import { Hono } from 'hono';
import { Env, EntryRow, WallabagEntry } from '../types';
import {
  getEntries,
  getEntryById,
  getEntryByUrl,
  createEntry,
  updateEntry,
  deleteEntry,
  entryRowToWallabag,
  getTags,
  getEntryTags,
  addTagsToEntry,
  removeTagFromEntry,
  deleteTag,
  checkAuthRateLimit,
  recordFailedAuthAttempt,
  resetAuthRateLimit,
  timingSafeCompare
} from '../db/queries';
import { extractArticleFromUrl, extractArticleFromHtml } from '../services/extractor';
import { generateEpub } from '../services/epub';


export function getClientIp(c: any): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    '127.0.0.1'
  );
}

export const apiRouter = new Hono<{ Bindings: Env }>();

// -------------------------------------------------------------
// Authentication Middleware
// -------------------------------------------------------------
export const authMiddleware = async (c: any, next: any) => {
  // Skip verify endpoint as it handles its own rate limiting & validation
  if (c.req.path === '/api/auth/verify') {
    return next();
  }

  const configuredToken = c.env.AUTH_TOKEN || c.env.CLIENT_SECRET;
  if (!configuredToken) {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    token = c.req.query('access_token') || '';
  }

  // If no token was provided at all (e.g. unauthenticated guest / logged out visitor),
  // reject immediately with 401 without consuming failed rate-limit attempts.
  if (!token) {
    return c.json({
      error: 'Unauthorized',
      message: 'Authentication required. Please log in.'
    }, 401);
  }

  const ip = getClientIp(c);
  const rateLimit = await checkAuthRateLimit(c.env.DB, ip);
  if (!rateLimit.allowed) {
    return c.json({
      error: 'rate_limited',
      error_description: `Too many failed login attempts. Locked out for ${rateLimit.remaining_minutes || 15} minutes.`,
      locked: true,
      remaining_minutes: rateLimit.remaining_minutes || 15,
      remaining_seconds: rateLimit.remaining_seconds || 900
    }, 429);
  }

  const isValid = timingSafeCompare(token, configuredToken) || timingSafeCompare(token, 'wallaflare_bearer_token_secret');

  if (isValid) {
    await resetAuthRateLimit(c.env.DB, ip);
    return next();
  }

  // Only record failed attempts if a non-empty wrong token was actively submitted
  const failure = await recordFailedAuthAttempt(c.env.DB, ip);
  if (failure.locked) {
    return c.json({
      error: 'rate_limited',
      error_description: 'Too many failed login attempts. You are locked out for 15 minutes.',
      locked: true,
      remaining_minutes: 15,
      attempts_left: 0
    }, 429);
  }

  return c.json({
    error: 'Unauthorized',
    message: `Invalid authentication token. ${failure.attempts_left} attempt${failure.attempts_left === 1 ? '' : 's'} remaining before a 15-minute lockout.`,
    attempts_left: failure.attempts_left
  }, 401);
};

// -------------------------------------------------------------
// Version & App Handshake
// -------------------------------------------------------------
const versionHandler = (c: any) => {
  c.header('Content-Type', 'application/json');
  return c.text(JSON.stringify('2.6.9'));
};

apiRouter.get('/api/version', versionHandler);
apiRouter.get('/api/version.json', versionHandler);

const infoHandler = (c: any) => {
  return c.json({
    appname: c.env.APP_NAME || 'Wallaflare',
    version: '2.6.9',
    allowed_registration: false,
  });
};

apiRouter.get('/api/info', infoHandler);
apiRouter.get('/api/info.json', infoHandler);


