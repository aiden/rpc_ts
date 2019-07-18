/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as fc from 'fast-check';
import * as express from 'express';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';
import { registerGrpcWebRoutes } from '../server/server';
import * as Utils from '../../../utils/utils';
import * as http from 'http';
import { getGrpcWebClient } from '../client/client';
import * as sinon from 'sinon';
import * as _ from 'lodash';
import { expect } from 'chai';
import { AssertionError } from 'assert';
import { GrpcWebCodec } from '../common/codec';
import { GrpcWebJsonCodec } from '../common/json_codec';
import { encodeUtf8 } from '../private/utf8';
import { grpc } from '@improbable-eng/grpc-web';
import { ModuleRpcContextServer } from '../../../context/server';
import { ModuleRpcContextClient } from '../../../context/client';
import { ModuleRpcCommon } from '../../../common';
import { ModuleRpcClient } from '../../../client';
import { ModuleRpcServer } from '../../../server';

describe('rpc_ts', () => {
  describe('protocol client/server', () => {
    it('successful unary call', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            method: lowerCamelCase(),
            requestContext: context(),
            responseContext: context(),
            useCompression: fc.boolean(),
            request: fc.dictionary(fc.string(), fc.jsonObject()),
            useRequestFunction: fc.boolean(),
          }),
          async arb => {
            const app = express();
            const handler: ModuleRpcServer.ServiceHandlerFor<
              typeof unaryServiceDefinition,
              any
            > = {
              async unary(request, requestContext) {
                return {
                  fooRequest: request,
                  barRequestContext: requestContext,
                };
              },
            };
            app.use(
              '/api',
              registerGrpcWebRoutes(
                unaryServiceDefinition,
                handler,
                serverContextConnector(arb.requestContext, arb.responseContext),
                {
                  useCompression: arb.useCompression,
                  reportError: console.error,
                },
              ),
            );
            const server = http.createServer(app).listen();
            const serverPort = server.address().port;
            app.set('port', serverPort);
            try {
              const client = getGrpcWebClient(
                unaryServiceDefinition,
                clientContextConnector(arb.requestContext, arb.responseContext),
                {
                  remoteAddress: `http://localhost:${serverPort}/api`,
                  getTransport: NodeHttpTransport(),
                },
              );
              const { response, responseContext } = await client.call(
                'unary',
                arb.useRequestFunction ? () => arb.request : arb.request,
              );
              expect(response).to.deep.equal({
                fooRequest: arb.request,
                barRequestContext: arb.requestContext,
              });
              expect(responseContext).to.deep.equal(arb.responseContext);
            } finally {
              server.close();
            }
          },
        ),
      );
    }).timeout(10000);

    it('successful server-stream call', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            method: lowerCamelCase(),
            requestContext: context(),
            responseContext: context(),
            useCompression: fc.boolean(),
            request: fc.array(fc.dictionary(fc.string(), fc.jsonObject())),
          }),
          async arb => {
            const app = express();
            const handler: ModuleRpcServer.ServiceHandlerFor<
              typeof serverStreamServiceDefinition,
              any
            > = {
              async serverStream(
                request: any[],
                { onReady, onMessage },
                requestContext,
              ) {
                onReady(() => {});
                for (const item of request) {
                  onMessage({
                    item,
                    requestContext,
                  });
                }
              },
            };
            app.use(
              '/api',
              registerGrpcWebRoutes(
                serverStreamServiceDefinition,
                handler,
                serverContextConnector(arb.requestContext, arb.responseContext),
                { useCompression: arb.useCompression },
              ),
            );
            const server = http.createServer(app).listen();
            const serverPort = server.address().port;
            app.set('port', serverPort);
            try {
              const client = getGrpcWebClient(
                serverStreamServiceDefinition,
                clientContextConnector(arb.requestContext, arb.responseContext),
                {
                  remoteAddress: `http://localhost:${serverPort}/api`,
                  getTransport: NodeHttpTransport(),
                },
              );
              const onMessageSpy = sinon.spy();
              await new Promise((accept, reject) => {
                client
                  .stream('serverStream', arb.request)
                  .on('message', onMessageSpy)
                  .on('complete', accept)
                  .on('error', reject)
                  .start();
              });
              expect(onMessageSpy.args.length).to.equal(arb.request.length);
              for (const [item, args] of _.zip(
                arb.request,
                onMessageSpy.args,
              )) {
                if (!args) {
                  throw new Error(
                    'expected args to be defined (arrays of the same length)',
                  );
                }
                expect(args[0]).to.deep.equal({
                  response: {
                    item,
                    requestContext: arb.requestContext,
                  },
                  responseContext: arb.responseContext,
                });
              }
            } finally {
              server.close();
            }
          },
        ),
      );
    }).timeout(30000);

    describe('client errors with default server', () => {
      let server: http.Server;
      let serverPort: number;

      beforeEach(() => {
        const app = express();
        const handler: ModuleRpcServer.ServiceHandlerFor<
          typeof unaryServiceDefinition,
          any
        > = {
          async unary(request, requestContext) {
            return {
              fooRequest: request,
              barRequestContext: requestContext,
            };
          },
        };
        app.use(
          '/api',
          registerGrpcWebRoutes(
            unaryServiceDefinition,
            handler,
            new ModuleRpcContextServer.EmptyServerContextConnector(),
          ),
        );
        server = http.createServer(app).listen();
        serverPort = server.address().port;
        app.set('port', serverPort);
      });

      afterEach(() => {
        server.close();
      });

      it('method not allowed', async () => {
        const statusCode = await new Promise((accept, reject) =>
          http
            .request(
              {
                host: '127.0.0.1',
                port: serverPort,
                path: '/api/unary',
                headers: {
                  Accept: 'application/json',
                },
                method: 'GET',
              },
              response => {
                accept(response.statusCode);
              },
            )
            .on('error', err => reject(err))
            .end(),
        );
        expect(statusCode).to.deep.equal(405); // Method Not Allowed
      });

      it('content not acceptable', async () => {
        const statusCode = await new Promise((accept, reject) =>
          http
            .request(
              {
                host: '127.0.0.1',
                port: serverPort,
                path: '/api/unary',
                headers: {
                  Accept: 'application/json',
                },
                method: 'POST',
              },
              response => {
                accept(response.statusCode);
              },
            )
            .on('error', err => reject(err))
            .end(),
        );
        expect(statusCode).to.deep.equal(406); // Not Acceptable
      });

      it('error when providing request context', async () => {
        const client = getGrpcWebClient(
          unaryServiceDefinition,
          {
            async provideRequestContext() {
              throw new Error('error');
            },
            async decodeResponseContext(_encodedResponseContext) {
              return {};
            },
          },
          {
            remoteAddress: `http://example.test`,
            getTransport: NodeHttpTransport(),
          },
        );
        try {
          await client.methodMap().unary({});
          throw new AssertionError({
            message: 'expected an Error to be thrown',
          });
        } catch (err) {
          if (!(err instanceof ModuleRpcClient.RequestContextError)) {
            throw err;
          }
        }
      });

      it('error when request is not JSON', async () => {
        const app = express();
        const errorMsg = 'some non-ClientRpcError';
        const handler = {
          async unary() {
            throw new Error(errorMsg);
          },
        };
        const reportError = sinon.spy();
        app.use(
          '/api',
          registerGrpcWebRoutes(
            unaryServiceDefinition,
            handler,
            new ModuleRpcContextServer.EmptyServerContextConnector(),
            { reportError },
          ),
        );
        const server = http.createServer(app).listen();
        const serverPort = server.address().port;
        app.set('port', serverPort);
        try {
          const client = getGrpcWebClient(
            unaryServiceDefinition,
            new ModuleRpcContextClient.EmptyClientContextConnector(),
            {
              remoteAddress: `http://localhost:${serverPort}/api`,
              codec: new InvalidCodec(),
              getTransport: NodeHttpTransport(),
            },
          );
          await client.methodMap().unary({});
          throw new AssertionError({
            message: 'expected an Error to be thrown',
          });
        } catch (err) {
          if (!(err instanceof ModuleRpcClient.ClientRpcError)) {
            throw err;
          }
          expect(err.errorType).to.equal(ModuleRpcCommon.RpcErrorType.internal);
        } finally {
          server.close();
        }
        expect(reportError.calledOnce).to.be.true;
        const serverError: Error = reportError.args[0][0];
        expect(serverError).to.be.instanceof(
          ModuleRpcServer.ServerTransportError,
        );
      });
    });

    describe('client errors with custom servers', () => {
      specify('error when request size exceeds limit', async () => {
        const app = express();
        const handler = {
          async unary() {
            throw new Error('unexpected call');
          },
        };
        const request = { foo: 'bar', qux: 'wobble' };
        const requestLimit = 5;
        expect(JSON.stringify(request).length).to.be.greaterThan(requestLimit);
        app.use(
          '/api',
          registerGrpcWebRoutes(
            unaryServiceDefinition,
            handler,
            new ModuleRpcContextServer.EmptyServerContextConnector(),
            {
              requestLimit,
            },
          ),
        );
        const server = http.createServer(app).listen();
        const serverPort = server.address().port;
        app.set('port', serverPort);
        try {
          const client = getGrpcWebClient(
            unaryServiceDefinition,
            new ModuleRpcContextClient.EmptyClientContextConnector(),
            {
              remoteAddress: `http://localhost:${serverPort}/api`,
              getTransport: NodeHttpTransport(),
            },
          );
          await client.call('unary', request);
          throw new AssertionError({
            message: 'expected an Error to be thrown',
          });
        } catch (err) {
          if (!(err instanceof ModuleRpcClient.ClientRpcError)) {
            throw err;
          }
          expect(err.errorType).to.equal(
            ModuleRpcCommon.RpcErrorType.invalidArgument,
          );
          expect(err.msg).to.equal('Request Too Large');
        } finally {
          server.close();
        }
      });
    });

    describe('server errors', () => {
      it('ServerRpcError is given special treatment', async () => {
        const app = express();
        const handler = {
          async unary() {
            throw new ModuleRpcServer.ServerRpcError(
              ModuleRpcCommon.RpcErrorType.invalidArgument,
              'should not be transmitted',
              'transmitted',
            );
          },
        };
        app.use(
          '/api',
          registerGrpcWebRoutes(
            unaryServiceDefinition,
            handler,
            new ModuleRpcContextServer.EmptyServerContextConnector(),
          ),
        );
        const server = http.createServer(app).listen();
        const serverPort = server.address().port;
        app.set('port', serverPort);
        try {
          const client = getGrpcWebClient(
            unaryServiceDefinition,
            new ModuleRpcContextClient.EmptyClientContextConnector(),
            {
              remoteAddress: `http://localhost:${serverPort}/api`,
              getTransport: NodeHttpTransport(),
            },
          );
          await client.call('unary', {});
          throw new AssertionError({
            message: 'expected an Error to be thrown',
          });
        } catch (err) {
          if (!(err instanceof ModuleRpcClient.ClientRpcError)) {
            throw err;
          }
          expect(err.errorType).to.equal(
            ModuleRpcCommon.RpcErrorType.invalidArgument,
          );
          expect(err.msg).to.equal('transmitted');
        } finally {
          server.close();
        }
      });

      it('non-ServerRpcError errors are internal errors', async () => {
        const app = express();
        const errorMsg = 'some non-ClientRpcError';
        const handler = {
          async unary() {
            throw new Error(errorMsg);
          },
        };
        app.use(
          '/api',
          registerGrpcWebRoutes(
            unaryServiceDefinition,
            handler,
            new ModuleRpcContextServer.EmptyServerContextConnector(),
          ),
        );
        const server = http.createServer(app).listen();
        const serverPort = server.address().port;
        app.set('port', serverPort);
        try {
          const client = getGrpcWebClient(
            unaryServiceDefinition,
            new ModuleRpcContextClient.EmptyClientContextConnector(),
            {
              remoteAddress: `http://localhost:${serverPort}/api`,
              getTransport: NodeHttpTransport(),
            },
          );
          await client.call('unary', {});
          throw new AssertionError({
            message: 'expected an Error to be thrown',
          });
        } catch (err) {
          if (!(err instanceof ModuleRpcClient.ClientRpcError)) {
            throw err;
          }
          expect(err.errorType).to.equal(ModuleRpcCommon.RpcErrorType.internal);
          expect(err.msg).to.not.contain(errorMsg);
        } finally {
          server.close();
        }
      });

      it('server dies during transmission', async () => {
        const app = express();
        const handler: ModuleRpcServer.ServiceHandlerFor<
          typeof serverStreamServiceDefinition
        > = {
          async serverStream(_request, { onReady }) {
            onReady(() => {});
          },
        };
        app.use(
          '/api',
          registerGrpcWebRoutes(
            serverStreamServiceDefinition,
            handler,
            new ModuleRpcContextServer.EmptyServerContextConnector(),
          ),
        );
        const server = http.createServer(app).listen();
        const serverPort = server.address().port;
        app.set('port', serverPort);
        try {
          const client = getGrpcWebClient(
            serverStreamServiceDefinition,
            new ModuleRpcContextClient.EmptyClientContextConnector(),
            {
              remoteAddress: `http://localhost:${serverPort}/api`,
              getTransport: NodeHttpTransport(),
            },
          );
          const stream = client.stream('serverStream', {});
          const promise = new Promise((_accept, reject) => {
            stream.on('error', reject);
          });
          stream.start();
          server.close();
          await promise;
          throw new AssertionError({
            message: 'expected an Error to be thrown',
          });
        } catch (err) {
          if (!(err instanceof ModuleRpcClient.ClientRpcError)) {
            throw err;
          }
          expect(err.errorType).to.equal(
            ModuleRpcCommon.RpcErrorType.unavailable,
          );
        } finally {
          server.close();
        }
      }).timeout(10000);

      it('non-200 error code', async () => {
        const app = express();
        app.use('/api', (_req, resp) => {
          resp.sendStatus(503);
        });
        const server = http.createServer(app).listen();
        const serverPort = server.address().port;
        app.set('port', serverPort);
        try {
          const client = getGrpcWebClient(
            unaryServiceDefinition,
            new ModuleRpcContextClient.EmptyClientContextConnector(),
            {
              remoteAddress: `http://localhost:${serverPort}/api`,
              getTransport: NodeHttpTransport(),
            },
          );
          await client.methodMap().unary({});
          throw new AssertionError({
            message: 'expected an Error to be thrown',
          });
        } catch (err) {
          if (!(err instanceof ModuleRpcClient.ClientRpcError)) {
            throw err;
          }
          expect(err.errorType).to.equal(
            ModuleRpcCommon.RpcErrorType.unavailable,
          );
        } finally {
          server.close();
        }
      });

      it('error is sent in the trailers if headers have already been sent', async () => {
        const app = express();
        const handler: ModuleRpcServer.ServiceHandlerFor<
          typeof serverStreamServiceDefinition
        > = {
          async serverStream(_request, { onReady, onMessage }) {
            onReady(() => {});
            onMessage({});
            throw new ModuleRpcServer.ServerRpcError(
              ModuleRpcCommon.RpcErrorType.resourceExhausted,
              undefined,
              'transmitted',
            );
          },
        };
        app.use(
          '/api',
          registerGrpcWebRoutes(
            serverStreamServiceDefinition,
            handler,
            new ModuleRpcContextServer.EmptyServerContextConnector(),
          ),
        );
        const server = http.createServer(app).listen();
        const serverPort = server.address().port;
        app.set('port', serverPort);
        try {
          const client = getGrpcWebClient(
            serverStreamServiceDefinition,
            new ModuleRpcContextClient.EmptyClientContextConnector(),
            {
              remoteAddress: `http://localhost:${serverPort}/api`,
              getTransport: NodeHttpTransport(),
            },
          );
          await ModuleRpcClient.streamAsPromise(
            client.methodMap().serverStream({}),
          );
          throw new AssertionError({
            message: 'expected an Error to be thrown',
          });
        } catch (err) {
          if (!(err instanceof ModuleRpcClient.ClientRpcError)) {
            throw err;
          }
          expect(err.errorType).to.equal(
            ModuleRpcCommon.RpcErrorType.resourceExhausted,
          );
          expect(err.msg).to.equal('transmitted');
        } finally {
          server.close();
        }
      });
    });
  });
});

