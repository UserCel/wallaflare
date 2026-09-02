import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { EntryRow } from '../types';

function createMockD1Database() {
  let entries: EntryRow[] = [];
  let tags: Array<{ id: number; label: string; slug: string }> = [];
  let entryTags: Array<{ entry_id: number; tag_id: number }> = [];
  let rateLimits: Map<string, { failed_attempts: number; last_attempt_at: number; locked_until: number }> = new Map();
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
          if (query.includes('FROM auth_rate_limits WHERE ip = ?')) {
            const ip = boundParams[0];
            return (rateLimits.get(ip) || null) as T;
          }
          if (query.includes('COUNT(*)')) {
            let filtered = [...entries];
            if (query.includes('is_archived = 0')) filtered = filtered.filter((e) => !e.is_archived);
            if (query.includes('is_archived = 1')) filtered = filtered.filter((e) => Boolean(e.is_archived));
            if (query.includes('is_starred = 1')) filtered = filtered.filter((e) => Boolean(e.is_starred));
            return { total: filtered.length } as any;
          }
          return null;
        },
        async all<T = any>() {
          if (query.includes('et.entry_id, t.id') || (query.includes('FROM tags') && query.includes('JOIN entry_tags'))) {
            const results = entryTags
              .map((et) => {
                const tag = tags.find((t) => t.id === et.tag_id);
                return tag ? { entry_id: et.entry_id, id: tag.id, label: tag.label, slug: tag.slug } : null;
              })
              .filter(Boolean);
            return { results: results as T[] };
          }

          if (query.includes('FROM entries')) {
            let filtered = [...entries];
            if (query.includes('e.is_archived = 0') || (query.includes('is_archived = ?') && boundParams.includes(0))) {
              filtered = filtered.filter((e) => !e.is_archived);
            }
            if (query.includes('e.is_archived = 1') || (query.includes('is_archived = ?') && boundParams.includes(1))) {
              filtered = filtered.filter((e) => Boolean(e.is_archived));
            }
            if (query.includes('e.is_starred = 1') || (query.includes('is_starred = ?') && boundParams.includes(1))) {
              filtered = filtered.filter((e) => Boolean(e.is_starred));
            }
            if (query.includes('INNER JOIN entry_tags') && boundParams.length > 0) {
              const tagSlug = boundParams.find((p) => typeof p === 'string');
              const targetTag = tags.find((t) => t.slug === tagSlug);
              if (targetTag) {
                const matchingEntryIds = entryTags.filter((et) => et.tag_id === targetTag.id).map((et) => et.entry_id);
                filtered = filtered.filter((e) => matchingEntryIds.includes(e.id));
              } else {
                filtered = [];
              }
            }
            return { results: filtered } as any;
          }

          if (query.includes('FROM tags')) {
            return { results: tags } as any;
          }

          return { results: [] } as any;
        },
        async run() {
          if (query.includes('auth_rate_limits') && query.includes('INSERT INTO')) {
            const ip = boundParams[0];
            rateLimits.set(ip, {
              failed_attempts: boundParams[1],
              last_attempt_at: boundParams[2],
              locked_until: boundParams[3],
            });
            return { meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM auth_rate_limits')) {
            boundParams.forEach((p) => rateLimits.delete(p));
            return { meta: { changes: 1 } };
          }
          return { success: true };
        },
      };
      return stmt;
    },
  };
}

