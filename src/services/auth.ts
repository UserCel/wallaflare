import { Context, Next } from 'hono';
import { Env, OAuthTokenResponse } from '../types';

export function generateToken(env: Env): OAuthTokenResponse {
  // Generate edge-safe pseudo-random token or reuse configured AUTH_TOKEN
  const token = env.AUTH_TOKEN || `wfl_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  return {
    access_token: token,
    expires_in: 31536000, // 1 year
    token_type: 'bearer',
    scope: null,
    refresh_token: `wfl_ref_${Math.random().toString(36).substring(2)}`,
  };
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const secret = c.env.AUTH_TOKEN || c.env.CLIENT_SECRET;

  // If no auth token or secret is configured in environment, permit all requests
  if (!secret) {
    return await next();
  }

  const authHeader = c.req.header('Authorization');
  const tokenFromQuery = c.req.query('access_token');

  let providedToken: string | null = null;

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    providedToken = authHeader.substring(7).trim();
  } else if (tokenFromQuery) {
    providedToken = tokenFromQuery;
  }

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
