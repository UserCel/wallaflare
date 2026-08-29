import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { EntryRow } from '../types';

function createMockD1Database() {
  let entries: EntryRow[] = [];
  let tags: Array<{ id: number; label: string; slug: string }> = [];
  let entryTags: Array<{ entry_id: number; tag_id: number }> = [];
  let autoId = 1;
  let autoTagId = 1;

  return {
    _entries: entries,
    _tags: tags,
    _entryTags: entryTags,
    addEntry(entry: Partial<EntryRow>, tagLabels: string[] = []) {
      const newEntry: EntryRow = {
        id: autoId++,
        url: entry.url || `https://example.com/item-${autoId}`,
        title: entry.title || `Article ${autoId}`,
        content: entry.content || `<p>Content for article ${autoId}</p>`,
        preview_picture: entry.preview_picture || null,
        domain_name: entry.domain_name || 'example.com',
        reading_time: entry.reading_time || 5,
        language: entry.language || 'en',
        author: entry.author || 'Test Author',
        is_archived: entry.is_archived ?? 0,
        is_starred: entry.is_starred ?? 0,
        created_at: entry.created_at || new Date().toISOString(),
        updated_at: entry.updated_at || new Date().toISOString(),
        published_at: entry.published_at || new Date().toISOString(),
      };
      entries.push(newEntry);

      tagLabels.forEach((label) => {
        const slug = label.toLowerCase().replace(/[^\w-]/g, '-');
        let tag = tags.find((t) => t.slug === slug);
        if (!tag) {
          tag = { id: autoTagId++, label, slug };
          tags.push(tag);
        }
        entryTags.push({ entry_id: newEntry.id, tag_id: tag.id });
      });

      return newEntry;
    },
    prepare(query: string) {
      let boundParams: any[] = [];
      const stmt = {
        bind(...params: any[]) {
          boundParams = params;
          return stmt;
        },
        async first<T = any>() {
          if (query.includes('SUM(CASE WHEN is_archived = 0')) {
            const unread = entries.filter((e) => !e.is_archived).length;
            const starred = entries.filter((e) => e.is_starred).length;
            const archive = entries.filter((e) => e.is_archived).length;
            const total = entries.length;
            return { unread, starred, archive, total } as T;
          }
          if (query.includes('SELECT COUNT(*)')) {
            let filtered = [...entries];
            if (query.includes('is_archived = ?')) {
              filtered = filtered.filter((e) => e.is_archived === boundParams[0]);
            }
            if (query.includes('is_starred = ?')) {
              filtered = filtered.filter((e) => e.is_starred === boundParams[0]);
            }
            return { total: filtered.length } as T;
          }
          if (query.includes('SELECT * FROM entries WHERE id = ?')) {
            const id = boundParams[0];
            return (entries.find((e) => e.id === id) || null) as T;
          }
          return null as T;
        },
        async all<T = any>() {
          // 1. Entry tags batch query
          if (query.includes('et.entry_id, t.id') || (query.includes('FROM tags') && query.includes('JOIN entry_tags'))) {
            const results = entryTags
              .map((et) => {
                const tag = tags.find((t) => t.id === et.tag_id);
                return tag ? { entry_id: et.entry_id, id: tag.id, label: tag.label, slug: tag.slug } : null;
              })
              .filter(Boolean);
            return { results: results as T[] };
          }
          // 2. Entries query
          if (query.includes('FROM entries')) {
            let filtered = [...entries];
            if (query.includes('is_archived = ?')) {
              const val = boundParams[0];
              filtered = filtered.filter((e) => e.is_archived === val);
            }
            if (query.includes('is_starred = ?')) {
              const val = boundParams[0];
              filtered = filtered.filter((e) => e.is_starred === val);
            }
            if (query.includes('LIKE ?')) {
              const term = String(boundParams[0]).replace(/%/g, '').toLowerCase();
              filtered = filtered.filter(
                (e) =>
                  (e.title && e.title.toLowerCase().includes(term)) ||
                  (e.content && e.content.toLowerCase().includes(term))
              );
            }
            if (query.includes('t.slug IN') || query.includes('et.tag_id IN') || query.includes('entry_tags')) {
              const matchingEntryIds = entryTags
                .filter((et) => {
                  const tag = tags.find((t) => t.id === et.tag_id);
                  return tag && (boundParams.includes(tag.slug) || boundParams.includes(tag.label));
                })
                .map((et) => et.entry_id);
              filtered = filtered.filter((e) => matchingEntryIds.includes(e.id));
            }
            return { results: filtered as T[] };
          }
          // 3. Simple tags list query
          if (query.includes('FROM tags')) {
            return { results: tags as T[] };
          }
          return { results: [] as T[] };
        },
        async run() {
          return { success: true };
        },
      };
      return stmt;
    },
  };
}

