/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export type BankingService = typeof bankingServiceDefinition;

/** Defines the banking service, giving all the methods and the request and response types. */
export const bankingServiceDefinition = {
  /** Get the balance for the authenticated user. */
  getBalance: {
    request: {},
    response: {} as {
      value: number;
    },
  },
  /**
   * Transfer funds from the authenticated user to another user. The authenticated
   * user must have sufficient funds.
   */
  transfer: {
    request: {} as {
      toUserId: string;
      amount: number;
    },
    response: {},
  },
};
