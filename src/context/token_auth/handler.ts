/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * An `AuthClaimsHandler` function obtains a number of authentication claims
 * ("the user ID is...", "the user is logged in as an admin", "the user uses
 * the English locale", ...) from an access token.
 *
 * This function is expected to throw `TokenValidationError` in case the token
 * is somehow not valid.
 */
export type AuthClaimsHandler<AuthClaims> = (
  token: string,
) => Promise<AuthClaims>;

/** There was an error during token validation. */
export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}
