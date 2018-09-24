/**
 * @module
 *
 * Fault tolerance for a series of `Stream` (the "raw" value returned by an RPC).
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as events from 'events';
import {
  BackoffOptions,
  DEFAULT_BACKOFF_OPTIONS,
  getBackoffMs,
} from './backoff';
import { Stream } from './stream';
import { sleep } from '../utils/utils';

/**
 * Retry a series of streams.
 *
 * @param getStream A stream provider.  The stream provider is called until a
 * stream emits a 'complete' or 'canceled' event, or the maximum number of retries,
 * as per the exponential backoff schedule, has been reached.
 * @param backoffOptions Options for the exponential backoff.
 */
export function retryStream<Message>(
  getStream: () => Stream<Message>,
  backoffOptions?: Partial<BackoffOptions>,
): RetryingStream<Message> {
  return new RetryingStreamImpl<Message>(getStream, {
    ...DEFAULT_BACKOFF_OPTIONS,
    ...backoffOptions,
  });
}

export interface RetryingStream<Message> extends Stream<Message> {
  start(): this;
  cancel(): this;

  /**
   * Register an event listener.
   *
   * In addition to the events from the `Stream` interface, the following
   * events are emitted:
   *
   * - `retryingError`: When an error occured, with the following parameters:
   *   - `err`: The error that occurred
   *   - `retriesSinceLastReady`: The number of retries since a stream emitted
   * the `ready` event.
   *   - `abandoned`: Whether the retrying stream gave up because of this error.
   * - `error`: When an error occured that made the retrying stream give up.
   */
  on(event: 'ready' | 'complete' | 'canceled', callback: () => void): this;
  on(event: 'message', callback: (message: Message) => void): this;
  on(event: 'error', callback: (err: Error) => void): this;
  on(
    event: 'retryingError',
    callback: (
      err: Error,
      retriesSinceLastReady: number,
      abandoned: boolean,
    ) => void,
  ): this;
}

/**
 * All the states of a retrying stream are gathered here for better clarity.
 */
enum RetryingStreamState {
  /** Initial state */
  initial = 'initial',
  /** The `start()` function was called. */
  started = 'started',
  /** The `ready` event was emitted. */
  ready = 'ready',
  /** Either the `cancel()` function was called, or the `cancel` event was emitted. */
  canceled = 'canceled',
  /** The max number of retries has been reached, the RPC has been abandoned. */
  abandoned = 'abandoned',
  /** The RPC successfully completed. */
  complete = 'complete',
}

class RetryingStreamImpl<Message> extends events.EventEmitter
  implements RetryingStream<Message> {
  /** The state of the retrying stream.  We use this to enforce state transitions. */
  private state: RetryingStreamState = RetryingStreamState.initial;

  /**
   * If a stream (provided by the stream provider) is currently open, the
   * `cancel()` function of this stream.
   */
  private cancelCurrentStream: () => void | null;

  /**
   * The number of retries since a stream emitted the `ready` event.
   */
  private retriesSinceLastReady: number = 0;

  constructor(
    private readonly getStream: () => Stream<Message>,
    private readonly options: BackoffOptions,
  ) {
    super();
  }

  private attempt = (stream: Stream<Message>, cb: () => void) => {
    stream
      .on('ready', () => {
        this.state = RetryingStreamState.ready;
        this.emit('ready');
        this.retriesSinceLastReady = 0;
      })
      .on('message', message => {
        if (this.state === RetryingStreamState.ready) {
          this.emit('message', message);
        }
      })
      .on('complete', () => {
        this.state = RetryingStreamState.complete;
        this.emit('complete');
        cb();
      })
      .on('error', async err => {
        if (
          this.options.maxRetries >= 0 &&
          this.retriesSinceLastReady >= this.options.maxRetries
        ) {
          this.state = RetryingStreamState.abandoned;
          this.emit('retryingError', err, this.retriesSinceLastReady, true);
          this.emit('error', err);
        } else {
          this.state = RetryingStreamState.started;
          this.emit('retryingError', err, this.retriesSinceLastReady, false);
          await sleep(getBackoffMs(this.options, this.retriesSinceLastReady++));
        }
        cb();
      })
      .on('canceled', () => {
        this.state = RetryingStreamState.canceled;
        this.emit('canceled');
        cb();
      })
      .start();
  };

  start() {
    this.asyncStart();
    return this;
  }

  cancel() {
    this.state = RetryingStreamState.canceled;
    this.cancelCurrentStream && this.cancelCurrentStream();
    return this;
  }

  private async asyncStart() {
    this.ensureState(RetryingStreamState.initial);
    this.state = RetryingStreamState.started;

    // We use async/await to get this nice infinite loop
    while (
      ![
        RetryingStreamState.complete,
        RetryingStreamState.canceled,
        RetryingStreamState.abandoned,
      ].includes(this.state)
    ) {
      const stream = this.getStream();
      this.cancelCurrentStream = stream.cancel.bind(stream);
      await new Promise<void>(accept => {
        this.attempt(stream, accept);
      });
      this.cancelCurrentStream = null;
    }
  }

  /* istanbul ignore next */
  private ensureState(state: RetryingStreamState) {
    if (this.state !== state) {
      throw new Error(
        `invalid retrier state: actual: ${this.state}; expected: ${state}`,
      );
    }
  }
}
