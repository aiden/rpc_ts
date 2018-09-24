/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { grpc } from 'grpc-web-client';

/**
 * Serialize/encode and deserialize/decode the requests and responses from their
 * in-memory representation to an encoded representation that can be transmitted on the wire.
 *
 * A `GrpcWebCodec` instance can be tied to a particular RPC service (whence the `method` argument
 * that can be passed to some of the methods in the Codec).
 *
 * Encoding proceeds from a generic `Message` type to an array of bytes (`Uint8Array`).
 */
export interface GrpcWebCodec<Message = any> {
  /**
   * Return the content type to put as HTTP headers (Accept and Content-Type) for
   * content negotiation.
   */
  getContentType(): string;

  /** Encode a request for the RPC method `method`. */
  encodeRequest(method: string, message: Message): Uint8Array;

  /** Decode a request for the RPC method `method`. */
  decodeRequest(method: string, message: Uint8Array);

  /**
   * Encode a message (part of the RPC response) for the RPC method `method`.
   */
  encodeMessage(method: string, message: Message): Uint8Array;

  /** Decode a message. */
  decodeMessage(method: string, encodedMessage: Uint8Array): Message;

  /** Encode a trailer metadata (part of the RPC response). */
  encodeTrailer(metadata: grpc.Metadata): Uint8Array;

  /** Decode a trailer. */
  decodeTrailer(encodedTrailer: Uint8Array): grpc.Metadata;
}
