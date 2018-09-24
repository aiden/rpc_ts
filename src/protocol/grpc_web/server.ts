/**
 * @module
 *
 * Server-side implementation of the `grpc_web` protocol.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Router, Response as ExpressResponse } from 'express';
import * as Utils from '../../utils/utils';
import * as ModuleRpcCommon from '../../common/rpc_common';
import * as ModuleRpcServer from '../../server/rpc_server';
import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import { errorTypesToHttpStatuses } from './private/http_status';
import { GrpcWebCodec } from './codec';
import { getMetadataFromGrpcWebError, GrpcWebError } from './private/grpc';
import {
  FullMethodParts,
  getFullMethodUrl,
  isLowerCamelCase,
} from './private/method_url';
import { isServerStreamMethod, isUnaryMethod } from '../helpers';
import { TextJsonGrpcWebCodec } from './text_json_codec';
import { AssertionError } from 'assert';
import { grpc } from 'grpc-web-client';

/** Options for the RPC server of the `grpc_web` protocol. */
export type GrpcWebServerOptions = {
  /** The express router to start from.  By default, we start from `Router()`. */
  router?: Router;

  /** A function to capture errors that occurred during RPCs. */
  captureError?: (err: Error) => void;

  /**
   * Use compression on response bodies.  Compression can be disabled as it is a security issue
   * (see https://www.blackhat.com/docs/asia-16/materials/asia-16-Karakostas-Practical-New-Developments-In-The-BREACH-Attack-wp.pdf
   * for a good overview).  To mitigate this we recommend, among other things, to use metadata
   * to pass "master" secrets (such as session secrets) around.
   */
  useCompression?: boolean;

  /**
   * The Codec to use.  By default, we use the `TextJsonGrpcWebCodec` codec.  The Codec must match
   * the Codec used by the client (this is enforced through content-type negotiation).
   */
  codec?: GrpcWebCodec;
};

/** HTTP statuses used in this implementation. */
const enum HttpStatus {
  internalError = 500,
  methodNotAllowed = 405,
  notAcceptable = 406,
}

/** The size in bytes of the grpc-web header in front of the chunks (containing messages or trailers) */
const HEADER_SIZE = 5;

/** Flag in the header to identify trailers. */
const TRAILER_FLAG = 0x80;

/**
 * Register the API routes of an RPC service for the `grpc_web` protocol.
 */
