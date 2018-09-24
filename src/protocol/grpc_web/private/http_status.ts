/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as _ from 'lodash';
import * as ModuleRpcCommon from '../../../common/rpc_common';

/** Exhaustively associate error types to HTTP status codes. */
export const errorTypesToHttpStatuses: {
  [errorType in ModuleRpcCommon.RpcErrorType]: number
} = {
  [ModuleRpcCommon.RpcErrorType.unknown]: 500, // Internal Server Error
  [ModuleRpcCommon.RpcErrorType.canceled]: 500, // Internal Server Error
  [ModuleRpcCommon.RpcErrorType.invalidArgument]: 400, // Bad Request
  [ModuleRpcCommon.RpcErrorType.notFound]: 404, // Not Found
  [ModuleRpcCommon.RpcErrorType.alreadyExists]: 409, // Conflict
  [ModuleRpcCommon.RpcErrorType.resourceExhausted]: 429, // Too Many Requests
  [ModuleRpcCommon.RpcErrorType.permissionDenied]: 403, // Forbidden
  [ModuleRpcCommon.RpcErrorType.failedPrecondition]: 400, // Bad Request
  [ModuleRpcCommon.RpcErrorType.internal]: 500, // Internal Server Error
  [ModuleRpcCommon.RpcErrorType.unavailable]: 503, // Service Unavailable
  [ModuleRpcCommon.RpcErrorType.unauthenticated]: 401, // Unauthorized
};

/**
 * Associate HTTP status codes to error types.  Status codes that could not be
 * associated end up as 'unknown' error type.
 */
export const httpStatusesToErrorTypes: {
  [status: number]: ModuleRpcCommon.RpcErrorType;
} = {
  // We use the exhaustive association `errorTypesToHttpStatuses` to build most of the map
  ..._.fromPairs(
    _.map(errorTypesToHttpStatuses, (status, errorType) => [status, errorType]),
  ),
  502 /* Bad Gateway */: ModuleRpcCommon.RpcErrorType.unavailable,
  504 /* Gateway Timeout */: ModuleRpcCommon.RpcErrorType.unavailable,
};
