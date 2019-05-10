import { AssertionError } from 'assert';
import { ModuleRpcCommon } from '../../../common';
import { ModuleRpcServer } from '../../../server';
import { GrpcWebJsonCodec, GrpcWebCodec } from '../common/common';
import { ReportErrorHandler } from '../server/server';
import { isServerStreamMethod, isUnaryMethod } from '../../private/helpers';

/** Options for the RPC server of the gRPC-Web protocol. */
export interface GrpcWebServerOptions<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition
> {
  /** A function to report errors that occurred during RPCs. */
  reportError?: ReportErrorHandler;

  /**
   * The Codec to use.  By default, we use the [[GrpcWebJsonCodec]] codec.  The Codec must match
   * the Codec used by the client (this is enforced through content-type negotiation).
   */
  codec?: GrpcWebCodec<serviceDefinition>;
}

export async function processCliArgs<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  RequestContext
>(
  serviceDefinition: serviceDefinition,
  serviceHandler: ModuleRpcServer.ServiceHandlerFor<
    serviceDefinition,
    RequestContext
  >,
  serverContextConnector: ModuleRpcServer.ServerContextConnector<
    RequestContext
  >,
  options: GrpcWebServerOptions<serviceDefinition> = {},
  argv: string[] = process.argv.slice(1),
  stdin: NodeJS.ReadStream = process.stdin,
  stdout: NodeJS.WriteStream = process.stdout,
) {
  const codec = options.codec || new GrpcWebJsonCodec();

  try {
    if (argv.length !== 2) {
      throw new Error(`expected two CLI arguments; got ${argv.length}`);
    }
    const method = getMethod(argv[0]);
    const metadata = getMetadata(argv[1]);

    // Decode the request context and the request
    const requestContext = await serverContextConnector.decodeRequestContext(
      metadata,
    );
    let request: any;
    const requestChunk = new Uint8Array(await readAll(stdin));
    try {
      request = codec.decodeRequest(method, requestChunk);
    } catch (err) {
      if (err instanceof ModuleRpcServer.ServerError) {
        throw err;
      }
      throw new ModuleRpcServer.ServerTransportError(err);
    }

    // The actual processing depends on whether the method is server-stream or unary.
    const methodHandler = serviceHandler[method];
    const fullMethodParts: FullMethodParts = { method };
    if (isServerStreamMethod(serviceDefinition[method], methodHandler)) {
      throw new Error('unimplemented server stream');
    } else if (isUnaryMethod(serviceDefinition[method], methodHandler)) {
      await processUnary(
        fullMethodParts,
        methodHandler,
        requestContext,
        request,
        resp,
        serverContextConnector,
        codec,
        options.reportError,
      );
    } else {
      /* istanbul ignore next */
      throw new AssertionError({
        message: `unexpected type for service method ${method}`,
      });
    }
  } catch (err) {
    // We safely capture the error and safely add the encoded response context
    // (that is, we ensure no error is thrown during the process).
    safeCaptureError(options.reportError, err, { url: method });
    try {
      await addEncodedResponseContext(serverContextConnector, resp, err);
    } catch (encodingErr) {
      safeCaptureError(options.reportError, encodingErr, { url: method });
    }

    const { status, grpcWebError } = getGrpcWebErrorFromError(err);
    const errorMetadata = getMetadataFromGrpcWebError(grpcWebError);
    try {
      if (!resp.headersSent) {
        // We can still set the status and the metadata on the HTTP headers
        sendHttpErrorResponse(status, errorMetadata, resp);
      } else if (!resp.finished) {
        // If the headers have already been sent, we have no choice but to send a trailer
        resp.write(
          encodeFrame(TRAILER_FLAG, codec.encodeTrailer(errorMetadata)),
        );
        resp.end();
      }
    } catch (err) /* istanbul ignore next */ {
      safeCaptureError(options.reportError, err, { url: method });
      if (err instanceof ModuleRpcServer.ServerError) {
        throw err;
      }
      throw new ModuleRpcServer.ServerTransportError(err);
    }
  }
}

function getMethod(str: string): string {
  // TODO: validation
  return str;
}

function getMetadata(str: string): ModuleRpcCommon.EncodedContext {
  const obj = JSON.parse(str);
  const metadata: ModuleRpcCommon.EncodedContext = {};
  Object.values(obj).forEach(([key, value]) => {
    if (value != null) {
      metadata[key] = value.toString();
    }
  });
  return metadata;
}

async function readAll(stream: NodeJS.ReadStream): Promise<Buffer> {
  return new Promise<Buffer>(resolve => {
    stream.resume();
    const bufs: Buffer[] = [];
    stream.on('data', (buf: Buffer) => {
      bufs.push(buf);
    });
    // TODO: error handling?
    stream.on('end', () => {
      resolve(Buffer.concat(bufs));
    });
  });
}
