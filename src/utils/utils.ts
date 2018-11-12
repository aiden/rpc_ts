/**
 * @ignore
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as lodash from 'lodash';
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
 * Filter non null values from a map.
 */
export function filterNonNullValues<K extends string, V>(
  o: { [key in K]: V | null | undefined },
): { [key in K]: V } {
  return lodash.reduce(
    o,
    (acc, value, key) => (notNull(value) ? { ...acc, [key]: value } : acc),
    {} as any,
  );
}

/** Type assert that a value is not null */
export function notNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * _.mapValues with types
 */
export function mapValuesWithStringKeys<T extends object, V>(
  o: T,
  fn: (value: ValueOf<T>, key: Extract<keyof T, string>, o: T) => V,
): { [key in Extract<keyof T, string>]: V } {
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
export function isRunUnderNode() {
  /* tslint:disable strict-type-predicates */
  return (
    typeof process !== 'undefined' &&
    (process as any).release &&
    (process as any).release.name === 'node'
  );
  /* tslint:enable strict-type-predicates */
}

/**
 * Same as `sleep`, but with promises.
 */
export async function sleep(timeInMillis: number): Promise<void> {
  return new Promise<void>(y => setTimeout(y, timeInMillis));
}

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
