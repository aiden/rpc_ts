/**
 * gRPC-related definitions.
 *
 * @module
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as _ from 'lodash';
import * as express from 'express';
import { grpc } from '@improbable-eng/grpc-web';
import { decodeHeaderValue, encodeHeaderValue } from './headers';
import { ModuleRpcCommon } from '../../../common';
import { ModuleRpcServer } from '../../../server';
import { errorTypesToHttpStatuses } from './http_status';
import { HttpStatus } from '../../private/http_status';

/**
 * The error message is optional and usually absent for security reasons,
 * unless explicitly added back.
 */
export type GrpcWebError = {
  errorType: ModuleRpcCommon.RpcErrorType;
  message?: string;
};

/**
 * List of the HTTP headers that gRPC-Web uses.
 */
export const grpcHeaders = {
  status: 'grpc-status',
  message: 'grpc-message',
};

/**
 * List of gRPC error codes. This is simply the list of gRPC status code without
 * status OK (0).  The numeric values are set by the gRPC specification.
 */
export const enum GrpcErrorCode {
  Canceled = 1,
  Unknown = 2,
  InvalidArgument = 3,
  DeadlineExceeded = 4,
  NotFound = 5,
  AlreadyExists = 6,
  PermissionDenied = 7,
  ResourceExhausted = 8,
  FailedPrecondition = 9,
  Aborted = 10,
  OutOfRange = 11,
  Unimplemented = 12,
  Internal = 13,
  Unavailable = 14,
  DataLoss = 15,
  Unauthenticated = 16,
}

/** Conversion table from error types to gRPC statuses. */
export const errorTypesToGrpcStatuses: {
  [errorType in ModuleRpcCommon.RpcErrorType]: GrpcErrorCode;
} = {
  [ModuleRpcCommon.RpcErrorType.canceled]: GrpcErrorCode.Canceled,
  [ModuleRpcCommon.RpcErrorType.unknown]: GrpcErrorCode.Unknown,
  [ModuleRpcCommon.RpcErrorType.invalidArgument]: GrpcErrorCode.InvalidArgument,
  [ModuleRpcCommon.RpcErrorType.notFound]: GrpcErrorCode.NotFound,
  [ModuleRpcCommon.RpcErrorType.alreadyExists]: GrpcErrorCode.AlreadyExists,
  [ModuleRpcCommon.RpcErrorType.permissionDenied]:
    GrpcErrorCode.PermissionDenied,
  [ModuleRpcCommon.RpcErrorType.resourceExhausted]:
    GrpcErrorCode.ResourceExhausted,
  [ModuleRpcCommon.RpcErrorType.failedPrecondition]:
    GrpcErrorCode.FailedPrecondition,
  [ModuleRpcCommon.RpcErrorType.unimplemented]: GrpcErrorCode.Unimplemented,
  [ModuleRpcCommon.RpcErrorType.internal]: GrpcErrorCode.Internal,
  [ModuleRpcCommon.RpcErrorType.unavailable]: GrpcErrorCode.Unavailable,
  [ModuleRpcCommon.RpcErrorType.unauthenticated]: GrpcErrorCode.Unauthenticated,
};

/** Conversion table from gRPC statuses to error types. */
export const grpcStatusesToErrorTypes = _.fromPairs(
  _.map(errorTypesToGrpcStatuses, (status, errorType) => [status, errorType]),
) as { [errorCode: number]: ModuleRpcCommon.RpcErrorType };

/** Get the error, or null in case the RPC succeeded, for the RPC call metadata. */
export function getGrpcWebErrorFromMetadata(
  metadata: grpc.Metadata,
): GrpcWebError | null {
  const grpcStatus = getStatusFromMetadata(metadata);
  if (grpcStatus === 0 || grpcStatus === null) {
    // OK or not specified
    return null;
  }
  const grpcMessage = metadata.get(grpcHeaders.message);
  return {
    errorType:
      grpcStatusesToErrorTypes[grpcStatus] ||
      ModuleRpcCommon.RpcErrorType.unknown,
    message: grpcMessage ? grpcMessage.map(decodeHeaderValue).join(',') : '',
  };
}

/** Get a GrpcWebError and an HTTP status from an Error */
export function getGrpcWebErrorFromError(
  err: Error,
): { status: number; grpcWebError: GrpcWebError } {
  // We give the `SeverRpcError` a special treatment that gives more info to
  // the client.  For other kinds of errors, a '500 Internal Server Error' HTTP
  // status is sent back.
  let status: number;
  let grpcWebError: GrpcWebError;
  if (err instanceof ModuleRpcServer.ServerRpcError) {
    grpcWebError = { errorType: err.errorType };
    // We do not transmit the `err.message` because it is a security issue,
    // only the `err.unsafeTransmittedMessage` (which should have been sanitized).
    if (err.unsafeTransmittedMessage) {
      grpcWebError.message = err.unsafeTransmittedMessage;
    }
    status =
      errorTypesToHttpStatuses[err.errorType] ||
      /* istanbul ignore next */ HttpStatus.internalServerError;
  } else {
    status = HttpStatus.internalServerError;
    grpcWebError = {
      errorType: ModuleRpcCommon.RpcErrorType.internal,
    };
  }
  return { status, grpcWebError };
}

/** Get the metadata from a GrpcWebError */
export function getMetadataFromGrpcWebError(
  error: GrpcWebError,
): grpc.Metadata {
  const map = new Map<string, string>();
  map.set(
    grpcHeaders.status,
    (
      errorTypesToGrpcStatuses[error.errorType] ||
      /* istanbul ignore next */ GrpcErrorCode.Unknown
    ).toString(),
  );
  if (error.message) {
    map.set(grpcHeaders.message, encodeHeaderValue(error.message));
  }
  return new grpc.Metadata(map);
}

/**
 * Send an HTTP error response.
 *
 * This fails if the HTTP headers have already been sent (e.g., when an error occurs
 * in the middle of sending the HTTP body).
 */
export function sendHttpErrorResponse(
  status: number,
  errorMetadata: grpc.Metadata,
  resp: express.Response,
) {
  resp.status(status);
  errorMetadata.forEach((name, value) => {
    resp.setHeader(name, value);
  });
  resp.end();
}

function getStatusFromMetadata(headers: grpc.Metadata): number | null {
  const fromHeaders = headers.get(grpcHeaders.status);
  if (fromHeaders.length > 0) {
    try {
      const asString = fromHeaders[0];
      return parseInt(asString, 10);
    } catch (e) {
      return null;
    }
  }
  return null;
}
