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
import { ModuleRpcContextCommon } from '../common';

export class EmptyServerContextConnector
  implements
    ModuleRpcServer.ServerContextConnector<
      ModuleRpcContextCommon.EmptyRequestContext
    > {
  constructor() {}

  async decodeRequestContext(
    _encodedRequestContext: ModuleRpcCommon.EncodedContext,
  ): Promise<ModuleRpcContextCommon.EmptyRequestContext> {
    return {};
  }

  async provideResponseContext(): Promise<ModuleRpcCommon.EncodedContext> {
    return {};
  }
}
