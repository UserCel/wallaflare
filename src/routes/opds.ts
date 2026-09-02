import { Hono, Context } from 'hono';
import { Env, EntryRow } from '../types';
import {
  getEntries,
  getTags,
  getLibraryCounts,
  getEntryById,
  getAllEntryTagsBatch,
  timingSafeCompare,
  checkAuthRateLimit,
  recordFailedAuthAttempt,
  resetAuthRateLimit,
} from '../db/queries';
import { getClientIp } from './api';
import { generateEpub } from '../services/epub';
import { validateSessionToken } from '../services/auth';
import {
  generateRootCatalogXml,
  generateTagsCatalogXml,
  generateAcquisitionFeedXml,
  generateOpenSearchXml,
} from '../services/opds';

export const opdsRouter = new Hono<{ Bindings: Env }>();

const OPDS_NAV_MIME = 'application/atom+xml;profile=opds-catalog;kind=navigation;charset=utf-8';
const OPDS_ACQ_MIME = 'application/atom+xml;profile=opds-catalog;kind=acquisition;charset=utf-8';
const OPENSEARCH_MIME = 'application/opensearchdescription+xml;charset=utf-8';

function getBaseUrl(c: Context): string {
  const url = new URL(c.req.url);
  return `${url.protocol}//${url.host}`;
}

export function extractOpdsToken(c: Context<{ Bindings: Env }>): string | null {
  // 1. URL Query Parameter (?token=... / ?access_token=... / ?key=...)
  const queryToken = c.req.query('token') || c.req.query('access_token') || c.req.query('key');
  if (queryToken && queryToken.trim().length > 0) {
    return queryToken.trim();
  }

  // 2. Authorization Header
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
          if (pass.length > 0) {
            return pass;
          }
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

export async function opdsAuthMiddleware(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
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

  const provided = extractOpdsToken(c);

  // 2. If no active token was provided (or empty credentials / unauthenticated browser probe),
  // challenge with 401 WWW-Authenticate without consuming rate-limit attempts.
  if (!provided) {
    c.header('WWW-Authenticate', 'Basic realm="Wallaflare OPDS"');
    c.header('Content-Type', 'text/plain; charset=utf-8');
    return c.text('401 Unauthorized: Authentication required. Please log in.\n', 401);
  }

  // 3. Active token was submitted: check IP rate limit on 'opds' scope (which also blocks if admin is locked)
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

  // When READ_TOKEN is configured, strictly validate against READ_TOKEN.
  // When READ_TOKEN is not configured, fall back to masterSecret.
  const isValid = Boolean(effectiveSecret && timingSafeCompare(provided, effectiveSecret));

  if (isValid) {
    if (c.env?.DB) {
      // If READ_TOKEN is dedicated, reset only 'opds' scope; if single masterSecret, reset 'admin'
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
      return c.text('429 Too Many Requests: Too many failed login attempts. Locked out for 15 minutes.\n', 429);
    }
  }

  c.header('WWW-Authenticate', 'Basic realm="Wallaflare OPDS"');
  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(
    `401 Unauthorized: Invalid OPDS credentials. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining before a 15-minute lockout.\n`,
    401
  );
}

// Apply authentication to all OPDS routes
opdsRouter.use('/opds/*', opdsAuthMiddleware);
opdsRouter.use('/opds', opdsAuthMiddleware);

// OpenSearch Description Document
opdsRouter.get('/opds/opensearch.xml', (c) => {
  const baseUrl = getBaseUrl(c);
  const appName = c.env?.APP_NAME || 'Wallaflare';
  const token = extractOpdsToken(c);

  const xml = generateOpenSearchXml({ baseUrl, appName, token });
  c.header('Content-Type', OPENSEARCH_MIME);
  return c.body(xml);
});

// Root Navigation Catalog
const handleRootCatalog = async (c: Context<{ Bindings: Env }>) => {
  const baseUrl = getBaseUrl(c);
  const appName = c.env?.APP_NAME || 'Wallaflare';
  const token = extractOpdsToken(c);

  let counts: { unread: number; starred: number; archive: number; total: number } | undefined;
  if (c.env?.DB) {
    try {
      const rawCounts = await getLibraryCounts(c.env.DB);
      counts = {
        unread: rawCounts.unread,
        starred: rawCounts.starred,
        archive: rawCounts.archive,
        total: rawCounts.total,
      };
    } catch (err) {
      console.warn('[OPDS] Failed to fetch library counts:', err);
    }
  }

  const xml = generateRootCatalogXml({ baseUrl, appName, token, counts });
  c.header('Content-Type', OPDS_NAV_MIME);
  return c.body(xml);
};

opdsRouter.get('/opds', handleRootCatalog);
opdsRouter.get('/opds/', handleRootCatalog);
opdsRouter.get('/opds/catalog.xml', handleRootCatalog);
opdsRouter.get('/opds/v1.2/catalog.xml', handleRootCatalog);

// Tags Navigation Catalog
opdsRouter.get('/opds/tags', async (c) => {
  const baseUrl = getBaseUrl(c);
  const appName = c.env?.APP_NAME || 'Wallaflare';
  const token = extractOpdsToken(c);

  const tags = c.env?.DB ? await getTags(c.env.DB) : [];
  const xml = generateTagsCatalogXml({ baseUrl, appName, token, tags });
  c.header('Content-Type', OPDS_NAV_MIME);
  return c.body(xml);
});

// Helper for article acquisition feeds
async function handleAcquisitionFeed(
  c: Context<{ Bindings: Env }>,
  filter: {
    feedId: string;
    feedTitle: string;
    feedPath: string;
    is_archived?: number;
    is_starred?: number;
    tag?: string;
    search?: string;
  }
) {
  const baseUrl = getBaseUrl(c);
  const appName = c.env?.APP_NAME || 'Wallaflare';
  const token = extractOpdsToken(c);

  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || c.req.query('perPage') || '30', 10)));

  if (!c.env?.DB) {
    const xml = generateAcquisitionFeedXml({
      baseUrl,
      appName,
      feedId: filter.feedId,
      feedTitle: filter.feedTitle,
      feedPath: filter.feedPath,
      entries: [],
      total: 0,
      page,
      limit,
      token,
    });
    c.header('Content-Type', OPDS_ACQ_MIME);
    return c.body(xml);
  }

  const result = await getEntries(c.env.DB, {
    is_archived: filter.is_archived,
    is_starred: filter.is_starred,
    tag: filter.tag,
    search: filter.search,
    page,
    limit,
    sort: 'created',
    order: 'desc',
  });

  const entryIds = result.entries.map((e) => e.id);
  let entryTagsMap: Map<number, any[]> | undefined;
  if (entryIds.length > 0) {
    try {
      entryTagsMap = await getAllEntryTagsBatch(c.env.DB, entryIds);
    } catch {}
  }

  const xml = generateAcquisitionFeedXml({
    baseUrl,
    appName,
    feedId: filter.feedId,
    feedTitle: filter.feedTitle,
    feedPath: filter.feedPath,
    entries: result.entries,
    entryTagsMap,
    total: result.total,
    page,
    limit,
    token,
  });

  c.header('Content-Type', OPDS_ACQ_MIME);
  return c.body(xml);
}

