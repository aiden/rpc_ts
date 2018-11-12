/**
 * @module ModuleRpcContextServer
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcCommon } from '../../common';
import { ModuleRpcServer } from '../../server';
import {
  TokenAuthRequestContext,
  tokenAuthContextKeys,
} from '../common/token_auth';
import { TokenValidationError, AuthClaimsHandler } from './token_auth_handler';

export class TokenAuthServerContextConnector<AuthClaims>
  implements
    ModuleRpcServer.ServerContextConnector<
      TokenAuthRequestContext<AuthClaims>
    > {
  constructor(
    private readonly authClaimsHandler: AuthClaimsHandler<AuthClaims>,
  ) {}

  async decodeRequestContext(
    encodedRequestContext: ModuleRpcCommon.EncodedContext,
  ): Promise<TokenAuthRequestContext<AuthClaims>> {
    const auth = encodedRequestContext[tokenAuthContextKeys.authorization];
    if (!auth) {
      throw new ModuleRpcServer.ServerRpcError(
        ModuleRpcCommon.RpcErrorType.unauthenticated,
        'missing auth context entry',
      );
    }
    if (!auth.startsWith('Bearer ')) {
      throw new ModuleRpcServer.ServerRpcError(
        ModuleRpcCommon.RpcErrorType.unauthenticated,
        'Authorization header is not a bearer token',
      );
    }
    const token = auth.replace(/^Bearer\s+/, '');
    try {
      return { authClaims: await this.authClaimsHandler(token) };
    } catch (err) {
      if (err instanceof TokenValidationError) {
        throw new ModuleRpcServer.ServerRpcError(
          ModuleRpcCommon.RpcErrorType.unauthenticated,
          `error during auth token validation: ${err.stack}`,
        );
      }
      throw err;
    }
  }

  async provideResponseContext(): Promise<ModuleRpcCommon.EncodedContext> {
    return {};
  }
}
