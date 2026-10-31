import { EntryRow } from "../types";

export const TEST_TOKEN = 'wfl_tok_test_valid_device_token';
export const TEST_TOKEN_HASH = '2a05a935f5fda801e7775c66f3ee7cff39acbf1e03e772aa0244e655a2fbb528';

// In-memory mock for D1 Database
export function createMockD1Database() {
  let entries: EntryRow[] = [];
  let tags: Array<{ id: number; label: string; slug: string }> = [];
  let entryTags: Array<{ entry_id: number; tag_id: number }> = [];
  let rateLimits: Map<string, { failed_attempts: number; last_attempt_at: number; locked_until: number }> = new Map();
  let annotations: Array<{ id: number; entry_id: number; user_id: string; quote: string; text: string; color: string; ranges: string; target: string | null; created_at: string; updated_at: string }> = [];
  let apiTokens: Array<{ id: number; token_hash: string; token_prefix: string; label: string; created_at: string; last_used_at: string | null; expires_at: string | null; revoked_at: string | null }> = [
    {
      id: 1,
      token_hash: TEST_TOKEN_HASH,
      token_prefix: 'wfl_tok_test_val...',
      label: 'Default Test Device',
      created_at: new Date().toISOString(),
      last_used_at: null,
      expires_at: null,
      revoked_at: null,
    }
  ];
  let autoId = 1;
  let autoTagId = 1;
  let autoAnnotationId = 1;
  let autoTokenId = 2;
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
          if (query.includes('FROM api_tokens')) {
            const hash = boundParams[0];
            const found = apiTokens.find(t => t.token_hash === hash && !t.revoked_at);
            return (found || null) as T;
          }
          if (query.includes('SELECT MAX(id)')) {
            return entries[entries.length - 1] as T;
          }
          return null as T;
        },
        async all<T = any>() {
          if (query.includes('FROM api_tokens')) {
            return { results: [...apiTokens] as T[] };
          }
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
          if (query.includes('INSERT INTO api_tokens')) {
            const token_hash = String(boundParams[0]);
            const token_prefix = String(boundParams[1]);
            const label = String(boundParams[2]);
            const created_at = String(boundParams[3]);
            const expires_at = boundParams[4] ? String(boundParams[4]) : null;
            const newTok = {
              id: autoTokenId++,
              token_hash,
              token_prefix,
              label,
              created_at,
              expires_at,
              revoked_at: null,
              last_used_at: null,
            };
            apiTokens.push(newTok);
            return { meta: { last_row_id: newTok.id, changes: 1 } };
          }
          if (query.includes('UPDATE api_tokens SET revoked_at = ?')) {
            const revokedAt = String(boundParams[0]);
            const id = Number(boundParams[1]);
            const tok = apiTokens.find(t => t.id === id && !t.revoked_at);
            if (tok) {
              tok.revoked_at = revokedAt;
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          if (query.includes('UPDATE api_tokens SET last_used_at = ?')) {
            const lastUsedAt = String(boundParams[0]);
            const id = Number(boundParams[1]);
            const tok = apiTokens.find(t => t.id === id);
            if (tok) tok.last_used_at = lastUsedAt;
            return { meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM api_tokens WHERE id = ?')) {
            const id = Number(boundParams[0]);
            const idx = apiTokens.findIndex(t => t.id === id);
            if (idx >= 0) {
              apiTokens.splice(idx, 1);
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          if (query.includes('DELETE FROM api_tokens') && query.includes('label = ?')) {
            const label = String(boundParams[0]);
            const initialCount = apiTokens.length;
            const remaining = apiTokens.filter(t => t.label !== label);
            apiTokens.length = 0;
            apiTokens.push(...remaining);
            return { meta: { changes: initialCount - remaining.length } };
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
