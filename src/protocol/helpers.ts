/**
 * @module
 *
 * Various helper functions common to all the protocols.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as TypeUtils from '../utils/type_utils';
import * as ModuleRpcCommon from '../common/rpc_common';
import * as ModuleRpcServer from '../server/rpc_server';

/** Whether a service method is unary. */
export function isUnaryMethod(
  methodDefinition: TypeUtils.ValueOf<ModuleRpcCommon.ServiceDefinition>,
  _methodHandler: any,
): _methodHandler is ModuleRpcServer.UnaryMethodHandler<any, any, any> {
  return !methodDefinition.type;
}

/** Whether a service method is a server stream. */
export function isServerStreamMethod(
  methodDefinition: TypeUtils.ValueOf<ModuleRpcCommon.ServiceDefinition>,
  _methodHandler: any,
): _methodHandler is ModuleRpcServer.ServerStreamMethodHandler<any, any, any> {
  return (
    methodDefinition.type === ModuleRpcCommon.ServiceMethodType.serverStream
  );
}
