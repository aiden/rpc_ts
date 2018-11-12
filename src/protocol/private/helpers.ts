/**
 * Various helper functions common to all the protocols.
 *
 * @module
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcUtils } from '../../utils';
import { ModuleRpcCommon } from '../../common';
import { ModuleRpcServer } from '../../server';

/** Whether a service method is unary. */
export function isUnaryMethod(
  methodDefinition: ModuleRpcUtils.ValueOf<ModuleRpcCommon.ServiceDefinition>,
  _methodHandler: any,
): _methodHandler is ModuleRpcServer.UnaryMethodHandler<any, any, any> {
  return !methodDefinition.type;
}

/** Whether a service method is a server stream. */
export function isServerStreamMethod(
  methodDefinition: ModuleRpcUtils.ValueOf<ModuleRpcCommon.ServiceDefinition>,
  _methodHandler: any,
): _methodHandler is ModuleRpcServer.ServerStreamMethodHandler<any, any, any> {
  return (
    methodDefinition.type === ModuleRpcCommon.ServiceMethodType.serverStream
  );
}
