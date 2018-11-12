/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Service, ServiceRetrier } from '../service';
import * as sinon from 'sinon';
import { Stream } from '../stream';
import { EventEmitter } from 'events';
import { AssertionError } from 'assert';
import { expect } from 'chai';
import * as Rx from 'rxjs';
import { take } from 'rxjs/operators';
import * as Utils from '../../utils/utils';
import { ModuleRpcClient } from '..';
import { ModuleRpcCommon } from '../../common';

describe('rpc_ts', () => {
  describe('client service', () => {
    describe('call', () => {
      let mockStream: MockStream;
      let promise: Promise<{
        responseContext: { qux: string };
        response: { value: number };
      }>;

      beforeEach(() => {
        mockStream = new MockStream();
        const streamProducer = sinon.stub().returns(mockStream);
        const service = new Service<
          typeof testServiceDefinition,
          ResponseContext
        >(testServiceDefinition, streamProducer);
        const request = { foo: 'bar' };
        promise = service.call('unary', request);

        expect(streamProducer.calledOnce).to.be.true;
        expect(streamProducer.args[0]).to.deep.equal(['unary', request]);
      });

      it('completes after one message', async () => {
        const message = {
          response: { value: 10 },
          responseContext: { qux: 'wobble' },
        };
        mockStream.emit('message', message);
        mockStream.emit('complete');
        expect(await promise).to.deep.equal(message);
      });

      it('throws if errors', async () => {
        mockStream.emit('error', new Error('__error__'));
        try {
          await promise;
        } catch (err) {
          expect(err.message).to.equal('__error__');
          return;
        }
        throw new AssertionError({ message: 'expected to throw' });
      });

      it('throws if canceled', async () => {
        mockStream.emit('canceled');
        try {
          await promise;
        } catch (err) {
          expect(err).is.instanceof(ModuleRpcClient.ClientRpcError);
          expect((err as ModuleRpcClient.ClientRpcError).errorType).to.equal(
            ModuleRpcCommon.RpcErrorType.canceled,
          );
          return;
        }
        throw new AssertionError({ message: 'expected to throw' });
      });

      it('throws if completed without a message', async () => {
        mockStream.emit('complete');
        try {
          await promise;
        } catch (err) {
          expect(err).is.instanceof(ModuleRpcClient.ClientProtocolError);
          return;
        }
        throw new AssertionError({ message: 'expected to throw' });
      });

      it('throws if completed with more than a message', async () => {
        mockStream.emit('message', {
          response: { value: 10 },
          responseContext: { qux: 'wobble' },
        });
        mockStream.emit('message', {
          response: { value: 20 },
          responseContext: { qux: 'wobble2' },
        });
        mockStream.emit('complete');
        try {
          await promise;
        } catch (err) {
          expect(err).is.instanceof(ModuleRpcClient.ClientProtocolError);
          return;
        }
        throw new AssertionError({ message: 'expected to throw' });
      });
    });

    describe('withRetry', () => {
      let sandbox: sinon.SinonSandbox;

      beforeEach(() => {
        sandbox = sinon.createSandbox();
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('emits service-level events', async () => {
        sandbox.stub(Utils, 'sleep').resolves();

        const message = {
          response: { value: 10 },
          responseContext: { qux: 'wobble' },
        };
        let mockStream: MockStream | undefined;
        const streamProducer = () => {
          mockStream = new MockStream();
          return mockStream;
        };
        const service = new Service<
          typeof testServiceDefinition,
          ResponseContext
        >(testServiceDefinition, streamProducer);
        const request = { foo: 'bar' };
        const retrier = service.withRetry();
        const nextServiceEvent = instrumentRetrier(retrier);
        const responsePromise = retrier.service().call('unary', request);
        if (!mockStream) {
          throw new Error('mockStream should have been initialized by now');
        }
        let serviceEventPromise = nextServiceEvent();
        mockStream.emit('error', new Error('__error__'));
        expect(await serviceEventPromise).to.deep.equal([
          'serviceError',
          '__error__',
          0,
          false,
          'unary',
          request,
        ]);
        serviceEventPromise = nextServiceEvent();
        mockStream.emit('error', new Error('__error2__'));
        expect(await serviceEventPromise).to.deep.equal([
          'serviceError',
          '__error2__',
          1,
          false,
          'unary',
          request,
        ]);
        serviceEventPromise = nextServiceEvent();
        mockStream.emit('ready');
        expect(await serviceEventPromise).to.deep.equal([
          'serviceReady',
          'unary',
          request,
        ]);
        mockStream.emit('message', message);
        serviceEventPromise = nextServiceEvent();
        mockStream.emit('complete');
        expect(await serviceEventPromise).to.deep.equal([
          'serviceComplete',
          'unary',
          request,
        ]);
        expect(await responsePromise).to.deep.equal(message);
      });
    });

    describe('nice', () => {
      it('unary methods can be called', async () => {
        const mockStream = new MockStream();
        const streamProducer = sinon.stub().returns(mockStream);
        const service = new Service<
          typeof testServiceDefinition,
          ResponseContext
        >(testServiceDefinition, streamProducer);
        const request = { foo: 'bar' };
        const promise = service.nice().unary(request);

        const message = {
          response: { value: 10 },
          responseContext: { qux: 'wobble' },
        };
        mockStream.emit('message', message);
        mockStream.emit('complete');
        expect(await promise).to.deep.equal({ value: 10 });

        expect(streamProducer.calledOnce).to.be.true;
        expect(streamProducer.args[0]).to.deep.equal(['unary', request]);
      });
    });

    it('server streams can be called', async () => {
      const mockStream = new MockStream();
      const streamProducer = sinon.stub().returns(mockStream);
      const service = new Service<
        typeof testServiceDefinition,
        ResponseContext
      >(testServiceDefinition, streamProducer);
      const request = { foo: 'bar' };
      const stream = service.nice().stream(request);

      const message1 = {
        response: { value: 10 },
        responseContext: { qux: 'wobble' },
      };
      await new Promise((accept, reject) => {
        stream.on('message', message => {
          try {
            expect(message).to.deep.equal({ value: 10 });
            accept();
          } catch (err) {
            reject(err);
          }
        });
        mockStream.emit('message', message1);
      });

      const message2 = {
        response: { value: 20 },
        responseContext: { qux: 'wobble2' },
      };
      await new Promise((accept, reject) => {
        stream.on('message', message => {
          try {
            expect(message).to.deep.equal({ value: 20 });
            accept();
          } catch (err) {
            reject(err);
          }
        });
        mockStream.emit('message', message2);
      });

      await new Promise(accept => {
        stream.on('complete', () => {
          accept();
        });
        mockStream.emit('complete');
      });

      expect(streamProducer.calledOnce).to.be.true;
      expect(streamProducer.args[0]).to.deep.equal(['stream', request]);
    });
  });
});

const testServiceDefinition = {
  unary: {
    request: {} as { foo: string },
    response: {} as { value: number },
  },
  stream: {
    type: ModuleRpcCommon.ServiceMethodType.serverStream,
    request: {} as { foo: string },
    response: {} as { value: number },
  },
};

type ResponseContext = { qux: string };

type Message = {
  response: { value: number };
  responseContext: ResponseContext;
};

class MockStream extends EventEmitter implements Stream<Message> {
  start() {
    return this;
  }
  cancel() {
    return this;
  }
}

function instrumentRetrier<
  serviceDefinition extends ModuleRpcCommon.ServiceDefinition,
  ResponseContext
>(
  retrier: ServiceRetrier<serviceDefinition, ResponseContext>,
): () => Promise<any> {
  const sub = new Rx.Subject();
  const cb = event => (...args) => {
    sub.next([
      event,
      ...args.map(arg => (arg instanceof Error ? arg.message : arg)),
    ]);
  };
  retrier.on('serviceReady', cb('serviceReady'));
  retrier.on('serviceError', cb('serviceError'));
  retrier.on('serviceComplete', cb('serviceComplete'));
  return () => sub.pipe(take(1)).toPromise();
}
