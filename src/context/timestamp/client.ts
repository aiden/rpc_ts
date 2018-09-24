/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcCommon, ModuleRpcClient } from '../..';
import { TimestampResponseContext, timestampContextKeys } from './common';

export class TimestampClientContextConnector
  implements ModuleRpcClient.ClientContextConnector<TimestampResponseContext> {
  async provideRequestContext(): Promise<ModuleRpcCommon.EncodedContext> {
    return {};
  }

  async decodeResponseContext(
    encodedResponseContext: ModuleRpcCommon.EncodedContext,
  ): Promise<TimestampResponseContext> {
    const date = encodedResponseContext[timestampContextKeys.serverTimestamp];
    if (!date) {
      throw new ModuleRpcClient.ResponseContextDecodingError(
        `${timestampContextKeys.serverTimestamp} context key is required`,
      );
    }
    return {
      date,
    };
  }
}
