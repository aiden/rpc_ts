/**
 * @module ModuleRpcContextClient
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcContextCommon } from '../common';
import { ModuleRpcClient } from '../../client';
import { ModuleRpcCommon } from '../../common';

export class EmptyClientContextConnector
  implements
    ModuleRpcClient.ClientContextConnector<
      ModuleRpcContextCommon.EmptyResponseContext
    > {
  async provideRequestContext(): Promise<ModuleRpcCommon.EncodedContext> {
    return {};
  }

  async decodeResponseContext(
    _encodedResponseContext: ModuleRpcCommon.EncodedContext,
  ): Promise<ModuleRpcContextCommon.EmptyResponseContext> {
    return {};
  }
}
