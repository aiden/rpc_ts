/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as ModuleRpcCommon from '../common/rpc_common';
import * as ModuleRpcClient from '../client/rpc_client';
import { getGrpcWebClient } from './grpc_web/client';
import { EmptyClientContextConnector } from '../context/empty/client';
import * as TypeUtils from '../utils/type_utils';

export type RpcClientOptions = {
  /** The remote address to connect to (example: https://test.com:8000). */
  remoteAddress: string;

  /** Transport protocol to use.  Defaults to grpcWebJson. */
  protocol?: ModuleRpcCommon.Protocol;
};

export function getRpcClient<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition
>(serviceDefinition: serviceDefinition, options: RpcClientOptions);
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
);
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
): ModuleRpcClient.Service<serviceDefinition, ResponseContext> {
  const protocol = options.protocol || ModuleRpcCommon.Protocol.grpcWebJson;
  const clientContextConnector =
    options.clientContextConnector || new EmptyClientContextConnector();
  switch (protocol) {
    case ModuleRpcCommon.Protocol.grpcWebJson:
      return getGrpcWebClient(serviceDefinition, clientContextConnector, {
        remoteAddress: options.remoteAddress,
      }) as ModuleRpcClient.Service<serviceDefinition, ResponseContext>;

    default:
      TypeUtils.assertUnreachable(protocol, true);
  }
}
