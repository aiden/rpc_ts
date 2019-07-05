/**
 * @module ModuleRpcProtocolGrpcWebCommon
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { grpc } from '@improbable-eng/grpc-web';

/**
 * Serializes/encodes and deserializes/decodes the requests and responses from their
 * in-memory representation to an encoded representation that can be transmitted on the wire.
 *
 * A `GrpcWebCodec` instance can be tied to a particular RPC service (that is why the
 * `method` argument is passed to some of the methods in the Codec).
 *
 * Encoding proceeds from a generic `Message` type to an array of bytes (`Uint8Array`).
 */
export interface GrpcWebCodec<Message = any> {
  /**
   * Returns the content type to put as HTTP headers (Accept and Content-Type) for
   * content negotiation.
   */
  getContentType(): string;

  /** Encodes a request for the RPC method `method`. */
  encodeRequest(method: string, message: Message): Uint8Array;

  /** Decodes a request for the RPC method `method`. */
  decodeRequest(method: string, message: Uint8Array): Message;

  /**
   * Encodes a message (part of the RPC response) for the RPC method `method`.
   */
  encodeMessage(method: string, message: Message): Uint8Array;

  /** Decodes a message. */
  decodeMessage(method: string, encodedMessage: Uint8Array): Message;

  /** Encodes a trailer metadata (part of the RPC response). */
  encodeTrailer(metadata: grpc.Metadata): Uint8Array;

  /** Decodes a trailer. */
  decodeTrailer(encodedTrailer: Uint8Array): grpc.Metadata;
}
