/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as express from 'express';
import { bankingServiceDefinition } from './service';
import { getBankingHandler } from './handler';
import {
  AuthServerContextConnector,
  AuthClientContextConnector,
} from './auth_context';
import * as http from 'http';
import { getRpcClient, registerRpcRoutes } from '../../src';

main().catch(
  /* istanbul ignore next */
  err => {
    console.error(err);
    process.exit(1);
  },
);

async function main() {
  // We launch an Express server, register the RPC routes using the
  // `http_json` protocol, initialize an `grpc_web` client connected to this server
  // and perform some remote procedure calls.
  //
  // The context comes from a mock "authentication" connector.
  const server = setupServer();
  try {
    await clientInteraction(`http://127.0.0.1:${server.address().port}/api`);
  } finally {
    server.close();
  }
}

function setupServer() {
  const app = express();

  app.use(
    '/api',
    registerRpcRoutes(bankingServiceDefinition, getBankingHandler(), {
      serverContextConnector: new AuthServerContextConnector('u1'),
    }),
  );

  const server = http.createServer(app).listen();
  const port = server.address().port;
  app.set('port', port);

  return server;
}

async function clientInteraction(remoteAddress: string) {
  const client = getRpcClient(bankingServiceDefinition, {
    remoteAddress,
    clientContextConnector: new AuthClientContextConnector('u1'),
  }).nice();

  const balanceResponseBefore = await client.getBalance({});
  console.log('Balance is', balanceResponseBefore.value);

  console.log('Transfering...');
  await client.transfer({
    toUserId: 'u2',
    amount: balanceResponseBefore.value / 2,
  });

  const balanceResponseAfter = await client.getBalance({});
  console.log('Now balance is', balanceResponseAfter.value);

  // If the user is not expected, an unauthenticated error is thrown
  {
    const unauthenticatedClient = getRpcClient(bankingServiceDefinition, {
      remoteAddress,
      clientContextConnector: new AuthClientContextConnector('u2'),
    }).nice();

    try {
      await unauthenticatedClient.getBalance({});
    } catch (err) {
      console.log('Expected error', err);
    }
  }
}
