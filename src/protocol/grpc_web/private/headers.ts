/**
 * Manipulations on HTTP headers.
 *
 * @module
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function encodeHeaderValue(value: string): string {
  return encodeURIComponent(value);
}

export function decodeHeaderValue(encodedValue: string): string {
  return decodeURIComponent(encodedValue);
}
