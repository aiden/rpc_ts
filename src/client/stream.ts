/**
 * Streams and operations on streams.
 *
 * @module ModuleRpcClient
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ModuleRpcCommon } from '../common';
import { ClientRpcError } from './errors';
import { EventEmitter } from 'events';

/**
 * A stream producer takes an RPC method and a request and returns a stream.
 *
 * Stream producers are implemented by streaming protocols (such as gRPC-Web).
 */
export interface StreamProducer {
  <Request, Message>(
    method: string,
    request: Request | (() => Request),
  ): Stream<Message>;
}

/**
 * Streams are `EventEmitter` objects that are "read-only" (i.e. they can only register
 * listeners, their `emit` function is not exposed), can be started and canceled,
 * and expose a number of standard events relevant to the lifecycle of an RPC.
 *
 * They are produced by a [[StreamProducer]] which takes an RPC method name and
 * an RPC request.
 *
 * Streams are used to implement both server streams and unary calls (a unary call
 * is then simply a stream that is expected to send one and only one message).
 */
export interface Stream<Message> {
  /**
   * Starts the stream.  No event will be processed and emitted before the stream is started:
   * basically, nothing happens before `start()` is called.
   */
  start(): this;

  /** Cancels the stream.  The `canceled` event will be emitted. */
  cancel(): this;

  /**
   * Registers an event listener.
   *
   * @param event
   * - `'ready'`: The stream is ready.
   * - `'complete'`: The stream successfully completed (no more message will be send).
   * - `'canceled'`: The stream has been canceled.
   *
   * @event
   */
  on(event: 'ready' | 'complete' | 'canceled', callback: () => void): this;
  /**
   * Register an event listener.
   *
   * @param event
   * - `'message'`: A message has been received.
   *
   * @event
   */
  on(event: 'message', callback: (message: Message) => void): this;
  /**
   * Register an event listener.
   *
   * @param event
   * - `'error'`: An error occurred.
   *
   * @event
   */
  on(event: 'error', callback: (err: Error) => void): this;
}

/**
 * Returns a stream created from an array that emits all the messages in the
 * array then either completes or errors if `error` is specified.
 *
 * This function is useful for testing.
 *
 * @example ```Typescript
 * const stream = streamFromArray([1, 2, 3, 4]);
 * stream.on('message', console.log(message)).on('complete', () => {
 *   console.log('COMPLETE');
 * }).start();
 *
 * const streamWithError = streamFromArray([1, 2, 3], new Error('error'));
 * streamWithError.on('error', err => {
 *   console.error('ERROR:', err);
 * }).start();
 * ```
 */
export function streamFromArray<T>(array: T[], error?: Error): Stream<T> {
  return new ArrayStream(array, error);
}

class ArrayStream<T> extends EventEmitter implements Stream<T> {
  constructor(private readonly array: T[], private readonly error?: Error) {
    super();
  }

  start() {
    for (const message of this.array) {
      this.emit('message', message);
    }
    if (this.error) {
      this.emit('error', this.error);
    } else {
      this.emit('complete');
    }
    return this;
  }

  cancel() {
    console.warn(
      '"cancel" called on a stream created with "streamFromArray" does nothing',
    );
    this.emit('canceled');
    return this;
  }
}

/**
 * Applies a function to each of the messages of a stream and streams the result.
 *
 * @typeparam T The type of the inbound messages.
 * @typeparam U The type of the outbound messages.
 * @param source The inbound stream to source messages from.
 * @param fn The transformation function to apply to the messages of the inbound stream.
 * @return The outbound stream.
 *
 * @example ```TypeScript
 * const sourceStream = streamFromArray([1, 2, 3]);
 * const result = transformStream(sourceStream, n => n * 2);
 * result.on('message', console.log).start();
 * // Result emits 2, 4, 6.
 * ```
 */
export function transformStream<T, U>(
  source: Stream<T>,
  fn: (T) => U,
): Stream<U> {
  return new TransformingStream<T, U>(source, fn);
}

class TransformingStream<T, U> extends EventEmitter implements Stream<U> {
  constructor(private readonly source: Stream<T>, fn: (T) => U) {
    super();
    source.on('message', message => {
      try {
        this.emit('message', fn(message));
      } catch (err) {
        this.emit('error', err);
      }
    });
    source.on('error', err => {
      this.emit('error', err);
    });
  }

  start() {
    this.source.start();
    return this;
  }

  cancel() {
    this.source.cancel();
    return this;
  }

  on(event: string, callback: (...args: any[]) => void): this {
    if (event === 'message' || event === 'error') {
      return super.on(event, callback);
    }
    this.source.on(event as any, callback);
    return this;
  }
}

/**
 * "Promisifies" a stream.
 *
 * @typeparam Message The type of the messages transmitted by the stream.
 * @param stream The stream to promisify.
 * @return A promise that resolves to all the transmitted messages when the
 * stream completes, and is rejected when the stream errors or is canceled (in this case,
 * the error is a [[ClientRpcError]] of type [[ModuleRpcCommon.RpcErrorType.canceled]]).
 *
 * @example ```TypeScript
 * const result = await streamAsPromise(stream);
 * // If stream emits 1, 2, 3, result is [1, 2, 3].
 * // If the stream is canceled or errored, the promise is rejected.
 * ```
 */
export function streamAsPromise<Message>(
  stream: Stream<Message>,
): Promise<Message[]> {
  return new Promise<Message[]>((accept, reject) => {
    const messages: Message[] = [];
    stream
      .on('message', message => {
        messages.push(message);
      })
      .on('error', err => {
        reject(err);
      })
      .on('canceled', () => {
        reject(new ClientRpcError(ModuleRpcCommon.RpcErrorType.canceled));
      })
      .on('complete', () => {
        accept(messages);
      })
      .start();
  });
}
