/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as child_process from 'child_process';
import * as path from 'path';

describe('rpc_ts', () => {
  describe('examples', () => {
    // Just invoke the examples

    for (const exampleName of ['context', 'server_stream']) {
      it(exampleName, async () => {
        await run(path.resolve(__dirname, '..', exampleName));
      }).timeout(10000);
    }

    it('the code in the README.md compiles and runs', async () => {
      const projectRoot = path.resolve(__dirname, '../../..');
      await run(
        path.resolve(projectRoot, 'readme_code.ts'),
        path.resolve(__dirname, '../../../tsconfig.doc.json'),
      );
    });
  });
});

async function run(script: string, tsNodeProject?: string) {
  return new Promise<void>((resolve, reject) => {
    child_process
      .spawn('yarn', ['ts-node', '-r', 'tsconfig-paths/register', script], {
        stdio: 'inherit',
        env: !tsNodeProject
          ? undefined
          : { ...process.env, TS_NODE_PROJECT: tsNodeProject },
      })
      .on('close', code => {
        if (code === 0) resolve();
        else reject(`non-zero exit code ${code}`);
      });
  });
}