const unaryServiceDefinition = {
  unary: {
    request: {},
    response: {},
  },
};

const serverStreamServiceDefinition = {
  serverStream: {
    type: ModuleRpcCommon.ServiceMethodType.serverStream,
    request: {},
    response: {},
  },
};

const serverContextConnector = (
  requestContext: any,
  responseContext: any,
): ModuleRpcServer.ServerContextConnector<any> => ({
  async decodeRequestContext(encodedRequestContext) {
    return _.fromPairs(
      Utils.entries(encodedRequestContext)
        .filter(([key]) => Utils.keys(requestContext).includes(key))
        .map(([key, value]) => [key, value.replace(`${key}__`, '')]),
    );
  },
  async provideResponseContext() {
    return Utils.mapValuesWithStringKeys(
      responseContext,
      (value, key) => `${key}__${value}`,
    );
  },
});

const clientContextConnector = (
  requestContext: any,
  responseContext: any,
): ModuleRpcClient.ClientContextConnector<any> => ({
  async provideRequestContext() {
    return Utils.mapValuesWithStringKeys(
      requestContext,
      (value, key) => `${key}__${value}`,
    );
  },
  async decodeResponseContext(encodedResponseContext) {
    return _.fromPairs(
      Utils.entries(encodedResponseContext)
        .filter(([key]) => Utils.keys(responseContext).includes(key))
        .map(([key, value]) => [key, value.replace(`${key}__`, '').trim()]),
    );
  },
});

