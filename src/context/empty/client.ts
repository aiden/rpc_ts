/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as ModuleRpcCommon from '../../common/rpc_common';
import * as ModuleRpcClient from '../../client/rpc_client';
import { EmptyResponseContext } from './common';

export class EmptyClientContextConnector
  implements ModuleRpcClient.ClientContextConnector<EmptyResponseContext> {
  async provideRequestContext(): Promise<ModuleRpcCommon.EncodedContext> {
    return {};
  }

  async decodeResponseContext(
    _encodedResponseContext: ModuleRpcCommon.EncodedContext,
  ): Promise<EmptyResponseContext> {
    return {};
  }
}
