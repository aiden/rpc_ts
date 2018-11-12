/**
 * @module ModuleRpcContextCommon
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** The Timestamp request context. */
export interface TimestampRequestContext {}

/** The Timestamp response context. */
export interface TimestampResponseContext {
  /** RFC3339-formatted response date */
  date: string;
}

/** Keys used to encode the Timestamp contexts */
export const timestampContextKeys = {
  serverTimestamp: 'x-server-timestamp',
};
