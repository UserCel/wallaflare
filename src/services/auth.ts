import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { Env, OAuthTokenResponse } from '../types';

export function getExpectedSecret(env: Env): string | undefined {
  return env.AUTH_TOKEN || env.CLIENT_SECRET;
}

export function generateToken(env: Env): OAuthTokenResponse {
  const secret = getExpectedSecret(env);
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
  const secret = getExpectedSecret(c.env);

  // If no auth token or secret is configured in environment, allow open access
  if (!secret) {
    return await next();
  }

  const providedToken = extractToken(c);

  if (!providedToken || providedToken !== secret) {
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
