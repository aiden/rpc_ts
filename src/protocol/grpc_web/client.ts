/**
 * @module
 *
 * Client-side implementation of the `grpc_web` protocol.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as ModuleRpcCommon from '../../common/rpc_common';
import * as ModuleRpcClient from '../../client/rpc_client';
import * as TypeUtils from '../../utils/type_utils';
import { httpStatusesToErrorTypes } from './private/http_status';
import { DefaultTransportFactory } from 'grpc-web-client/dist/transports/Transport';
import { GrpcWebCodec } from './codec';
import { getGrpcWebErrorFromMetadata } from './private/grpc';
import { grpc } from 'grpc-web-client';
import { ChunkParser, ChunkType } from 'grpc-web-client/dist/ChunkParser';
import { TextJsonGrpcWebCodec } from './text_json_codec';
import * as events from 'events';

/** Options for the RPC client of the `grpc_web` protocol. */
export type GrpcWebClientOptions = {
  /** The remote address to connect to (example: https://test.com:8000). */
  remoteAddress: string;

  /**
   * Optional transport mechanism override.  A `Transport` is a low-level implementation that can
   * talk to an HTTP server.  The actual transport depends on the runtime (NodeJS, a particular
   * browser), and if not specified `grpc-web-client` select the most appropriate one.
   */
  getTransport?: (options: grpc.TransportOptions) => grpc.Transport | Error;

  /**
   * The Codec to use.  By default, we use the `TextJsonGrpcWebCodec` codec.  The Codec must match
   * the Codec used by the server (this is enforced through content-type negotiation).
   */
  codec?: GrpcWebCodec;
};

/**
 * Return an RPC client for the `grpc_web` protocol.
 */
export function getGrpcWebClient<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  ResponseContext
>(
  serviceDefinition: serviceDefinition,
  clientContextConnector: ModuleRpcClient.ClientContextConnector<
    ResponseContext
  >,
  options: GrpcWebClientOptions,
): ModuleRpcClient.Service<serviceDefinition, ResponseContext> {
  const codec = options.codec || new TextJsonGrpcWebCodec();
  const getTransport =
    options.getTransport || (options => DefaultTransportFactory(options));

  return new ModuleRpcClient.Service<serviceDefinition, ResponseContext>(
    serviceDefinition,
    (method, request) =>
      new GrpcWebStream(
        `${options.remoteAddress}/${method}`,
        method,
        getTransport,
        clientContextConnector,
        codec,
        request,
      ),
  );
}

/**
 * All the states of a grpc-web stream are gathered here for better clarity.
 */
enum GrpcWebStreamState {
  /** Initial state */
  initial = 'initial',
  /** Waiting for the request, the request context and the transport to start. */
  waitingForRequest = 'waitingForRequest',
  /** The transport is started, waiting for the headers/metadata. */
  started = 'started',
  /** The headers/metadata had been received and successfully decoded, we are ready to receive messages. */
  ready = 'ready',
  /** The stream has been canceled. */
  canceled = 'canceled',
  /** The stream errored. */
  error = 'error',
  /** The trailers have been received. */
  trailersReceived = 'trailedsReceived',
  /** The stream successfully completed. */
  complete = 'complete',
  /* The transported ended before the state was equal to `ready` */
  endedBeforeReady = 'endedBeforeReady',
}

