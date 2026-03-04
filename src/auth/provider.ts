import type {
  AuthorizationParams,
  OAuthServerProvider,
} from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type { Response } from 'express';
import { jwtVerify, SignJWT } from 'jose';
import { InMemoryClientsStore } from './clients.js';

const ACCESS_TOKEN_TTL = 3600;       // 1 hour
const REFRESH_TOKEN_TTL = 86_400;    // 24 hours
const AUTH_CODE_TTL = 300;           // 5 minutes

function getSecret(): Uint8Array {
  const secret = process.env['AUTH_SECRET'];
  if (secret === undefined || secret === '') {
    throw new Error('AUTH_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
}

function getIssuer(): string {
  const issuer = process.env['AUTH_ISSUER_URL'];
  if (issuer === undefined || issuer === '') {
    throw new Error('AUTH_ISSUER_URL environment variable is required');
  }
  return issuer;
}

interface JwtClaimsBase extends Record<string, unknown> {
  clientId: string;
  scopes: string[];
  type: string;
}

async function signToken(payload: Record<string, unknown>, expiresInSeconds: number): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(getIssuer())
    .setIssuedAt()
    .setExpirationTime(`${String(expiresInSeconds)}s`)
    .sign(getSecret());
}

async function createTokens(clientId: string, scopes: string[]): Promise<OAuthTokens> {
  const accessPayload: JwtClaimsBase = { type: 'access_token', clientId, scopes };
  const refreshPayload: JwtClaimsBase = { type: 'refresh_token', clientId, scopes };

  const [accessToken, refreshToken] = await Promise.all([
    signToken(accessPayload, ACCESS_TOKEN_TTL),
    signToken(refreshPayload, REFRESH_TOKEN_TTL),
  ]);

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL,
    refresh_token: refreshToken,
    scope: scopes.join(' '),
  };
}

function decodePayload(payload: Record<string, unknown>): JwtClaimsBase {
  return payload as JwtClaimsBase;
}

export class JwtOAuthProvider implements OAuthServerProvider {
  private readonly _clientsStore = new InMemoryClientsStore();

  public get clientsStore(): InMemoryClientsStore {
    return this._clientsStore;
  }

  public async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    const payload: JwtClaimsBase & { codeChallenge: string; redirectUri: string } = {
      type: 'auth_code',
      clientId: client.client_id,
      codeChallenge: params.codeChallenge,
      redirectUri: params.redirectUri,
      scopes: params.scopes ?? [],
    };

    const code = await signToken(payload, AUTH_CODE_TTL);

    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (params.state !== undefined && params.state !== '') {
      redirectUrl.searchParams.set('state', params.state);
    }

    res.redirect(redirectUrl.toString());
  }

  public async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const { payload } = await jwtVerify(authorizationCode, getSecret(), {
      issuer: getIssuer(),
    });

    const claims = decodePayload(payload);

    if (claims.type !== 'auth_code') {
      throw new Error('Invalid authorization code');
    }

    const { codeChallenge } = payload as Record<string, unknown> & { codeChallenge: unknown };
    if (typeof codeChallenge !== 'string') {
      throw new TypeError('Missing code challenge in authorization code');
    }

    return codeChallenge;
  }

  public async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<OAuthTokens> {
    const { payload } = await jwtVerify(authorizationCode, getSecret(), {
      issuer: getIssuer(),
    });

    const claims = decodePayload(payload);

    if (claims.type !== 'auth_code') {
      throw new Error('Invalid authorization code');
    }

    if (claims.clientId !== client.client_id) {
      throw new Error('Authorization code was issued to a different client');
    }

    return createTokens(client.client_id, claims.scopes);
  }

  public async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
  ): Promise<OAuthTokens> {
    const { payload } = await jwtVerify(refreshToken, getSecret(), {
      issuer: getIssuer(),
    });

    const claims = decodePayload(payload);

    if (claims.type !== 'refresh_token') {
      throw new Error('Invalid refresh token');
    }

    if (claims.clientId !== client.client_id) {
      throw new Error('Refresh token was issued to a different client');
    }

    const effectiveScopes = scopes ?? claims.scopes;
    return createTokens(client.client_id, effectiveScopes);
  }

  public async verifyAccessToken(token: string): Promise<AuthInfo> {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: getIssuer(),
    });

    const claims = decodePayload(payload);

    if (claims.type !== 'access_token') {
      throw new Error('Invalid access token');
    }

    const info: AuthInfo = {
      token,
      clientId: claims.clientId,
      scopes: claims.scopes,
    };

    if (typeof payload.exp === 'number') {
      info.expiresAt = payload.exp;
    }

    return info;
  }
}
