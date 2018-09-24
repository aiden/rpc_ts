/**
 * @module Streams
 *
 * Streams and operations on streams.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as ModuleRpcCommon from '../common/rpc_common';
import { ClientRpcError } from './errors';
import { EventEmitter } from 'events';

/**
 * A stream producer takes an RPC method and a request and returns a stream.
 *
 * Stream producers are implemented by streaming protocols (such as `grpc_web`).
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
 */
export interface Stream<Message> {
  /**
   * Start the stream.  No event will be processed and emitted before the stream is started:
   * basically, nothing happens before `start()` is called.
   */
  start(): this;

  /** Cancel the stream.  The `canceled` event will be emitted. */
  cancel(): this;

  /**
   * Register listeners.
   *
   * The following events are emitted:
   *
   * - `read`: The stream is ready
   */
  on(event: 'ready' | 'complete' | 'canceled', callback: () => void): this;
  on(event: 'message', callback: (message: Message) => void): this;
  on(event: 'error', callback: (err: Error) => void): this;
}

/**
 * Apply a function to each of the messages of a stream and stream the result.
 *
 * @example ```TypeScript
 * const result = transformStream(sourceStream, n => n * 2);
 * // If sourceStream emits 1, 2, 3, result emits 2, 4, 6.
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
 * "Promisify" a stream.
 *
 * @example ```TypeScript
 * const result = await streamAsPromise(stream);
 * // If stream emits 1, 2, 3, result is [1, 2, 3].
 * // If the stream is canceled or errored, the promise is rejected.
 * ```
 */
export function streamAsPromise<T>(stream: Stream<T>): Promise<T[]> {
  return new Promise<T[]>((accept, reject) => {
    const messages: T[] = [];
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
