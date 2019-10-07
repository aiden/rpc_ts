/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as _ from 'lodash';
import { HttpStatus } from '../../private/http_status';
import { ModuleRpcCommon } from '../../../common';

/** Exhaustively associate error types to HTTP status codes. */
export const errorTypesToHttpStatuses: {
  [errorType in ModuleRpcCommon.RpcErrorType]: number;
} = {
  [ModuleRpcCommon.RpcErrorType.unknown]: HttpStatus.internalServerError,
  [ModuleRpcCommon.RpcErrorType.canceled]: HttpStatus.internalServerError,
  [ModuleRpcCommon.RpcErrorType.invalidArgument]: HttpStatus.badRequest,
  [ModuleRpcCommon.RpcErrorType.notFound]: HttpStatus.notFound,
  [ModuleRpcCommon.RpcErrorType.alreadyExists]: HttpStatus.conflict,
  [ModuleRpcCommon.RpcErrorType.resourceExhausted]: HttpStatus.tooManyRequests,
  [ModuleRpcCommon.RpcErrorType.permissionDenied]: HttpStatus.forbidden,
  [ModuleRpcCommon.RpcErrorType.failedPrecondition]: HttpStatus.badRequest,
  [ModuleRpcCommon.RpcErrorType.unimplemented]: HttpStatus.notImplemented,
  [ModuleRpcCommon.RpcErrorType.internal]: HttpStatus.internalServerError,
  [ModuleRpcCommon.RpcErrorType.unavailable]: HttpStatus.serviceUnavailable,
  [ModuleRpcCommon.RpcErrorType.unauthenticated]: HttpStatus.unauthorized,
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
  413 /* Request Entity Too Large */: ModuleRpcCommon.RpcErrorType
    .invalidArgument,
  502 /* Bad Gateway */: ModuleRpcCommon.RpcErrorType.unavailable,
  504 /* Gateway Timeout */: ModuleRpcCommon.RpcErrorType.unavailable,
};

/**
 * Associate HTTP status codes to generic error message.  Status codes
 * that could not be associated end up giving a generic
 * 'non-200 status code'.
 */
export const httpStatusesToClientErrorMessages: {
  [status: number]: string;
} = {
  413 /* Request Entity Too Large */: 'Request Too Large',
};
