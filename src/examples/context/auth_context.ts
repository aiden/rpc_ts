/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcClient } from '../../client';
import { ModuleRpcCommon } from '../../common';
import { ModuleRpcServer } from '../../server';

/**
 * This is the type of the request context that results from context decoding by the client
 * context connector (used client-side).
 *
 * In this mock authentication connector, what is provided is the ID of the user
 * performing the request.
 */
export type AuthRequestContext = {
  userId: string;
};

/**
 * This is the type of the response context that results from context decoding by the server
 * context connector (used server-side).
 *
 * Here, the server sends an empty context to the client.
 */
export type AuthResponseContext = {};

/**
 * These are the context keys that the context connectors decode from.
 */
export const authContextKeys = {
  /** The key for the encoded context entry that stores the ID of the user making the request. */
  userId: 'x-user-id',
};

/**
 * This context connector is used client-side.
 */
export class AuthClientContextConnector
  implements ModuleRpcClient.ClientContextConnector<AuthResponseContext> {
  constructor(private readonly userId: string) {}

  /**
   * Encode the request context that is sent to the server
   * (the server decodes it into an `AuthRequestContext` using the `AuthServerContextConnector`)
   */
  async provideRequestContext(): Promise<ModuleRpcCommon.EncodedContext> {
    return {
      [authContextKeys.userId]: this.userId,
    };
  }

  /**
   * Decode the response context received from the server into an `AuthResponseContext`.
   */
  async decodeResponseContext(
    _encodedResponseContext: ModuleRpcCommon.EncodedContext,
  ): Promise<AuthResponseContext> {
    return {};
  }
}

/**
 * This context connector is used server-side.
 */
export class AuthServerContextConnector
  implements ModuleRpcServer.ServerContextConnector<AuthRequestContext> {
  constructor(private readonly expectedUserId: string) {}

  /**
   * Decode the encode request context sent by the client into an `AuthRequestContext`.
   */
  async decodeRequestContext(
    encodedRequestContext: ModuleRpcCommon.EncodedContext,
  ): Promise<AuthRequestContext> {
    const userId = encodedRequestContext[authContextKeys.userId];
    if (userId !== this.expectedUserId) {
      throw new ModuleRpcServer.ServerRpcError(
        ModuleRpcCommon.RpcErrorType.unauthenticated,
        'unexpected userId',
      );
    }
    return { userId };
  }

  /**
   * Encode the response context that is sent to the client (the client decodes it
   * into an `AuthResponseContext` using the `AuthClientContextConnector`).
   */
  async provideResponseContext(): Promise<ModuleRpcCommon.EncodedContext> {
    return {};
  }
}