describe('RSS 2.0 Feed Syndication (/feed)', () => {
  let mockDb: ReturnType<typeof createMockD1Database>;
  const READ_TOKEN = 'secret_feed_token_123';
  const AUTH_TOKEN = 'master_admin_password_456';

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockDb.addEntry({ title: 'Unread Article One', is_archived: 0, is_starred: 0 }, ['tech', 'news']);
    mockDb.addEntry({ title: 'Starred Article Two', is_archived: 0, is_starred: 1 }, ['tech']);
    mockDb.addEntry({ title: 'Archived Article Three', is_archived: 1, is_starred: 0 }, ['history']);
  });

  it('rejects unauthenticated requests on /feed/unread with 401 WWW-Authenticate', async () => {
    const res = await app.request('/feed/unread', {
      headers: { 'CF-Connecting-IP': '198.51.100.1' },
    }, {
      DB: mockDb as any,
      READ_TOKEN,
      AUTH_TOKEN,
    });

    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toContain('Basic realm="Wallaflare RSS Feed"');
    const text = await res.text();
    expect(text).toContain('401 Unauthorized');
  });

  it('delivers unread RSS 2.0 feed with valid ?token parameter', async () => {
    const res = await app.request(`/feed/unread?token=${READ_TOKEN}`, {
      headers: { 'CF-Connecting-IP': '198.51.100.2' },
    }, {
      DB: mockDb as any,
      READ_TOKEN,
      AUTH_TOKEN,
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/rss+xml');
    const xml = await res.text();
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<title>Wallaflare - Unread Articles</title>');
    expect(xml).toContain('<item>');
    expect(xml).toContain('<title>Unread Article One</title>');
    expect(xml).toContain('<category>tech</category>');
    expect(xml).toContain('<content:encoded>');
  });

  it('delivers starred RSS 2.0 feed', async () => {
    const res = await app.request(`/feed/starred?token=${READ_TOKEN}`, {
      headers: { 'CF-Connecting-IP': '198.51.100.3' },
    }, {
      DB: mockDb as any,
      READ_TOKEN,
      AUTH_TOKEN,
    });

    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('<title>Wallaflare - Starred Articles</title>');
    expect(xml).toContain('<title>Starred Article Two</title>');
  });

  it('delivers tag-filtered RSS 2.0 feed', async () => {
    const res = await app.request(`/feed/tags/history?token=${READ_TOKEN}`, {
      headers: { 'CF-Connecting-IP': '198.51.100.4' },
    }, {
      DB: mockDb as any,
      READ_TOKEN,
      AUTH_TOKEN,
    });

    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('<title>Wallaflare - Tagged #history</title>');
    expect(xml).toContain('<title>Archived Article Three</title>');
  });

  it('supports Wallabag v2 legacy URL path format (/feed/:user/:token/unread) ignoring :user', async () => {
    const res = await app.request(`/feed/anyuser/${READ_TOKEN}/unread`, {
      headers: { 'CF-Connecting-IP': '198.51.100.5' },
    }, {
      DB: mockDb as any,
      READ_TOKEN,
      AUTH_TOKEN,
    });

    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('<title>Wallaflare - Unread Articles</title>');
    expect(xml).toContain('Unread Article One');
  });

  it('supports Wallabag v2 legacy tag URL format (/feed/:user/:token/tags/tech)', async () => {
    const res = await app.request(`/feed/myuser/${READ_TOKEN}/tags/tech`, {
      headers: { 'CF-Connecting-IP': '198.51.100.6' },
    }, {
      DB: mockDb as any,
      READ_TOKEN,
      AUTH_TOKEN,
    });

    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('<title>Wallaflare - Tagged #tech</title>');
    expect(xml).toContain('Unread Article One');
    expect(xml).toContain('Starred Article Two');
  });

  it('enforces strict token segregation: rejects AUTH_TOKEN on /feed when READ_TOKEN is set', async () => {
    const res = await app.request(`/feed/unread?token=${AUTH_TOKEN}`, {
      headers: { 'CF-Connecting-IP': '198.51.100.7' },
    }, {
      DB: mockDb as any,
      READ_TOKEN,
      AUTH_TOKEN,
    });

    expect(res.status).toBe(401);
  });

  it('falls back to AUTH_TOKEN when READ_TOKEN is not configured', async () => {
    const res = await app.request(`/feed/unread?token=${AUTH_TOKEN}`, {
      headers: { 'CF-Connecting-IP': '198.51.100.8' },
    }, {
      DB: mockDb as any,
      AUTH_TOKEN,
    });

    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('Unread Articles');
  });

  it('enforces brute-force rate-limiting lockout after 5 consecutive failed feed token attempts', async () => {
    const ip = '203.0.113.88';

    // 5 invalid attempts
    for (let i = 1; i <= 5; i++) {
      const res = await app.request(`/feed/unread?token=invalid_${i}`, {
        headers: { 'CF-Connecting-IP': ip },
      }, {
        DB: mockDb as any,
        READ_TOKEN,
        AUTH_TOKEN,
      });

      if (i < 5) {
        expect(res.status).toBe(401);
        const text = await res.text();
        expect(text).toContain(`${5 - i} attempt(s) remaining`);
      } else {
        expect(res.status).toBe(429);
        const text = await res.text();
        expect(text).toContain('429 Too Many Requests');
      }
    }

    // 6th attempt is locked out immediately even with valid token
    const lockedRes = await app.request(`/feed/unread?token=${READ_TOKEN}`, {
      headers: { 'CF-Connecting-IP': ip },
    }, {
      DB: mockDb as any,
      READ_TOKEN,
      AUTH_TOKEN,
    });

    expect(lockedRes.status).toBe(429);
  });
});
