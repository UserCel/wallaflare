import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { EntryRow } from '../types';

// In-memory mock for D1 Database
function createMockD1Database() {
  let entries: EntryRow[] = [];
  let tags: Array<{ id: number; label: string; slug: string }> = [];
  let entryTags: Array<{ entry_id: number; tag_id: number }> = [];
  let rateLimits: Map<string, { failed_attempts: number; last_attempt_at: number; locked_until: number }> = new Map();
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
          if (query.includes('FROM auth_rate_limits WHERE ip = ?')) {
            const ip = boundParams[0];
            return (rateLimits.get(ip) || null) as T;
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
              author: boundParams[11] || null,
              published_at: boundParams[12] || null,
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
          if (query.includes('UPDATE entries SET')) {
            const id = Number(boundParams[boundParams.length - 1]);
            const entry = entries.find(e => e.id === id);
            if (entry) {
              const setPart = query.split('SET')[1].split('WHERE')[0];
              const clauses = setPart.split(',').map(s => s.trim());
              clauses.forEach((c, idx) => {
                if (c.startsWith('title = ?')) entry.title = boundParams[idx];
                if (c.startsWith('content = ?')) entry.content = boundParams[idx];
                if (c.startsWith('is_archived = ?')) entry.is_archived = boundParams[idx];
                if (c.startsWith('is_starred = ?')) entry.is_starred = boundParams[idx];
              });
              entry.updated_at = new Date().toISOString();
            }
            return { meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM entries WHERE id = ?')) {
            const id = Number(boundParams[0]);
            entries = entries.filter(e => e.id !== id);
            entryTags = entryTags.filter(et => et.entry_id !== id);
            return { meta: { changes: 1 } };
          }
          if (query.includes('auth_rate_limits') && query.includes('INSERT INTO')) {
            const ip = boundParams[0];
            rateLimits.set(ip, {
              failed_attempts: boundParams[1],
              last_attempt_at: boundParams[2],
              locked_until: boundParams[3]
            });
            return { meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM auth_rate_limits WHERE ip = ?')) {
            const ip = boundParams[0];
            rateLimits.delete(ip);
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

describe('Wallaflare Brute Force & Rate Limiting Protection', () => {
  const SECRET = 'ultra_secure_pass_123';

  it('tracks consecutive failed login attempts and locks out after 5 failures', async () => {
    const mockDb = createMockD1Database();


    // 1st failed attempt -> 4 left
    let res = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong_1' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(res.status).toBe(400);
    let data = await res.json<any>();
    expect(data.attempts_left).toBe(4);
    expect(data.message).toContain('4 attempts remaining');

    // 2nd failed attempt -> 3 left
    res = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong_2' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(res.status).toBe(400);
    data = await res.json<any>();
    expect(data.attempts_left).toBe(3);

    // 3rd failed attempt -> 2 left
    res = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong_3' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(res.status).toBe(400);
    data = await res.json<any>();
    expect(data.attempts_left).toBe(2);

    // 4th failed attempt -> 1 left
    res = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong_4' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(res.status).toBe(400);
    data = await res.json<any>();
    expect(data.attempts_left).toBe(1);

    // 5th failed attempt -> 429 Too Many Requests (Lockout for 15 mins)
    res = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong_5' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(res.status).toBe(429);
    data = await res.json<any>();
    expect(data.locked).toBe(true);
    expect(data.remaining_minutes).toBe(15);
    expect(data.message).toContain('locked out');

    // Subsequent request while locked is immediately rejected with 429
    res = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: SECRET })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(res.status).toBe(429);
  });

  it('resets the failed attempts counter upon a successful login before lockout', async () => {
    const mockDb = createMockD1Database();


    // 2 failed attempts
    await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'bad_token' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'bad_token' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    // Correct login resets the counter
    const successRes = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: SECRET })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(successRes.status).toBe(200);
    const successData = await successRes.json<any>();
    expect(successData.success).toBe(true);

    // Next failure starts fresh with 4 attempts remaining
    const nextRes = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong_again' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(nextRes.status).toBe(400);
    const nextData = await nextRes.json<any>();
    expect(nextData.attempts_left).toBe(4);
  });

  it('automatically resets failed attempts if 15 minutes pass between attempts', async () => {
    const mockDb = createMockD1Database();

    // 3 failed attempts
    for (let i = 0; i < 3; i++) {
      await app.request('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'wrong_old' })
      }, { DB: mockDb, AUTH_TOKEN: SECRET });
    }

    // Advance last_attempt_at time in mock DB by 20 minutes (1200000 ms) in the past
    const row = await mockDb.prepare('SELECT failed_attempts, last_attempt_at, locked_until FROM auth_rate_limits WHERE ip = ?').bind('127.0.0.1').first<any>();
    if (row) {
      await mockDb.prepare('INSERT INTO auth_rate_limits (ip, failed_attempts, last_attempt_at, locked_until) VALUES (?, ?, ?, ?)').bind(
        '127.0.0.1',
        row.failed_attempts,
        Date.now() - (20 * 60 * 1000),
        0
      ).run();
    }

    // Next failure after 20 minutes should start fresh (4 attempts left, not 1)
    const nextRes = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'wrong_fresh' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(nextRes.status).toBe(400);
    const nextData = await nextRes.json<any>();
    expect(nextData.attempts_left).toBe(4);
  });
});
describe('Search Engine Privacy & Robots Exclusion', () => {
  it('serves /robots.txt disallowing all crawlers', async () => {
    const res = await app.request('/robots.txt');
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Disallow: /');
  });

  it('includes X-Robots-Tag: noindex, nofollow on all responses', async () => {
    const res = await app.request('/api/version');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive, nosnippet');
  });
});

