import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { Env, OAuthTokenResponse } from '../types';
import { timingSafeCompare } from '../db/queries';

export function getExpectedSecret(env: Env): string | undefined {
  return env.AUTH_TOKEN || env.CLIENT_SECRET;
}

export function getClientSecret(env: Env): string {
  return env.CLIENT_SECRET || 'wallaflare';
}

export async function createSessionToken(env: Env): Promise<string> {
  if (!env.AUTH_TOKEN) {
    return 'wallaflare_session_open';
  }
  const enc = new TextEncoder().encode(`${env.AUTH_TOKEN}:wallaflare_session_salt_v1`);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `wfl_sess_${hex.substring(0, 32)}`;
}

export async function validateSessionToken(c: Context<{ Bindings: Env }> | string | undefined | null, env: Env): Promise<boolean> {
  if (!env.AUTH_TOKEN) {
    return true;
  }

  let cookieVal: string | undefined;
  if (typeof c === 'object' && c !== null && 'req' in c) {
    cookieVal = getCookie(c as any, 'PHPSESSID') || getCookie(c as any, 'wf_auth_token');
  } else if (typeof c === 'string') {
    cookieVal = c;
  }

  if (!cookieVal) {
    return false;
  }

  const expectedSession = await createSessionToken(env);
  return timingSafeCompare(cookieVal, expectedSession) || timingSafeCompare(cookieVal, env.AUTH_TOKEN);
}

export function generateToken(env: Env): OAuthTokenResponse {
  const secret = env.AUTH_TOKEN || getExpectedSecret(env);
  const token = secret || `wfl_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  return {
    access_token: token,
    expires_in: 31536000, // 1 year
    token_type: 'bearer',
    scope: null,
    refresh_token: `wfl_ref_${Math.random().toString(36).substring(2)}`,
  };
}

export function extractToken(c: Context<{ Bindings: Env }>): string | null {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.substring(7).trim();
  }

  const tokenFromQuery = c.req.query('access_token') || c.req.query('token');
  if (tokenFromQuery) {
    return tokenFromQuery.trim();
  }

  const cookieToken = getCookie(c, 'wf_auth_token');
  if (cookieToken) {
    return cookieToken.trim();
  }

  return null;
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const secret = c.env.AUTH_TOKEN || getExpectedSecret(c.env);

  // If no auth token or secret is configured in environment, allow open access
  if (!secret) {
    return await next();
  }

  const providedToken = extractToken(c);

  if (!providedToken || !timingSafeCompare(providedToken, secret)) {
    return c.json(
      {
        error: 'invalid_grant',
        error_description: 'The access token provided is invalid or missing.',
      },
      401
    );
  }

  return await next();
}
