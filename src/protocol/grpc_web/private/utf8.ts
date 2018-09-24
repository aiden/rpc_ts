/**
 * This module bridges the nodejs and browser environments concerning UTF-8 encoding.
 *
 * @see https://github.com/nodejs/node/issues/20365
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as Utils from '../../../utils/utils';
import 'fast-text-encoding'; // text-encoding polyfill

const textEncoder = new (Utils.isRunUnderNode()
  ? require('util').TextEncoder
  : TextEncoder)();
const textDecoder = new (Utils.isRunUnderNode()
  ? require('util').TextDecoder
  : TextDecoder)('utf-8');

/**
 * Encode a string to UTF-8 bytes.
 */
export function encodeUtf8(str: string): Uint8Array {
  return textEncoder.encode(str);
}

/**
 * Decode an array of UTF-8 bytes to a string.
 */
export function decodeUtf8(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}
