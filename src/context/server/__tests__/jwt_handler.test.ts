/**
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from 'chai';
import { AssertionError } from 'assert';
// @ts-ignore
import * as jose from 'node-jose';
import * as moment from 'moment';
import * as sinon from 'sinon';
import * as Utils from '../../../utils/utils';
import * as ModuleJwtHandler from '../token_auth_jwt_handler';
import { TokenValidationError } from '../token_auth_handler';
import * as fetchMock from 'fetch-mock';

const JWKS_URL = 'https://domain.test/.well-known/jwks.json';

describe('jwt_handler', () => {
  let key: any;
  let sign: string;
  let sandbox: sinon.SinonSandbox;

  before(async () => {
    key = await jose.JWK.createKeyStore().generate('oct', 256);
    sign = await jose.JWS.createSign({ format: 'compact' }, key)
      .update(JSON.stringify({ foo: 'bar' }))
      .final();
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    fetchMock.reset();
    fetchMock.restore();
  });

  it('fails authentication for bogus authorization header', async () => {
    try {
      await ModuleJwtHandler.getJwtAuthClaimsHandler(
        JWKS_URL,
        ['foo'],
        null as any,
      )('__bogus__');
    } catch (err) {
      expect(err).to.be.instanceof(TokenValidationError);
      expect(err.message).to.match(/cannot parse token/);
      return;
    }
    throw new AssertionError({
      message: 'expected authenticateHeader to throw',
    });
  });

  it('fails authentication for JWT with an unregistered key', async () => {
    const key2 = await jose.JWK.createKeyStore().generate('oct', 256);
    mockJwks({
      keys: [key2],
    });

    try {
      await ModuleJwtHandler.getJwtAuthClaimsHandler(
        JWKS_URL,
        ['foo'],
        null as any,
      )(sign);
    } catch (err) {
      expect(err).to.be.instanceof(TokenValidationError);
      expect(err.message).to.match(/cannot find key/);
      return;
    }
    throw new AssertionError({
      message: 'expected authenticateHeader to throw',
    });
  });

  describe('fails authentication if the claims are bogus', () => {
    const validClaims = {
      aud: 'foo',
      exp: moment()
        .add(1, 'month')
        .unix(),
      sub: '1234',
      'custom:userUuid': 'abcd',
    };

    beforeEach(() => {
      mockJwks({ keys: [key.toJSON(true)] });
    });

    async function ensureFailForBogusClaims(
      claims: any,
      expectedMessage: RegExp,
    ) {
      const signWithBogusClaims = await jose.JWS.createSign(
        { format: 'compact' },
        key,
      )
        .update(JSON.stringify(claims))
        .final();
      try {
        await ModuleJwtHandler.getJwtAuthClaimsHandler(
          JWKS_URL,
          ['foo'],
          null as any,
        )(signWithBogusClaims);
      } catch (err) {
        expect(err).to.be.instanceof(TokenValidationError);
        expect(err.message).to.match(expectedMessage);
        return;
      }
      throw new AssertionError({
        message: 'expected authenticateHeader to throw',
      });
    }

    it('wrong audience', async () => {
      await ensureFailForBogusClaims(
        { ...validClaims, aud: '__other__' },
        /aud \(token audience\) was not expected/,
      );
    });

    it('expired', async () => {
      await ensureFailForBogusClaims(
        {
          ...validClaims,
          exp: moment()
            .subtract(1, 'month')
            .unix(),
        },
        /token has expired/,
      );
    });

    it('no sub', async () => {
      await ensureFailForBogusClaims(
        Utils.omit(validClaims, ['sub']),
        /sub \(token subject\) is not set/,
      );
    });

    it('valid', async () => {
      const validSign = await jose.JWS.createSign({ format: 'compact' }, key)
        .update(JSON.stringify(validClaims))
        .final();
      await ModuleJwtHandler.getJwtAuthClaimsHandler(
        JWKS_URL,
        ['foo'],
        async encodedClaims => encodedClaims,
      )(validSign);
    });
  });
});

function mockJwks(jwks: any) {
  fetchMock.getOnce(JWKS_URL, {
    body: jwks,
    headers: {
      'content-type': 'application/json',
    },
  });
}
