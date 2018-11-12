/**
 * @module ModuleRpcContextServer
 *
 * Implements a JWT-based `AuthClaimsHandler` that extracts authentication
 * claims from JWT tokens.
 *
 * JWT tokens are defined in [RFC7519](https://tools.ietf.org/html/rfc7519).  We
 * validate the claims against [RFC7523](https://tools.ietf.org/html/rfc7523), which defines
 * a profile for OAuth 2.0.  We only deal with JSON Web Signatures, not with plain text.
 *
 * Abstract of RFC7519:
 *
 *    JSON Web Token (JWT) is a compact, URL-safe means of representing
 *    claims to be transferred between two parties.  The claims in a JWT
 *    are encoded as a JSON object that is used as the payload of a JSON
 *    Web Signature (JWS) structure or as the plaintext of a JSON Web
 *    Encryption (JWE) structure, enabling the claims to be digitally
 *    signed or integrity protected with a Message Authentication Code
 *    (MAC) and/or encrypted.
 *
 * @license
 * Copyright (c) Aiden.ai
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import * as jose from 'node-jose';
import { AuthClaimsHandler, TokenValidationError } from './token_auth_handler';

/**
 * The authentication claims are given in JWT as a string map.
 */
export interface EncodedJwtAuthClaims {
  [key: string]: string;
}

/**
 * Decodes raw JWT claims into a custom data type.
 */
export type JwtAuthClaimsDecoder<AuthClaims> = (
  encodedClaims: EncodedJwtAuthClaims,
) => Promise<AuthClaims>;

/**
 * Gets an [[AuthClaimsHandler]] that extracts authentication claims from JWT tokens.
 *
 * @param jwksUrl The URL from which to retrieve the JSON-serialized Web Key Set (JWKS)
 * used to validate the JWT tokens.
 * @param expectedAudiences The audiences expected from the JWT tokens (the 'aud'
 * authentication claim must be included in this list).
 * @param decodeClaims Decode raw JWT claims into a custom data type.
 *
 * @throws `TokenValidationError` if the token is invalid.
 */
export function getJwtAuthClaimsHandler<AuthClaims>(
  jwksUrl: string,
  expectedAudiences: string[],
  decodeClaims: JwtAuthClaimsDecoder<AuthClaims>,
): AuthClaimsHandler<AuthClaims> {
  /** The JWKS, or null if not already (lazily) fetched */
  let jwks: any;

  /**
   * Lazily initiated `verify` functions (from the `node-jose` package), one for each
   * key (indexation by the key ID).
   */
  const verify: { [keyId: string]: any } = {};

  function getKey(jwks: any, keyId: string): any {
    const key = jwks.keys.find(key => key.kid === keyId);
    if (!key) {
      throw new TokenValidationError(`cannot find key ${keyId} in JWKS`);
    }
    return key;
  }

  async function getVerify(keyId: string): Promise<any> {
    if (!verify[keyId]) {
      if (!jwks) {
        jwks = await fetchJwks(jwksUrl);
      }
      const key = getKey(jwks, keyId);
      const result = await jose.JWK.asKey(key);
      verify[keyId] = jose.JWS.createVerify(result);
    }
    return verify[keyId];
  }

  return async (token: string) => {
    let jwt: any;
    try {
      const sections = token.split('.');
      jwt = JSON.parse(jose.util.base64url.decode(sections[0]));
    } catch (err) {
      throw new TokenValidationError('cannot parse token');
    }
    const verify = await getVerify(jwt.kid);
    let result: any;
    try {
      result = await verify.verify(token);
    } catch (err) {
      throw new TokenValidationError(`cannot verify token: ${err.stack}`);
    }
    const claims = JSON.parse(result.payload);
    checkClaims(expectedAudiences, claims);
    return decodeClaims(claims);
  };
}

function checkClaims(expectedAudiences: string[], claims: any) {
  if (!claims.exp || getCurrentTs() > claims.exp) {
    throw new TokenValidationError('token has expired or exp is not set');
  }
  if (!expectedAudiences.includes(claims.aud)) {
    throw new TokenValidationError(`aud (token audience) was not expected`);
  }
  if (!claims.sub) {
    throw new TokenValidationError('sub (token subject) is not set');
  }
}

async function fetchJwks(jwksUrl: string): Promise<any> {
  const res = await fetch(jwksUrl);
  if (!res.ok) {
    throw new Error('cannot fetch JWT keys');
  }
  return res.json();
}

/** Get the current timestamp, in seconds, to compare it to the JWT's expiry date. */
function getCurrentTs() {
  return Math.floor(new Date().getTime() / 1000);
}
