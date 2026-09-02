import { Hono, Context } from 'hono';
import { Env, EntryRow } from '../types';
import {
  getEntries,
  getAllEntryTagsBatch,
  timingSafeCompare,
  checkAuthRateLimit,
  recordFailedAuthAttempt,
  resetAuthRateLimit,
} from '../db/queries';
import { getClientIp } from './api';
import { validateSessionToken } from '../services/auth';
import { generateRssFeedXml } from '../services/feed';

export const feedRouter = new Hono<{ Bindings: Env }>();

const RSS_MIME = 'application/rss+xml; charset=utf-8';

function getBaseUrl(c: Context): string {
  const url = new URL(c.req.url);
  return `${url.protocol}//${url.host}`;
}

export function extractFeedToken(c: Context<{ Bindings: Env }>): string | null {
  // 1. Path Pattern (/feed/:user/:token/...)
  const pathParts = c.req.path.replace(/^\/feed\//, '').split('/');
  if (pathParts.length >= 3 && pathParts[1] && pathParts[1].trim().length > 0) {
    return pathParts[1].trim();
  }

  // 2. URL Query Parameter (?token=... / ?access_token=... / ?key=...)
  const queryToken = c.req.query('token') || c.req.query('access_token') || c.req.query('key');
  if (queryToken && queryToken.trim().length > 0) {
    return queryToken.trim();
  }

  // 3. Authorization Header
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const trimmed = authHeader.trim();
    // HTTP Basic Auth
    if (trimmed.toLowerCase().startsWith('basic ')) {
      try {
        const decoded = atob(trimmed.substring(6).trim());
        const colonIdx = decoded.indexOf(':');
        if (colonIdx !== -1) {
          const pass = decoded.substring(colonIdx + 1).trim();
          if (pass.length > 0) return pass;
          return null;
        }
        const token = decoded.trim();
        return token.length > 0 ? token : null;
      } catch {}
    }
    // Bearer Token
    if (trimmed.toLowerCase().startsWith('bearer ')) {
      const token = trimmed.substring(7).trim();
      return token.length > 0 ? token : null;
    }
  }

  return null;
}

export async function feedAuthMiddleware(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  const masterSecret = c.env?.AUTH_TOKEN || c.env?.CLIENT_SECRET;
  const readSecret = c.env?.READ_TOKEN;
  const effectiveSecret = readSecret || masterSecret;

  // Open access if no secret configured
  if (!effectiveSecret) {
    return await next();
  }

  // 1. If user is logged into the web dashboard (valid session cookie), grant access
  if (c.env && (await validateSessionToken(c, c.env))) {
    return await next();
  }

  const provided = extractFeedToken(c);

  // 2. If no token provided, challenge with 401 WWW-Authenticate
  if (!provided) {
    c.header('WWW-Authenticate', 'Basic realm="Wallaflare RSS Feed"');
    c.header('Content-Type', 'text/plain; charset=utf-8');
    return c.text('401 Unauthorized: Authentication required. Please provide a valid feed token.\n', 401);
  }

  // 3. Check rate limit on 'opds' scope
  const ip = getClientIp(c);
  if (c.env?.DB) {
    const rateLimit = await checkAuthRateLimit(c.env.DB, ip, 'opds');
    if (!rateLimit.allowed) {
      c.header('Content-Type', 'text/plain; charset=utf-8');
      return c.text(
        `429 Too Many Requests: Too many failed login attempts. Locked out for ${rateLimit.remaining_minutes || 15} minutes.\n`,
        429
      );
    }
  }

  const isValid = Boolean(effectiveSecret && timingSafeCompare(provided, effectiveSecret));

  if (isValid) {
    if (c.env?.DB) {
      await resetAuthRateLimit(c.env.DB, ip, readSecret ? 'opds' : 'admin');
    }
    return await next();
  }

  // 4. Record failed attempt on 'opds' scope
  let attemptsLeft = 5;
  if (c.env?.DB) {
    const failure = await recordFailedAuthAttempt(c.env.DB, ip, 'opds');
    attemptsLeft = failure.attempts_left;
    if (failure.locked) {
      c.header('Content-Type', 'text/plain; charset=utf-8');
      return c.text(
        `429 Too Many Requests: Too many failed login attempts. Locked out for ${failure.remaining_minutes || 15} minutes.\n`,
        429
      );
    }
  }

  c.header('WWW-Authenticate', 'Basic realm="Wallaflare RSS Feed"');
  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(
    `401 Unauthorized: Invalid feed token credentials. ${attemptsLeft} attempt(s) remaining.\n`,
    401
  );
}

feedRouter.use('/feed/*', feedAuthMiddleware);
feedRouter.use('/feed', feedAuthMiddleware);

