import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { EntryRow } from '../types';

// In-memory mock for D1 Database
function createMockD1Database() {
  let entries: EntryRow[] = [];
  let autoId = 1;

  return {
    _entries: entries,
    prepare(query: string) {
      let boundParams: any[] = [];
      const stmt = {
        bind(...params: any[]) {
          boundParams = params;
          return stmt;
        },
        async first<T = any>() {
          if (query.includes('SELECT COUNT(*)')) {
            let filtered = [...entries];
            if (query.includes('is_archived = ?')) {
              const archiveVal = boundParams[0];
              filtered = filtered.filter(e => e.is_archived === archiveVal);
            }
            return { total: filtered.length } as T;
          }
          if (query.includes('SELECT * FROM entries WHERE id = ?')) {
            const id = boundParams[0];
            const found = entries.find(e => e.id === id);
            return (found || null) as T;
          }
          if (query.includes('INSERT INTO entries')) {
            const [url, title, content, preview_picture, domain_name, reading_time, language, is_archived, is_starred, created_at, updated_at] = boundParams;
            const newEntry: EntryRow = {
              id: autoId++,
              url,
              title,
              content,
              preview_picture,
              domain_name,
              reading_time,
              language,
              is_archived,
              is_starred,
              created_at,
              updated_at,
            };
            entries.push(newEntry);
            return newEntry as T;
          }
          if (query.includes('UPDATE entries')) {
            const id = boundParams[boundParams.length - 1];
            const found = entries.find(e => e.id === id);
            if (!found) return null as T;

            let paramIdx = 1;
            if (query.includes('is_starred = ?')) {
              found.is_starred = boundParams[paramIdx++];
            }
            if (query.includes('is_archived = ?')) {
              found.is_archived = boundParams[paramIdx++];
            }
            found.updated_at = boundParams[0];
            return found as T;
          }
          return null as T;
        },
        async all<T = any>() {
          if (query.includes('SELECT * FROM entries')) {
            let results = [...entries];
            if (query.includes('is_archived = ?')) {
              results = results.filter(e => e.is_archived === boundParams[0]);
            }
            if (query.includes('is_starred = ?')) {
              results = results.filter(e => e.is_starred === boundParams[0]);
            }
            return { results: results as T[] };
          }
          return { results: [] as T[] };
        },
        async run() {
          if (query.includes('DELETE FROM entries WHERE id = ?')) {
            const id = boundParams[0];
            const initialLen = entries.length;
            entries = entries.filter(e => e.id !== id);
            return { meta: { changes: initialLen - entries.length } };
          }
          return { meta: { changes: 0 } };
        }
      };
      return stmt;
    }
  } as unknown as D1Database;
}

describe('Wallaflare Wallabag v2 API Endpoints', () => {
  let mockDb: D1Database;

  beforeEach(() => {
    mockDb = createMockD1Database();
  });

  it('handles /oauth/v2/token token issuance', async () => {
    const res = await app.request('/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'password',
        client_id: 'test',
        client_secret: 'test',
        username: 'user',
        password: 'password',
      }),
    }, { DB: mockDb });

    expect(res.status).toBe(200);
    const data = await res.json<any>();
    expect(data.access_token).toBeDefined();
    expect(data.token_type).toBe('bearer');
    expect(data.expires_in).toBeGreaterThan(0);
  });

  it('serves Wallabag version and info endpoints', async () => {
    const verRes = await app.request('/api/version', {}, { DB: mockDb });
    expect(verRes.status).toBe(200);
    expect(await verRes.json()).toBe('2.6.9');

    const infoRes = await app.request('/api/info.json', {}, { DB: mockDb });
    expect(infoRes.status).toBe(200);
    const info = await infoRes.json<any>();
    expect(info.appname).toBeDefined();
    expect(info.version).toBe('2.6.9');
  });

  it('creates, retrieves, updates, and deletes articles', async () => {
    // 1. Direct text ingestion
    const createRes = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Cloudflare Workers with D1',
        content: '<p>A modern edge computing architecture for read-it-later.</p>',
      }),
    }, { DB: mockDb });

    expect(createRes.status).toBe(200);
    const created = await createRes.json<any>();
    expect(created.id).toBe(1);
    expect(created.title).toBe('Cloudflare Workers with D1');
    expect(created.is_archived).toBe(0);
    expect(created.is_starred).toBe(0);

    // 2. Retrieve entries list (Wallabag v2 format)
    const listRes = await app.request('/api/entries.json', {}, { DB: mockDb });
    expect(listRes.status).toBe(200);
    const listData = await listRes.json<any>();
    expect(listData._embedded.items.length).toBe(1);
    expect(listData._embedded.items[0].title).toBe('Cloudflare Workers with D1');

    // 3. Retrieve single entry
    const singleRes = await app.request('/api/entries/1.json', {}, { DB: mockDb });
    expect(singleRes.status).toBe(200);
    const singleData = await singleRes.json<any>();
    expect(singleData.id).toBe(1);

    // 4. Update entry (Star and Archive)
    const patchRes = await app.request('/api/entries/1.json', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        starred: 1,
        archive: 1,
      }),
    }, { DB: mockDb });
    expect(patchRes.status).toBe(200);

    // 5. Export EPUB
    const epubRes = await app.request('/api/entries/1/export.epub', {}, { DB: mockDb });
    expect(epubRes.status).toBe(200);
    expect(epubRes.headers.get('Content-Type')).toBe('application/epub+zip');
    expect(epubRes.headers.get('Content-Disposition')).toContain('.epub');
    const epubBlob = await epubRes.arrayBuffer();
    expect(epubBlob.byteLength).toBeGreaterThan(500);

    // 6. Delete entry
    const delRes = await app.request('/api/entries/1.json', {
      method: 'DELETE',
    }, { DB: mockDb });
    expect(delRes.status).toBe(200);
  });

  it('serves the Web UI dashboard on GET /', async () => {
    const res = await app.request('/', {}, { DB: mockDb });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Wallaflare');
    expect(html).toContain('KOReader');
    expect(html).toContain('Add URL');
  });
});

describe('Wallaflare Protected Mode (AUTH_TOKEN enabled)', () => {
  let mockDb: D1Database;
  const SECRET = 'super-secret-key-123';

  beforeEach(() => {
    mockDb = createMockD1Database();
  });

  it('rejects unauthenticated requests with 401 when AUTH_TOKEN is set', async () => {
    const res = await app.request('/api/entries.json', {}, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(res.status).toBe(401);
  });

  it('permits authenticated requests with valid Bearer token', async () => {
    const res = await app.request('/api/entries.json', {
      headers: { 'Authorization': `Bearer ${SECRET}` },
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(res.status).toBe(200);
  });

  it('permits authenticated requests with access_token query param for EPUB download', async () => {
    const res = await app.request(`/api/entries.json?access_token=${SECRET}`, {}, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(res.status).toBe(200);
  });
});
