/**
 * @module ModuleRpcClient
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcCommon } from '../common';
import { ClientProtocolError, ClientRpcError } from './errors';
import { BackoffOptions } from './backoff';
import { StreamProducer, Stream, transformStream } from './stream';
import { mapValuesWithStringKeys } from '../utils/utils';
import * as events from 'events';
import { retryStream } from './stream_retrier';

/**
 * Implements a service from a [[StreamProducer]].  The StreamProducer
 * is provided by a streaming protocol, for instance through [[getGrpcWebClient]] in the
 * case of the gRPC-Web protocol.
 *
 * @typeparam serviceDefinition The definition of the service, enumerating all the
 * methods and their request and response types.
 * @typeparam ResponseContext The type of the response context that is transmitted along
 * with the response to the client.
 */
export class Service<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  ResponseContext
> {
  /**
   * @param serviceDefinition The definition of the service.
   * @param streamProducer A handler that produces a stream of [[ResponseWithContext]]
   * objects given a method name and an RPC request to which the transportation is delegated.
   */
  constructor(
    readonly serviceDefinition: serviceDefinition,
    private readonly streamProducer: StreamProducer,
  ) {}

  /**
   * Retrieves a server stream from a method using a request.
   *
   * @return An object containing the response of the RPC and the context of
   * the response (meta-information).  The response context contains the information
   * that is related to the "remote" aspect of the procedure call: it would be empty if
   * the call were to be made within the same OS process.
   */
  stream<method extends ModuleRpcCommon.MethodsFor<serviceDefinition>>(
    method: method,
    request:
      | ModuleRpcCommon.RequestFor<serviceDefinition, method>
      | (() => ModuleRpcCommon.RequestFor<serviceDefinition, method>),
  ): Stream<ResponseWithContext<serviceDefinition, method, ResponseContext>> {
    return this.streamProducer<
      ModuleRpcCommon.RequestFor<serviceDefinition, method>,
      {
        response: ModuleRpcCommon.ResponseFor<serviceDefinition, method>;
        responseContext: ResponseContext;
      }
    >(method, request);
  }

  /**
   * Calls a unary method on a request.
   *
   * The underlying server stream is retrieved and transformed into a promise.
   *
   * @return An object containing the response of the RPC and the context of
   * the response (meta-information).  The response context contains the information
   * that is related to the "remote" aspect of the procedure call: it would be empty if
   * the call were to be made within the same OS process.
   *
   * @throws [[ClientProtocolError]] if the remote implementation was not that of a unary method.
   * @throws `Error` if errors were encountered during the streaming.
   *
   * @see [[streamAsPromise]]
   */
  call<method extends ModuleRpcCommon.UnaryMethodsFor<serviceDefinition>>(
    method: method,
    request:
      | ModuleRpcCommon.RequestFor<serviceDefinition, method>
      | (() => ModuleRpcCommon.RequestFor<serviceDefinition, method>),
  ) {
    return new Promise<
      ResponseWithContext<serviceDefinition, method, ResponseContext>
    >((accept, reject) => {
      let message: {
        response: ModuleRpcCommon.ResponseFor<serviceDefinition, method>;
        responseContext: ResponseContext;
      };
      this.stream(method, request)
        .on('message', msg => {
          if (message) {
            reject(
              new ClientProtocolError(
                method,
                'expected unary method, but got more than one message from server',
              ),
            );
          } else {
            message = msg;
          }
        })
        .on('error', err => {
          reject(err);
        })
        .on('complete', () => {
          if (!message) {
            reject(
              new ClientProtocolError(
                method,
                'expected unary method, but got no message from server',
              ),
            );
          } else {
            accept(message);
          }
        })
        .on('canceled', () => {
          reject(new ClientRpcError(0, ModuleRpcCommon.RpcErrorType.canceled));
        })
        .start();
    });
  }

  /**
   * Returns a service wrapped with a given retry policy that applies to all
   * the methods of this service.
   *
   * @param backoffOptions Options for the exponential backoff.
   */
  withRetry(
    backoffOptions: Partial<BackoffOptions> = {},
  ): ServiceRetrier<serviceDefinition, ResponseContext> {
    return new ServiceRetrierImpl(this, backoffOptions);
  }

  /**
   * Return a "method map" service interface with which it is possible to call RPCs
   * as "normal" JavaScript functions.
   *
   * @example ```Typescript
   * // Before
   * const service: Service<...> = ...;
   * service.stream('serverStream', { foo: 'bar' })
   *   .on('message', ({ response, responseContext }) => { ... })
   *   .start();
   * const { response, responseContext } = await service.call('unaryMethod', { foo: 'bar' });
   *
   * // After
   * const methodMap = service.methodMap();
   * methodMap.serverStream({ foo: 'bar' })
   *   .on('message', response => { ... })
   *   .start();
   * const response = await methodMap.unaryMethod({ foo: 'bar' });
   * ```
   */
  methodMap(): ServiceMethodMap<serviceDefinition, ResponseContext> {
    const methods = mapValuesWithStringKeys(
      this.serviceDefinition,
      (methodDefinition, method) => {
        if (
          methodDefinition.type ===
          ModuleRpcCommon.ServiceMethodType.serverStream
        ) {
          return (request: any) =>
            transformStream(
              this.stream(method, request),
              ({ response }) => response,
            );
        } else {
          return async (request: any) => {
            // Any-cast is the simplest way since it is difficult to type assert
            // the fact that it is a unary method.
            const { response } = await this.call(method as any, request);
            return response;
          };
        }
      },
    ) as any;
    return {
      ...methods,
      [serviceKey]: this,
    };
  }
}

