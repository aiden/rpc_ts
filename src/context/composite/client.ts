/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as ModuleRpcCommon from '../../common/rpc_common';
import * as ModuleRpcClient from '../../client/rpc_client';
import { CompositeContext } from './common';

export type CompositeServerContextConnectorsFor<
  ResponseContext extends CompositeContext
> = {
  [connectorName in keyof ResponseContext]: ModuleRpcClient.ClientContextConnector<
    ResponseContext[connectorName]
  >
};

export class CompositeClientContextConnector<
  CompositeResponseContext extends CompositeContext
> implements ModuleRpcClient.ClientContextConnector<CompositeResponseContext> {
  constructor(
    private readonly serverContextConnectors: CompositeServerContextConnectorsFor<
      CompositeResponseContext
    >,
  ) {}

  async provideRequestContext() {
    let encodedRequestContext: ModuleRpcCommon.EncodedContext = {};
    for (const connectorName in this.serverContextConnectors) {
      encodedRequestContext = {
        ...encodedRequestContext,
        ...(await this.serverContextConnectors[
          connectorName
        ].provideRequestContext()),
      };
    }
    return encodedRequestContext;
  }

  async decodeResponseContext(
    encodedResponseContext: ModuleRpcCommon.EncodedContext,
  ) {
    const responseContext: CompositeResponseContext = {} as any;
    for (const connectorName in this.serverContextConnectors) {
      responseContext[connectorName] = await this.serverContextConnectors[
        connectorName
      ].decodeResponseContext(encodedResponseContext);
    }
    return responseContext;
  }
}