const lowerCamelCase = () =>
  fc
    .tuple(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
      fc.stringOf(
        fc.constantFrom(
          ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(
            '',
          ),
        ),
      ),
    )
    .map(([firstLetter, remaining]) => `${firstLetter}${remaining}`);

const context = () =>
  fc.dictionary(
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvzxyz-'.split('')),
      1,
      20,
    ),
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvzxyz-'.split('')),
      1,
      20,
    ),
  );

class InvalidCodec implements GrpcWebCodec {
  private codec = new GrpcWebJsonCodec();

  /** @override */
  getContentType() {
    return this.codec.getContentType();
  }

  /** @override */
  encodeMessage(_method: string, _payload: any): Uint8Array {
    return encodeUtf8('__invalid_json__');
  }

  /** @override */
  encodeTrailer(_metadata: grpc.Metadata): Uint8Array {
    return encodeUtf8('');
  }

  /** @override */
  encodeRequest(_method: string, _message: any): Uint8Array {
    return encodeUtf8('__invalid_json__');
  }

  /** @override */
  decodeRequest(method: string, message: Uint8Array) {
    return this.codec.decodeRequest(method, message);
  }

  /** @override */
  decodeMessage(method: string, encodedMessage: Uint8Array): any {
    return this.codec.decodeMessage(method, encodedMessage);
  }

  /** @override */
  decodeTrailer(encodedTrailer: Uint8Array): grpc.Metadata {
    return this.codec.decodeTrailer(encodedTrailer);
  }
}
