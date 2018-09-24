/**
 * @module
 *
 * Simple exponential backoff strategy.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export type BackoffOptions = {
  exponentialBackoffBase: number;
  constantBackoffMs: number;
  maxBackoffMs: number;
  maxRetries: number;
};

export const DEFAULT_BACKOFF_OPTIONS: BackoffOptions = {
  exponentialBackoffBase: 2,
  constantBackoffMs: 500,
  maxBackoffMs: 5000,
  maxRetries: -1,
};

export function getBackoffMs(options: BackoffOptions, retries: number) {
  let backoffMs =
    Math.pow(options.exponentialBackoffBase, retries) *
    options.constantBackoffMs;
  if (options.maxBackoffMs > 0 && backoffMs < options.maxBackoffMs) {
    backoffMs = options.maxBackoffMs;
  }
  return backoffMs;
}
