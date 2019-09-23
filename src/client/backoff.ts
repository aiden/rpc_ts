/**
 * Simple exponential backoff strategy.
 *
 * @module ModuleRpcClient
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** Options for an exponential backoff. */
export interface BackoffOptions {
  exponentialBackoffBase: number;
  constantBackoffMs: number;
  maxBackoffMs: number;
  maxRetries: number;
  statusCodesToIgnore: number[];
}

/** Default options for an exponential backoff. */
export const DEFAULT_BACKOFF_OPTIONS: BackoffOptions = {
  exponentialBackoffBase: 2,
  constantBackoffMs: 500,
  maxBackoffMs: 3000,
  maxRetries: -1,
  statusCodesToIgnore: [],
};

/**
 * Gets the number of milliseconds to elapse for a given number of retries
 * and a backoff schedule.
 */
export function getBackoffMs(options: BackoffOptions, retries: number) {
  let backoffMs =
    Math.pow(options.exponentialBackoffBase, retries) *
    options.constantBackoffMs;
  if (options.maxBackoffMs > 0 && backoffMs > options.maxBackoffMs) {
    backoffMs = options.maxBackoffMs;
  }
  return backoffMs;
}