export function registerGrpcWebRoutes<
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
  options: GrpcWebServerOptions = {},
): Router {
  const router = options.router || Router();
  const codec = options.codec || new TextJsonGrpcWebCodec();

  // We get the full raw request (no client streaming).
  router.use(bodyParser.raw({ type: '*/*' }));

  if (options.useCompression) {
    // We compress the responses.
    router.use(compression());
  }

  for (const method in serviceDefinition) {
    if (!isLowerCamelCase(method)) {
      throw new ModuleRpcCommon.MisspecifiedServiceError(
        `method name ${method} is not lower camel case (example: fooBar; not FooBar or foo_bar)`,
      );
    }
    router.use(`/${method}`, async (req, resp) => {
      if (req.method !== 'POST') {
        resp.sendStatus(HttpStatus.methodNotAllowed);
        return;
      }
      if (req.header('accept') !== codec.getContentType()) {
        resp.sendStatus(HttpStatus.notAcceptable);
        return;
      }

      try {
        // Get the encoded request context from the HTTP headers
        const encodedRequestContext = Utils.mapValues(
          req.headers,
          value =>
            typeof value === 'string'
              ? value
              : /* istanbul ignore next */ value.join(','),
        );

        // Decode the request context and the request
        const requestContext = await serverContextConnector.decodeRequestContext(
          encodedRequestContext,
        );
        let request: any;
        const requestChunk = new Uint8Array(req.body);
        try {
          request = codec.decodeRequest(method, requestChunk);
        } catch (err) {
          throw new ModuleRpcServer.ServerTransportError(err);
        }

        // The actual processing depends on whether the method is server-stream or unary.
        const methodHandler = serviceHandler[method];
        const fullMethodParts: FullMethodParts = { method };
        if (isServerStreamMethod(serviceDefinition[method], methodHandler)) {
          await processServerStream(
            fullMethodParts,
            methodHandler,
            requestContext,
            request,
            resp,
            serverContextConnector,
            codec,
            options.captureError,
          );
        } else if (isUnaryMethod(serviceDefinition[method], methodHandler)) {
          await processUnary(
            fullMethodParts,
            methodHandler as ModuleRpcServer.UnaryMethodHandler<
              serviceDefinition,
              any,
              RequestContext
            >,
            requestContext,
            request,
            resp,
            serverContextConnector,
            codec,
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
        safeCaptureError(options.captureError, err);
        try {
          await addEncodedResponseContext(serverContextConnector, resp, err);
        } catch (encodingErr) {
          safeCaptureError(options.captureError, encodingErr);
        }

        // We give the `SeverRpcError` a special treatment that gives more info to
        // the client.  For other kinds of errors, a '500 Internal Server Error' HTTP
        // status is sent back.
        let status: number;
        let grpcWebError: GrpcWebError;
        if (err instanceof ModuleRpcServer.ServerRpcError) {
          grpcWebError = { errorType: err.errorType };
          // We do not transmit the `err.message` because it is a security issue,
          // only the `err.unsafeTransmittedMessage` (which should have been sanitized).
          if (err.unsafeTransmittedMessage) {
            grpcWebError.message = err.unsafeTransmittedMessage;
          }
          status =
            errorTypesToHttpStatuses[err.errorType] ||
            /* istanbul ignore next */ HttpStatus.internalError;
        } else {
          status = HttpStatus.internalError;
          grpcWebError = {
            errorType: ModuleRpcCommon.RpcErrorType.internal,
          };
        }

        const errorMetadata = getMetadataFromGrpcWebError(grpcWebError);
        try {
          if (!resp.headersSent) {
            // We can still set the status and the metadata on the HTTP headers
            resp.status(status);
            errorMetadata.forEach((name, value) => {
              resp.setHeader(name, value);
            });
            resp.end();
          } else if (!resp.finished) {
            // If the headers have already been sent, we have no choice but to send a trailer
            resp.write(
              encodeFrame(TRAILER_FLAG, codec.encodeTrailer(errorMetadata)),
            );
            resp.end();
          }
        } catch (err) /* istanbul ignore next */ {
          throw new ModuleRpcServer.ServerTransportError(err);
        }
      }
    });
  }
  return router;
}

async function processServerStream<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  method extends keyof serviceDefinition,
  RequestContext
>(
  fullMethodParts: FullMethodParts,
  methodHandler: ModuleRpcServer.ServerStreamMethodHandler<
    serviceDefinition,
    method,
    RequestContext
  >,
  requestContext: RequestContext,
  request: ModuleRpcCommon.RequestFor<serviceDefinition, method>,
  resp: ExpressResponse,
  serverContextConnector: ModuleRpcServer.ServerContextConnector<
    RequestContext
  >,
  codec: GrpcWebCodec,
  captureError?: (err: Error) => void,
) {
  enum StreamStatus {
    notReady = 'notReady',
    ready = 'ready',
    end = 'end',
  }

  // Add the encoded response context to the HTTP response.
  await addEncodedResponseContext(serverContextConnector, resp);

  let status: StreamStatus = StreamStatus.notReady;
  let close: ModuleRpcServer.CloseServerStream;
  resp.on('close', () => {
    if (close) {
      close();
    }
  });
  try {
    // Actually handle the request and stream the messages.
    await new Promise<void>((resolve, reject) => {
      methodHandler(
        request,
        {
          onReady: c => {
            try {
              // Check that onReady is called at the appropriate time
              if (status === StreamStatus.ready) {
                new ModuleRpcServer.HandlerProtocolError(
                  getFullMethodUrl(fullMethodParts),
                  'onReady called more than once',
                );
              } else if (status === StreamStatus.end) {
                throw new ModuleRpcServer.HandlerProtocolError(
                  getFullMethodUrl(fullMethodParts),
                  'onReady called after end of streaming',
                );
              }

              // Send HTTP status
              try {
                resp.status(200);
              } catch (err) /* istanbul ignore next */ {
                throw new ModuleRpcServer.ServerTransportError(err);
              }

              // Update status
              close = c;
              status = StreamStatus.ready;
            } catch (err) {
              reject(err);
            }
          },
          onMessage: message => {
            try {
              // Check that onMessage is called at the appropriate times
              if (status === StreamStatus.notReady) {
                throw new ModuleRpcServer.HandlerProtocolError(
                  getFullMethodUrl(fullMethodParts),
                  'onMessage called before onReady',
                );
              } else if (status === StreamStatus.end) {
                throw new ModuleRpcServer.HandlerProtocolError(
                  getFullMethodUrl(fullMethodParts),
                  'onMessage called after end of streaming',
                );
              }

              // Encode the message.
              let encodedMessage: Uint8Array;
              try {
                encodedMessage = codec.encodeMessage(
                  fullMethodParts.method,
                  message,
                );
              } catch (err) {
                // Encoding can fail (e.g. cyclical constructs)
                throw new ModuleRpcServer.HandlerProtocolError(
                  getFullMethodUrl(fullMethodParts),
                  `cannot encode message: ${message}`,
                );
              }

              // Send the encoded message
              if (resp.finished) {
                throw new ModuleRpcServer.ServerTransportError(
                  new Error('onMessage after end'),
                );
              }
              try {
                resp.write(encodeFrame(0, encodedMessage));
              } catch (err) /* istanbul ignore next */ {
                throw new ModuleRpcServer.ServerTransportError(err);
              }
            } catch (err) {
              reject(err);
            }
          },
        },
        requestContext,
      )
        .then(() => {
          try {
            resp.write(
              encodeFrame(
                TRAILER_FLAG,
                codec.encodeTrailer(new grpc.Metadata()),
              ),
            );
          } catch (err) /* istanbul ignore next */ {
            throw new ModuleRpcServer.ServerTransportError(err);
          }
          resolve();
        })
        .catch(reject);
    });
  } catch (err) {
    status = StreamStatus.end;
    safeCaptureError(captureError, err);

    // Send an error 'trailer' to the client
    let grpcWebError: GrpcWebError;
    if (err instanceof ModuleRpcServer.ServerRpcError) {
      grpcWebError = { errorType: err.errorType };
      if (err.unsafeTransmittedMessage) {
        grpcWebError.message = err.unsafeTransmittedMessage;
      }
    } else {
      grpcWebError = {
        errorType: ModuleRpcCommon.RpcErrorType.internal,
      };
    }
    try {
      resp.write(
        encodeFrame(
          TRAILER_FLAG,
          codec.encodeTrailer(getMetadataFromGrpcWebError(grpcWebError)),
        ),
      );
      resp.end();
    } catch (err) /* istanbul ignore next */ {
      throw new ModuleRpcServer.ServerTransportError(err);
    }
    return;
  }

  try {
    resp.end();
  } catch (err) /* istanbul ignore next */ {
    throw new ModuleRpcServer.ServerTransportError(err);
  }
}

async function processUnary<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  method extends keyof serviceDefinition,
  RequestContext
>(
  fullMethodParts: FullMethodParts,
  methodHandler: ModuleRpcServer.UnaryMethodHandler<
    serviceDefinition,
    method,
    RequestContext
  >,
  requestContext: RequestContext,
  request: ModuleRpcCommon.RequestFor<serviceDefinition, method>,
  resp: ExpressResponse,
  serverContextConnector: ModuleRpcServer.ServerContextConnector<
    RequestContext
  >,
  codec: GrpcWebCodec,
) {
  // Actually handle the request.
  const response = await methodHandler(request, requestContext);

  // Add the encoded response context to the HTTP response.
  await addEncodedResponseContext(serverContextConnector, resp);

  // Send the response.
  try {
    resp.write(
      encodeFrame(0, codec.encodeMessage(fullMethodParts.method, response)),
    );
    resp.write(
      encodeFrame(TRAILER_FLAG, codec.encodeTrailer(new grpc.Metadata())),
    );
    resp.end();
  } catch (err) /* istanbul ignore next */ {
    throw new ModuleRpcServer.ServerTransportError(err);
  }
}

/**
 * Add an encoded response context to an HTTP response.
 */
async function addEncodedResponseContext<RequestContext>(
  serverContextConnector: ModuleRpcServer.ServerContextConnector<
    RequestContext
  >,
  resp: ExpressResponse,
  err?: Error,
) {
  const encodedResponseContext = await serverContextConnector.provideResponseContext(
    err,
  );
  Utils.entries(encodedResponseContext).forEach(([key, value]) => {
    if (key) {
      resp.setHeader(key, value);
    }
  });
}

/**
 * Safely call a `captureError` function, i.e. ensure that all errors thrown by
 * `captureError` itself are catched.
 */
function safeCaptureError(
  captureError: (err: Error) => void | undefined,
  err: Error,
) {
  if (!captureError) {
    return;
  }

  try {
    captureError(err);
  } catch (err) {
    console.error('Cannot capture error', err.stack);
  }
}

/** Encode a frame to be sent on the wire. */
function encodeFrame(firstByte: number, encodedPayload: Uint8Array): Buffer {
  const buf = new Buffer(HEADER_SIZE + encodedPayload.byteLength);
  buf.writeUInt8(firstByte, 0);
  buf.writeUInt32BE(encodedPayload.byteLength, 1);
  for (let i = 0; i < encodedPayload.byteLength; ++i) {
    buf.writeUInt8(encodedPayload[i], HEADER_SIZE + i);
  }
  return buf;
}
