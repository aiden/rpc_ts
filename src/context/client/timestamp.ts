/**
 * @module ModuleRpcContextClient
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcCommon } from '../../common';
import { ModuleRpcClient } from '../../client';
import { ModuleRpcContextCommon } from '../common';

export class TimestampClientContextConnector
  implements
    ModuleRpcClient.ClientContextConnector<
      ModuleRpcContextCommon.TimestampResponseContext
    > {
  async provideRequestContext(): Promise<ModuleRpcCommon.EncodedContext> {
    return {};
  }

  async decodeResponseContext(
    encodedResponseContext: ModuleRpcCommon.EncodedContext,
  ): Promise<ModuleRpcContextCommon.TimestampResponseContext> {
    const date =
      encodedResponseContext[
        ModuleRpcContextCommon.timestampContextKeys.serverTimestamp
      ];
    if (!date) {
      throw new ModuleRpcClient.ResponseContextDecodingError(
        `${
          ModuleRpcContextCommon.timestampContextKeys.serverTimestamp
        } context key is required`,
      );
    }
    return {
      date,
    };
  }
}
