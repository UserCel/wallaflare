import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { EntryRow } from '../types';

// In-memory mock for D1 Database
function createMockD1Database() {
  let entries: EntryRow[] = [];
  let tags: Array<{ id: number; label: string; slug: string }> = [];
  let entryTags: Array<{ entry_id: number; tag_id: number }> = [];
  let rateLimits: Map<string, { failed_attempts: number; last_attempt_at: number; locked_until: number }> = new Map();
  let annotations: Array<{ id: number; entry_id: number; user_id: string; quote: string; text: string; color: string; ranges: string; target: string | null; created_at: string; updated_at: string }> = [];
  let autoId = 1;
  let autoTagId = 1;
  let autoAnnotationId = 1;
  let currentRev = 1;
  let currentInstanceId = 1780000000000;
  let deletedEntries: Array<{ entry_id: number; revision: number; deleted_at: string }> = [];

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
          if (query.includes('FROM sync_state') || query.includes('UPDATE sync_state')) {
            if (query.includes('UPDATE sync_state')) {
              currentRev++;
            }
            return { revision: currentRev, instance_id: currentInstanceId } as T;
          }
          if (query.includes('SUM(CASE WHEN is_archived = 0')) {
            const unread = entries.filter(e => !e.is_archived).length;
            const starred = entries.filter(e => e.is_starred).length;
            const archive = entries.filter(e => e.is_archived).length;
            const total = entries.length;
            return { unread, starred, archive, total } as T;
          }
          if (query.includes('SELECT COUNT(*)')) {
            let filtered = [...entries];
            if (query.includes('is_archived = ?')) {
              const archiveVal = boundParams[0];
              filtered = filtered.filter(e => e.is_archived === archiveVal);
            }
            return { total: filtered.length } as T;
          }
                    if (query.includes('FROM annotations WHERE id = ?')) {
            const id = boundParams[0];
            const found = annotations.find(a => a.id === id);
            return (found || null) as T;
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
          if (query.includes('FROM deleted_entries')) {
            const since = boundParams[0] || 0;
            const matched = deletedEntries.filter(d => d.revision > since);
            return { results: matched as T[] };
          }
          if (query.includes('FROM annotations')) {
            if (query.includes('WHERE entry_id = ?')) {
              const entryId = boundParams[0];
              const matched = annotations.filter(a => a.entry_id === entryId);
              return { results: matched as T[] };
            }
            if (query.includes('WHERE entry_id IN')) {
              const entryIds = boundParams;
              const matched = annotations.filter(a => entryIds.includes(a.entry_id));
              return { results: matched as T[] };
            }
            return { results: [...annotations] as T[] };
          }
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
            return {
              results: tags.map(t => ({
                id: t.id,
                label: t.label,
                slug: t.slug,
                entry_count: entryTags.filter(et => et.tag_id === t.id).length
              })) as T[]
            };
          }
          if (query.includes('SELECT * FROM entries')) {
            let matched = [...entries];
            if (query.includes('revision > ?')) {
              const revVal = boundParams.find(p => typeof p === 'number');
              if (typeof revVal === 'number') {
                matched = matched.filter(e => (e.revision || 1) > revVal);
              }
            }
            if (query.includes('WHERE t.slug IN') || query.includes('entry_tags et')) {
              const tagVal = boundParams[0];
              const matchedTagIds = tags.filter(t => t.slug === tagVal || t.label === tagVal).map(t => t.id);
              const matchedEntryIds = entryTags.filter(et => matchedTagIds.includes(et.tag_id)).map(et => et.entry_id);
              matched = entries.filter(e => matchedEntryIds.includes(e.id));
            }
            if (query.includes('title COLLATE NOCASE ASC') || (query.includes('title COLLATE NOCASE') && query.includes('ASC'))) {
              matched.sort((a, b) => a.title.localeCompare(b.title));
            } else if (query.includes('reading_time ASC') || (query.includes('reading_time') && query.includes('ASC'))) {
              matched.sort((a, b) => (a.reading_time || 1) - (b.reading_time || 1));
            } else if (query.includes('reading_time DESC') || (query.includes('reading_time') && query.includes('DESC'))) {
              matched.sort((a, b) => (b.reading_time || 1) - (a.reading_time || 1));
            } else if (query.includes('ORDER BY created_at ASC')) {
              matched.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            } else if (query.includes('ORDER BY created_at DESC')) {
              matched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            }

            if (query.includes('LIMIT ? OFFSET ?') && boundParams.length >= 2) {
              const limit = boundParams[boundParams.length - 2];
              const offset = boundParams[boundParams.length - 1];
              if (typeof limit === 'number' && typeof offset === 'number') {
                matched = matched.slice(offset, offset + limit);
              }
            }
            return { results: matched as T[] };
          }
          return { results: [...entries] as T[] };
        },
        async run() {
          if (query.includes('INSERT OR REPLACE INTO deleted_entries')) {
            const entryId = boundParams[0];
            const rev = boundParams[1];
            deletedEntries.push({ entry_id: entryId, revision: rev, deleted_at: new Date().toISOString() });
            return { meta: { changes: 1 } };
          }
          if (query.includes('UPDATE sync_state')) {
            currentRev++;
            return { meta: { changes: 1 } };
          }
          if (query.includes('INSERT INTO annotations')) {
            const entryId = Number(boundParams[0]);
            const userId = String(boundParams[1]);
            const quote = String(boundParams[2]);
            const text = String(boundParams[3] || '');
            const color = String(boundParams[4] || 'yellow');
            const ranges = String(boundParams[5] || '[]');
            const target = boundParams[6] ? String(boundParams[6]) : null;
            const createdAt = String(boundParams[7]);
            const updatedAt = String(boundParams[8]);
            const newAnn = {
              id: autoAnnotationId++,
              entry_id: entryId,
              user_id: userId,
              quote,
              text,
              color,
              ranges,
              target,
              created_at: createdAt,
              updated_at: updatedAt
            };
            annotations.push(newAnn);
            return { meta: { last_row_id: newAnn.id, changes: 1 } };
          }
          if (query.includes('UPDATE annotations SET')) {
            const id = Number(boundParams[boundParams.length - 1]);
            const found = annotations.find(a => a.id === id);
            if (found) {
              if (boundParams[0] !== undefined) found.text = String(boundParams[0]);
              if (boundParams[1] !== undefined) found.color = String(boundParams[1]);
              if (boundParams[2] !== undefined) found.target = boundParams[2] ? String(boundParams[2]) : null;
              found.updated_at = String(boundParams[3]);
            }
            return { meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM annotations WHERE id = ?')) {
            const id = Number(boundParams[0]);
            const idx = annotations.findIndex(a => a.id === id);
            if (idx >= 0) {
              annotations.splice(idx, 1);
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
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
              revision: boundParams[13] || currentRev,
              content_revision: 1,
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
            if (query.includes('WHERE id IN')) {
              const setPart = query.split('SET')[1].split('WHERE')[0];
              const clauses = setPart.split(',').map(s => s.trim());
              // params: updated_at, is_starred/is_archived, ...ids
              const targetIds = boundParams.slice(clauses.length).map(Number);
              entries.filter(e => targetIds.includes(e.id)).forEach(entry => {
                clauses.forEach((c, idx) => {
                  if (c.startsWith('is_archived = ?')) entry.is_archived = boundParams[idx];
                  if (c.startsWith('is_starred = ?')) entry.is_starred = boundParams[idx];
                });
                entry.updated_at = new Date().toISOString();
              });
              return { meta: { changes: targetIds.length } };
            } else {
              const id = Number(boundParams[boundParams.length - 1]);
              const entry = entries.find(e => e.id === id);
              if (entry) {
                const setPart = query.split('SET')[1].split('WHERE')[0];
                const clauses = setPart.split(',').map(s => s.trim());
                if (query.includes('content_revision = content_revision + 1')) {
                  entry.content_revision = (entry.content_revision || 1) + 1;
                }
                clauses.forEach((c, idx) => {
                  if (c.startsWith('title = ?')) entry.title = boundParams[idx];
                  if (c.startsWith('content = ?')) entry.content = boundParams[idx];
                  if (c.startsWith('author = ?')) entry.author = boundParams[idx];
                  if (c.startsWith('url = ?')) entry.url = boundParams[idx];
                  if (c.startsWith('is_archived = ?')) entry.is_archived = boundParams[idx];
                  if (c.startsWith('is_starred = ?')) entry.is_starred = boundParams[idx];
                  if (c.startsWith('revision = ?')) entry.revision = boundParams[idx];
                });
                entry.updated_at = new Date().toISOString();
              }
              return { meta: { changes: 1 } };
            }
          }
          if (query.includes('DELETE FROM entries WHERE id IN') || query.includes('DELETE FROM entries WHERE id = ?')) {
            const targetIds = boundParams.map(Number);
            const beforeCount = entries.length;
            entries.splice(0, entries.length, ...entries.filter(e => !targetIds.includes(e.id)));
            entryTags.splice(0, entryTags.length, ...entryTags.filter(et => !targetIds.includes(et.entry_id)));
            return { meta: { changes: beforeCount - entries.length } };
          }
          if (query.trim() === 'DELETE FROM entries') {
            entries.length = 0;
            return { meta: { changes: 1 } };
          }
          if (query.trim() === 'DELETE FROM tags') {
            tags.length = 0;
            return { meta: { changes: 1 } };
          }
          if (query.trim() === 'DELETE FROM entry_tags') {
            entryTags.length = 0;
            return { meta: { changes: 1 } };
          }
          if (query.trim() === 'DELETE FROM annotations') {
            annotations.length = 0;
            return { meta: { changes: 1 } };
          }
          if (query.trim() === 'DELETE FROM deleted_entries') {
            deletedEntries.length = 0;
            return { meta: { changes: 1 } };
          }
          if (query.trim() === 'DELETE FROM sync_state') {
            currentRev = 1;
            return { meta: { changes: 1 } };
          }
          if (query.includes('INSERT INTO sync_state')) {
            currentRev = 1;
            if (typeof boundParams[0] === 'number') {
              currentInstanceId = boundParams[0];
            } else if (typeof boundParams[1] === 'number') {
              currentInstanceId = boundParams[1];
            }
            return { meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM entry_tags WHERE entry_id IN')) {
            const targetIds = boundParams.map(Number);
            entryTags = entryTags.filter(et => !targetIds.includes(et.entry_id));
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
          if (query.includes('DELETE FROM auth_rate_limits')) {
            boundParams.forEach(p => rateLimits.delete(p));
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

  it('checks article existence via /api/entries/exists.json conforming to Wallabag v2', async () => {
    // 1. Not found -> returns false
    const notFoundRes = await app.request('/api/entries/exists.json?url=https://example.com/notfound', {}, { DB: mockDb });
    expect(notFoundRes.status).toBe(200);
    expect(await notFoundRes.json()).toEqual({ exists: false });

    // 2. Create article
    const createRes = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/exists-check', title: 'Exists Test' })
    }, { DB: mockDb });
    const createdItem = await createRes.json<any>();
    expect(createdItem.hashed_url).toBeDefined();
    expect(typeof createdItem.hashed_url).toBe('string');
    const hash = createdItem.hashed_url;

    // 3. Found via raw URL -> returns true
    const foundRes = await app.request('/api/entries/exists.json?url=https://example.com/exists-check', {}, { DB: mockDb });
    expect(foundRes.status).toBe(200);
    expect(await foundRes.json()).toEqual({ exists: true });

    // 4. Found via hashed_url -> returns true
    const hashRes = await app.request(`/api/entries/exists.json?hashed_url=${hash}`, {}, { DB: mockDb });
    expect(hashRes.status).toBe(200);
    expect(await hashRes.json()).toEqual({ exists: true });

    // 5. Multi-hash sweep check (Wallabag app "sweep deleted articles")
    const sweepRes = await app.request(`/api/entries/exists.json?hashed_urls[]=${hash}&hashed_urls[]=deadbeef1234`, {}, { DB: mockDb });
    expect(sweepRes.status).toBe(200);
    const sweepData = await sweepRes.json<any>();
    expect(sweepData[hash]).toBe(true);
    expect(sweepData['deadbeef1234']).toBe(false);

    // 6. Multi-URL check
    const multiUrlRes = await app.request('/api/entries/exists.json?urls[]=https://example.com/exists-check&urls[]=https://example.com/missing', {}, { DB: mockDb });
    expect(multiUrlRes.status).toBe(200);
    const multiUrlData = await multiUrlRes.json<any>();
    expect(multiUrlData['https://example.com/exists-check']).toBe(true);
    expect(multiUrlData['https://example.com/missing']).toBe(false);

    // 7. Duplicate prevention with title & content (Wallabagger browser mode)
    const dupRes = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com/exists-check',
        title: 'Browser Extracted' ,
        content: '<p>Browser content</p>'
      })
    }, { DB: mockDb });

    expect(dupRes.status).toBe(200);
    const dupData = await dupRes.json<any>();
    expect(dupData.already_exists).toBe(true);
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


  
  it("serves the KOReader native plugin bundle as a downloadable zip on GET /download/wallaflare.koplugin.zip", async () => {
    const res = await app.request("/download/wallaflare.koplugin.zip", {}, { DB: mockDb });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    expect(res.headers.get("Content-Disposition")).toContain("wallaflare.koplugin.zip");
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(100);
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

  it('sets domain_name when URL is provided and preserves direct-input when URL is missing', async () => {
    // 1. Create entry with title, content, and URL (e.g. Wallabagger browser fetch)
    const resWithUrl = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Browser Extracted Article',
        content: '<p>Parsed content from browser tab.</p>',
        url: 'https://example.com/news/article-1',
      })
    }, { DB: mockDb });

    const itemWithUrl = await resWithUrl.json<any>();
    expect(itemWithUrl.domain_name).toBe('example.com');

    // 2. Create entry with title and content without URL (URL-less note)
    const resNoUrl = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'URL-less Custom Note',
        content: '<p>My custom hand-crafted note with no source URL.</p>',
      })
    }, { DB: mockDb });

    const itemNoUrl = await resNoUrl.json<any>();
    expect(itemNoUrl.domain_name).toBe('direct-input');

    // Attempt reload on URL-less note -> 400 error
    const reloadRes = await app.request(`/api/entries/${itemNoUrl.id}/reload.json`, {
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

describe('Custom Text Preview Picture Support', () => {
  let mockDb: any;
  beforeEach(() => {
    mockDb = createMockD1Database();
  });

  it('persists manual preview_picture on custom text submission', async () => {
    const res = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Book Chapter with Custom Cover',
        content: '<p>Chapter text goes here.</p>',
        preview_picture: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
      })
    }, { DB: mockDb });

    expect(res.status).toBe(200);
    const data = await res.json<any>();
    expect(data.preview_picture).toBe('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c');
    expect(data.domain_name).toBe('direct-input');
  });
});


