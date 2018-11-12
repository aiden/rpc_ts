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

/**
 * Maps the connector names to their client context connectors.
 */
export type CompositeClientContextConnectorsFor<
  ResponseContext extends ModuleRpcContextCommon.CompositeContext
> = {
  [connectorName in keyof ResponseContext]: ModuleRpcClient.ClientContextConnector<
    ResponseContext[connectorName]
  >
};

export class CompositeClientContextConnector<
  CompositeResponseContext extends ModuleRpcContextCommon.CompositeContext
> implements ModuleRpcClient.ClientContextConnector<CompositeResponseContext> {
  constructor(
    private readonly clientContextConnectors: CompositeClientContextConnectorsFor<
      CompositeResponseContext
    >,
  ) {}

  async provideRequestContext() {
    let encodedRequestContext: ModuleRpcCommon.EncodedContext = {};
    for (const connectorName in this.clientContextConnectors) {
      encodedRequestContext = {
        ...encodedRequestContext,
        ...(await this.clientContextConnectors[
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
    for (const connectorName in this.clientContextConnectors) {
      responseContext[connectorName] = await this.clientContextConnectors[
        connectorName
      ].decodeResponseContext(encodedResponseContext);
    }
    return responseContext;
  }
}
