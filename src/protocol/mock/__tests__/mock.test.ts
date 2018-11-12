/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { getMockRpcClient } from '../mock';
import { ModuleRpcClient } from '../../../client';
import { expect } from 'chai';

describe('ts-rpc', () => {
  describe('protocol mock', () => {
    it('mocks a successful unary call', async () => {
      const serviceDefinition = {
        foo: { request: {}, response: {} as { bar: number } },
      };
      const client = getMockRpcClient(serviceDefinition, (method, request) => {
        console.log(
          'RPC:',
          method,
          request instanceof Function ? request() : request,
        );
        return ModuleRpcClient.streamFromArray([
          { response: { bar: 1 } },
        ]) as ModuleRpcClient.Stream<any>;
      });
      const { bar } = await client.nice().foo({});
      expect(bar).to.equal(1);
    });
  });
});
