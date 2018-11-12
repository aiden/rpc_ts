/**
 * @module ModuleRpcClient
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { BaseError } from 'make-error';
import { ModuleRpcCommon } from '../common';

/** Base class for all client errors. */
export abstract class ClientError extends BaseError {}

/** An error ocurred when providing the request context. */
export class RequestContextError extends ClientError {}

/** An error occurred during the decoding of the response context. */
export class ResponseContextDecodingError extends ClientError {}

/** The server did not respect the transport protocol. */
export class ClientProtocolError extends ClientError {
  /**
   * @param url The URL (`<remote address>/<method name>`)
   * that did not respect the transport protocol.
   */
  constructor(readonly url: string, readonly message: string) {
    super(`${url}: ${message}`);
  }
}

/** There has been an error in the transport layer. */
export class ClientTransportError extends ClientError {
  /**
   * @param cause Cause of the transport error.
   */
  constructor(readonly cause: Error) {
    super(
      `Client transport error: ${cause.stack ||
        /* istanbul ignore next */ cause.message}`,
    );
  }
}

/**
 * A remote error intercepted by the RPC client.  Note that RPC handlers should
 * throw a different error ([[ModuleRpcServer.ServerRpcError]]).  We do this
 * to ensure that no RPC server mistakenly rethrow the RPC error of an upstream
 * service.
 */
export class ClientRpcError<ResponseContext = any> extends ClientError {
  /**
   * @param errorType Type of the RPC error.
   * @param msg Optional message describing the RPC error in more details.
   * @param context Response context given back by the RPC.
   */
  constructor(
    readonly errorType: ModuleRpcCommon.RpcErrorType,
    readonly msg?: string,
    readonly context?: ResponseContext,
  ) {
    super(
      msg
        ? `Error: ${ModuleRpcCommon.RpcErrorType[errorType]}: ${JSON.stringify(
            msg,
          )}`
        : ModuleRpcCommon.RpcErrorType[errorType],
    );
  }
}
