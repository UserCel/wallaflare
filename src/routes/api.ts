import { OTA_VERSION, OTA_MIN_NATIVE_VERSION, OTA_BUNDLE_B64, OTA_CHECKSUM } from '../views/ota-bundle';
import { KOPLUGIN_VERSION, KOPLUGIN_FILES } from '../views/koplugin-bundle';
import { Hono } from 'hono';
import { Env, EntryRow, WallabagEntry } from '../types';
import {
  getEntries,
  getEntryById,
  getEntryByUrl,
  createEntry,
  updateEntry,
  deleteEntry,
  deleteEntriesBatch,
  updateEntriesBatch,
  addTagsToEntriesBatch,
  removeTagFromEntriesBatch,
  entryRowToWallabag,
  getTags,
  getEntryAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getEntryTags,
  addTagsToEntry,
  removeTagFromEntry,
  deleteTag,
  getLibraryCounts,
  getSiteCookies,
  getSiteCookieForDomain,
  saveSiteCookie,
  toggleSiteCookie,
  deleteSiteCookie,
  clearAllSiteCookies,
  getCurrentSyncRevision,
  getSyncState,
  getDeletedEntriesSince,
  checkAuthRateLimit,
  recordFailedAuthAttempt,
  resetAuthRateLimit,
  timingSafeCompare,
  slugify,
  wipeDatabase
} from '../db/queries';
import { extractArticleFromUrl, extractArticleFromHtml, extractCoverImageFromUrl, extractDomain } from '../services/extractor';
import { generateEpub } from '../services/epub';
import { getClientSecret } from '../services/auth';


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
    appname: c.env?.APP_NAME || 'Wallaflare',
    version: '2.6.9',
    allowed_registration: false,
    has_read_token: Boolean(c.env?.READ_TOKEN),
  });
};


// -------------------------------------------------------------
// Capacitor OTA App Update Endpoints
// -------------------------------------------------------------
const appVersionHandler = (c: any) => {
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  return c.json({
    version: OTA_VERSION,
    min_native_version: OTA_MIN_NATIVE_VERSION,
    checksum: OTA_CHECKSUM,
    url: '/api/app/bundle.zip',
    has_read_token: Boolean(c.env?.READ_TOKEN),
  });
};

apiRouter.get('/api/app/version', appVersionHandler);
apiRouter.get('/api/app/version.json', appVersionHandler);

// -------------------------------------------------------------
// KOReader Plugin OTA Endpoints
// -------------------------------------------------------------
const kopluginVersionHandler = (c: any) => {
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  return c.json({
    version: KOPLUGIN_VERSION,
    zip_url: '/download/wallaflare.koplugin.zip',
    files_url: '/api/app/koplugin/files.json',
  });
};

const kopluginFilesHandler = (c: any) => {
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  return c.json({
    version: KOPLUGIN_VERSION,
    files: KOPLUGIN_FILES,
  });
};

apiRouter.get('/api/app/koplugin/version', kopluginVersionHandler);
apiRouter.get('/api/app/koplugin/version.json', kopluginVersionHandler);
apiRouter.get('/api/app/koplugin/files', kopluginFilesHandler);
apiRouter.get('/api/app/koplugin/files.json', kopluginFilesHandler);