describe('Custom Text Ingestion with Author & Tags', () => {
  let mockDb: any;
  beforeEach(() => {
    mockDb = createMockD1Database();
  });

  it('saves custom text with author, tags, and source URL', async () => {
    const res = await app.request('/api/entries.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Custom Chapter 1',
        content: '<p>This is a custom pasted story chapter.</p>',
        author: 'Brandon Sanderson',
        tags: 'fantasy, cosmere',
        url: 'https://brandonsanderson.com/chapter1'
      })
    }, { DB: mockDb });

    expect(res.status).toBe(200);
    const data = await res.json<any>();
    expect(data.title).toBe('Custom Chapter 1');
    expect(data.published_by).toEqual(['Brandon Sanderson']);
    expect(data.author).toBe('Brandon Sanderson');
    expect(data.tags).toHaveLength(2);
  });
});

describe('Article Title Editing via API', () => {
  let mockDb: any;
  beforeEach(() => {
    mockDb = createMockD1Database();
  });

  it('updates article title via PATCH /api/entries/:id.json', async () => {
    // 1. Create entry
    const createRes = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Original Noisy Title | Blog Name',
        content: '<p>Article content here.</p>',
      })
    }, { DB: mockDb });

    const created = await createRes.json<any>();
    expect(created.title).toBe('Original Noisy Title | Blog Name');

    // 2. Patch title
    const patchRes = await app.request(`/api/entries/${created.id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Cleaned Article Title'
      })
    }, { DB: mockDb });

    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json<any>();
    expect(patched.title).toBe('Cleaned Article Title');
  });
});

describe('Re-fetch Article Content API', () => {
  let mockDb: any;
  beforeEach(() => {
    mockDb = createMockD1Database();
  });

  it('rejects reload on direct-input manual entries to preserve hand-crafted text', async () => {
    // 1. Create custom text entry with a URL
    const createRes = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Custom Story Chapter',
        content: '<p>My custom hand-crafted story text.</p>',
        url: 'https://example.com/chapter-url',
      })
    }, { DB: mockDb });

    const created = await createRes.json<any>();
    expect(created.domain_name).toBe('direct-input');

    // 2. Attempt to reload
    const reloadRes = await app.request(`/api/entries/${created.id}/reload.json`, {
      method: 'PATCH',
    }, { DB: mockDb });

    expect(reloadRes.status).toBe(400);
    const errData = await reloadRes.json<any>();
    expect(errData.error).toContain('Cannot re-fetch custom pasted text');
  });
});

describe('Custom Text Ingestion (Plain text & Markdown)', () => {
  let mockDb: any;
  beforeEach(() => {
    mockDb = createMockD1Database();
  });

  it('successfully saves plain text notes without HTML tags', async () => {
    const res = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Plain Text Note',
        content: 'This is a simple plain text entry with no html tags.\n\nHere is paragraph two.',
        author: 'Note Taker',
      })
    }, { DB: mockDb });

    expect(res.status).toBe(200);
    const data = await res.json<any>();
    expect(data.title).toBe('Plain Text Note');
    expect(data.domain_name).toBe('direct-input');
    expect(data.content).toContain('This is a simple plain text entry');
  });
});