describe('Wallabag v2 Batch Operations', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockD1Database();
  });
  it('mass deletes entries via DELETE /api/entries/list.json', async () => {
    // 1. Create 3 articles
    const res1 = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/batch-del-1', title: 'Batch Delete 1' })
    }, { DB: mockDb });
    const res2 = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/batch-del-2', title: 'Batch Delete 2' })
    }, { DB: mockDb });
    const res3 = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/batch-del-3', title: 'Batch Delete 3' })
    }, { DB: mockDb });

    const item1 = await res1.json();
    const item2 = await res2.json();
    const item3 = await res3.json();

    // 2. Mass delete item1 and item2 in one call
    const delBatchRes = await app.request('/api/entries/list.json', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [item1.id, item2.id] })
    }, { DB: mockDb });

    expect(delBatchRes.status).toBe(200);
    const delData = await delBatchRes.json();
    expect(delData.success).toBe(true);
    expect(delData.count).toBe(2);

    // Verify item1 & item2 are gone, item3 remains
    const check1 = await app.request(`/api/entries/${item1.id}.json`, {}, { DB: mockDb });
    expect(check1.status).toBe(404);
    const check2 = await app.request(`/api/entries/${item2.id}.json`, {}, { DB: mockDb });
    expect(check2.status).toBe(404);
    const check3 = await app.request(`/api/entries/${item3.id}.json`, {}, { DB: mockDb });
    expect(check3.status).toBe(200);
  });

  it('mass updates entries (star/archive) via PATCH /api/entries/list.json', async () => {
    const res1 = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/batch-patch-1', title: 'Batch Patch 1' })
    }, { DB: mockDb });
    const res2 = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/batch-patch-2', title: 'Batch Patch 2' })
    }, { DB: mockDb });

    const item1 = await res1.json();
    const item2 = await res2.json();

    // Mass star both entries
    const patchRes = await app.request('/api/entries/list.json', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [item1.id, item2.id], starred: 1, archive: 1 })
    }, { DB: mockDb });

    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.success).toBe(true);
    expect(patchData.count).toBe(2);

    const check1 = await app.request(`/api/entries/${item1.id}.json`, {}, { DB: mockDb });
    const updated1 = await check1.json();
    expect(updated1.is_starred).toBe(1);
    expect(updated1.is_archived).toBe(1);
  });

  it('mass adds and removes tags via /api/entries/tags/lists.json and /api/entries/tags/list.json', async () => {
    const res1 = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/batch-tag-1', title: 'Batch Tag 1' })
    }, { DB: mockDb });
    const res2 = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/batch-tag-2', title: 'Batch Tag 2' })
    }, { DB: mockDb });

    const item1 = await res1.json();
    const item2 = await res2.json();

    // Mass add tag "bulk-test"
    const addTagsRes = await app.request('/api/entries/tags/lists.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [item1.id, item2.id], tags: 'bulk-test, news' })
    }, { DB: mockDb });

    expect(addTagsRes.status).toBe(200);

    // Verify tag added to item1
    const checkTags1 = await app.request(`/api/entries/${item1.id}/tags.json`, {}, { DB: mockDb });
    const tags1 = await checkTags1.json();
    expect(tags1.some((t: any) => t.slug === 'bulk-test')).toBe(true);

    // Mass remove tag "bulk-test"
    const removeTagsRes = await app.request('/api/entries/tags/list.json', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [item1.id, item2.id], tag: 'bulk-test' })
    }, { DB: mockDb });

    expect(removeTagsRes.status).toBe(200);

    const checkTagsAfter = await app.request(`/api/entries/${item1.id}/tags.json`, {}, { DB: mockDb });
    const tagsAfter = await checkTagsAfter.json();
    expect(tagsAfter.some((t: any) => t.slug === 'bulk-test')).toBe(false);
  });
});