/**
 * A response with a response context for a given service method.
 *
 * @see [[Service.stream]]
 */
export interface ResponseWithContext<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  method extends ModuleRpcCommon.MethodsFor<serviceDefinition>,
  ResponseContext
> {
  response: ModuleRpcCommon.ResponseFor<serviceDefinition, method>;
  responseContext: ResponseContext;
}

/**
 * Symbol used as a property name on a [[ServiceMethodMap]] to access the
 * full service interface from a "method map" service interface.
 *
 * This symbol is private to this module as [[serviceInstance]] should
 * be used externally instead of directly accessing the service instance
 * using the symbol.
 */
const serviceKey = Symbol('serviceKey');

/**
 * "Method map" service interface derived from a service definition.
 *
 * @see [[Service.methodMap]]
 */
export type ServiceMethodMap<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  ResponseContext = any
> = {
  [method in ModuleRpcCommon.MethodsFor<
    serviceDefinition
  >]: serviceDefinition[method] extends {
    type: typeof ModuleRpcCommon.ServiceMethodType.serverStream;
  }
    ? ServerStreamMethod<serviceDefinition, method>
    : UnaryMethod<serviceDefinition, method>;
} & {
  [serviceKey]: Service<serviceDefinition, ResponseContext>;
};

/**
 * Get the full service instance from a "method map" service interface.
 *
 * Implementation detail: The service instance is stored in a "method map" through a
 * symbol-named property.
 *
 * @example ```Typescript
 * const service: Service<...> = ...;
 * const methodMap = service.methodMap();
 * // serviceInstance(methodMap) === service
 * ```
 */
export function serviceInstance<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  ResponseContext = any
>(methodMap: ServiceMethodMap<serviceDefinition, ResponseContext>) {
  return methodMap[serviceKey];
}

/** A unary method typed as part of a "method map" service interface. */
export interface UnaryMethod<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  method extends ModuleRpcCommon.MethodsFor<serviceDefinition>
> {
  (request: ModuleRpcCommon.RequestFor<serviceDefinition, method>): Promise<
    ModuleRpcCommon.ResponseFor<serviceDefinition, method>
  >;
}

/** A server-stream method typed as part of a "method map" service interface. */
export interface ServerStreamMethod<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  method extends ModuleRpcCommon.MethodsFor<serviceDefinition>
> {
  (
    request:
      | ModuleRpcCommon.RequestFor<serviceDefinition, method>
      | (() => ModuleRpcCommon.RequestFor<serviceDefinition, method>),
  ): Stream<ModuleRpcCommon.ResponseFor<serviceDefinition, method>>;
}

/**
 * Wrapper that retries RPCs when they fail and emit service-wide events.
 */
export interface ServiceRetrier<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  ResponseContext
> {
  /**
   * Return the wrapped service.  All the methods are retried using the
   * agreed-upon strategy.
   *
   * @see ModuleRpcClient.Service#withRetry()
   */
  service(): Service<serviceDefinition, ResponseContext>;

  /**
   * Register listeners.
   *
   * Events are:
   *
   * - `serviceReady`: When a method is ready to process a request.
   * - `serviceComplete`: When a method has completed after successfully
   * processing a request.
   * - `serviceError`: When a method has errored.  Parameters:
   *   - `err`: The error.
   *   - `retriesSinceLastReady`: The number of retries made since the method
   * last emitted a 'ready' event.
   *   - `abandoned`: Whether as a result of this error event the retrying was
   * abandoned (as a consequence, the error `err` has been forwarded to the client).
   *   - `method`: The method that errored.
   *   - `request`: The request the method errored on.
   */
  on(
    event: 'serviceReady' | 'serviceComplete',
    callback: <method extends ModuleRpcCommon.MethodsFor<serviceDefinition>>(
      method: method,
      request: ModuleRpcCommon.RequestFor<serviceDefinition, method>,
    ) => void,
  ): this;
  on(
    event: 'serviceError',
    callback: <method extends ModuleRpcCommon.MethodsFor<serviceDefinition>>(
      err: Error,
      retriesSinceLastReady: number,
      abandoned: boolean,
      method: method,
      request: ModuleRpcCommon.RequestFor<serviceDefinition, method>,
    ) => void,
  ): this;
}

class ServiceRetrierImpl<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  ResponseContext
> extends events.EventEmitter
  implements ServiceRetrier<serviceDefinition, ResponseContext> {
  constructor(
    private readonly baseService: Service<serviceDefinition, ResponseContext>,
    private readonly backoffOptions: Partial<BackoffOptions>,
  ) {
    super();
  }

  service() {
    return new Service<serviceDefinition, ResponseContext>(
      this.baseService.serviceDefinition,
      this.stream,
    );
  }

  private stream: StreamProducer = <
    method extends ModuleRpcCommon.MethodsFor<serviceDefinition>
  >(
    method: method,
    request:
      | ModuleRpcCommon.RequestFor<serviceDefinition, method>
      | (() => ModuleRpcCommon.RequestFor<serviceDefinition, method>),
  ) => {
    return retryStream<ModuleRpcCommon.ResponseFor<serviceDefinition, method>>(
      () => this.baseService.stream(method, request),
      this.backoffOptions,
    )
      .on('ready', () => {
        this.emit('serviceReady', method, request);
      })
      .on('retryingError', (err, retries, abandoned) => {
        this.emit('serviceError', err, retries, abandoned, method, request);
      })
      .on('complete', () => {
        this.emit('serviceComplete', method, request);
      });
  };
}
