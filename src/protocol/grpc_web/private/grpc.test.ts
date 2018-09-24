import { grpc } from 'grpc-web-client';
import {
  getGrpcWebErrorFromMetadata,
  GrpcErrorCode,
  getMetadataFromGrpcWebError,
} from './grpc';
import * as ModuleRpcCommon from '../../../common/rpc_common';
import { expect } from 'chai';

describe('ts-grpc', () => {
  describe('protocol grpc', () => {
    describe('getGrpcWebErrorFromMetadata', () => {
      it('ok', () => {
        expect(
          getGrpcWebErrorFromMetadata(
            new grpc.Metadata({ 'grpc-status': '0' }),
          ),
        ).to.be.null;
        expect(getGrpcWebErrorFromMetadata(new grpc.Metadata())).to.be.null;
      });

      it('error with no message', () => {
        expect(
          getGrpcWebErrorFromMetadata(
            new grpc.Metadata({
              'grpc-status': GrpcErrorCode.InvalidArgument.toString(),
            }),
          ),
        ).to.deep.equal({
          errorType: ModuleRpcCommon.RpcErrorType.invalidArgument,
          message: '',
        });
      });

      it('error with error message', () => {
        expect(
          getGrpcWebErrorFromMetadata(
            new grpc.Metadata({
              'grpc-status': GrpcErrorCode.InvalidArgument.toString(),
              'grpc-message': 'Foo bar',
            }),
          ),
        ).to.deep.equal({
          errorType: ModuleRpcCommon.RpcErrorType.invalidArgument,
          message: 'Foo bar',
        });
      });

      it('unknown error', () => {
        expect(
          getGrpcWebErrorFromMetadata(
            new grpc.Metadata({
              'grpc-status': '123',
              'grpc-message': 'Foo bar',
            }),
          ),
        ).to.deep.equal({
          errorType: ModuleRpcCommon.RpcErrorType.unknown,
          message: 'Foo bar',
        });
      });
    });

    describe('getMetadataFromGrpcWebError', () => {
      it('error', () => {
        expect(
          getMetadataFromGrpcWebError({
            errorType: ModuleRpcCommon.RpcErrorType.invalidArgument,
            message: 'Foo bar',
          }).headersMap,
        ).to.deep.equal({
          'grpc-status': [GrpcErrorCode.InvalidArgument.toString()],
          'grpc-message': ['Foo bar'],
        });
      });
    });
  });
});
