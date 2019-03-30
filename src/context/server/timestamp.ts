/**
 * @module ModuleRpcContextServer
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcCommon } from '../../common';
import { ModuleRpcServer } from '../../server';
import * as moment from 'moment';
import { ModuleRpcContextCommon } from '../common';

export class TimestampServerContextConnector
  implements
    ModuleRpcServer.ServerContextConnector<
      ModuleRpcContextCommon.TimestampRequestContext
    > {
  async decodeRequestContext(
    _encodedRequestContext: ModuleRpcCommon.EncodedContext,
  ): Promise<ModuleRpcContextCommon.TimestampRequestContext> {
    return {};
  }

  async provideResponseContext(): Promise<ModuleRpcCommon.EncodedContext> {
    // TODO: probably better to get the time from MySQL
    // (e.g. `SELECT UTC_TIMESTAMP() FROM DUAL;`).
    return {
      [ModuleRpcContextCommon.timestampContextKeys
        .serverTimestamp]: moment.utc().format(),
    };
  }
}
