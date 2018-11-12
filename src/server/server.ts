/**
 * Generic tooling to implement the server side of an RPC service.  To create an RPC
 * server, however, see [[ModuleRpcProtocolServer.registerRpcRoutes]].
 *
 * @module ModuleRpcServer
 * @preferred
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** */
export * from './errors';
export { ServerContextConnector } from './context_connector';
export * from './handler';
