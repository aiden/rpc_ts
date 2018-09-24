/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { sleep } from './utils';

describe('ts-grpc', () => {
  describe('utils', () => {
    it('sleep', async () => {
      await sleep(10);
    });
  });
});
