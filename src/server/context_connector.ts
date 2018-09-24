/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as ModuleRpcCommon from '../common/rpc_common';

/**
 * A context connector for the server.
 */
export interface ServerContextConnector<RequestContext> {
  /**
   * Decode the request context received from the client into a `RequestContext`.
   */
  decodeRequestContext(
    encodedRequestContext: ModuleRpcCommon.EncodedContext,
  ): Promise<RequestContext>;

  /**
   * Encode the response context that is sent to the client
   * (the client decodes it into a `ResponseContext` using a `ClientContextConnector`).
   *
   * @param err Set if the RPC errored.  This can be used to modulate what you put
   *            in the response context in case of failure.
   */
  provideResponseContext(err?: Error): Promise<ModuleRpcCommon.EncodedContext>;
}
