/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * HTTP statuses.
 */
export const enum HttpStatus {
  internalServerError = 500,
  badRequest = 400,
  notFound = 404,
  conflict = 409,
  tooManyRequests = 429,
  forbidden = 403,
  notImplemented = 501,
  serviceUnavailable = 503,
  unauthorized = 401,
  methodNotAllowed = 405,
  notAcceptable = 406,
}
