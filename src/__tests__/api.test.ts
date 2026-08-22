import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { EntryRow } from '../types';

// In-memory mock for D1 Database
function createMockD1Database() {
  let entries: EntryRow[] = [];
  let tags: Array<{ id: number; label: string; slug: string }> = [];
  let entryTags: Array<{ entry_id: number; tag_id: number }> = [];
  let autoId = 1;
  let autoTagId = 1;

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
          if (query.includes('FROM tags WHERE slug = ?')) {
            const slug = boundParams[0];
            const found = tags.find(t => t.slug === slug);
            return (found || null) as T;
          }
          if (query.includes('FROM tags WHERE slug = ? OR label = ?')) {
            const val = boundParams[0];
            const found = tags.find(t => t.slug === val || t.label === val);
            return (found || null) as T;
          }
          if (query.includes('SELECT * FROM entries WHERE id = ?') || (query.includes('WHERE id = ?') && !query.includes('tags'))) {
            const id = boundParams[0];
            const found = entries.find(e => e.id === id);
            return (found || null) as T;
          }
          if (query.includes('WHERE url = ?')) {
            const url = boundParams[0];
            const found = entries.find(e => e.url === url);
            return (found || null) as T;
          }
          if (query.includes('SELECT MAX(id)')) {
            return entries[entries.length - 1] as T;
          }
          return null as T;
        },
        async all<T = any>() {
          if (query.includes('SELECT * FROM tags')) {
            return { results: [...tags] as T[] };
          }
          if (query.includes('FROM tags t') && query.includes('entry_tags et')) {
            if (query.includes('WHERE et.entry_id = ?')) {
              const entryId = boundParams[0];
              const linkedTagIds = entryTags.filter(et => et.entry_id === entryId).map(et => et.tag_id);
              const matchedTags = tags.filter(t => linkedTagIds.includes(t.id));
              return { results: matchedTags as T[] };
            }
            if (query.includes('WHERE et.entry_id IN')) {
              const results: any[] = [];
              for (const et of entryTags) {
                const tag = tags.find(t => t.id === et.tag_id);
                if (tag) {
                  results.push({ entry_id: et.entry_id, id: tag.id, label: tag.label, slug: tag.slug });
                }
              }
              return { results: results as T[] };
            }
          }
          if (query.includes('SELECT * FROM entries')) {
            if (query.includes('WHERE t.slug IN') || query.includes('entry_tags et')) {
              const tagVal = boundParams[0];
              const matchedTagIds = tags.filter(t => t.slug === tagVal || t.label === tagVal).map(t => t.id);
              const matchedEntryIds = entryTags.filter(et => matchedTagIds.includes(et.tag_id)).map(et => et.entry_id);
              const matchedEntries = entries.filter(e => matchedEntryIds.includes(e.id));
              return { results: matchedEntries as T[] };
            }
            return { results: [...entries] as T[] };
          }
          return { results: [...entries] as T[] };
        },
        async run() {
          if (query.includes('INSERT INTO entries')) {
            const newEntry: EntryRow = {
              id: autoId++,
              url: boundParams[0],
              title: boundParams[1],
              content: boundParams[2],
              preview_picture: boundParams[3],
              domain_name: boundParams[4],
              reading_time: boundParams[5],
              language: boundParams[6],
              is_archived: boundParams[7],
              is_starred: boundParams[8],
              created_at: boundParams[9],
              updated_at: boundParams[10],
            };
            entries.push(newEntry);
            return { meta: { last_row_id: newEntry.id, changes: 1 } };
          }
          if (query.includes('INSERT OR IGNORE INTO tags')) {
            const label = String(boundParams[0]);
            const slug = String(boundParams[1]);
            if (!tags.some(t => t.slug === slug)) {
              tags.push({ id: autoTagId++, label, slug });
            }
            return { meta: { changes: 1 } };
          }
          if (query.includes('INSERT OR IGNORE INTO entry_tags')) {
            const entryId = Number(boundParams[0]);
            const tagId = Number(boundParams[1]);
            if (!entryTags.some(et => et.entry_id === entryId && et.tag_id === tagId)) {
              entryTags.push({ entry_id: entryId, tag_id: tagId });
            }
            return { meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?')) {
            const entryId = Number(boundParams[0]);
            const tagId = Number(boundParams[1]);
            entryTags = entryTags.filter(et => !(et.entry_id === entryId && et.tag_id === tagId));
            return { meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM entries WHERE id = ?')) {
            const id = Number(boundParams[0]);
            entries = entries.filter(e => e.id !== id);
            entryTags = entryTags.filter(et => et.entry_id !== id);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 1 } };
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

  it('checks article existence via /api/entries/exists.json', async () => {
    const existsRes = await app.request('/api/entries/exists.json?url=https://example.com/notfound', {}, { DB: mockDb });
    expect(existsRes.status).toBe(200);
    const existsData = await existsRes.json<any>();
    expect(existsData.exists).toBe(false);
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


  it('supports full tag lifecycle: adding, listing, filtering, and removing tags', async () => {
    

    // 1. Create article with tags
    const createRes = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/tagged-story',
        title: 'Tagged Story',
        content: '<p>Content</p>',
        tags: 'tech, news'
      })
    }, { DB: mockDb });

    expect(createRes.status).toBe(200);
    const created = await createRes.json<any>();
    expect(created.tags).toHaveLength(2);
    expect(created.tags.map((t: any) => t.label)).toContain('tech');

    // 2. Fetch tags for entry
    const entryTagsRes = await app.request(`/api/entries/${created.id}/tags.json`, {}, { DB: mockDb });
    expect(entryTagsRes.status).toBe(200);
    const entryTags = await entryTagsRes.json<any>();
    expect(entryTags).toHaveLength(2);

    // 3. Add an additional tag
    const addTagRes = await app.request(`/api/entries/${created.id}/tags.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: 'highlights' })
    }, { DB: mockDb });
    expect(addTagRes.status).toBe(200);
    const updatedWithTag = await addTagRes.json<any>();
    expect(updatedWithTag.tags).toHaveLength(3);

    // 4. Filter entries by tag
    const filterRes = await app.request('/api/entries.json?tags=tech', {}, { DB: mockDb });
    expect(filterRes.status).toBe(200);
    const filterData = await filterRes.json<any>();
    expect(filterData._embedded.items).toHaveLength(1);

    // 5. Remove a tag
    const tagToRemove = updatedWithTag.tags[0].id;
    const deleteTagRes = await app.request(`/api/entries/${created.id}/tags/${tagToRemove}.json`, {
      method: 'DELETE'
    }, { DB: mockDb });
    expect(deleteTagRes.status).toBe(200);
    const afterDelete = await deleteTagRes.json<any>();
    expect(afterDelete.tags).toHaveLength(2);
  });


  it('prevents adding duplicate article URLs and returns existing entry with added date notification', async () => {
    const mockDb = createMockD1Database();
    
    // First creation
    const res1 = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/unique-article-test',
        title: 'Unique Article',
      })
    }, { DB: mockDb });

    expect(res1.status).toBe(200);
    const entry1 = await res1.json<any>();
    expect(entry1.already_exists).toBeUndefined();

    // Duplicate creation
    const res2 = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/unique-article-test',
        title: 'Unique Article Duplicate Attempt',
      })
    }, { DB: mockDb });

    expect(res2.status).toBe(200);
    const entry2 = await res2.json<any>();
    expect(entry2.id).toBe(entry1.id);
    expect(entry2.already_exists).toBe(true);
    expect(entry2.added_date_str).toBeDefined();
  });

  it('serves the Web UI dashboard on GET / with browser headers', async () => {
    const res = await app.request('/?view=dashboard', {}, { DB: mockDb });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Wallaflare');
    expect(html).toContain('KOReader');
    expect(html).toContain('Add URL');
  });

  it('serves Wallabag login page on GET /login', async () => {
    const res = await app.request('/login', {}, { DB: mockDb });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('loginform');
    expect(html).toContain('wallabag logo');
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