describe('OPDS 1.2 Catalog Engine (KOReader & Crosspoint Compatibility)', () => {
  let mockDb: ReturnType<typeof createMockD1Database>;
  const AUTH_SECRET = 'opds_test_secret_123';

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockDb.addEntry({ title: 'Unread Article 1', is_archived: 0, is_starred: 0 }, ['tech', 'news']);
    mockDb.addEntry({ title: 'Starred Article 2', is_archived: 0, is_starred: 1 }, ['tech', 'favorites']);
    mockDb.addEntry({ title: 'Archived Article 3', is_archived: 1, is_starred: 0 }, ['archive']);
  });

  it('rejects unauthenticated requests with 401 and WWW-Authenticate Basic realm header', async () => {
    const res = await app.request('/opds', {
      method: 'GET',
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: AUTH_SECRET,
    });

    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toContain('Basic realm="Wallaflare OPDS"');
  });

  it('authenticates via HTTP Basic Auth (KOReader dialog login)', async () => {
    const basicAuth = 'Basic ' + Buffer.from(`wallaflare:${AUTH_SECRET}`).toString('base64');
    const res = await app.request('/opds', {
      method: 'GET',
      headers: { Authorization: basicAuth },
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: AUTH_SECRET,
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(res.headers.get('Content-Type')).toContain('application/atom+xml');
    expect(res.headers.get('Content-Type')).toContain('profile=opds-catalog');
    expect(text).toContain('urn:wallaflare:opds:root');
    expect(text).toContain('Unread Articles');
    expect(text).toContain('Starred / Favorites');
    expect(text).toContain('Archive');
    expect(text).toContain('Tags');
  });

  it('authenticates via URL query token ?token=... (Crosspoint / QR scan)', async () => {
    const res = await app.request(`/opds?token=${AUTH_SECRET}`, {
      method: 'GET',
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: AUTH_SECRET,
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('urn:wallaflare:opds:root');
    // Verifies token propagation in navigation subsection links
    expect(text).toContain(`token=${AUTH_SECRET}`);
  });

  it('accepts dedicated OPDS_TOKEN when configured in environment', async () => {
    const dedicatedToken = 'readonly_opds_secret';
    const res = await app.request(`/opds?token=${dedicatedToken}`, {
      method: 'GET',
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: 'master_admin_secret',
      OPDS_TOKEN: dedicatedToken,
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('urn:wallaflare:opds:root');
  });

  it('serves OpenSearch description at /opds/opensearch.xml', async () => {
    const res = await app.request(`/opds/opensearch.xml?token=${AUTH_SECRET}`, {
      method: 'GET',
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: AUTH_SECRET,
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/opensearchdescription+xml');
    const text = await res.text();
    expect(text).toContain('<OpenSearchDescription');
    expect(text).toContain('/opds/search?q={searchTerms}');
  });

  it('serves unread articles acquisition feed with EPUB download links', async () => {
    const res = await app.request(`/opds/unread?token=${AUTH_SECRET}`, {
      method: 'GET',
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: AUTH_SECRET,
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('kind=acquisition');
    const text = await res.text();
    expect(text).toContain('urn:wallaflare:opds:unread');
    expect(text).toContain('Unread Article 1');
    expect(text).toContain('Starred Article 2');
    expect(text).not.toContain('Archived Article 3');

    // Check acquisition EPUB link and propagated token
    expect(text).toContain('rel="http://opds-spec.org/acquisition"');
    expect(text).toContain('type="application/epub+zip"');
    expect(text).toContain(`/opds/download/1.epub?token=${AUTH_SECRET}`);
  });

  it('serves starred articles acquisition feed', async () => {
    const res = await app.request(`/opds/starred?token=${AUTH_SECRET}`, {
      method: 'GET',
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: AUTH_SECRET,
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('urn:wallaflare:opds:starred');
    expect(text).toContain('Starred Article 2');
    expect(text).not.toContain('Unread Article 1');
  });

  it('serves tags navigation feed and tag-filtered acquisition feed', async () => {
    const tagsRes = await app.request(`/opds/tags?token=${AUTH_SECRET}`, {
      method: 'GET',
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: AUTH_SECRET,
    });

    expect(tagsRes.status).toBe(200);
    const tagsText = await tagsRes.text();
    expect(tagsText).toContain('urn:wallaflare:opds:tags');
    expect(tagsText).toContain('tech');
    expect(tagsText).toContain('/opds/tags/tech');

    const tagFilterRes = await app.request(`/opds/tags/tech?token=${AUTH_SECRET}`, {
      method: 'GET',
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: AUTH_SECRET,
    });

    expect(tagFilterRes.status).toBe(200);
    const tagFilterText = await tagFilterRes.text();
    expect(tagFilterText).toContain('Unread Article 1');
    expect(tagFilterText).toContain('Starred Article 2');
    expect(tagFilterText).not.toContain('Archived Article 3');
  });

  it('searches articles via /opds/search?q=...', async () => {
    const res = await app.request(`/opds/search?q=Starred&token=${AUTH_SECRET}`, {
      method: 'GET',
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: AUTH_SECRET,
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Starred Article 2');
    expect(text).not.toContain('Unread Article 1');
  });

  it('downloads EPUB directly via /opds/download/:id.epub', async () => {
    const res = await app.request(`/opds/download/1.epub?token=${AUTH_SECRET}`, {
      method: 'GET',
    }, {
      DB: mockDb as any,
      AUTH_TOKEN: AUTH_SECRET,
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/epub+zip');
    expect(res.headers.get('Content-Disposition')).toContain('Unread_Article_1.epub');
    
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    // Standard ZIP magic bytes (PK\x03\x04)
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
  });
});
