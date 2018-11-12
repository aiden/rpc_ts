/**
 * @module ModuleRpcContextCommon
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * The request context containing a number of claims ("the user ID is...",
 * "the user is logged in as an admin", "the user uses the English locale", ...).
 * The claims are obtained from the token contained in the 'authorization' header.
 */
export interface TokenAuthRequestContext<AuthClaims> {
  authClaims: AuthClaims;
}

export interface TokenAuthResponseContext {}

/** Keys used to encode the contexts. */
export const tokenAuthContextKeys = {
  authorization: 'authorization',
};

/** A generic token info that adds context to a bearer token. */
export interface TokenInfo {
  /** The bearer token. */
  token: string;

  /** The expiry date of the bearer token (RFC3339-formatted). */
  expiryDate: string;

  /** The refresh token.  This refresh token can be used to obtain a new bearer token. */
  refreshToken: string;
}