describe("Developer Page & OAuth Client Secret Security", () => {
  let mockDb: D1Database;
  const SECRET = "super-secret-password-xyz";

  beforeEach(() => {
    mockDb = createMockD1Database();
  });

  it("redirects unauthenticated GET /developer requests to /login", async () => {
    const res = await app.request("/developer", {}, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/login");
  });

  it("rejects invalid password on POST /login_check", async () => {
    const res = await app.request("/login_check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "_username=wallaflare&_password=wrong-password"
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/login?error=1");
  });

  it("authenticates POST /login_check with correct password and sets session cookie", async () => {
    const res = await app.request("/login_check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `_username=wallaflare&_password=${SECRET}`
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/developer");

    const setCookie = res.headers.get("Set-Cookie") || "";
    expect(setCookie).toContain("PHPSESSID=");

    // Extract cookie
    const match = setCookie.match(/PHPSESSID=([^;]+)/);
    expect(match).not.toBeNull();
    const sessionToken = match![1];

    // Access /developer with authenticated session cookie
    const devRes = await app.request("/developer", {
      headers: { "Cookie": `PHPSESSID=${sessionToken}` }
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });

    expect(devRes.status).toBe(200);
    const html = await devRes.text();
    expect(html).toContain("API clients management");
    expect(html).toContain("wallaflare");
    // Verify master password is NEVER exposed in the HTML
    expect(html).not.toContain(SECRET);
  });

  it("uses custom CLIENT_SECRET in /developer HTML when explicitly configured", async () => {
    const CUSTOM_CLIENT_SECRET = "custom_extension_secret_abc123";
    const loginRes = await app.request("/login_check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `_username=wallaflare&_password=${SECRET}`
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
      CLIENT_SECRET: CUSTOM_CLIENT_SECRET
    });

    const setCookie = loginRes.headers.get("Set-Cookie") || "";
    const match = setCookie.match(/PHPSESSID=([^;]+)/);
    const sessionToken = match![1];

    const devRes = await app.request("/developer", {
      headers: { "Cookie": `PHPSESSID=${sessionToken}` }
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
      CLIENT_SECRET: CUSTOM_CLIENT_SECRET
    });

    expect(devRes.status).toBe(200);
    const html = await devRes.text();
    expect(html).toContain(CUSTOM_CLIENT_SECRET);
    expect(html).not.toContain(SECRET);
  });

  it("exchanges credentials for access_token on /oauth/v2/token with decoupled client secret", async () => {
    const CUSTOM_CLIENT_SECRET = "client_sec_test_999";
    const res = await app.request("/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "password",
        client_id: "wallaflare",
        client_secret: CUSTOM_CLIENT_SECRET,
        username: "wallaflare",
        password: SECRET
      })
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
      CLIENT_SECRET: CUSTOM_CLIENT_SECRET
    });

    expect(res.status).toBe(200);
    const data = await res.json<any>();
    expect(data.access_token).toBe(SECRET);
    expect(data.token_type).toBe("bearer");
  });


  it("rejects invalid username on POST /login_check even if password is correct", async () => {
    const res = await app.request("/login_check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `_username=wronguser&_password=${SECRET}`
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/login?error=1");
  });

  it("rejects invalid username on /oauth/v2/token password grant", async () => {
    const res = await app.request("/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "password",
        client_id: "wallaflare",
        client_secret: "wallaflare",
        username: "wronguser",
        password: SECRET
      })
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });

    expect(res.status).toBe(400);
    const data = await res.json<any>();
    expect(data.error).toBe("invalid_grant");
  });


  it('returns Cache-Control headers on /api/tags.json for extensions and supports live queries', async () => {
    // 1. Check standard tags request contains Cache-Control header for extension caching
    const tagsRes = await app.request('/api/tags.json', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(tagsRes.status).toBe(200);
    expect(tagsRes.headers.get('Cache-Control')).toContain('private, max-age=300');

    // 2. Add an article with a new tag
    const createRes = await app.request('/api/entries.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`
      },
      body: JSON.stringify({
        title: 'Live Tag Article',
        content: '<p>Content with tags</p>',
        tags: 'urgent, breaking'
      })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(createRes.status).toBe(200);

    // 3. Request with dashboard timestamp bypass pattern -> Returns fresh tags immediately
    const liveTagsRes = await app.request('/api/tags.json?_t=' + Date.now(), {
      headers: {
        'Cache-Control': 'no-cache',
        'Authorization': `Bearer ${SECRET}`
      }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(liveTagsRes.status).toBe(200);
    const tags = await liveTagsRes.json<any>();
    expect(tags.some((t: any) => t.slug === 'urgent')).toBe(true);
    expect(tags.some((t: any) => t.slug === 'breaking')).toBe(true);
  });


  it('creates standalone tags via POST /api/tags.json', async () => {
    // 1. Create a new standalone tag
    const createTagRes = await app.request('/api/tags.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`
      },
      body: JSON.stringify({ label: 'Science Fiction' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(createTagRes.status).toBe(200);
    const tag = await createTagRes.json<any>();
    expect(tag.label).toBe('Science Fiction');
    expect(tag.slug).toBe('science-fiction');

    // 2. Listing tags includes the newly created standalone tag
    const listRes = await app.request('/api/tags.json', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(listRes.status).toBe(200);
    const allTags = await listRes.json<any>();
    expect(allTags.some((t: any) => t.slug === 'science-fiction')).toBe(true);

    // 3. Deleting tag by slug works and cleans up
    const deleteSlugRes = await app.request('/api/tags/science-fiction.json', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(deleteSlugRes.status).toBe(200);
    const deleteSlugJson = await deleteSlugRes.json<any>();
    expect(deleteSlugJson.success).toBe(true);
  });

  it("returns entries, all tags, and counts in a single handshake on GET /api/sync.json", async () => {
    // 1. Create a standalone tag (unused by any entry)
    await app.request('/api/tags.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`
      },
      body: JSON.stringify({ label: 'Unused Standalone Tag' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    // 2. Call /api/sync.json
    const syncRes = await app.request('/api/sync.json?perPage=10', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(syncRes.status).toBe(200);
    expect(syncRes.headers.get('Cache-Control')).toContain('no-cache');
    const syncData = await syncRes.json<any>();

    expect(Array.isArray(syncData.entries)).toBe(true);
    expect(Array.isArray(syncData.tags)).toBe(true);
    expect(typeof syncData.total).toBe('number');
    expect(syncData.counts).toBeDefined();
    expect(typeof syncData.counts.unread).toBe('number');
    expect(typeof syncData.counts.starred).toBe('number');
    expect(typeof syncData.counts.archive).toBe('number');
    expect(typeof syncData.counts.total).toBe('number');
    expect(syncData.tags.some((t: any) => t.slug === 'unused-standalone-tag')).toBe(true);
    expect(syncData.ota_version).toBeDefined();
    expect(syncData.ota_checksum).toBeDefined();
  });

  it("handles large database pagination, sorting by title / date, and live library counts", { timeout: 15000 }, async () => {
    // Ingest 60 items with distinctive titles to test multi-page database pagination
    for (let i = 1; i <= 60; i++) {
      const padded = String(i).padStart(3, '0');
      await app.request('/api/entries.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SECRET}`
        },
        body: JSON.stringify({
          title: `Book Article ${padded}`,
          content: `<p>Content for book article ${padded}</p>`,
          url: `https://example.com/book/${padded}`,
          tags: i % 2 === 0 ? 'even-tag' : 'odd-tag'
        })
      }, { DB: mockDb, AUTH_TOKEN: SECRET });
    }

    // 1. Fetch Page 1 (50 items) sorted by title ASC
    const page1Res = await app.request('/api/sync.json?page=1&perPage=50&sort=title&order=asc', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(page1Res.status).toBe(200);
    const page1Data = await page1Res.json<any>();
    expect(page1Data.entries.length).toBe(50);
    expect(page1Data.total).toBeGreaterThanOrEqual(60);
    expect(page1Data.pages).toBeGreaterThanOrEqual(2);
    expect(page1Data.page).toBe(1);
    expect(page1Data.counts.total).toBeGreaterThanOrEqual(60);
    expect(page1Data.counts.unread).toBeGreaterThanOrEqual(60);

    // Verify alphabetical sort from Cloudflare database
    expect(page1Data.entries[0].title).toBe('Book Article 001');
    expect(page1Data.entries[1].title).toBe('Book Article 002');

    // 2. Fetch Page 2 (remaining items) for Title ASC
    const page2Res = await app.request('/api/entries.json?page=2&perPage=50&sort=title&order=asc', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(page2Res.status).toBe(200);
    const page2Data = await page2Res.json<any>();
    const page2Items = page2Data._embedded?.items || page2Data;
    expect(page2Items.length).toBeGreaterThanOrEqual(10);
    expect(page2Items[0].title).toBe('Book Article 051');

    // 3. Fetch Page 1 and Page 2 with Oldest First sorting
    const oldestP1Res = await app.request('/api/sync.json?page=1&perPage=50&sort=oldest', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const oldestP1 = await oldestP1Res.json<any>();
    expect(oldestP1.entries.length).toBe(50);

    const oldestP2Res = await app.request('/api/entries.json?page=2&perPage=50&sort=oldest', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const oldestP2 = await oldestP2Res.json<any>();
    const oldestP2Items = oldestP2._embedded?.items || oldestP2;
    expect(oldestP2Items.length).toBeGreaterThanOrEqual(10);

    // 4. Fetch Page 1 and Page 2 with Newest First sorting
    const newestP1Res = await app.request('/api/sync.json?page=1&perPage=50&sort=newest', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const newestP1 = await newestP1Res.json<any>();
    expect(newestP1.entries.length).toBe(50);
    expect(newestP1.entries[0].title).toBe('Book Article 060');

    const newestP2Res = await app.request('/api/entries.json?page=2&perPage=50&sort=newest', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const newestP2 = await newestP2Res.json<any>();
    const newestP2Items = newestP2._embedded?.items || newestP2;
    expect(newestP2Items.length).toBeGreaterThanOrEqual(10);
    expect(newestP2Items[0].title).toBe('Book Article 010');

    // 5. Verify tag entry counts accurately reflect database counts across all pages
    const tagEven = page1Data.tags.find((t: any) => t.slug === 'even-tag');
    expect(tagEven).toBeDefined();
    expect(tagEven.entry_count).toBeGreaterThanOrEqual(30);
  });

  it("supports monotonic sync_rev delta sync, returning up_to_date: true when no changes occurred", async () => {
    // 1. Initial Sync
    const syncRes1 = await app.request('/api/sync.json', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(syncRes1.status).toBe(200);
    const syncData1 = await syncRes1.json<any>();
    expect(syncData1.sync_rev).toBeDefined();
    expect(syncData1.up_to_date).toBe(false);
    const rev = syncData1.sync_rev;

    // 2. Refocus Sync with since_rev = rev (no changes)
    const syncRes2 = await app.request(`/api/sync.json?since_rev=${rev}`, {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(syncRes2.status).toBe(200);
    const syncData2 = await syncRes2.json<any>();
    expect(syncData2.up_to_date).toBe(true);
    expect(syncData2.sync_rev).toBe(rev);
    expect(syncData2.counts).toBeDefined();
    expect(syncData2.entries).toBeUndefined(); // Zero articles transferred over wire
  });

  it("propagates deleted article tombstones to delta sync clients", async () => {
    // 1. Create a test entry to delete
    const postRes = await app.request('/api/entries.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`
      },
      body: JSON.stringify({
        title: 'Article To Be Deleted',
        content: '<p>Delete me</p>',
        url: 'https://example.com/delete-test-article'
      })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    const newArticle = await postRes.json<any>();
    const deleteTargetId = newArticle.id;

    // 2. Sync state before deletion
    const beforeSyncRes = await app.request('/api/sync.json', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const beforeSyncData = await beforeSyncRes.json<any>();
    const beforeRev = beforeSyncData.sync_rev;

    // 3. Delete the article
    const delRes = await app.request(`/api/entries/${deleteTargetId}.json`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(delRes.status).toBe(200);

    // 4. Client delta sync with since_rev = beforeRev
    const afterSyncRes = await app.request(`/api/sync.json?since_rev=${beforeRev}`, {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(afterSyncRes.status).toBe(200);
    const afterSyncData = await afterSyncRes.json<any>();
    expect(afterSyncData.up_to_date).toBe(false);
    expect(afterSyncData.sync_rev).toBeGreaterThan(beforeRev);
    expect(afterSyncData.deleted_ids).toContain(deleteTargetId);
  });

  it("propagates batch deleted article tombstones on DELETE /api/entries/list.json", async () => {
    // 1. Ingest 2 test articles
    const p1 = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
      body: JSON.stringify({ title: 'Batch Item 1', content: '<p>1</p>', url: 'https://example.com/b1' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const item1 = await p1.json<any>();

    const p2 = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
      body: JSON.stringify({ title: 'Batch Item 2', content: '<p>2</p>', url: 'https://example.com/b2' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const item2 = await p2.json<any>();

    // 2. Sync revision before batch deletion
    const beforeSyncRes = await app.request('/api/sync.json', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const beforeSyncData = await beforeSyncRes.json<any>();
    const beforeRev = beforeSyncData.sync_rev;

    // 3. Batch delete both items
    const batchDelRes = await app.request('/api/entries/list.json', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
      body: JSON.stringify({ ids: [item1.id, item2.id] })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(batchDelRes.status).toBe(200);

    // 4. Delta sync should return both tombstones
    const afterSyncRes = await app.request(`/api/sync.json?since_rev=${beforeRev}`, {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const afterSyncData = await afterSyncRes.json<any>();
    expect(afterSyncData.up_to_date).toBe(false);
    expect(afterSyncData.deleted_ids).toContain(item1.id);
    expect(afterSyncData.deleted_ids).toContain(item2.id);
  });

  it("propagates PATCH starring, archiving, and title edits to delta sync clients", async () => {
    // 1. Ingest an article
    const postRes = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
      body: JSON.stringify({ title: 'Original Title', content: '<p>Body</p>', url: 'https://example.com/sync-patch-test' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const article = await postRes.json<any>();

    // 2. Client gets current sync_rev baseline
    const syncRes1 = await app.request('/api/sync.json', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const data1 = await syncRes1.json<any>();
    const baselineRev = data1.sync_rev;

    // 3. Client A stars and archives the article via PATCH
    const patchRes = await app.request(`/api/entries/${article.id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
      body: JSON.stringify({ starred: 1, archive: 1, title: 'Updated Title' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(patchRes.status).toBe(200);

    // 4. Client B calls delta sync with since_rev = baselineRev
    const syncRes2 = await app.request(`/api/sync.json?since_rev=${baselineRev}`, {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(syncRes2.status).toBe(200);
    const data2 = await syncRes2.json<any>();
    expect(data2.up_to_date).toBe(false);
    expect(data2.sync_rev).toBeGreaterThan(baselineRev);
    expect(data2.entries).toBeDefined();
    expect(data2.entries.length).toBeGreaterThan(0);
    const updated = data2.entries.find((e: any) => e.id === article.id);
    expect(updated).toBeDefined();
    expect(updated.is_starred).toBe(1);
    expect(updated.is_archived).toBe(1);
    expect(updated.title).toBe('Updated Title');
  });

  it("handles CORS preflight OPTIONS requests for Capacitor Android app with 24h caching", async () => {
    const optionsRes = await app.request('/api/sync.json', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type'
      }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(optionsRes.status).toBe(204);
    expect(optionsRes.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(optionsRes.headers.get('Access-Control-Max-Age')).toBe('86400');
    expect(optionsRes.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it("handles empty database edge cases gracefully in getLibraryCounts and sync", async () => {
    // Mock empty database that supports auth rate limit checks
    const emptyDb: any = {
      prepare: (query: string) => ({
        bind: (...params: any[]) => ({
          first: async () => {
            if (query.includes('FROM auth_rate_limits')) return null;
            return { unread: null, starred: null, archive: null, total: null };
          },
          all: async () => ({ results: [] }),
          run: async () => ({ meta: { changes: 1 } })
        }),
        first: async () => {
          if (query.includes('FROM auth_rate_limits')) return null;
          return { unread: null, starred: null, archive: null, total: null };
        },
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 1 } })
      })
    };

    const res = await app.request('/api/sync.json', {
      headers: {
        'Authorization': `Bearer ${SECRET}`,
        'CF-Connecting-IP': '10.0.0.99'
      }
    }, { DB: emptyDb, AUTH_TOKEN: SECRET });

    expect(res.status).toBe(200);
    const data = await res.json<any>();
    expect(data.entries).toEqual([]);
    expect(data.tags).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.counts).toEqual({ unread: 0, starred: 0, archive: 0, total: 0 });
  });

  it("returns active client credentials on GET /api/client-info when authenticated", async () => {
    const res = await app.request("/api/client-info", {
      headers: { "Authorization": `Bearer ${SECRET}` }
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });

    expect(res.status).toBe(200);
    const data = await res.json<any>();
    expect(data.client_id).toBe("wallaflare");
    expect(data.username).toBe("wallaflare");
    expect(data.client_secret).toBe("wallaflare");
  });
});


describe("Capacitor Android OTA Endpoints", () => {
  it("serves the OTA version manifest on /api/app/version.json", async () => {
    const res = await app.request("/api/app/version.json");
    expect(res.status).toBe(200);
    const data = await res.json<any>();
    expect(data.version).toBeDefined();
    expect(data.min_native_version).toBeDefined();
    expect(data.min_native_version).toBe("1.3.1");
    expect(data.url).toBe("/api/app/bundle.zip");
    expect(data.checksum).toBeDefined();
  });

  it("serves the OTA zip bundle on /api/app/bundle.zip", async () => {
    const res = await app.request("/api/app/bundle.zip");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    expect(res.headers.get("Cache-Control")).toContain("public, max-age=86400");
    const arrayBuffer = await res.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeGreaterThan(1000);
  });
});


describe("Annotations & Highlights API (W3C + Wallabag v2)", () => {
  const SECRET = "test_secret_key_annotations";
  let mockDb: any;
  let createdEntryId: number;

  beforeEach(async () => {
    mockDb = createMockD1Database();
    // Create an entry to test annotations
    const res = await app.request("/api/entries.json", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SECRET}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: "https://example.com/annotations-test",
        title: "Annotations Test Article",
        content: "<p>This is an important passage for testing highlights.</p>"
      })
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });
    const entry = await res.json<any>();
    createdEntryId = entry.id;
  });

  it("creates a new annotation with W3C target and Wallabag fields on POST /api/annotations/:entryId", async () => {
    const w3cTarget = {
      source: "https://example.com/annotations-test",
      selector: [
        { type: "TextQuoteSelector", exact: "important passage", prefix: "This is an ", suffix: " for testing" },
        { type: "TextPositionSelector", start: 11, end: 28 }
      ]
    };

    const res = await app.request(`/api/annotations/${createdEntryId}.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SECRET}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        quote: "important passage",
        text: "Key finding to remember",
        color: "green",
        ranges: [{ start: "/p[1]", startOffset: 11, end: "/p[1]", endOffset: 28 }],
        target: w3cTarget
      })
    }, {
      DB: mockDb,
      AUTH_TOKEN: SECRET,
    });

    expect(res.status).toBe(201);
    const data = await res.json<any>();
    expect(data.id).toBeGreaterThan(0);
    expect(data.quote).toBe("important passage");
    expect(data.text).toBe("Key finding to remember");
    expect(data.color).toBe("green");
    expect(data.target).toBeDefined();
    expect(data.target.selector[0].exact).toBe("important passage");
    expect(data.annotator_schema_version).toBe("v1.0");
  });

  it("lists all annotations on GET /api/annotations/:entryId.json", async () => {
    // Create an annotation first
    await app.request(`/api/annotations/${createdEntryId}.json`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ quote: "First highlight", color: "yellow" })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    const res = await app.request(`/api/annotations/${createdEntryId}.json`, {
      headers: { "Authorization": `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(res.status).toBe(200);
    const data = await res.json<any>();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].quote).toBe("First highlight");
  });

  it("updates annotation note and color on PATCH /api/annotations/:id.json", async () => {
    const postRes = await app.request(`/api/annotations/${createdEntryId}.json`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ quote: "Update me", color: "yellow", text: "Old note" })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const created = await postRes.json<any>();

    const patchRes = await app.request(`/api/annotations/${created.id}.json`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ color: "purple", text: "Updated personal comment" })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json<any>();
    expect(updated.color).toBe("purple");
    expect(updated.text).toBe("Updated personal comment");
  });

  it("deletes an annotation on DELETE /api/annotations/:id.json", async () => {
    const postRes = await app.request(`/api/annotations/${createdEntryId}.json`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ quote: "Delete me" })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const created = await postRes.json<any>();

    const delRes = await app.request(`/api/annotations/${created.id}.json`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(delRes.status).toBe(200);
    const delData = await delRes.json<any>();
    expect(delData.success).toBe(true);
  });

  it("embeds annotations array inside GET /api/entries.json and GET /api/entries/:id.json without extra requests", async () => {
    // Add an annotation
    await app.request(`/api/annotations/${createdEntryId}.json`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ quote: "Embedded highlight", color: "blue" })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    // Fetch entries
    const listRes = await app.request("/api/entries.json", {
      headers: { "Authorization": `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(listRes.status).toBe(200);
    const listData = await listRes.json<any>();
    const entry = listData._embedded.items.find((i: any) => i.id === createdEntryId);
    expect(entry).toBeDefined();
    expect(entry.annotations).toBeDefined();
    expect(entry.annotations.length).toBeGreaterThan(0);
    expect(entry.annotations[0].quote).toBe("Embedded highlight");
    expect(entry.annotations[0].color).toBe("blue");
  });


  it("serves KOReader plugin OTA version manifest and file payload", async () => {
    const verRes = await app.request("/api/app/koplugin/version.json", {}, { DB: mockDb });
    expect(verRes.status).toBe(200);
    const verData = await verRes.json<any>();
    expect(verData.version).toBeDefined();
    expect(verData.zip_url).toBe("/download/wallaflare.koplugin.zip");
    expect(verData.files_url).toBe("/api/app/koplugin/files.json");

    const filesRes = await app.request("/api/app/koplugin/files.json", {}, { DB: mockDb });
    expect(filesRes.status).toBe(200);
    const filesData = await filesRes.json<any>();
    expect(filesData.version).toBe(verData.version);
    expect(filesData.files).toBeDefined();
    expect(filesData.files["_meta.lua"]).toBeDefined();
    expect(filesData.files["main.lua"]).toBeDefined();
    expect(filesData.files["api.lua"]).toBeDefined();
    expect(filesData.files["store.lua"]).toBeDefined();
  });

  it("resets and wipes Cloudflare D1 database on POST /api/admin/reset-database with valid password", async () => {
    // 1. Rejects invalid password
    const badRes = await app.request('/api/admin/reset-database.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
      body: JSON.stringify({ token: 'wrong_password' })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(badRes.status).toBe(401);

    // 2. Succeeds with correct password
    const goodRes = await app.request('/api/admin/reset-database.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
      body: JSON.stringify({ token: SECRET })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(goodRes.status).toBe(200);
    const goodData = await goodRes.json<any>();
    expect(goodData.success).toBe(true);
    expect(goodData.instance_id).toBeDefined();
    expect(typeof goodData.instance_id).toBe('number');

    // 3. Database is completely empty, revision is 1, and instance_id is assigned
    const listRes = await app.request('/api/entries.json', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const listData = await listRes.json<any>();
    expect(listData.total).toBe(0);
    expect(listData._embedded.items.length).toBe(0);

    const syncRes = await app.request('/api/sync.json', {
      headers: { 'Authorization': `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const syncData = await syncRes.json<any>();
    expect(syncData.sync_rev).toBe(1);
    expect(syncData.instance_id).toBe(goodData.instance_id);
    expect(syncData.entries.length).toBe(0);
    expect(syncData.counts.total).toBe(0);
  });
});

describe("Dual-Revision Sync & Content Revision Engine", () => {
  const SECRET = "test_secret_dual_rev";
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockD1Database();
  });

  it("starts with content_revision = 1 on new entry creation", async () => {
    const res = await app.request("/api/entries.json", {
      method: "POST",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com/rev-article-1",
        title: "Dual Revision Article 1",
        content: "<p>Original article body.</p>"
      })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    expect(res.status).toBe(200);
    const entry = await res.json<any>();
    expect(entry.revision).toBeGreaterThan(0);
    expect(entry.content_revision).toBe(1);
  });

  it("preserves content_revision = 1 when adding annotations, but bumps sync revision", async () => {
    const createRes = await app.request("/api/entries.json", {
      method: "POST",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com/rev-article-2",
        title: "Article with Annotations",
        content: "<p>Highlight me please.</p>"
      })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const entry = await createRes.json<any>();
    const initialRev = entry.revision;
    const initialContentRev = entry.content_revision;

    // Add annotation
    const annRes = await app.request(`/api/annotations/${entry.id}.json`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        quote: "Highlight me",
        color: "yellow",
        target: { selector: { type: "TextQuoteSelector", exact: "Highlight me", prefix: "<p>", suffix: " please." } }
      })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    expect(annRes.status).toBe(201);

    // Verify sync delta returns updated entry with preserved content_revision
    const syncRes = await app.request(`/api/sync.json?since_rev=${initialRev}`, {
      headers: { "Authorization": `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const syncData = await syncRes.json<any>();
    expect(syncData.up_to_date).toBe(false);
    expect(syncData.entries.length).toBe(1);
    expect(syncData.entries[0].id).toBe(entry.id);
    expect(syncData.entries[0].revision).toBeGreaterThan(initialRev);
    expect(syncData.entries[0].content_revision).toBe(initialContentRev);
    expect(syncData.entries[0].annotations.length).toBe(1);
    expect(syncData.entries[0].annotations[0].quote).toBe("Highlight me");
  });

  it("preserves content_revision = 1 when adding/removing tags and starring", async () => {
    const createRes = await app.request("/api/entries.json", {
      method: "POST",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com/rev-article-3",
        title: "Tagging Article",
        content: "<p>Article text.</p>"
      })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const entry = await createRes.json<any>();
    const initialRev = entry.revision;

    // Star article
    await app.request(`/api/entries/${entry.id}.json`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ starred: 1 })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    // Add tag
    await app.request(`/api/entries/${entry.id}/tags.json`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tags: "science, technology" })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });

    const syncRes = await app.request(`/api/sync.json?since_rev=${initialRev}`, {
      headers: { "Authorization": `Bearer ${SECRET}` }
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const syncData = await syncRes.json<any>();
    expect(syncData.entries.length).toBe(1);
    expect(syncData.entries[0].is_starred).toBe(1);
    expect(syncData.entries[0].tags.length).toBe(2);
    expect(syncData.entries[0].content_revision).toBe(1);
  });

  it("increments content_revision when title or content is edited", async () => {
    const createRes = await app.request("/api/entries.json", {
      method: "POST",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com/rev-article-4",
        title: "Original Title",
        content: "<p>Original content.</p>"
      })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const entry = await createRes.json<any>();
    expect(entry.content_revision).toBe(1);

    // Edit title
    const patchRes1 = await app.request(`/api/entries/${entry.id}.json`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated Title After Re-fetch" })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const updated1 = await patchRes1.json<any>();
    expect(updated1.content_revision).toBe(2);

    // Edit content
    const patchRes2 = await app.request(`/api/entries/${entry.id}.json`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "<p>Freshly scraped article content body.</p>" })
    }, { DB: mockDb, AUTH_TOKEN: SECRET });
    const updated2 = await patchRes2.json<any>();
    expect(updated2.content_revision).toBe(3);
  });
});
