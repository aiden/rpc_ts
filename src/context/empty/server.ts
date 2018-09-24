/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as ModuleRpcCommon from '../../common/rpc_common';
import * as ModuleRpcServer from '../../server/rpc_server';
import { EmptyRequestContext } from './common';

export class EmptyServerContextConnector
  implements ModuleRpcServer.ServerContextConnector<EmptyRequestContext> {
  constructor() {}

  async decodeRequestContext(
    _encodedRequestContext: ModuleRpcCommon.EncodedContext,
  ): Promise<EmptyRequestContext> {
    return {};
  }

  async provideResponseContext(): Promise<ModuleRpcCommon.EncodedContext> {
    return {};
  }
}
