/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as express from 'express';
import { getGrpcWebClient } from '../../protocol/grpc_web/client/client';
import { numberServiceDefinition, NumberService } from './service';
import * as http from 'http';
import { getNumberHandler } from './handler';
import { ModuleRpcClient } from '../../client';
import { ModuleRpcCommon } from '../../common';
import { AssertionError } from 'assert';
import { ModuleRpcContextServer } from '../../context/server';
import { ModuleRpcContextClient } from '../../context/client';
import { ModuleRpcProtocolServer } from '../../protocol/server';

main().catch(
  /* istanbul ignore next */
  err => {
    console.error(err);
    process.exit(1);
  },
);

async function main() {
  // We launch an Express server, register the RPC routes using the
  // `grpc_web` protocol, initialize a `grpc_web` client connected to this server
  // and perform some remote procedure calls.
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
    ModuleRpcProtocolServer.registerRpcRoutes(
      numberServiceDefinition,
      getNumberHandler(),
      {
        serverContextConnector: new ModuleRpcContextServer.EmptyServerContextConnector(),
      },
    ),
  );

  const server = http.createServer(app).listen();
  const port = server.address().port;
  app.set('port', port);

  return server;
}

async function clientInteraction(remoteAddress: string) {
  const client = getGrpcWebClient(
    numberServiceDefinition,
    new ModuleRpcContextClient.EmptyClientContextConnector(),
    { remoteAddress },
  ).nice();

  // We call our unary method
  const { value } = await client.increment({ value: 10 });
  console.log('Value is', value);

  // Now we convert a server stream into a promise.  The promise resolves to
  // an array containing all the messages that were streamed before the 'complete'
  // event was emitted.
  const result = await ModuleRpcClient.streamAsPromise(streamNumbers(client));
  console.log('ping: all messages:', result);

  // Here, we cancel the call right in the middle of streaming.  An exception is thrown.
  try {
    const stream = streamNumbers(client).on('ready', () => {
      setTimeout(() => stream.cancel(), 2000);
    });
    await ModuleRpcClient.streamAsPromise(stream);
    throw new AssertionError({ message: 'expected cancelation error' });
  } catch (err) {
    console.error('Expected cancelation error:', err);
  }
}

function streamNumbers(
  client: ModuleRpcClient.NiceService<NumberService>,
): ModuleRpcClient.Stream<
  ModuleRpcCommon.ResponseFor<NumberService, 'streamNumbers'>
> {
  return client
    .streamNumbers({ max: 3, sleepMs: 500 })
    .on('ready', () => {
      console.log('ping: onReady()');
    })
    .on('message', message => {
      console.log(`ping: onMessage(${JSON.stringify(message)})`);
    })
    .on('canceled', () => {
      console.log('ping: canceled');
    })
    .on(
      'error',
      /* istanbul ignore next */
      err => {
        console.log('ping: error (not supposed to happen):', err);
      },
    );
}
