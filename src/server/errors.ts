/**
 * @module ModuleRpcServer
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcCommon } from '../common';
import { BaseError } from 'make-error';

/** Base class for all the server errors. */
export abstract class ServerError extends BaseError {}

/**
 * The handler did not respect the protocol.
 */
export class HandlerProtocolError extends ServerError {
  /**
   * @param url The URL (`<remote address>/<method name>`)
   * that did not respect the transport protocol.
   */
  constructor(readonly url: string, readonly message: string) {
    super(`${url}: ${message}`);
  }
}

/** There has been an error in the transport layer. */
export class ServerTransportError extends ServerError {
  constructor(readonly cause: Error) {
    super(`Server transport error: ${cause.stack}`);
  }
}

/**
 * An error sent by the RPC handler or the context provider.  Note that RPC clients
 * throw a different error ([[ModuleRpcClient.ClientRpcError]]).  We do this
 * to ensure that no RPC server mistakenly rethrow the RPC error of an upstream
 * service.
 */
export class ServerRpcError extends ServerError {
  constructor(
    public readonly errorType: ModuleRpcCommon.RpcErrorType,
    message?: string,
    public readonly unsafeTransmittedMessage?: string,
  ) {
    super(
      formatServerRpcErrorMessage(errorType, message, unsafeTransmittedMessage),
    );
  }
}

/** @visibleForTesting */
export function formatServerRpcErrorMessage(
  errorType: ModuleRpcCommon.RpcErrorType,
  message?: string,
  unsafeTransmittedMessage?: string,
): string {
  let output = `${errorType || '<unknown RPC error type>'}`;
  if (message) {
    output += `: ${message}`;
    if (unsafeTransmittedMessage) {
      output += `; transmitted to client: ${unsafeTransmittedMessage}`;
    }
  } else if (unsafeTransmittedMessage) {
    output += `: transmitted to client: ${unsafeTransmittedMessage}`;
  }
  return output;
}
