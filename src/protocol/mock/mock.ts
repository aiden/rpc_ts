/**
 * @module ModuleRpcProtocolMock
 * @preferred
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** */
import { ModuleRpcClient } from '../../client';
import { ModuleRpcCommon } from '../../common';

/**
 * Mocks an RPC client, calling a stream producer that can be used to mock
 * server responses.
 *
 * @example ```Typescript
 * const serviceDefinition = {
 *   foo: { request: {}, response: {} as { bar: number } },
 * };
 * const client = getMockRpcClient(serviceDefinition, (method, request) => {
 *   console.log(
 *     'RPC:',
 *     method,
 *     request instanceof Function ? request() : request,
 *   );
 *   return ModuleRpcClient.streamFromArray([
 *     { response: { bar: 1 } },
 *   ]) as ModuleRpcClient.Stream<any>;
 * });
 * const { bar } = await client.nice().foo({});
 * expect(bar).to.equal(1);
 * ```
 */
export function getMockRpcClient<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  ResponseContext
>(
  serviceDefinition: serviceDefinition,
  streamProducer: ModuleRpcClient.StreamProducer,
): ModuleRpcClient.Service<serviceDefinition, ResponseContext> {
  return new ModuleRpcClient.Service<serviceDefinition, ResponseContext>(
    serviceDefinition,
    streamProducer,
  );
}
