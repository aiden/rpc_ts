/**
 * @module ModuleRpcContextServer
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { BaseError } from 'make-error';

/**
 * Obtains a number of authentication claims
 * ("the user ID is...", "the user is logged in as an admin", "the user uses
 * the English locale", ...) from an access token.
 *
 * @throws `TokenValidationError` in case the token is not valid.
 */
export type AuthClaimsHandler<AuthClaims> = (
  token: string,
) => Promise<AuthClaims>;

/** There was an error during token validation. */
export class TokenValidationError extends BaseError {}