// Unread Articles Acquisition Feed
opdsRouter.get('/opds/unread', (c) => {
  return handleAcquisitionFeed(c, {
    feedId: 'unread',
    feedTitle: 'Unread Articles',
    feedPath: '/opds/unread',
    is_archived: 0,
  });
});

// Starred Articles Acquisition Feed
opdsRouter.get('/opds/starred', (c) => {
  return handleAcquisitionFeed(c, {
    feedId: 'starred',
    feedTitle: 'Starred Articles',
    feedPath: '/opds/starred',
    is_starred: 1,
  });
});

// Archived Articles Acquisition Feed
opdsRouter.get('/opds/archive', (c) => {
  return handleAcquisitionFeed(c, {
    feedId: 'archive',
    feedTitle: 'Archived Articles',
    feedPath: '/opds/archive',
    is_archived: 1,
  });
});

// All Articles Acquisition Feed
opdsRouter.get('/opds/all', (c) => {
  return handleAcquisitionFeed(c, {
    feedId: 'all',
    feedTitle: 'All Articles',
    feedPath: '/opds/all',
  });
});

// Tag-Specific Acquisition Feed
opdsRouter.get('/opds/tags/:tag', (c) => {
  const rawTag = c.req.param('tag');
  const tag = decodeURIComponent(rawTag);
  return handleAcquisitionFeed(c, {
    feedId: `tag:${tag}`,
    feedTitle: `Tag: #${tag}`,
    feedPath: `/opds/tags/${encodeURIComponent(rawTag)}`,
    tag,
  });
});

// OpenSearch Acquisition Feed
opdsRouter.get('/opds/search', (c) => {
  const query = c.req.query('q') || c.req.query('query') || '';
  return handleAcquisitionFeed(c, {
    feedId: `search:${query}`,
    feedTitle: query ? `Search: "${query}"` : 'Search Articles',
    feedPath: `/opds/search?q=${encodeURIComponent(query)}`,
    search: query,
  });
});

// Direct EPUB Acquisition Download Endpoint
opdsRouter.get('/opds/download/:id', async (c) => {
  const rawId = c.req.param('id').replace(/\.epub$/i, '');
  const id = Number(rawId);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid entry ID' }, 400);
  }

  if (!c.env?.DB) {
    return c.json({ error: 'Database connection missing' }, 500);
  }

  const entry = await getEntryById(c.env.DB, id);
  if (!entry) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  const epubBytes = await generateEpub({
    id: entry.id,
    title: entry.title || 'Untitled',
    content: entry.content || '',
    url: entry.url,
    domain_name: entry.domain_name,
    preview_picture: entry.preview_picture,
    reading_time: entry.reading_time,
    created_at: entry.created_at,
    published_at: entry.published_at || null,
    author: entry.author || null,
    language: entry.language || 'en',
  });

  const rawTitle = (entry.title || 'article').replace(/[\r\n\t]/g, ' ').trim();
  const safeAsciiFilename = rawTitle.replace(/[^\w\s.-]/g, '').trim().replace(/\s+/g, '_') || `article_${entry.id}`;
  const encodedUtf8Filename = encodeURIComponent(`${rawTitle}.epub`);

  return new Response(epubBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': `attachment; filename="${safeAsciiFilename}.epub"; filename*=UTF-8''${encodedUtf8Filename}`,
      'Content-Length': String(epubBytes.byteLength),
      'Cache-Control': 'private, no-cache, no-transform',
    },
  });
});
