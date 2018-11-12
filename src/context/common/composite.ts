/**
 * @module ModuleRpcContextCommon
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** A composite context is a map of the connector names to their context. */
export interface CompositeContext {
  [connectorName: string]: any;
}
