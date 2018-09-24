// Ok so test here as well...
import * as fc from 'fast-check';
import { Stream } from './stream';
import { EventEmitter } from 'events';
import * as streamRetrier from './stream_retrier';
import * as sinon from 'sinon';
import { expect } from 'chai';
import * as Utils from '../utils/utils';

describe('ts-grpc', () => {
  describe('client stream_retrier', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(Utils, 'sleep').resolves();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('fast-check', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.array(fc.string().map(msg => new MessageCommand(msg))),
            1,
            5,
          ),
          fc.oneof(
            fc.constant(new CancelCommand()),
            fc.constant(new CompleteCommand()),
          ),
          async (commands, final) => {
            let i = 0;
            const models: StreamModel[] = [];
            const retryingStream = streamRetrier.retryStream(() => {
              const curCommands =
                i === commands.length - 1
                  ? [new ReadyCommand(), ...commands[i], final]
                  : [
                      new ReadyCommand(),
                      ...commands[i],
                      new ErrorCommand(new Error('error__')),
                    ];
              const real = new MockStream();
              const model = new StreamModel();
              models.push(model);
              setTimeout(() => {
                fc.modelRun(() => ({ real, model }), curCommands);
              });
              ++i;
              return real;
            });
            const events = getRetryingStreamEvents(retryingStream);
            retryingStream.start();
            await waitForRetryingStream(retryingStream);
            const expectedEvents = models.reduce(
              (acc, model) => acc.concat(model.expectedEvents),
              [],
            );
            expect(events).to.deep.equal(
              expectedEvents,
              `expected ${JSON.stringify(
                events,
              )} to deep equal ${JSON.stringify(expectedEvents)}`,
            );
          },
        ),
        { verbose: true },
      );
    }).timeout(5000);

    it('abandons after max retries', async () => {
      const retryingStream = streamRetrier.retryStream(
        () => {
          const stream = new MockStream();
          setTimeout(() => {
            stream.emit('error', new Error('__error__'));
          });
          return stream;
        },
        {
          maxRetries: 3,
        },
      );
      const events = getRetryingStreamEvents(retryingStream);
      retryingStream.start();
      await waitForRetryingStream(retryingStream);
      expect(events).to.deep.equal([
        ['retryingError', '__error__', 0, false],
        ['retryingError', '__error__', 1, false],
        ['retryingError', '__error__', 2, false],
        ['retryingError', '__error__', 3, true],
        ['error', '__error__'],
      ]);
    });
  });

  it('can be canceled', async () => {
    let stream: MockStream;
    const retryingStream = streamRetrier.retryStream(() => {
      stream = new MockStream();
      return stream;
    });
    const events = getRetryingStreamEvents(retryingStream);
    retryingStream.start();
    const promise = waitForRetryingStream(retryingStream);
    stream.emit('error', new Error('__error__'));
    const canceledSpy = sinon.spy();
    stream.on('canceled', canceledSpy);
    retryingStream.cancel();
    await promise;
    expect(events).to.deep.equal([
      ['retryingError', '__error__', 0, false],
      ['canceled'],
    ]);
    expect(canceledSpy.calledOnce).to.be.true;
  });
});

function getRetryingStreamEvents<T>(
  retryingStream: streamRetrier.RetryingStream<T>,
) {
  const events = [];
  for (const event of [
    'ready',
    'complete',
    'canceled',
    'message',
    'error',
    'retryingError',
  ]) {
    retryingStream.on(event as any, (...args) => {
      if (event === 'error') {
        events.push([event, args[0].message]);
      } else if (event === 'retryingError') {
        events.push([event, args[0].message, ...args.slice(1)]);
      } else {
        events.push([event, ...args]);
      }
    });
  }
  return events;
}

async function waitForRetryingStream<T>(
  retryingStream: streamRetrier.RetryingStream<T>,
) {
  await new Promise(accept => {
    retryingStream.on('complete', accept);
    retryingStream.on('canceled', accept);
    retryingStream.on('error', accept);
  });
}

class StreamModel {
  state: StreamState = StreamState.initial;
  expectedEvents: any[] = [];
}

class MockStream extends EventEmitter implements Stream<string> {
  start() {
    return this;
  }

  cancel() {
    this.emit('canceled');
    return this;
  }
}

type StreamCommand = fc.Command<StreamModel, MockStream>;

enum StreamState {
  initial = 'initial',
  ready = 'ready',
  canceled = 'canceled',
  error = 'error',
  complete = 'complete',
}

class ReadyCommand implements StreamCommand {
  check(m: StreamModel) {
    return m.state === StreamState.initial;
  }
  run(m: StreamModel, o: MockStream) {
    o.emit('ready');
    m.state = StreamState.ready;
    m.expectedEvents.push(['ready']);
  }
  toString() {
    return 'Ready';
  }
}

class MessageCommand implements StreamCommand {
  constructor(readonly msg: string) {}

  check(m: StreamModel) {
    return m.state === StreamState.ready;
  }
  run(m: StreamModel, o: MockStream) {
    o.emit('message', this.msg);
    m.expectedEvents.push(['message', this.msg]);
  }
  toString() {
    return 'Message';
  }
}

class CancelCommand implements StreamCommand {
  check(_m: StreamModel) {
    return true;
  }
  run(m: StreamModel, o: MockStream) {
    o.emit('canceled');
    m.state = StreamState.canceled;
    m.expectedEvents.push(['canceled']);
  }
  toString() {
    return 'Cancel';
  }
}

class CompleteCommand implements StreamCommand {
  check(m: StreamModel) {
    return m.state === StreamState.ready;
  }
  run(m: StreamModel, o: MockStream) {
    o.emit('complete');
    m.state = StreamState.complete;
    m.expectedEvents.push(['complete']);
  }
  toString() {
    return 'Complete';
  }
}

class ErrorCommand implements StreamCommand {
  constructor(readonly err: Error) {}
  check(_m: StreamModel) {
    return true;
  }
  run(m: StreamModel, o: MockStream) {
    o.emit('error', this.err);
    m.state = StreamState.error;
    m.expectedEvents.push(['retryingError', this.err.message, 0, false]);
  }
  toString() {
    return 'Error';
  }
}
