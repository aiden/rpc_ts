/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as child_process from 'child_process';
import * as path from 'path';

describe('ts-grpc', () => {
  describe('examples', () => {
    // Just invoke the examples

    for (const exampleName of ['context', 'server_stream']) {
      it(exampleName, async () => {
        return new Promise<void>((resolve, reject) => {
          child_process
            .spawn(
              'yarn',
              [
                'ts-node',
                '-r',
                'tsconfig-paths/register',
                path.join(__dirname, exampleName),
              ],
              {
                stdio: 'inherit',
              },
            )
            .on('close', code => {
              if (code === 0) resolve();
              else reject(`non-zero exit code ${code}`);
            });
        });
      }).timeout(10000);
    }
  });
});