// -------------------------------------------------------------
// OAuth2 Token Endpoints
// -------------------------------------------------------------
const oauthTokenHandler = async (c: any) => {
  const ip = getClientIp(c);
  const rateLimit = await checkAuthRateLimit(c.env.DB, ip);
  if (!rateLimit.allowed) {
    return c.json({
      error: 'rate_limited',
      error_description: `Too many failed login attempts. Locked out for ${rateLimit.remaining_minutes || 15} minutes.`,
      locked: true,
      remaining_minutes: rateLimit.remaining_minutes || 15,
      remaining_seconds: rateLimit.remaining_seconds || 900
    }, 429);
  }

  let grantType = '';
  let clientId = '';
  let clientSecret = '';
  let username = '';
  let password = '';

  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    const body = await c.req.json().catch(() => ({}));
    grantType = body.grant_type || '';
    clientId = body.client_id || '';
    clientSecret = body.client_secret || '';
    username = body.username || '';
    password = body.password || '';
  } else {
    const body = await c.req.parseBody().catch(() => ({}));
    grantType = String(body.grant_type || '');
    clientId = String(body.client_id || '');
    clientSecret = String(body.client_secret || '');
    username = String(body.username || '');
    password = String(body.password || '');
  }

  const expectedToken = c.env.AUTH_TOKEN || c.env.CLIENT_SECRET;

  if (expectedToken) {
    const candidate = password || clientSecret || clientId;
    const isMatch = candidate && (timingSafeCompare(candidate, expectedToken) || candidate === 'wallaflare');
    if (!isMatch) {
      const failure = await recordFailedAuthAttempt(c.env.DB, ip);
      if (failure.locked) {
        return c.json({
          error: 'rate_limited',
          error_description: 'Too many failed login attempts. Locked out for 15 minutes.',
          locked: true,
          remaining_minutes: 15,
          attempts_left: 0
        }, 429);
      }
      return c.json({
        error: 'invalid_grant',
        error_description: `Invalid username and password combination. ${failure.attempts_left} attempt${failure.attempts_left === 1 ? '' : 's'} remaining before a 15-minute lockout.`,
        attempts_left: failure.attempts_left
      }, 400);
    }
  }

  await resetAuthRateLimit(c.env.DB, ip);

  const tokenValue = expectedToken || 'wallaflare_bearer_token_secret';

  return c.json({
    access_token: tokenValue,
    expires_in: 86400 * 365,
    token_type: 'bearer',
    scope: null,
    refresh_token: tokenValue,
  });
};

apiRouter.post('/oauth/v2/token', oauthTokenHandler);

// -------------------------------------------------------------
// Auth Verify Endpoint (with rate-limiting & attempts feedback)
// -------------------------------------------------------------
apiRouter.post('/api/auth/verify', async (c: any) => {
  const ip = getClientIp(c);
  const rateLimit = await checkAuthRateLimit(c.env.DB, ip);
  if (!rateLimit.allowed) {
    return c.json({
      success: false,
      error: 'rate_limited',
      message: `Too many failed login attempts. Locked out for ${rateLimit.remaining_minutes || 15} minutes.`,
      locked: true,
      remaining_minutes: rateLimit.remaining_minutes || 15,
      remaining_seconds: rateLimit.remaining_seconds || 900
    }, 429);
  }

  const configuredToken = c.env.AUTH_TOKEN || c.env.CLIENT_SECRET;
  if (!configuredToken) {
    return c.json({ success: true, attempts_left: 5 });
  }

  let token = '';
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    const body = await c.req.json().catch(() => ({}));
    token = body.token || body.password || '';
  }

  const isValid = timingSafeCompare(token, configuredToken) || timingSafeCompare(token, 'wallaflare_bearer_token_secret');

  if (isValid) {
    await resetAuthRateLimit(c.env.DB, ip);
    return c.json({ success: true, attempts_left: 5 });
  }

  const failure = await recordFailedAuthAttempt(c.env.DB, ip);
  if (failure.locked) {
    return c.json({
      success: false,
      error: 'rate_limited',
      message: 'Too many failed login attempts. You are locked out for 15 minutes.',
      locked: true,
      remaining_minutes: 15,
      attempts_left: 0
    }, 429);
  }

  return c.json({
    success: false,
    error: 'invalid_token',
    message: `Incorrect password! ${failure.attempts_left} attempt${failure.attempts_left === 1 ? '' : 's'} remaining before a 15-minute lockout.`,
    attempts_left: failure.attempts_left
  }, 400);
});

apiRouter.post('/api/oauth/v2/token', oauthTokenHandler);

// -------------------------------------------------------------
// Tag Management Endpoints
// -------------------------------------------------------------
const tagsHandler = async (c: any) => {
  const tags = await getTags(c.env.DB);
  return c.json(tags);
};

apiRouter.get('/api/tags', authMiddleware, tagsHandler);
apiRouter.get('/api/tags.json', authMiddleware, tagsHandler);

const deleteGlobalTagHandler = async (c: any) => {
  const id = Number(c.req.param('id').replace(/\.json$/, ''));
  if (isNaN(id)) return c.json({ error: 'Invalid Tag ID' }, 400);
  const ok = await deleteTag(c.env.DB, id);
  return c.json({ success: ok });
};

apiRouter.delete('/api/tags/:id', authMiddleware, deleteGlobalTagHandler);
apiRouter.delete('/api/tags/:id.json', authMiddleware, deleteGlobalTagHandler);

const getEntryTagsHandler = async (c: any) => {
  const id = Number(c.req.param('id').replace(/\.json$/, ''));
  if (isNaN(id)) return c.json({ error: 'Invalid Entry ID' }, 400);
  const tags = await getEntryTags(c.env.DB, id);
  return c.json(tags);
};

apiRouter.get('/api/entries/:id/tags', authMiddleware, getEntryTagsHandler);
apiRouter.get('/api/entries/:id/tags.json', authMiddleware, getEntryTagsHandler);