apiRouter.get('/api/app/bundle.zip', (c: any) => {
  const binaryString = atob(OTA_BUNDLE_B64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  c.header('Content-Type', 'application/zip');
  c.header('Content-Disposition', 'attachment; filename="bundle.zip"');
  c.header('Cache-Control', 'public, max-age=86400');
  return c.body(bytes);
});

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
  let body: any = {};

  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json().catch(() => ({}));
    grantType = body.grant_type || '';
    clientId = body.client_id || '';
    clientSecret = body.client_secret || '';
    username = body.username || '';
    password = body.password || '';
  } else {
    body = await c.req.parseBody().catch(() => ({}));
    grantType = String(body.grant_type || '');
    clientId = String(body.client_id || '');
    clientSecret = String(body.client_secret || '');
    username = String(body.username || '');
    password = String(body.password || '');
  }

  const expectedToken = c.env.AUTH_TOKEN || c.env.CLIENT_SECRET;
  const expectedClientSecret = getClientSecret(c.env);

  if (expectedToken) {
    let isMatch = false;

    if (grantType === 'password' || !grantType) {
      const expectedUsername = (c.env.USERNAME || 'wallaflare').toLowerCase();
      const usernameCandidate = String(username || body.username || '').trim().toLowerCase();
      const isUserValid = usernameCandidate === expectedUsername;
      const passwordCandidate = password || body.password || '';
      const isPasswordValid = passwordCandidate && (timingSafeCompare(passwordCandidate, expectedToken) || timingSafeCompare(passwordCandidate, 'wallaflare'));
      const isSecretValid = !clientSecret || timingSafeCompare(clientSecret, expectedClientSecret) || timingSafeCompare(clientSecret, expectedToken) || timingSafeCompare(clientSecret, 'wallaflare');
      isMatch = Boolean(isUserValid && isPasswordValid && isSecretValid);
    } else if (grantType === 'client_credentials') {
      isMatch = Boolean(clientSecret && (timingSafeCompare(clientSecret, expectedClientSecret) || timingSafeCompare(clientSecret, expectedToken)));
    } else if (grantType === 'refresh_token') {
      const refreshToken = c.req.query('refresh_token') || body.refresh_token || '';
      isMatch = Boolean(refreshToken && timingSafeCompare(refreshToken, expectedToken));
    } else {
      const candidate = password || clientSecret || clientId;
      isMatch = Boolean(candidate && (timingSafeCompare(candidate, expectedToken) || timingSafeCompare(candidate, expectedClientSecret) || candidate === 'wallaflare'));
    }

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
// Annotations & Highlights Endpoints (Wallabag v2 Compatible)
// -------------------------------------------------------------
const getAnnotationsHandler = async (c: any) => {
  let rawId = c.req.param('entryId') || '';
  rawId = rawId.replace(/\.json$/, '');
  const entryId = Number(rawId);
  if (isNaN(entryId) || entryId <= 0) {
    return c.json({ error: 'Invalid entry ID' }, 400);
  }
  const annotations = await getEntryAnnotations(c.env.DB, entryId);
  return c.json(annotations);
};

const createAnnotationHandler = async (c: any) => {
  let rawId = c.req.param('entryId') || '';
  rawId = rawId.replace(/\.json$/, '');
  const entryId = Number(rawId);
  if (isNaN(entryId) || entryId <= 0) {
    return c.json({ error: 'Invalid entry ID' }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const rawQuote = body.quote !== undefined ? String(body.quote).trim() : '';
  const rawText = body.text !== undefined && body.quote !== undefined ? String(body.text) : (body.comment !== undefined ? String(body.comment) : (body.text !== undefined ? String(body.text) : ''));
  const ranges = Array.isArray(body.ranges) ? body.ranges : [];
  const target = body.target || null;

  // An annotation is valid if it has a quote (pure highlight), a note (text/comment), or valid DOM ranges/target
  const hasRanges = ranges.some((r: any) => r && (r.start || r.end || Number(r.startOffset) > 0 || Number(r.endOffset) > 0));
  if (!rawQuote && !rawText && !hasRanges && !target) {
    return c.json({ error: 'Annotation must contain quote text, a note, or valid ranges' }, 400);
  }

  const quote = rawQuote;
  const text = rawText;
  const color = String(body.color || 'yellow');

  const annotation = await createAnnotation(c.env.DB, entryId, { quote, text, color, ranges, target });
  return c.json(annotation, 201);
};

const updateAnnotationHandler = async (c: any) => {
  let rawId = c.req.param('id') || '';
  rawId = rawId.replace(/\.json$/, '');
  const id = Number(rawId);
  if (isNaN(id) || id <= 0) {
    return c.json({ error: 'Invalid annotation ID' }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const annotation = await updateAnnotation(c.env.DB, id, {
    text: body.text !== undefined ? String(body.text) : undefined,
    color: body.color !== undefined ? String(body.color) : undefined,
    target: body.target !== undefined ? body.target : undefined
  });

  if (!annotation) {
    return c.json({ error: 'Annotation not found' }, 404);
  }
  return c.json(annotation);
};

const deleteAnnotationHandler = async (c: any) => {
  let rawId = c.req.param('id') || '';
  rawId = rawId.replace(/\.json$/, '');
  const id = Number(rawId);
  if (isNaN(id) || id <= 0) {
    return c.json({ error: 'Invalid annotation ID' }, 400);
  }

  const deleted = await deleteAnnotation(c.env.DB, id);
  if (!deleted) {
    return c.json({ error: 'Annotation not found' }, 404);
  }
  return c.json({ success: true, message: 'Annotation deleted' });
};

apiRouter.get('/api/annotations/:entryId', authMiddleware, getAnnotationsHandler);
apiRouter.get('/api/annotations/:entryId.json', authMiddleware, getAnnotationsHandler);
apiRouter.post('/api/annotations/:entryId', authMiddleware, createAnnotationHandler);
apiRouter.post('/api/annotations/:entryId.json', authMiddleware, createAnnotationHandler);
apiRouter.put('/api/annotations/:id', authMiddleware, updateAnnotationHandler);
apiRouter.put('/api/annotations/:id.json', authMiddleware, updateAnnotationHandler);
apiRouter.patch('/api/annotations/:id', authMiddleware, updateAnnotationHandler);
apiRouter.patch('/api/annotations/:id.json', authMiddleware, updateAnnotationHandler);
apiRouter.delete('/api/annotations/:id', authMiddleware, deleteAnnotationHandler);
apiRouter.delete('/api/annotations/:id.json', authMiddleware, deleteAnnotationHandler);

// -------------------------------------------------------------
// Tag Management Endpoints
// -------------------------------------------------------------
const tagsHandler = async (c: any) => {
  const tags = await getTags(c.env.DB);
  const cacheHeader = c.req.header('Cache-Control') || '';
  const isNoCache = cacheHeader.includes('no-cache') || Boolean(c.req.query('_t')) || Boolean(c.req.query('t'));
  if (isNoCache) {
    c.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  } else {
    c.header('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
  }
  return c.json(tags);
};

apiRouter.get('/api/tags', authMiddleware, tagsHandler);
apiRouter.get('/api/tags.json', authMiddleware, tagsHandler);

const createTagHandler = async (c: any) => {
  let label = '';
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    const body = await c.req.json().catch(() => ({}));
    label = body.label || body.tag || body.name || '';
  } else {
    const form = await c.req.parseBody().catch(() => ({}));
    label = String(form.label || form.tag || form.name || '');
  }

  if (!label || !label.trim()) {
    return c.json({ error: 'Tag label is required' }, 400);
  }

  const cleanLabel = label.trim();
  const slug = slugify(cleanLabel);

  await c.env.DB.prepare('INSERT OR IGNORE INTO tags (label, slug) VALUES (?, ?)').bind(cleanLabel, slug).run();
  const tag = await c.env.DB.prepare('SELECT id, label, slug FROM tags WHERE slug = ? LIMIT 1').bind(slug).first<TagItem>();

  return c.json(tag || { id: Date.now(), label: cleanLabel, slug, entry_count: 0 }, 200);
};

apiRouter.post('/api/tags', authMiddleware, createTagHandler);
apiRouter.post('/api/tags.json', authMiddleware, createTagHandler);

const deleteGlobalTagHandler = async (c: any) => {
  const param = decodeURIComponent(c.req.param('id').replace(/\.json$/, ''));
  const ok = await deleteTag(c.env.DB, param);
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
  const query = c.req.query();
  const url = query.url || query['urls[]'] || query.urls;

  if (!url) {
    return c.json(false);
  }

  // If array of URLs requested
  if (Array.isArray(url)) {
    const results: Record<string, boolean> = {};
    for (const u of url) {
      const existing = await getEntryByUrl(c.env.DB, u);
      results[u] = Boolean(existing);
    }
    return c.json(results);
  }

  // Single URL query (standard Wallabag API returns JSON boolean)
  const existing = await getEntryByUrl(c.env.DB, String(url));
  return c.json(Boolean(existing));
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
// Unified Dashboard & App Sync: GET /api/sync(.json)
// Returns entries, all tags (including unused), and counts in 1 handshake
// -------------------------------------------------------------
const syncHandler = async (c: any) => {
  const query = c.req.query();
  const perPage = query.perPage ? Number(query.perPage) : 50;
  const page = query.page ? Number(query.page) : 1;
  const sinceRev = query.since_rev !== undefined && query.since_rev !== '' ? Number(query.since_rev) : undefined;
  const sort = query.sort || undefined;
  const order = query.order || undefined;
  const search = query.search || undefined;
  const tags = query.tags || query.tag || undefined;
  const is_archived = query.archive !== undefined ? Number(query.archive) : undefined;
  const is_starred = query.starred !== undefined ? Number(query.starred) : undefined;

  const syncState = await getSyncState(c.env.DB);
  const currentRev = syncState.revision;
  const instanceId = syncState.instance_id;

  // If client provides since_rev that matches server's current revision, return lightweight 304-style status
  if (sinceRev !== undefined && !isNaN(sinceRev) && sinceRev === currentRev && page === 1 && !search && !tags && is_archived === undefined && is_starred === undefined) {
    const counts = await getLibraryCounts(c.env.DB);
    c.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return c.json({
      up_to_date: true,
      sync_rev: currentRev,
      instance_id: instanceId,
      counts: counts,
      ota_version: OTA_VERSION,
      ota_checksum: OTA_CHECKSUM,
      koplugin_version: KOPLUGIN_VERSION,
      koplugin_url: '/download/wallaflare.koplugin.zip',
      has_read_token: Boolean(c.env?.READ_TOKEN),
    });
  }

  const entriesFilter: any = {
    page,
    perPage,
    order,
    sort,
    search,
    tags,
    is_archived,
    is_starred,
    since_rev: (sinceRev !== undefined && !isNaN(sinceRev) && sinceRev > 0) ? sinceRev : undefined
  };

  const [entriesResult, allTags, counts, deletedIds, siteCookies] = await Promise.all([
    getEntries(c.env.DB, entriesFilter),
    getTags(c.env.DB),
    getLibraryCounts(c.env.DB),
    sinceRev !== undefined && !isNaN(sinceRev) ? getDeletedEntriesSince(c.env.DB, sinceRev) : Promise.resolve([]),
    getSiteCookies(c.env.DB, true),
  ]);

  c.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  return c.json({
    up_to_date: false,
    sync_rev: currentRev,
    instance_id: instanceId,
    entries: entriesResult.entries.map(e => entryRowToWallabag(e)),
    tags: allTags,
    counts: counts,
    deleted_ids: deletedIds,
    site_cookies: siteCookies,
    total: entriesResult.total,
    page: entriesResult.page,
    limit: entriesResult.limit,
    pages: entriesResult.pages,
    ota_version: OTA_VERSION,
    ota_checksum: OTA_CHECKSUM,
    koplugin_version: KOPLUGIN_VERSION,
    koplugin_url: '/download/wallaflare.koplugin.zip',
    has_read_token: Boolean(c.env?.READ_TOKEN),
  });
};

apiRouter.get('/api/sync', authMiddleware, syncHandler);
apiRouter.get('/api/sync.json', authMiddleware, syncHandler);

// -------------------------------------------------------------

// -------------------------------------------------------------
// Site Cookies Vault Endpoints (Paywalled & Logged-In Sites)
// -------------------------------------------------------------
apiRouter.get('/api/site-cookies', authMiddleware, async (c: any) => {
  const list = await getSiteCookies(c.env.DB);
  return c.json({
    success: true,
    sites: list
  });
});

apiRouter.post('/api/site-cookies', authMiddleware, async (c: any) => {
  const body = await c.req.json().catch(() => ({}));
  const domain = String(body.domain || '').trim();
  const siteName = String(body.site_name || body.name || '').trim();
  const cookieValue = String(body.cookie_value || body.cookie || '').trim();

  if (!domain || !cookieValue) {
    return c.json({ error: 'Domain and cookie_value are required' }, 400);
  }

  await saveSiteCookie(c.env.DB, domain, siteName, cookieValue);
  return c.json({ success: true, domain, site_name: siteName || domain });
});

apiRouter.patch('/api/site-cookies/:domain', authMiddleware, async (c: any) => {
  const domain = c.req.param('domain') || '';
  const body = await c.req.json().catch(() => ({}));
  const isEnabled = body.is_enabled !== undefined ? Boolean(body.is_enabled) : true;
  if (!domain) return c.json({ error: 'Domain is required' }, 400);

  const success = await toggleSiteCookie(c.env.DB, domain, isEnabled);
  return c.json({ success, domain, is_enabled: isEnabled ? 1 : 0 });
});

apiRouter.delete('/api/site-cookies', authMiddleware, async (c: any) => {
  const cleared = await clearAllSiteCookies(c.env.DB);
  return c.json({ success: cleared, message: 'All site cookies deleted' });
});

apiRouter.delete('/api/site-cookies/:domain', authMiddleware, async (c: any) => {
  const domain = c.req.param('domain') || '';
  if (!domain) return c.json({ error: 'Domain is required' }, 400);

  const deleted = await deleteSiteCookie(c.env.DB, domain);
  return c.json({ success: deleted });
});

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

  // Duplicate URL check: Return existing entry if already in library
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    const existing = await getEntryByUrl(c.env.DB, url);
    if (existing) {
      if (rawTags) {
        await addTagsToEntry(c.env.DB, existing.id, rawTags);
      }
      const addedDate = existing.created_at 
        ? new Date(existing.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'an earlier date';
      const wallabagObj = entryRowToWallabag(existing);
      (wallabagObj as any).already_exists = true;
      (wallabagObj as any).added_date_str = addedDate;
      return c.json(wallabagObj, 200);
    }
  }

  let entryData: Partial<EntryRow> & { tags?: string | string[] } = {};
  const rawHtml = body.html ? String(body.html).trim() : '';

  if (title && content) {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      console.log(`[API:Ingest] 📱 Client-extracted article: "${title}" (${url}) [${content.length} chars]`);
    } else {
      console.log(`[API:Ingest] 📝 Custom text note: "${title}" [${content.length} chars]`);
    }
    // Custom pasted / manual text entry
    const extracted = extractArticleFromHtml(content, url || undefined);
    let previewPicture = body.preview_picture || extracted.previewPicture || null;
    
    // Auto-extract preview cover image from Source URL if not already provided
    if (!previewPicture && url && (url.startsWith('http://') || url.startsWith('https://'))) {
      previewPicture = await extractCoverImageFromUrl(url);
    }

    const domainName = url && (url.startsWith('http://') || url.startsWith('https://'))
      ? (extracted.domainName || extractDomain(url))
      : 'direct-input';

    entryData = {
      url: url || undefined,
      title,
      content: extracted.content,
      preview_picture: previewPicture,
      domain_name: domainName,
      reading_time: extracted.readingTime,
      language: body.language || extracted.language || 'en',
      author: body.author ? String(body.author).trim() : (extracted.byline || null),
      published_at: body.published_at || extracted.publishedAt || null,
      is_archived: body.archive ? Number(body.archive) : 0,
      is_starred: body.starred ? Number(body.starred) : 0,
      tags: rawTags,
    };
  } else if (url && rawHtml) {
    console.log(`[API:Ingest] 📱 Native Android pre-fetched HTML received for: ${url} [${rawHtml.length} chars]`);
    const extracted = extractArticleFromHtml(rawHtml, url);
    let previewPicture = body.preview_picture || extracted.previewPicture || null;
    if (!previewPicture) {
      previewPicture = await extractCoverImageFromUrl(url);
    }
    const domainName = extracted.domainName || extractDomain(url);
    entryData = {
      url,
      title: body.title || extracted.title || 'Untitled Article',
      content: extracted.content,
      preview_picture: previewPicture,
      domain_name: domainName,
      reading_time: extracted.readingTime || 1,
      language: body.language || extracted.language || 'en',
      author: body.author ? String(body.author).trim() : (extracted.byline || null),
      published_at: body.published_at || extracted.publishedAt || null,
      is_archived: body.archive ? Number(body.archive) : 0,
      is_starred: body.starred ? Number(body.starred) : 0,
      tags: rawTags,
    };
  } else if (url) {
    console.log(`[API:Ingest] ☁️ Server-side scraping triggered on Cloudflare Worker for: ${url}`);
    // Automated web scraper
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
      const domain = extractDomain(url);
      const storedCookie = await getSiteCookieForDomain(c.env.DB, domain);
      if (storedCookie) {
        console.log(`[API:Ingest] 🔑 Attached stored subscription cookie for domain: ${domain}`);
      }
      const extracted = await extractArticleFromUrl(url, storedCookie || undefined);
      console.log(`[API:Ingest] ☁️ Server scraping succeeded for: "${extracted.title || title || url}"`);
      entryData = {
        url,
        title: title || extracted.title,
        content: extracted.content,
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
      console.warn(`[API:Ingest] ⚠️ Server scraping error for ${url}: ${err?.message}`);
      entryData = {
        url,
        title: title || url,
        content: `<p><a href="${url}">${url}</a></p>`,
        domain_name: new URL(url).hostname,
        reading_time: 1,
        language: 'en',
        author: body.author ? String(body.author).trim() : null,
        published_at: body.published_at || null,
        is_archived: body.archive ? Number(body.archive) : 0,
        is_starred: body.starred ? Number(body.starred) : 0,
        tags: rawTags,
      };
    }
  } else {
    return c.json({ error: 'Missing required field: url or (title and content)' }, 400);
  }

  const saved = await createEntry(c.env.DB, entryData);
  return c.json(entryRowToWallabag(saved), 200);
};

apiRouter.post('/api/entries', authMiddleware, postEntryHandler);
apiRouter.post('/api/entries.json', authMiddleware, postEntryHandler);

// -------------------------------------------------------------

// -------------------------------------------------------------
// Helper to extract Entry IDs from request (Body or Query)
// -------------------------------------------------------------
async function extractIdsFromRequest(c: any): Promise<number[]> {
  let ids: any[] = [];
  const queryIds = c.req.query('ids') || c.req.query('entries');
  if (queryIds) {
    if (Array.isArray(queryIds)) ids = queryIds;
    else ids = String(queryIds).split(',').map((s: string) => s.trim());
  } else {
    const contentType = c.req.header('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const body = await c.req.json().catch(() => ({}));
      if (Array.isArray(body)) ids = body;
      else if (Array.isArray(body.ids)) ids = body.ids;
      else if (Array.isArray(body.entries)) ids = body.entries;
      else if (typeof body.ids === 'string') ids = body.ids.split(',');
      else if (typeof body.entries === 'string') ids = body.entries.split(',');
    } else {
      const form = await c.req.parseBody().catch(() => ({}));
      if (Array.isArray(form['ids[]'])) ids = form['ids[]'];
      else if (Array.isArray(form.ids)) ids = form.ids;
      else if (typeof form.ids === 'string') ids = form.ids.split(',');
      else if (typeof form.entries === 'string') ids = form.entries.split(',');
    }
  }
  return ids.map(Number).filter(n => !isNaN(n) && n > 0);
}

// -------------------------------------------------------------
// Mass Delete Entries: DELETE /api/entries/list(.json)
// -------------------------------------------------------------
const batchDeleteEntriesHandler = async (c: any) => {
  const ids = await extractIdsFromRequest(c);
  if (ids.length === 0) {
    return c.json({ error: 'No valid entry IDs provided' }, 400);
  }

  const deletedCount = await deleteEntriesBatch(c.env.DB, ids);
  return c.json({ ids, count: deletedCount, success: true, message: 'Entries deleted' });
};

apiRouter.delete('/api/entries/list', authMiddleware, batchDeleteEntriesHandler);
apiRouter.delete('/api/entries/list.json', authMiddleware, batchDeleteEntriesHandler);

// -------------------------------------------------------------
// Mass Update Entries (Star/Archive): PATCH /api/entries/list(.json)
// -------------------------------------------------------------
const batchPatchEntriesHandler = async (c: any) => {
  let body: any = {};
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json().catch(() => ({}));
  } else {
    body = await c.req.parseBody().catch(() => ({}));
  }

  let ids: any[] = [];
  if (Array.isArray(body.ids)) ids = body.ids;
  else if (Array.isArray(body.entries)) ids = body.entries;
  else if (typeof body.ids === 'string') ids = body.ids.split(',');
  else if (c.req.query('ids')) ids = String(c.req.query('ids')).split(',');

  const validIds = ids.map(Number).filter(n => !isNaN(n) && n > 0);
  if (validIds.length === 0) {
    return c.json({ error: 'No valid entry IDs provided' }, 400);
  }

  const updates: { is_starred?: number; is_archived?: number } = {};
  if (body.starred !== undefined) updates.is_starred = Number(body.starred);
  if (body.archive !== undefined) updates.is_archived = Number(body.archive);
  if (body.is_starred !== undefined) updates.is_starred = Number(body.is_starred);
  if (body.is_archived !== undefined) updates.is_archived = Number(body.is_archived);

  const updatedCount = await updateEntriesBatch(c.env.DB, validIds, updates);
  return c.json({ ids: validIds, count: updatedCount, success: true });
};

apiRouter.patch('/api/entries/list', authMiddleware, batchPatchEntriesHandler);
apiRouter.patch('/api/entries/list.json', authMiddleware, batchPatchEntriesHandler);
apiRouter.patch('/api/entries/lists', authMiddleware, batchPatchEntriesHandler);
apiRouter.patch('/api/entries/lists.json', authMiddleware, batchPatchEntriesHandler);

// -------------------------------------------------------------
// Mass Add Tags to Entries: POST /api/entries/tags/lists(.json)
// -------------------------------------------------------------
const batchAddTagsHandler = async (c: any) => {
  let body: any = {};
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json().catch(() => ({}));
  } else {
    body = await c.req.parseBody().catch(() => ({}));
  }

  let ids: any[] = [];
  if (Array.isArray(body.entries)) ids = body.entries;
  else if (Array.isArray(body.ids)) ids = body.ids;
  else if (typeof body.entries === 'string') ids = body.entries.split(',');
  else if (typeof body.ids === 'string') ids = body.ids.split(',');

  const validIds = ids.map(Number).filter(n => !isNaN(n) && n > 0);
  const tags = body.tags || body.tag || '';

  if (validIds.length === 0) {
    return c.json({ error: 'No valid entry IDs provided' }, 400);
  }

  await addTagsToEntriesBatch(c.env.DB, validIds, tags);
  return c.json({ ids: validIds, success: true, message: 'Tags added to entries' });
};

apiRouter.post('/api/entries/tags/lists', authMiddleware, batchAddTagsHandler);
apiRouter.post('/api/entries/tags/lists.json', authMiddleware, batchAddTagsHandler);
apiRouter.post('/api/entries/tags/list', authMiddleware, batchAddTagsHandler);
apiRouter.post('/api/entries/tags/list.json', authMiddleware, batchAddTagsHandler);

// -------------------------------------------------------------
// Mass Remove Tag from Entries: DELETE /api/entries/tags/list(.json)
// -------------------------------------------------------------
const batchRemoveTagsHandler = async (c: any) => {
  let body: any = {};
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json().catch(() => ({}));
  } else {
    body = await c.req.parseBody().catch(() => ({}));
  }

  let ids: any[] = [];
  if (Array.isArray(body.entries)) ids = body.entries;
  else if (Array.isArray(body.ids)) ids = body.ids;
  else if (typeof body.entries === 'string') ids = body.entries.split(',');
  else if (c.req.query('entries')) ids = String(c.req.query('entries')).split(',');
  else if (c.req.query('ids')) ids = String(c.req.query('ids')).split(',');

  const validIds = ids.map(Number).filter(n => !isNaN(n) && n > 0);
  const tagParam = body.tag || body.tag_id || c.req.query('tag') || c.req.query('tag_id') || '';

  if (validIds.length === 0) {
    return c.json({ error: 'No valid entry IDs provided' }, 400);
  }

  await removeTagFromEntriesBatch(c.env.DB, validIds, tagParam);
  return c.json({ ids: validIds, success: true, message: 'Tags removed from entries' });
};

apiRouter.delete('/api/entries/tags/list', authMiddleware, batchRemoveTagsHandler);
apiRouter.delete('/api/entries/tags/list.json', authMiddleware, batchRemoveTagsHandler);
apiRouter.delete('/api/entries/tags/lists', authMiddleware, batchRemoveTagsHandler);
apiRouter.delete('/api/entries/tags/lists.json', authMiddleware, batchRemoveTagsHandler);

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
// Re-fetch / Reload Article: PATCH /api/entries/:id/reload(.json)
// -------------------------------------------------------------
const reloadEntryHandler = async (c: any) => {
  const id = Number(c.req.param('id').replace(/\.json$/, ''));
  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const entry = await getEntryById(c.env.DB, id);
  if (!entry) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  if (!entry.url || entry.domain_name === 'direct-input') {
    return c.json({ error: 'Cannot re-fetch custom pasted text or URL-less entry' }, 400);
  }

  try {
    const domain = extractDomain(entry.url);
    const storedCookie = await getSiteCookieForDomain(c.env.DB, domain);
    const extracted = await extractArticleFromUrl(entry.url, storedCookie || undefined);
    if (!extracted.content || extracted.content.length < 50) {
      return c.json({ error: 'Could not extract readable article text from source (page may be blocked or JS-rendered)' }, 422);
    }

    const updates: Partial<EntryRow> = {
      title: extracted.title || entry.title,
      content: extracted.content,
      preview_picture: extracted.previewPicture || entry.preview_picture,
      domain_name: extracted.domainName || entry.domain_name,
      reading_time: extracted.readingTime || entry.reading_time,
      language: extracted.language || entry.language,
    };
    if (extracted.byline) updates.author = extracted.byline;
    if (extracted.publishedAt) updates.published_at = extracted.publishedAt;

    const updated = await updateEntry(c.env.DB, id, updates);
    return c.json(entryRowToWallabag(updated || entry), 200);
  } catch (err: any) {
    const msg = err.message || 'Could not fetch from source';
    return c.json({ error: `Failed to re-fetch: ${msg}` }, 422);
  }
};

apiRouter.patch('/api/entries/:id/reload', authMiddleware, reloadEntryHandler);
apiRouter.patch('/api/entries/:id/reload.json', authMiddleware, reloadEntryHandler);


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


// -------------------------------------------------------------
// Client Info Endpoint (For KOReader & Sync Settings Modal)
// -------------------------------------------------------------
apiRouter.get('/api/client-info', authMiddleware, async (c: any) => {
  const origin = new URL(c.req.url).origin;
  const clientSecret = getClientSecret(c.env);
  return c.json({
    server_url: origin,
    client_id: 'wallaflare',
    client_secret: clientSecret,
    username: 'wallaflare',
    has_read_token: Boolean(c.env?.READ_TOKEN),
  });
});


// -------------------------------------------------------------
// Database Reset / Wipe Endpoint: POST /api/admin/reset-database(.json)
// -------------------------------------------------------------
const resetDatabaseHandler = async (c: any) => {
  let body: any = {};
  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json().catch(() => ({}));
  } else {
    body = await c.req.parseBody().catch(() => ({}));
  }

  const providedToken = String(body.token || body.password || body.auth_token || '').trim();
  const configuredToken = String(c.env.AUTH_TOKEN || c.env.CLIENT_SECRET || '').trim();

  // If AUTH_TOKEN is configured on server, require exact password/token match in body
  if (configuredToken) {
    if (!providedToken || !timingSafeCompare(providedToken, configuredToken)) {
      return c.json({ error: 'Invalid authentication token / password' }, 401);
    }
  }

  const resetResult = await wipeDatabase(c.env.DB);
  return c.json({
    success: true,
    message: 'Cloudflare D1 database has been wiped clean',
    instance_id: resetResult.instance_id,
    sync_rev: 1
  });
};

apiRouter.post('/api/admin/reset-database', authMiddleware, resetDatabaseHandler);
apiRouter.post('/api/admin/reset-database.json', authMiddleware, resetDatabaseHandler);
