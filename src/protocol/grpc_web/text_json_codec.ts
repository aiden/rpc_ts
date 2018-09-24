/**
 * @module
 *
 * A Codec that serializes/deserializes messages to and from JSON.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { GrpcWebCodec } from './codec';
import { decodeUtf8, encodeUtf8 } from './private/utf8';
import { grpc } from 'grpc-web-client';

/**
 * Line separator between the entries of the trailer metadata (as required by
 * the gRPC-Web specification).
 */
const CLRF = '\r\n';

/**
 * A Codec that serializes/deserializes messages to and from JSON.
 */
export class TextJsonGrpcWebCodec implements GrpcWebCodec {
  /** @override */
  getContentType() {
    return 'application/grpc-web+text-json';
  }

  /** @override */
  encodeMessage(_method: string, payload: any): Uint8Array {
    return encodeUtf8(JSON.stringify(payload));
  }

  /** @override */
  encodeTrailer(metadata: grpc.Metadata): Uint8Array {
    const headers = [];
    for (const key in metadata.headersMap) {
      const values = metadata.headersMap[key];
      for (const value of values) {
        const trimmedValue = value.trim();
        if (!trimmedValue) continue;
        headers.push(`${key}: ${trimmedValue}`);
      }
    }
    return encodeUtf8(headers.join(CLRF));
  }

  /** @override */
  encodeRequest(_method: string, message: any): Uint8Array {
    return encodeUtf8(JSON.stringify(message));
  }

  /** @override */
  decodeRequest(_method: string, message: Uint8Array) {
    return JSON.parse(decodeUtf8(message));
  }

  /** @override */
  decodeMessage(_method: string, encodedMessage: Uint8Array): any {
    return JSON.parse(decodeUtf8(encodedMessage));
  }

  /** @override */
  decodeTrailer(encodedTrailer: Uint8Array): grpc.Metadata {
    return new grpc.Metadata(decodeUtf8(encodedTrailer));
  }
}
