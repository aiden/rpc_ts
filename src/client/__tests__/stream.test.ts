/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { EventEmitter } from 'events';
import { streamAsPromise, transformStream, Stream } from '../stream';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { AssertionError } from 'assert';

describe('ts-rpc', () => {
  describe('client stream', () => {
    describe('transformStream', () => {
      it('transforms', async () => {
        const source = new MockStream<number>();
        const result = transformStream(source, n => n * 2);
        const onMessage = sinon.spy();
        const onError = sinon.spy();
        result.on('message', onMessage);
        result.on('error', onError);
        source.start();
        source.emit('message', 1);
        source.emit('message', 2);
        source.emit('message', 3);
        expect(onMessage.args).to.deep.equal([[2], [4], [6]]);
        expect(onError.called).to.be.false;
      });

      it('error during message transformation', async () => {
        const source = new MockStream<number>();
        const result = transformStream(source, _n => {
          throw new Error('error');
        });
        const onMessage = sinon.spy();
        const onError = sinon.spy();
        result.on('message', onMessage);
        result.on('error', onError);
        source.start();
        source.emit('message', 1);
        expect(onError.calledOnce).to.be.true;
        expect(onMessage.called).to.be.false;
      });

      it('error emitted by source stream', async () => {
        const source = new MockStream<number>();
        const result = transformStream(source, n => n * 2);
        const onMessage = sinon.spy();
        const onError = sinon.spy();
        result.on('message', onMessage);
        result.on('error', onError);
        source.start();
        source.emit('error', new Error('__error__'));
        expect(onError.calledOnce).to.be.true;
        expect(onMessage.called).to.be.false;
      });
    });

    describe('streamAsPromise', () => {
      it('transforms to promise', async () => {
        const stream = new MockStream<number>();
        const promise = streamAsPromise(stream);
        stream.start();
        stream.emit('message', 1);
        stream.emit('message', 2);
        stream.emit('message', 3);
        stream.emit('complete');
        expect(await promise).to.deep.equal([1, 2, 3]);
      });

      it('rejects on error', async () => {
        const stream = new MockStream<number>();
        const promise = streamAsPromise(stream);
        stream.start();
        stream.emit('error', new Error('__error__'));
        try {
          await promise;
          throw new AssertionError({ message: 'Expected error to be thrown' });
        } catch (err) {
          expect(err.message).to.equal('__error__');
        }
      });
    });
  });
});

class MockStream<Message> extends EventEmitter implements Stream<Message> {
  start() {
    return this;
  }
  cancel() {
    return this;
  }
}
