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

/**
 * Maps the connector names to their server context connectors.
 */
export type CompositeServerContextConnectorsFor<
  RequestContext extends ModuleRpcContextCommon.CompositeContext
> = {
  [connectorName in keyof RequestContext]: ModuleRpcServer.ServerContextConnector<
    RequestContext[connectorName]
  >;
};

export class CompositeServerContextConnector<
  RequestContext extends ModuleRpcContextCommon.CompositeContext
> implements ModuleRpcServer.ServerContextConnector<RequestContext> {
  constructor(
    private readonly contextConnectors: CompositeServerContextConnectorsFor<
      RequestContext
    >,
  ) {}

  async decodeRequestContext(
    encodedRequestContext: ModuleRpcCommon.EncodedContext,
  ) {
    const requestContext: RequestContext = {} as any;
    for (const connectorName in this.contextConnectors) {
      requestContext[connectorName] = await this.contextConnectors[
        connectorName
      ].decodeRequestContext(encodedRequestContext);
    }
    return requestContext;
  }

  async provideResponseContext() {
    let encodedResponseContext: ModuleRpcCommon.EncodedContext = {};
    for (const connectorName in this.contextConnectors) {
      encodedResponseContext = {
        ...encodedResponseContext,
        ...(await this.contextConnectors[
          connectorName
        ].provideResponseContext()),
      };
    }
    return encodedResponseContext;
  }
}
