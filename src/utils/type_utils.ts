/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Opposite of keyof
 */
export type ValueOf<T> = T[keyof T];

/**
 * This function is used to make sure that types are exhaustive. Putting it at the end
 * of a switch statement will only throw if x has an assignable type.
 */
/* istanbul ignore next */
export function assertUnreachable(x: never, shouldThrow: boolean): never {
  const err = new Error(x);
  if (shouldThrow) {
    throw err;
  }
  return null as never;
}
