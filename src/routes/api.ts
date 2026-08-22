import { Hono } from 'hono';
import { Env } from '../types';
import { generateToken, authMiddleware } from '../services/auth';
import {
  getEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  entryRowToWallabag,
} from '../db/queries';
import { extractArticleFromUrl, extractArticleFromHtml } from '../services/extractor';
import { generateEpub } from '../services/epub';

export const apiRouter = new Hono<{ Bindings: Env }>();

// -------------------------------------------------------------
// OAuth v2 Authentication (Mock / Validated for Wallabag Clients)
// -------------------------------------------------------------
apiRouter.post('/oauth/v2/token', async (c) => {
  let body: any = {};
  const contentType = c.req.header('Content-Type') || '';

  if (contentType.includes('application/json')) {
    body = await c.req.json().catch(() => ({}));
  } else {
    body = await c.req.parseBody().catch(() => ({}));
  }

  const configuredSecret = c.env.AUTH_TOKEN || c.env.CLIENT_SECRET;

  if (configuredSecret) {
    const providedSecret = body.password || body.client_secret || body.refresh_token;
    if (providedSecret !== configuredSecret) {
      return c.json(
        {
          error: 'invalid_grant',
          error_description: 'Invalid credentials provided.',
        },
        400
      );
    }
  }

  const tokenResp = generateToken(c.env);
  return c.json(tokenResp);
});

// -------------------------------------------------------------
// Wallabag Version & Info Endpoints (Required for Client Handshake)
// -------------------------------------------------------------
apiRouter.get('/api/version', (c) => {
  return c.text('2.6.9');
});

const infoHandler = (c: any) => {
  return c.json({
    appname: c.env.APP_NAME || 'Wallaflare',
    version: '2.6.9',
    allowed_registration: false,
  });
};
apiRouter.get('/api/info', infoHandler);
apiRouter.get('/api/info.json', infoHandler);

const userHandler = (c: any) => {
  return c.json({
    id: 1,
    username: 'wallaflare',
    email: 'user@wallaflare.local',
    created_at: '2024-01-01T00:00:00+0000',
    updated_at: '2024-01-01T00:00:00+0000',
  });
};
apiRouter.get('/api/user', authMiddleware, userHandler);
apiRouter.get('/api/user.json', authMiddleware, userHandler);

// -------------------------------------------------------------
// Tags Compatibility Endpoints
// -------------------------------------------------------------
const tagsHandler = (c: any) => c.json([]);
apiRouter.get('/api/tags', authMiddleware, tagsHandler);
apiRouter.get('/api/tags.json', authMiddleware, tagsHandler);
apiRouter.get('/api/tagging/tags', authMiddleware, tagsHandler);
apiRouter.get('/api/tagging/tags.json', authMiddleware, tagsHandler);

// -------------------------------------------------------------
// Entries List: GET /api/entries(.json)
// -------------------------------------------------------------
const getEntriesHandler = async (c: any) => {
  const query = c.req.query();
  const archive = query.archive !== undefined ? Number(query.archive) : undefined;
  const starred = query.starred !== undefined ? Number(query.starred) : undefined;
  const page = query.page ? Number(query.page) : 1;
  const perPage = query.perPage || query.limit ? Number(query.perPage || query.limit) : 30;
  const sort = query.sort || 'created';
  const order = query.order || 'desc';
  const since = query.since ? Number(query.since) || query.since : undefined;

  const result = await getEntries(c.env.DB, {
    archive,
    starred,
    page,
    perPage,
    sort,
    order,
    since,
  });

  return c.json(result);
};

apiRouter.get('/api/entries', authMiddleware, getEntriesHandler);
apiRouter.get('/api/entries.json', authMiddleware, getEntriesHandler);

// -------------------------------------------------------------
// Ingest New Entry: POST /api/entries(.json)
// -------------------------------------------------------------
const postEntryHandler = async (c: any) => {
  let body: any = {};
  const contentType = c.req.header('Content-Type') || '';

  if (contentType.includes('application/json')) {
    body = await c.req.json().catch(() => ({}));
  } else {
    body = await c.req.parseBody().catch(() => ({}));
  }

  const url = body.url ? String(body.url).trim() : null;
  const title = body.title ? String(body.title).trim() : null;
  const content = body.content ? String(body.content) : null;
  const is_archived = body.archive === 1 || body.archive === '1' || body.is_archived === 1 ? 1 : 0;
  const is_starred = body.starred === 1 || body.starred === '1' || body.is_starred === 1 ? 1 : 0;

  let entryData: {
    url?: string | null;
    title: string;
    content: string;
    preview_picture?: string | null;
    domain_name?: string | null;
    reading_time?: number;
    language?: string;
    is_archived?: number;
    is_starred?: number;
  };

  if (url) {
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
        is_archived,
        is_starred,
      };
    } catch (err: any) {
      // Fallback if URL fetch fails but url provided
      entryData = {
        url,
        title: title || url,
        content: content || `<p>Could not fetch article contents from <a href="${url}">${url}</a>: ${err.message}</p>`,
        domain_name: new URL(url).hostname.replace(/^www\./, ''),
        reading_time: 1,
        language: 'en',
        is_archived,
        is_starred,
      };
    }
  } else if (title && content) {
    const extracted = extractArticleFromHtml(content);
    entryData = {
      url: null,
      title,
      content,
      domain_name: 'direct-input',
      reading_time: extracted.readingTime,
      language: extracted.language || 'en',
      is_archived,
      is_starred,
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
// EPUB Export: GET /api/entries/:id/export.epub
// -------------------------------------------------------------
apiRouter.get('/api/entries/:id/export.epub', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) {
    return c.json({ error: 'Invalid ID' }, 400);
  }

  const entry = await getEntryById(c.env.DB, id);
  if (!entry) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  const epubBytes = generateEpub({
    id: entry.id,
    title: entry.title,
    content: entry.content,
    url: entry.url,
    domain_name: entry.domain_name,
    created_at: entry.created_at,
    language: entry.language,
  });

  const slug = (entry.title || 'article')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);

  return new Response(epubBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': `attachment; filename="${slug || 'article'}.epub"`,
      'Content-Length': String(epubBytes.byteLength),
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

// -------------------------------------------------------------
// Update Entry: PATCH /api/entries/:id(.json)
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

  const updates: any = {};
  if (body.title !== undefined) updates.title = String(body.title);
  if (body.content !== undefined) updates.content = String(body.content);
  if (body.archive !== undefined) updates.is_archived = Number(body.archive) === 1 ? 1 : 0;
  if (body.is_archived !== undefined) updates.is_archived = Number(body.is_archived) === 1 ? 1 : 0;
  if (body.starred !== undefined) updates.is_starred = Number(body.starred) === 1 ? 1 : 0;
  if (body.is_starred !== undefined) updates.is_starred = Number(body.is_starred) === 1 ? 1 : 0;

  const updated = await updateEntry(c.env.DB, id, updates);
  if (!updated) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  return c.json(entryRowToWallabag(updated));
};

apiRouter.patch('/api/entries/:id', authMiddleware, patchEntryHandler);
apiRouter.patch('/api/entries/:id.json', authMiddleware, patchEntryHandler);

// -------------------------------------------------------------
// Delete Entry: DELETE /api/entries/:id(.json)
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

  await deleteEntry(c.env.DB, id);
  return c.json(entryRowToWallabag(existing));
};

apiRouter.delete('/api/entries/:id', authMiddleware, deleteEntryHandler);
apiRouter.delete('/api/entries/:id.json', authMiddleware, deleteEntryHandler);
