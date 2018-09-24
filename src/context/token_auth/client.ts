/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcCommon, ModuleRpcClient } from '../..';
import {
  TokenAuthResponseContext,
  tokenAuthContextKeys,
  TokenInfo,
} from './common';
import * as moment from 'moment';

export type RefreshTokenHandler = (refreshToken: string) => Promise<TokenInfo>;

/**
 * Provide a client context connector that adds an 'authorization' header.
 *
 * The bearer token to put can be given and refreshed through the `authenticate` method
 * (when initialized, the `TokenAuthClientContextConnector` operates without any token
 * and so no 'authorization' header is added).  Additionally, it is possible to specify
 * an optional `refreshTokenHandler` that is automatically called `expiryDateOffsetMs`
 * milliseconds before the current token expires.
 */
export class TokenAuthClientContextConnector
  implements ModuleRpcClient.ClientContextConnector<TokenAuthResponseContext> {
  private tokenInfo: TokenInfo;

  constructor(
    private readonly refreshTokenHandler: RefreshTokenHandler = null,
    private readonly expiryDateOffsetMs: number = 0,
  ) {}

  authenticate(tokenInfo: TokenInfo) {
    this.tokenInfo = tokenInfo;
  }

  async provideRequestContext(): Promise<ModuleRpcCommon.EncodedContext> {
    if (!this.tokenInfo) {
      return {};
    }
    if (
      this.tokenInfo.expiryDate &&
      moment().isAfter(
        moment(this.tokenInfo.expiryDate).subtract(
          this.expiryDateOffsetMs,
          'ms',
        ),
      )
    ) {
      if (!this.refreshTokenHandler || !this.tokenInfo.refreshToken) {
        return {};
      }
      this.tokenInfo = await this.refreshTokenHandler(
        this.tokenInfo.refreshToken,
      );
    }
    return {
      [tokenAuthContextKeys.authorization]: `Bearer ${this.tokenInfo.token}`,
    };
  }

  async decodeResponseContext(
    _encodedResponseContext: ModuleRpcCommon.EncodedContext,
  ): Promise<TokenAuthResponseContext> {
    return {};
  }
}
