/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as lodash from 'lodash';
import * as TypeUtils from './type_utils';
import { Omit } from 'type-zoo/types';

/**
 * _.omit with types
 */
export function omit<T extends object, K extends keyof T>(
  o: T,
  keys: K[],
): Omit<T, K> {
  return <any>lodash.omit(o, ...keys);
}

/**
 * _.mapValues with types
 */
export function mapValues<T extends object, V>(
  o: T,
  fn: (value: TypeUtils.ValueOf<T>, key: keyof T, o: T) => V,
): { [key in keyof T]: V } {
  return lodash.mapValues(o, fn);
}

/**
 * Like Object.keys() but with types.
 * Typescript is having a debate on this so we can just implement it ourselves:
 * https://github.com/Microsoft/TypeScript/pull/12253#issuecomment-263132208
 */
export function keys<T>(o: T) {
  /* tslint:disable:ban */
  return Object.keys(o) as (keyof T)[];
  /* tslint:enable:ban */
}

/**
 * Object.entries with types
 */
export function entries<T extends { [k: string]: any[] }>(
  o: T,
): [keyof T, T[keyof T][number][]][];
export function entries<T extends { [k: string]: any }>(
  o: T,
): [keyof T, T[keyof T]][];
export function entries<T>(o: T): [keyof T, T[keyof T]][] {
  /* tslint:disable:ban */
  return Object.entries(o) as any;
  /* tslint:enable:ban */
}

/**
 * Returns true if we are in a process run under nodejs. Useful to figure out
 * if a function is being called from the backend or the frontend.
 **/
export const isRunUnderNode = () =>
  // We need the any cast since TS sucks ;)
  typeof process !== 'undefined' &&
  (process as any).release &&
  (process as any).release.name === 'node';

export async function sleep(timeInMillis: number): Promise<void> {
  return new Promise<void>(y => setTimeout(y, timeInMillis));
}
