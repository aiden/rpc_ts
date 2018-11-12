/**
 * @module ModuleRpcContextClient
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcCommon } from '../../common';
import { ModuleRpcClient } from '../../client';
import * as moment from 'moment';
import { ModuleRpcContextCommon } from '../common';

/**
 * Takes a refresh token and returns a brand new token info.
 */
export type RefreshTokenHandler = (
  refreshToken: string,
) => Promise<ModuleRpcContextCommon.TokenInfo>;

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
  implements
    ModuleRpcClient.ClientContextConnector<
      ModuleRpcContextCommon.TokenAuthResponseContext
    > {
  private tokenInfo: ModuleRpcContextCommon.TokenInfo;
  private timeout: NodeJS.Timer;

  /* tslint:disable: unified-signatures */
  /**
   * Constructs a token auth client context connector.
   * The initial token must be provided with [[TokenAuthClientContextConnector.authenticate]].
   */
  constructor();
  /**
   * Constructs a token auth client context connector with a
   * handler that will be called to refresh the token when it expires.
   * The initial token must be provided with [[TokenAuthClientContextConnector.authenticate]].
   *
   * @param refreshTokenHandler Given the refresh token of the current token info,
   * returns a new token info in order to extend the life time of the authentication.
   * @param expiryDateOffsetMs The refresh token handler will be called `expiryDateOffsetMs`
   * milliseconds before the token expires.
   * @param reportRefreshError Reports an error that occurred during the refresh (with
   * auto refresh on, the refreshing occurred within a `setTimeout` and so in a different
   * execution context).
   */
  constructor(
    refreshTokenHandler: RefreshTokenHandler,
    expiryDateOffsetMs?: number,
    reportRefreshError?: (err: Error) => void,
  );
  constructor(
    private readonly refreshTokenHandler:
      | RefreshTokenHandler
      | undefined = undefined,
    private readonly expiryDateOffsetMs: number = 10000,
    private readonly reportRefreshError: (err: Error) => void = console.error,
  ) {}
  /* tslint:enable: unified-signatures */

  /**
   * Provides an initial token info.
   *
   * This function also sets up a `setInterval` to refresh the token periodically,
   * unless `autoRefresh` is set to `false`.
   */
  authenticate(
    tokenInfo: ModuleRpcContextCommon.TokenInfo,
    autoRefresh: boolean = true,
  ) {
    this.tokenInfo = tokenInfo;

    this.clearAutoRefresh();
    if (autoRefresh) {
      const setRefreshTimeout = () => {
        if (!this.tokenInfo.expiryDate) {
          return;
        }

        const duration = moment().diff(
          moment(this.tokenInfo.expiryDate).subtract(
            this.expiryDateOffsetMs,
            'ms',
          ),
        );
        this.timeout = setTimeout(async () => {
          try {
            await this.refreshToken();
            setRefreshTimeout();
          } catch (err) {
            this.reportRefreshError(err);
          }
        }, duration);
      };

      setRefreshTimeout();
    }
  }

  /**
   * Clear the auto refresh.
   *
   * If the function is not called when one is finished with the connector,
   * the auto refresh keeps happening in the background.
   */
  clearAutoRefresh() {
    clearTimeout(this.timeout);
  }

  /**
   * Forces a token refresh.  This function does nothing if no refresh handler or
   * no refresh token was specified.
   */
  async forceRefreshToken() {
    if (!this.refreshTokenHandler || !this.tokenInfo.refreshToken) {
      return;
    }
    if (!this.timeout) {
      this.refreshToken();
    } else {
      this.authenticate(
        await this.refreshTokenHandler(this.tokenInfo.refreshToken),
      );
    }
  }

  private async refreshToken() {
    if (!this.refreshTokenHandler || !this.tokenInfo.refreshToken) {
      return;
    }
    this.tokenInfo = await this.refreshTokenHandler(
      this.tokenInfo.refreshToken,
    );
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
      [ModuleRpcContextCommon.tokenAuthContextKeys.authorization]: `Bearer ${
        this.tokenInfo.token
      }`,
    };
  }

  async decodeResponseContext(
    _encodedResponseContext: ModuleRpcCommon.EncodedContext,
  ): Promise<ModuleRpcContextCommon.TokenAuthResponseContext> {
    return {};
  }
}