class GrpcWebStream<Request, Response, ResponseContext>
  extends events.EventEmitter
  implements
    ModuleRpcClient.Stream<{
      response: Response;
      responseContext: ResponseContext;
    }> {
  /**
   * Used to buffer frames as received from the server so as to read entire chunks
   * if they are saddled on multiple frames.
   */
  private chunkParser = new ChunkParser();

  /** The low-level transport.  Invokes `fetch`, XHR, `node-fetch`, ... */
  private transport: grpc.Transport;

  /**
   * The chunks that are pending processing because the headers have not yet been decoded
   * (the decoding is asynchronous).  When the state becomes `GrpcWebStreamState.ready`,
   * these chunk bytes are processed all at once.
   */
  private pendingChunkBytes: Uint8Array[] = [];

  /**
   * The response context resulting from the decoding of the headers/metadata.
   */
  private responseContext: ResponseContext;

  /** The state of the stream.  We use this to enforce state transitions. */
  private state: GrpcWebStreamState = GrpcWebStreamState.initial;

  constructor(
    private readonly url: string,
    private readonly method: string,
    private readonly getTransport: (
      options: grpc.TransportOptions,
    ) => grpc.Transport | Error,
    private readonly clientContextConnector: ModuleRpcClient.ClientContextConnector<
      ResponseContext
    >,
    private readonly codec: GrpcWebCodec,
    private readonly request: Request | (() => Request),
  ) {
    super();
  }

  /** @override */
  start() {
    this.ensureState(GrpcWebStreamState.initial);
    this.state = GrpcWebStreamState.waitingForRequest;

    const transport = this.getTransport({
      methodDefinition: {} as any, // gRPC method definition is irrelevant in our case
      debug: false,
      url: this.url,
      onHeaders: (headers, status) =>
        this.onHeaders(headers, status)
          .then(responseContext => {
            this.responseContext = responseContext;
            switch (this.state) {
              case GrpcWebStreamState.started:
              case GrpcWebStreamState.endedBeforeReady:
                this.ready();
                break;

              /* istanbul ignore next */
              case GrpcWebStreamState.initial:
              /* istanbul ignore next */
              case GrpcWebStreamState.ready:
              /* istanbul ignore next */
              case GrpcWebStreamState.waitingForRequest:
              /* istanbul ignore next */
              case GrpcWebStreamState.complete:
              /* istanbul ignore next */
              case GrpcWebStreamState.trailersReceived:
                /* istanbul ignore next */
                this.unexpectedState();
                break;

              case GrpcWebStreamState.canceled:
              case GrpcWebStreamState.error:
                break;

              /* istanbul ignore next */
              default:
                TypeUtils.assertUnreachable(this.state, true);
            }
          })
          .catch(err => this.emit('error', err)),
      onChunk: (chunkBytes, _flush) => {
        switch (this.state) {
          case GrpcWebStreamState.started:
            this.pendingChunkBytes.push(chunkBytes);
            break;

          case GrpcWebStreamState.ready:
            this.onChunk(chunkBytes);
            break;

          case GrpcWebStreamState.canceled:
          case GrpcWebStreamState.error:
            return;

          /* istanbul ignore next */
          case GrpcWebStreamState.initial:
          /* istanbul ignore next */
          case GrpcWebStreamState.waitingForRequest:
          /* istanbul ignore next */
          case GrpcWebStreamState.complete:
          /* istanbul ignore next */
          case GrpcWebStreamState.endedBeforeReady:
          /* istanbul ignore next */
          case GrpcWebStreamState.trailersReceived:
            return this.unexpectedState();

          /* istanbul ignore next */
          default:
            TypeUtils.assertUnreachable(this.state, true);
        }
      },
      onEnd: err => {
        if (this.state === GrpcWebStreamState.error) {
          return;
        }
        if (err) {
          this.state = GrpcWebStreamState.error;
          /* tslint:disable:no-unnecessary-type-assertion */
          /* istanbul ignore else */
          if ((err as any).code === 'ECONNREFUSED') {
            /* tslint:enable:no-unnecessary-type-assertion */
            this.emit(
              'error',
              new ModuleRpcClient.ClientRpcError(
                ModuleRpcCommon.RpcErrorType.unavailable,
                err.stack || /* istanbul ignore next */ err.message,
              ),
            );
          } else {
            this.emit('error', err);
          }
        } else {
          if (this.state === GrpcWebStreamState.started) {
            this.state = GrpcWebStreamState.endedBeforeReady;
            return;
          }
          this.end();
        }
      },
    });
    /* istanbul ignore next */
    if (transport instanceof Error) {
      this.state = GrpcWebStreamState.error;
      this.emit('error', new ModuleRpcClient.ClientTransportError(transport));
      return this;
    }
    this.transport = transport;

    this.clientContextConnector
      .provideRequestContext()
      .then(requestContext => {
        transport.start(
          new grpc.Metadata({
            'content-type': this.codec.getContentType(),
            accept: this.codec.getContentType(),
            'x-user-agent': 'grpc-web-javascript/0.1',
            ...requestContext,
          }),
        );
        this.state = GrpcWebStreamState.started;

        this.transport.sendMessage(
          this.codec.encodeRequest(
            this.method,
            this.request instanceof Function ? this.request() : this.request,
          ),
        );
        this.transport.finishSend();
      })
      .catch(err => {
        this.state = GrpcWebStreamState.error;
        this.emit('error', new ModuleRpcClient.RequestContextError(err));
      });

    return this;
  }

  /** @override */
  cancel() {
    if (this.transport) {
      this.transport.cancel();
    }
    this.state = GrpcWebStreamState.canceled;
    this.emit('canceled');

    return this;
  }

  /** When the headers are received */
  private async onHeaders(
    headers: grpc.Metadata,
    status: number,
  ): Promise<ResponseContext> {
    const encodedResponseContext: ModuleRpcCommon.EncodedContext = {};
    headers.forEach((name, values) => {
      encodedResponseContext[name] = values[0];
    });

    const responseContext = await this.clientContextConnector.decodeResponseContext(
      encodedResponseContext,
    );

    const error = getGrpcWebErrorFromMetadata(headers);
    if (error) {
      this.transport.cancel();
      throw new ModuleRpcClient.ClientRpcError<ResponseContext>(
        error.errorType,
        error.message,
        responseContext,
      );
    }

    if (status !== 200) {
      const errorType = guessErrorTypeFromHttpStatus(status);
      throw new ModuleRpcClient.ClientRpcError<ResponseContext>(
        errorType,
        `non-200 HTTP status code (${status})`,
        responseContext,
      );
    }

    return responseContext;
  }

  /** When a chunk (message or trailer) is received */
  private onChunk(chunkBytes: Uint8Array) {
    for (const chunk of this.chunkParser.parse(chunkBytes)) {
      switch (chunk.chunkType) {
        case ChunkType.MESSAGE: {
          const response = this.codec.decodeMessage(this.method, chunk.data);
          this.emit('message', {
            response,
            responseContext: this.responseContext,
          });
          break;
        }

        case ChunkType.TRAILERS: {
          const error = getGrpcWebErrorFromMetadata(chunk.trailers);
          if (error) {
            this.state = GrpcWebStreamState.error;
            this.emit(
              'error',
              new ModuleRpcClient.ClientRpcError<ResponseContext>(
                error.errorType,
                error.message,
                this.responseContext,
              ),
            );
          } else {
            this.state = GrpcWebStreamState.trailersReceived;
          }
          break;
        }

        /* istanbul ignore next */
        default:
          TypeUtils.assertUnreachable(chunk.chunkType, true);
      }
    }
  }

  /** Call this when the stream is ready. */
  private ready() {
    const endedBeforeReady = this.state === GrpcWebStreamState.endedBeforeReady;
    this.state = GrpcWebStreamState.ready;
    this.emit('ready');
    for (const chunkBytes of this.pendingChunkBytes) {
      this.onChunk(chunkBytes);
    }

    if (endedBeforeReady) {
      this.end();
    }
  }

  /** Call this when the stream ends. */
  private end() {
    if (this.state === GrpcWebStreamState.trailersReceived) {
      this.state = GrpcWebStreamState.complete;
      this.emit('complete');
    } else if (this.state !== GrpcWebStreamState.error) {
      // The connection was closed before the trailers could be received
      this.emit(
        'error',
        new ModuleRpcClient.ClientRpcError(
          ModuleRpcCommon.RpcErrorType.unavailable,
        ),
      );
    }
  }

  /* istanbul ignore next */
  private ensureState(state: GrpcWebStreamState) {
    if (this.state !== state) {
      throw new Error(
        `invalid retrier state: actual: ${this.state}; expected: ${state}`,
      );
    }
  }

  /* istanbul ignore next */
  private unexpectedState() {
    throw new Error(`unexpected state ${this.state}`);
  }
}

function guessErrorTypeFromHttpStatus(
  httpStatus: number,
): ModuleRpcCommon.RpcErrorType {
  return (
    httpStatusesToErrorTypes[httpStatus] ||
    /* istanbul ignore next */ ModuleRpcCommon.RpcErrorType.unknown
  );
}
