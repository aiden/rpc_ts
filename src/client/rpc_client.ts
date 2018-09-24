/**
 * @module ModuleRpcClient
 *
 * The client side of an RPC service.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { ClientContextConnector } from './context_connector';
export * from './errors';
export { retryStream } from './stream_retrier';
export { Service, NiceService } from './service';
export {
  StreamProducer,
  Stream,
  transformStream,
  streamAsPromise,
} from './stream';