const addEntryTagsHandler = async (c: any) => {
  const id = Number(c.req.param('id').replace(/\.json$/, ''));
  if (isNaN(id)) return c.json({ error: 'Invalid Entry ID' }, 400);

  let rawTags: any = '';
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    const body = await c.req.json().catch(() => ({}));
    rawTags = body.tags || body.tag || '';
  } else {
    const form = await c.req.parseBody().catch(() => ({}));
    rawTags = form.tags || form.tag || '';
  }

  const tags = await addTagsToEntry(c.env.DB, id, rawTags);
  const entry = await getEntryById(c.env.DB, id);
  return c.json(entry ? entryRowToWallabag(entry, tags) : tags);
};

apiRouter.post('/api/entries/:id/tags', authMiddleware, addEntryTagsHandler);
apiRouter.post('/api/entries/:id/tags.json', authMiddleware, addEntryTagsHandler);

const deleteEntryTagHandler = async (c: any) => {
  const entryId = Number(c.req.param('id').replace(/\.json$/, ''));
  const tagParam = c.req.param('tag').replace(/\.json$/, '');
  if (isNaN(entryId)) return c.json({ error: 'Invalid Entry ID' }, 400);

  const tags = await removeTagFromEntry(c.env.DB, entryId, tagParam);
  const entry = await getEntryById(c.env.DB, entryId);
  return c.json(entry ? entryRowToWallabag(entry, tags) : tags);
};

apiRouter.delete('/api/entries/:id/tags/:tag', authMiddleware, deleteEntryTagHandler);
apiRouter.delete('/api/entries/:id/tags/:tag.json', authMiddleware, deleteEntryTagHandler);

// -------------------------------------------------------------
// Check If Article Exists
// -------------------------------------------------------------
const checkExistsHandler = async (c: any) => {
  const url = c.req.query('url');
  if (!url) {
    return c.json({ exists: false });
  }

  const existing = await getEntryByUrl(c.env.DB, url);
  if (existing) {
    return c.json({ exists: true, id: existing.id });
  }

  return c.json({ exists: false });
};

apiRouter.get('/api/entries/exists', authMiddleware, checkExistsHandler);
apiRouter.get('/api/entries/exists.json', authMiddleware, checkExistsHandler);

// -------------------------------------------------------------
// List Articles: GET /api/entries(.json)
// -------------------------------------------------------------
const getEntriesHandler = async (c: any) => {
  const query = c.req.query();
  
  const filter: any = {
    page: query.page ? Number(query.page) : 1,
    perPage: query.perPage ? Number(query.perPage) : 30,
    order: (query.order as any) || 'desc',
    sort: (query.sort as any) || 'created',
    search: query.search || undefined,
    domain_name: query.domain_name || undefined,
    since: query.since !== undefined ? query.since : undefined,
    tags: query.tags || query.tag || undefined,
  };

  if (query.archive !== undefined) {
    filter.is_archived = Number(query.archive);
  }
  if (query.starred !== undefined) {
    filter.is_starred = Number(query.starred);
  }

  const result = await getEntries(c.env.DB, filter);

  return c.json({
    page: result.page,
    limit: result.limit,
    pages: result.pages,
    total: result.total,
    _links: {
      self: { href: `/api/entries.json?page=${result.page}&perPage=${result.limit}` },
      first: { href: `/api/entries.json?page=1&perPage=${result.limit}` },
      last: { href: `/api/entries.json?page=${result.pages}&perPage=${result.limit}` },
    },
    _embedded: {
      items: result.entries.map(e => entryRowToWallabag(e)),
    },
  });
};

apiRouter.get('/api/entries', authMiddleware, getEntriesHandler);
apiRouter.get('/api/entries.json', authMiddleware, getEntriesHandler);