async function handleFeedRequest(
  c: Context<{ Bindings: Env }>,
  feedType: 'unread' | 'starred' | 'archive' | 'all' | 'tag',
  tagSlug?: string
) {
  if (!c.env?.DB) {
    return c.text('500 Internal Server Error: Database binding unavailable\n', 500);
  }

  const baseUrl = getBaseUrl(c);
  const appName = c.env.APP_NAME || 'Wallaflare';
  const token = extractFeedToken(c);

  const isArchived = feedType === 'unread' ? 0 : (feedType === 'archive' ? 1 : undefined);
  const isStarred = feedType === 'starred' ? 1 : undefined;

  let feedTitle = 'All Articles';
  let feedDescription = `Articles syndicated from ${appName}`;
  let feedPath = `/feed/${feedType}`;

  if (feedType === 'unread') {
    feedTitle = 'Unread Articles';
    feedDescription = `Unread reading queue on ${appName}`;
  } else if (feedType === 'starred') {
    feedTitle = 'Starred Articles';
    feedDescription = `Starred and favorite stories on ${appName}`;
  } else if (feedType === 'archive') {
    feedTitle = 'Archive';
    feedDescription = `Archived articles on ${appName}`;
  } else if (feedType === 'tag' && tagSlug) {
    const cleanTag = tagSlug.replace(/\.(xml|rss)$/i, '');
    feedTitle = `Tagged #${cleanTag}`;
    feedDescription = `Articles tagged #${cleanTag} on ${appName}`;
    feedPath = `/feed/tags/${encodeURIComponent(cleanTag)}`;
  }

  // Fetch up to 50 latest articles for the RSS feed
  const result = await getEntries(c.env.DB, {
    is_archived: isArchived,
    is_starred: isStarred,
    tag: feedType === 'tag' && tagSlug ? tagSlug.replace(/\.(xml|rss)$/i, '') : undefined,
    sort: 'created',
    order: 'desc',
    page: 1,
    perPage: 50,
  });

  const entryIds = result.entries.map((e) => e.id);
  const entryTagsMap = await getAllEntryTagsBatch(c.env.DB, entryIds);

  const xml = generateRssFeedXml({
    baseUrl,
    feedTitle,
    feedDescription,
    feedPath,
    entries: result.entries,
    entryTagsMap,
    appName,
    token,
  });

  return c.body(xml, 200, {
    'Content-Type': RSS_MIME,
  });
}

// -------------------------------------------------------------
// Standard Feed Routes
// -------------------------------------------------------------
feedRouter.get('/feed/unread', (c) => handleFeedRequest(c, 'unread'));
feedRouter.get('/feed/unread.xml', (c) => handleFeedRequest(c, 'unread'));
feedRouter.get('/feed/unread.rss', (c) => handleFeedRequest(c, 'unread'));

feedRouter.get('/feed/starred', (c) => handleFeedRequest(c, 'starred'));
feedRouter.get('/feed/starred.xml', (c) => handleFeedRequest(c, 'starred'));
feedRouter.get('/feed/starred.rss', (c) => handleFeedRequest(c, 'starred'));

feedRouter.get('/feed/archive', (c) => handleFeedRequest(c, 'archive'));
feedRouter.get('/feed/archive.xml', (c) => handleFeedRequest(c, 'archive'));
feedRouter.get('/feed/archive.rss', (c) => handleFeedRequest(c, 'archive'));

feedRouter.get('/feed/all', (c) => handleFeedRequest(c, 'all'));
feedRouter.get('/feed/all.xml', (c) => handleFeedRequest(c, 'all'));
feedRouter.get('/feed/all.rss', (c) => handleFeedRequest(c, 'all'));

feedRouter.get('/feed/tags/:tag', (c) => handleFeedRequest(c, 'tag', c.req.param('tag')));

// -------------------------------------------------------------
// Wallabag v2 Legacy Routes (single-user: :user is ignored)
// -------------------------------------------------------------
feedRouter.get('/feed/:user/:token/unread', (c) => handleFeedRequest(c, 'unread'));
feedRouter.get('/feed/:user/:token/unread.xml', (c) => handleFeedRequest(c, 'unread'));
feedRouter.get('/feed/:user/:token/starred', (c) => handleFeedRequest(c, 'starred'));
feedRouter.get('/feed/:user/:token/starred.xml', (c) => handleFeedRequest(c, 'starred'));
feedRouter.get('/feed/:user/:token/archive', (c) => handleFeedRequest(c, 'archive'));
feedRouter.get('/feed/:user/:token/archive.xml', (c) => handleFeedRequest(c, 'archive'));
feedRouter.get('/feed/:user/:token/all', (c) => handleFeedRequest(c, 'all'));
feedRouter.get('/feed/:user/:token/all.xml', (c) => handleFeedRequest(c, 'all'));
feedRouter.get('/feed/:user/:token/tags/:tag', (c) => handleFeedRequest(c, 'tag', c.req.param('tag')));
