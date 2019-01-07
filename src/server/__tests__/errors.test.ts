/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** */
import { expect } from 'chai';
import { formatServerRpcErrorMessage } from '../errors';
import { ModuleRpcCommon } from '../../common';

describe('rpc_ts server errors', () => {
  describe('formatServerRpcErrorMessage', () => {
    it('formats a message with only an error type', () => {
      expect(
        formatServerRpcErrorMessage(ModuleRpcCommon.RpcErrorType.canceled),
      ).to.equal('canceled');
    });

    it('formats a message with an error type and a server-only message', () => {
      expect(
        formatServerRpcErrorMessage(
          ModuleRpcCommon.RpcErrorType.canceled,
          'foobar',
        ),
      ).to.equal('canceled: foobar');
    });

    it('formats a message with an error type, a server-only message, and a client-transmitted message', () => {
      expect(
        formatServerRpcErrorMessage(
          ModuleRpcCommon.RpcErrorType.canceled,
          'foobar',
          'wobble',
        ),
      ).to.equal('canceled: foobar; transmitted to client: wobble');
    });

    it('formats a message with an error type and a client-trsansmitted message', () => {
      expect(
        formatServerRpcErrorMessage(
          ModuleRpcCommon.RpcErrorType.canceled,
          undefined,
          'wobble',
        ),
      ).to.equal('canceled: transmitted to client: wobble');
    });
  });
});
