/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as ModuleRpcCommon from '../common/rpc_common';

/**
 * Type type of a service handler. Service handlers actually implement the service methods
 * on the server.
 */
export type ServiceHandlerFor<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  Context = any
> = {
  [method in keyof serviceDefinition]: serviceDefinition[method] extends {
    type: typeof ModuleRpcCommon.ServiceMethodType.serverStream;
  }
    ? ServerStreamMethodHandler<serviceDefinition, method, Context>
    : UnaryMethodHandler<serviceDefinition, method, Context>
};

export type ServerStreamMethodHandler<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  method extends keyof serviceDefinition,
  Context = any
> = (
  request: ModuleRpcCommon.RequestFor<serviceDefinition, method>,
  callbacks: {
    onReady: (close: CloseServerStream) => void;
    onMessage: (
      message: ModuleRpcCommon.ResponseFor<serviceDefinition, method>,
    ) => void;
  },
  ctx?: Context,
) => Promise<void>;

export type UnaryMethodHandler<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  method extends keyof serviceDefinition,
  Context = any
> = (
  request: ModuleRpcCommon.RequestFor<serviceDefinition, method>,
  ctx?: Context,
) => Promise<ModuleRpcCommon.ResponseFor<serviceDefinition, method>>;

/**
 * Callback used to close a server stream.
 */
export type CloseServerStream = () => void;
