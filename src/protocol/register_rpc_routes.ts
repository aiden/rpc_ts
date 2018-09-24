/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as ModuleRpcCommon from '../common/rpc_common';
import * as ModuleRpcServer from '../server/rpc_server';
import { Router } from 'express';
import { EmptyServerContextConnector } from '../context/empty/server';
import { registerGrpcWebRoutes } from './grpc_web/server';
import * as TypeUtils from '../utils/type_utils';

export type RpcServerOptions = {
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

  /** Transport protocol to use.  Defaults to grpcWebJson. */
  protocol?: ModuleRpcCommon.Protocol;
};

export function registerRpcRoutes<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition
>(
  serviceDefinition: serviceDefinition,
  serviceHandler: ModuleRpcServer.ServiceHandlerFor<serviceDefinition>,
  options?: RpcServerOptions,
);
export function registerRpcRoutes<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  RequestContext
>(
  serviceDefinition: serviceDefinition,
  serviceHandler: ModuleRpcServer.ServiceHandlerFor<
    serviceDefinition,
    RequestContext
  >,
  options: RpcServerOptions & {
    serverContextConnector: ModuleRpcServer.ServerContextConnector<
      RequestContext
    >;
  },
);
export function registerRpcRoutes<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  RequestContext
>(
  serviceDefinition: serviceDefinition,
  serviceHandler: ModuleRpcServer.ServiceHandlerFor<
    serviceDefinition,
    RequestContext
  >,
  options: RpcServerOptions & {
    serverContextConnector?: ModuleRpcServer.ServerContextConnector<
      RequestContext
    >;
  } = {},
): Router {
  const protocol = options.protocol || ModuleRpcCommon.Protocol.grpcWebJson;
  const serverContextConnector =
    options.serverContextConnector || new EmptyServerContextConnector();
  switch (protocol) {
    case ModuleRpcCommon.Protocol.grpcWebJson:
      return registerGrpcWebRoutes(
        serviceDefinition,
        serviceHandler,
        serverContextConnector,
        {
          router: options.router,
          captureError: options.captureError,
          useCompression: options.useCompression,
        },
      );

    default:
      TypeUtils.assertUnreachable(protocol, true);
  }
}
