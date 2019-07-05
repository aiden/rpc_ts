/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { expect } from 'chai';
import * as fc from 'fast-check';
import { grpc } from '@improbable-eng/grpc-web';
import { ModuleRpcProtocolGrpcWebCommon } from '../common';
import { ModuleRpcUtils } from '../../../utils';

describe('rpc_ts', () => {
  describe('protocol json_codec', () => {
    const codec = new ModuleRpcProtocolGrpcWebCommon.GrpcWebJsonCodec();

    it('encodes/decodes requests', () => {
      fc.assert(
        fc.property(fc.string(), fc.jsonObject(), (method, message) => {
          expect(
            codec.decodeRequest(method, codec.encodeRequest(method, message)),
          ).to.deep.equal(message);
        }),
      );
    });

    it('encodes/decodes messages', () => {
      fc.assert(
        fc.property(fc.string(), fc.jsonObject(), (method, message) => {
          expect(
            codec.decodeMessage(method, codec.encodeMessage(method, message)),
          ).to.deep.equal(message);
        }),
      );
    });

    it('encodes/decodes trailers', () => {
      fc.assert(
        fc.property(grpcMetadata(), metadata => {
          expect(
            ModuleRpcUtils.entries(
              codec.decodeTrailer(codec.encodeTrailer(metadata)).headersMap,
            ),
          ).to.deep.equal(
            ModuleRpcUtils.entries(metadata.headersMap)
              .map(
                ([key, values]) =>
                  [
                    key.toString().trim(),
                    values.map(value => value.trim()).filter(value => !!value),
                  ] as [string, string[]],
              )
              .filter(([key, values]) => key && values.some(value => !!value)),
          );
        }),
      );
    });
  });
});

const grpcMetadata = () =>
  fc
    .dictionary(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvzxyz-'.split(''))),
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvzxyz- '.split(''))),
    )
    .map(headers => new grpc.Metadata(headers));
