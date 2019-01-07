/**
 * This module provides a simplified interface for instantiating an RPC server.
 * Under the hood, it is a thin wrapper around
 * [[ModuleRpcProtocolGrpcWebServer.registerGrpcWebRoutes]],
 * and it provides a gRPC-Web transportation protocol with JSON encoding/decoding.  Other
 * protocols could be offered here in the future, and [[registerRpcRoutes]] would be used
 * to easily choose between them.
 *
 * @see [[ModuleRpcProtocolClient]]
 *
 * @module ModuleRpcProtocolServer
 * @preferred
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** */
import { Router } from 'express';
import { registerGrpcWebRoutes } from '../grpc_web/server/server';
import { ModuleRpcContextServer } from '../../context/server';
import { ModuleRpcCommon } from '../../common';
import { ModuleRpcServer } from '../../server';

export interface RpcServerOptions {
  /** The express router to start from.  By default, we start from `Router()`. */
  router?: Router;

  /** A function to capture errors that occurred during RPCs. */
  captureError?: (err: Error, errorContext: { url?: string }) => void;
}

export function registerRpcRoutes<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition
>(
  serviceDefinition: serviceDefinition,
  serviceHandler: ModuleRpcServer.ServiceHandlerFor<serviceDefinition>,
  options?: RpcServerOptions,
): Router;
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
): Router;
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
  const serverContextConnector =
    options.serverContextConnector ||
    new ModuleRpcContextServer.EmptyServerContextConnector();
  return registerGrpcWebRoutes(
    serviceDefinition,
    serviceHandler,
    serverContextConnector,
    {
      router: options.router,
      reportError: options.captureError,
    },
  );
}
