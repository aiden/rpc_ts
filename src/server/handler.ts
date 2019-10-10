/**
 * @module ModuleRpcServer
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcCommon } from '../common';

/**
 * Service handlers implement the business logic of the service methods on the server.
 *
 * @see [[ModuleRpcServer.UnaryMethodHandler]]
 * @see [[ModuleRpcServer.ServerStreamMethodHandler]]
 *
 * @example ```Typescript
 * const serviceDefinition = {
 *   increment: {
 *     request: {} as { value: number },
 *     response: {} as { value: number },
 *   },
 * };
 *
 * const handler: ModuleRpcServer.ServiceHandlerFor<typeof serviceDefinition> = {
 *   async increment({ value }) {
 *     return { value: value + 1 };
 *   },
 * };
 * ```
 */
export type ServiceHandlerFor<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  Context = undefined
> = {
  [method in ModuleRpcCommon.MethodsFor<
    serviceDefinition
  >]: serviceDefinition[method] extends {
    type: typeof ModuleRpcCommon.ServiceMethodType.serverStream;
  }
    ? ServerStreamMethodHandler<serviceDefinition, method, Context>
    : UnaryMethodHandler<serviceDefinition, method, Context>;
};

/**
 * Implements a server stream on an RPC server.  Sending messages is done through
 * the callbacks.  The stream is closed when the returned promise resolved.
 * To signal an error (and close the stream), the returned promise can be rejected.
 *
 * @param request The request sent to the server.
 * @param callbacks Various callbacks that the handler can call during the life time
 * of the server stream.
 * @param context Client context that was optionally sent along with the request.
 *
 * @throws [[ModuleRpcServer.ServerRpcError]] can be thrown to set the RPC error
 * type that would be sent to the client.
 */
export type ServerStreamMethodHandler<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  method extends ModuleRpcCommon.MethodsFor<serviceDefinition>,
  RequestContext = undefined
> = RequestContext extends undefined
  ? (
      request: ModuleRpcCommon.RequestFor<serviceDefinition, method>,
      callbacks: ServerStreamMethodHandlerCallbacks<serviceDefinition, method>,
    ) => Promise<void>
  : (
      request: ModuleRpcCommon.RequestFor<serviceDefinition, method>,
      callbacks: ServerStreamMethodHandlerCallbacks<serviceDefinition, method>,
      context: RequestContext,
    ) => Promise<void>;

/**
 * Callbacks available to a server stream method handler.
 */
export interface ServerStreamMethodHandlerCallbacks<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  method extends ModuleRpcCommon.MethodsFor<serviceDefinition>
> {
  /**
   * To be called before any invocation of `onMessage` to register
   * a cancellation callback.
   */
  onReady: (close: CloseServerStream) => void;
  /**
   * To be called to send a message.
   */
  onMessage: (
    message: ModuleRpcCommon.ResponseFor<serviceDefinition, method>,
  ) => void;
}

/**
 * Implements a unary method handler.  The returned promise resolved into the
 * response.
 *
 * @param request The request sent to the server.
 * @param context Context that was optionally sent along with the request.
 *
 * @throws [[ModuleRpcServer.ServerRpcError]] can be thrown to set the RPC error
 * type that would be sent to the client.
 */
export type UnaryMethodHandler<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  method extends ModuleRpcCommon.MethodsFor<serviceDefinition>,
  RequestContext = undefined
> = RequestContext extends undefined
  ? (
      request: ModuleRpcCommon.RequestFor<serviceDefinition, method>,
    ) => Promise<ModuleRpcCommon.ResponseFor<serviceDefinition, method>>
  : (
      request: ModuleRpcCommon.RequestFor<serviceDefinition, method>,
      context: RequestContext,
    ) => Promise<ModuleRpcCommon.ResponseFor<serviceDefinition, method>>;

/**
 * Closes a server stream.
 *
 * @see [[ServiceMethodType.serverStream]]
 */
export type CloseServerStream = () => void;
