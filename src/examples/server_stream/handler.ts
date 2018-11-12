/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcServer } from '../../server';
import { NumberService } from './service';

export type NumberHandler = ModuleRpcServer.ServiceHandlerFor<NumberService>;

/**
 * Return a handler where the methods of the BankingService are actually implemented.
 *
 * We wrap it in a function to allow for closures, so that you can have variables scoped
 * to the lifetime of the server (such as the mock store `users` in this instance).
 */
export const getNumberHandler = (): NumberHandler => {
  return {
    async increment({ value }) {
      return { value: value + 1 };
    },
    /** Server-side streams are offered with a slightly different signature */
    async streamNumbers({ max, sleepMs }, { onReady, onMessage }) {
      // Calling 'onReady' is mandatory before any call to 'onMessage'.
      // 'onReady' allows us to pass a callback for early cancellation.
      let closed = false;
      onReady(() => {
        closed = true;
      });

      for (let counter = 0; counter < max; ++counter) {
        // If the stream has been closed, exit early
        if (closed) {
          break;
        }
        onMessage({ counter });
        await sleep(sleepMs);
      }
    },
  };
};

/**
 * Like setTimeout but with promises
 */
async function sleep(timeInMillis: number): Promise<void> {
  return new Promise<void>(y => setTimeout(y, timeInMillis));
}