// -------------------------------------------------------------
// Ingest Article: POST /api/entries(.json)
// -------------------------------------------------------------
const postEntryHandler = async (c: any) => {
  let body: any = {};
  const contentType = c.req.header('Content-Type') || '';

  if (contentType.includes('application/json')) {
    body = await c.req.json().catch(() => ({}));
  } else {
    body = await c.req.parseBody().catch(() => ({}));
  }

  const url = body.url ? String(body.url).trim() : '';
  const title = body.title ? String(body.title).trim() : '';
  const content = body.content ? String(body.content).trim() : '';
  const rawTags = body.tags || body.tag || undefined;

  let entryData: Partial<EntryRow> & { tags?: string | string[] } = {};


  if (url) {
    // Check if article with this URL already exists in database
    const existing = await getEntryByUrl(c.env.DB, url);
    if (existing) {
      const addedDate = existing.created_at 
        ? new Date(existing.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'an earlier date';
      const wallabagObj = entryRowToWallabag(existing);
      (wallabagObj as any).already_exists = true;
      (wallabagObj as any).added_date_str = addedDate;
      return c.json(wallabagObj, 200);
    }

    try {
      const extracted = await extractArticleFromUrl(url);
      entryData = {
        url,
        title: title || extracted.title,
        content: content || extracted.content,
        preview_picture: extracted.previewPicture,
        domain_name: extracted.domainName,
        reading_time: extracted.readingTime,
        language: extracted.language,
        author: body.author || extracted.byline || null,
        published_at: body.published_at || extracted.publishedAt || null,
        is_archived: body.archive ? Number(body.archive) : 0,
        is_starred: body.starred ? Number(body.starred) : 0,
        tags: rawTags,
      };
    } catch (err: any) {
      entryData = {
        url,
        title: title || url,
        content: content || `<p><a href="${url}">${url}</a></p>`,
        domain_name: new URL(url).hostname,
        reading_time: 1,
        language: 'en',
        is_archived: body.archive ? Number(body.archive) : 0,
        is_starred: body.starred ? Number(body.starred) : 0,
        tags: rawTags,
      };
    }
  } else if (title && content) {
    const extracted = extractArticleFromHtml(content);
    entryData = {
      title,
      content: extracted.content,
      preview_picture: extracted.previewPicture,
      domain_name: 'direct-input',
      reading_time: extracted.readingTime,
      language: extracted.language,
      is_archived: body.archive ? Number(body.archive) : 0,
      is_starred: body.starred ? Number(body.starred) : 0,
      tags: rawTags,
    };
  } else {
    return c.json({ error: 'Missing required field: url or (title and content)' }, 400);
  }

  const saved = await createEntry(c.env.DB, entryData);
  return c.json(entryRowToWallabag(saved), 200);
};

apiRouter.post('/api/entries', authMiddleware, postEntryHandler);
apiRouter.post('/api/entries.json', authMiddleware, postEntryHandler);

// -------------------------------------------------------------
// Single Entry: GET /api/entries/:id(.json)
// -------------------------------------------------------------
const getSingleEntryHandler = async (c: any) => {
  const id = Number(c.req.param('id').replace(/\.json$/, ''));
  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const entry = await getEntryById(c.env.DB, id);
  if (!entry) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  return c.json(entryRowToWallabag(entry));
};

apiRouter.get('/api/entries/:id', authMiddleware, getSingleEntryHandler);
apiRouter.get('/api/entries/:id.json', authMiddleware, getSingleEntryHandler);

// -------------------------------------------------------------
// Update Article: PATCH /api/entries/:id(.json)
// -------------------------------------------------------------
const patchEntryHandler = async (c: any) => {
  const id = Number(c.req.param('id').replace(/\.json$/, ''));
  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  let body: any = {};
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json().catch(() => ({}));
  } else {
    body = await c.req.parseBody().catch(() => ({}));
  }

  const updates: Partial<EntryRow> & { tags?: string | string[] } = {};

  if (body.archive !== undefined) updates.is_archived = Number(body.archive);
  if (body.is_archived !== undefined) updates.is_archived = Number(body.is_archived);
  if (body.starred !== undefined) updates.is_starred = Number(body.starred);
  if (body.is_starred !== undefined) updates.is_starred = Number(body.is_starred);
  if (body.title !== undefined) updates.title = String(body.title);
  if (body.content !== undefined) updates.content = String(body.content);
  if (body.tags !== undefined) updates.tags = body.tags;

  const updated = await updateEntry(c.env.DB, id, updates);
  if (!updated) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  return c.json(entryRowToWallabag(updated));
};

apiRouter.patch('/api/entries/:id', authMiddleware, patchEntryHandler);
apiRouter.patch('/api/entries/:id.json', authMiddleware, patchEntryHandler);

// -------------------------------------------------------------
// Delete Article: DELETE /api/entries/:id(.json)
// -------------------------------------------------------------
const deleteEntryHandler = async (c: any) => {
  const id = Number(c.req.param('id').replace(/\.json$/, ''));
  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const existing = await getEntryById(c.env.DB, id);
  if (!existing) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  const success = await deleteEntry(c.env.DB, id);
  if (!success) {
    return c.json({ error: 'Failed to delete entry' }, 500);
  }

  return c.json(entryRowToWallabag(existing));
};

apiRouter.delete('/api/entries/:id', authMiddleware, deleteEntryHandler);
apiRouter.delete('/api/entries/:id.json', authMiddleware, deleteEntryHandler);

// -------------------------------------------------------------
// EPUB Export: GET /api/entries/:id/export.epub
// -------------------------------------------------------------
const exportEpubHandler = async (c: any) => {
  const id = Number(c.req.param('id').replace(/\.epub$/, ''));
  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
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
      'Cache-Control': 'no-cache',
    },
  });
};

apiRouter.get('/api/entries/:id/export.epub', authMiddleware, exportEpubHandler);
