/**
 * This module provides a simplified interface for instantiating an RPC client.
 * Under the hood, it is a thin wrapper around [[ModuleRpcProtocolGrpcWebClient.getGrpcWebClient]],
 * and it provides a gRPC-Web transportation protocol with JSON encoding/decoding.  Other
 * protocols could be offered here in the future, and [[getRpcClient]] would be used
 * to easily choose between them.
 *
 * @see [[ModuleRpcProtocolServer]]
 *
 * @module ModuleRpcProtocolClient
 * @preferred
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** */
import { grpc } from '@improbable-eng/grpc-web';
import { ModuleRpcContextClient } from '../../context/client';
import { ModuleRpcProtocolGrpcWebClient } from '../grpc_web/client';
import { ModuleRpcCommon } from '../../common';
import { ModuleRpcClient } from '../../client';

export interface RpcClientOptions {
  /** The remote address to connect to (example: https://test.com:8000). */
  remoteAddress: string;

  /**
   * Optional transport mechanism override.  A `Transport` is a low-level implementation that can
   * talk to an HTTP server.  The actual transport depends on the runtime (NodeJS, a particular
   * browser), and if not specified `@improbable-eng/grpc-web` select the most appropriate one.
   *
   * @ignore
   */
  getGrpcWebTransport?: (
    options: grpc.TransportOptions,
  ) => grpc.Transport | Error;
}

export function getRpcClient<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition
>(
  serviceDefinition: serviceDefinition,
  options: RpcClientOptions,
): ModuleRpcClient.ServiceMethodMap<serviceDefinition, any>;
export function getRpcClient<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  ResponseContext
>(
  serviceDefinition: serviceDefinition,
  options: RpcClientOptions & {
    clientContextConnector: ModuleRpcClient.ClientContextConnector<
      ResponseContext
    >;
  },
): ModuleRpcClient.ServiceMethodMap<serviceDefinition, ResponseContext>;
export function getRpcClient<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  ResponseContext
>(
  serviceDefinition: serviceDefinition,
  options: RpcClientOptions & {
    clientContextConnector?: ModuleRpcClient.ClientContextConnector<
      ResponseContext
    >;
  },
): ModuleRpcClient.ServiceMethodMap<serviceDefinition, ResponseContext> {
  const clientContextConnector =
    options.clientContextConnector ||
    new ModuleRpcContextClient.EmptyClientContextConnector();
  return (ModuleRpcProtocolGrpcWebClient.getGrpcWebClient(
    serviceDefinition,
    clientContextConnector,
    {
      remoteAddress: options.remoteAddress,
      getTransport: options.getGrpcWebTransport,
    },
  ) as ModuleRpcClient.Service<serviceDefinition, ResponseContext>).methodMap();
}
