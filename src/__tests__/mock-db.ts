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
  let configStore: Map<string, { value: string; updated_at: string }> = new Map();

  function likeToRegex(pattern: string, hasEscape: boolean): RegExp {
    let regexStr = '^';
    for (let i = 0; i < pattern.length; i++) {
      const ch = pattern[i];
      if (hasEscape && ch === '\\' && i + 1 < pattern.length) {
        const next = pattern[++i];
        regexStr += next.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      } else if (ch === '%') {
        regexStr += '[\\s\\S]*';
      } else if (ch === '_') {
        regexStr += '[\\s\\S]';
      } else {
        regexStr += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
    }
    regexStr += '$';
    return new RegExp(regexStr, 'i');
  }

  function applyEntriesWhere(source: EntryRow[], query: string, boundParams: any[]): EntryRow[] {
    const whereIdx = query.indexOf('WHERE ');
    if (whereIdx === -1) return [...source];

    let wherePart = query.slice(whereIdx + 6);
    const tailMatch = wherePart.search(/\b(ORDER BY|LIMIT|GROUP BY)\b/i);
    if (tailMatch !== -1) {
      wherePart = wherePart.slice(0, tailMatch);
    }

    // Parse predicates in textual order to match boundParams indices accurately
    type Token = { pos: number; len: number; kind: string; count?: number; hasEscape?: boolean };
    const tokens: Token[] = [];
    const scanRegexes: Array<{ kind: string; re: RegExp }> = [
      { kind: 'is_archived', re: /e?\.?is_archived\s*=\s*\?/g },
      { kind: 'is_starred', re: /e?\.?is_starred\s*=\s*\?/g },
      { kind: 'domain_name', re: /e?\.?domain_name\s*=\s*\?/g },
      { kind: 'updated_at_gte', re: /e?\.?updated_at\s*>=\s*\?/g },
      { kind: 'revision_gt', re: /e?\.?revision\s*>\s*\?/g },
      { kind: 'id_in', re: /\b(?:e\.)?id\s+IN\s*\(\s*\?[\s,?]*\)/gi },
      { kind: 'tag_filter', re: /id\s+IN\s*\(\s*SELECT\s+et\.entry_id[\s\S]*?WHERE\s+t\.slug\s+IN\s*\(([^)]+)\)\s+OR\s+(?:LOWER\()?t\.label(?:\))?\s+IN\s*\(([^)]+)\)\s*\)/gi },
      { kind: 'search_like', re: /\(\s*(?:e\.)?title\s+LIKE\s+\?(\s+ESCAPE\s+'\\\\')?\s+OR\s+(?:e\.)?content\s+LIKE\s+\?(\s+ESCAPE\s+'\\\\')?\s*\)/gi },
    ];

    for (const { kind, re } of scanRegexes) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(wherePart)) !== null) {
        if (kind === 'id_in') {
          const count = (m[0].match(/\?/g) || []).length;
          tokens.push({ pos: m.index, len: m[0].length, kind, count });
        } else if (kind === 'tag_filter') {
          const c1 = (m[1].match(/\?/g) || []).length;
          const c2 = (m[2].match(/\?/g) || []).length;
          tokens.push({ pos: m.index, len: m[0].length, kind, count: c1 + c2 });
        } else if (kind === 'search_like') {
          tokens.push({ pos: m.index, len: m[0].length, kind, count: 2, hasEscape: Boolean(m[1] || m[2]) });
        } else {
          tokens.push({ pos: m.index, len: m[0].length, kind, count: 1 });
        }
      }
    }

    tokens.sort((a, b) => a.pos - b.pos);

    let matched = [...source];
    let paramIdx = 0;

    for (const tok of tokens) {
      if (tok.kind === 'is_archived') {
        const val = Number(boundParams[paramIdx++]);
        matched = matched.filter(e => Number(e.is_archived) === val);
      } else if (tok.kind === 'is_starred') {
        const val = Number(boundParams[paramIdx++]);
        matched = matched.filter(e => Number(e.is_starred) === val);
      } else if (tok.kind === 'domain_name') {
        const val = String(boundParams[paramIdx++]);
        matched = matched.filter(e => e.domain_name === val);
      } else if (tok.kind === 'updated_at_gte') {
        const val = String(boundParams[paramIdx++]);
        matched = matched.filter(e => (e.updated_at || '') >= val);
      } else if (tok.kind === 'revision_gt') {
        const val = Number(boundParams[paramIdx++]);
        matched = matched.filter(e => (e.revision || 1) > val);
      } else if (tok.kind === 'id_in') {
        const count = tok.count || 0;
        const ids = boundParams.slice(paramIdx, paramIdx + count).map(Number);
        paramIdx += count;
        matched = matched.filter(e => ids.includes(e.id));
      } else if (tok.kind === 'tag_filter') {
        const count = tok.count || 0;
        const half = Math.floor(count / 2);
        const slugs = boundParams.slice(paramIdx, paramIdx + half).map((v: any) => String(v).toLowerCase());
        const labels = boundParams.slice(paramIdx + half, paramIdx + count).map((v: any) => String(v).toLowerCase());
        paramIdx += count;
        const matchedTagIds = tags
          .filter(t => slugs.includes(t.slug.toLowerCase()) || labels.includes(t.label.toLowerCase()))
          .map(t => t.id);
        const matchedEntryIds = new Set(
          entryTags.filter(et => matchedTagIds.includes(et.tag_id)).map(et => et.entry_id)
        );
        matched = matched.filter(e => matchedEntryIds.has(e.id));
      } else if (tok.kind === 'search_like') {
        const titlePat = String(boundParams[paramIdx++] || '');
        const contentPat = String(boundParams[paramIdx++] || '');
        const titleRe = likeToRegex(titlePat, Boolean(tok.hasEscape));
        const contentRe = likeToRegex(contentPat, Boolean(tok.hasEscape));
        matched = matched.filter(e => titleRe.test(e.title || '') || contentRe.test(e.content || ''));
      }
    }

    return matched;
  }

  return {
    _entries: entries,
    _tags: tags,
    _entryTags: entryTags,
    _annotations: annotations,
    _apiTokens: apiTokens,
    _config: configStore,
    async batch(statements: any[]) {
      const results: any[] = [];
      for (const s of statements) {
        if (s && typeof s.run === 'function') {
          results.push(await s.run());
        }
      }
      return results;
    },
    prepare(query: string) {
      let boundParams: any[] = [];
      const stmt = {
        bind(...params: any[]) {
          if (params.length > 100) {
            throw new Error(`D1_ERROR: too many SQL variables (${params.length} > 100)`);
          }
          boundParams = params;
          return stmt;
        },
        async first<T = any>() {
          if (query.includes('FROM config WHERE key = ?')) {
            const key = String(boundParams[0]);
            const row = configStore.get(key);
            return (row ? { key, value: row.value, updated_at: row.updated_at } : null) as T;
          }
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
            const filtered = applyEntriesWhere(entries, query, boundParams);
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
          if (query.includes('FROM api_tokens')) {
            if (query.includes('WHERE id = ?')) {
              const id = Number(boundParams[0]);
              const found = apiTokens.find(t => t.id === id && !t.revoked_at);
              return (found || null) as T;
            }
            const hash = boundParams[0];
            const found = apiTokens.find(t => t.token_hash === hash && !t.revoked_at);
            return (found || null) as T;
          }
          if (query.includes('SELECT * FROM entries WHERE id = ?') || (query.includes('WHERE id = ?') && !query.includes('tags') && !query.includes('api_tokens'))) {
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
          if (query.includes('FROM site_cookies')) {
            if (query.includes('is_enabled = 1')) {
              return { results: siteCookies.filter(c => c.is_enabled === 1) as T[] };
            }
            return { results: [...siteCookies] as T[] };
          }
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
          if (query.includes('SELECT entry_id FROM entry_tags WHERE tag_id = ?')) {
            const tagId = Number(boundParams[0]);
            const matched = entryTags
              .filter(et => et.tag_id === tagId)
              .map(et => ({ entry_id: et.entry_id }));
            return { results: matched as T[] };
          }
          if (query.includes('FROM tags t') && query.includes('entry_tags et')) {
            if (query.includes('WHERE et.entry_id = ?')) {
              const entryId = boundParams[0];
              const linkedTagIds = entryTags.filter(et => et.entry_id === entryId).map(et => et.tag_id);
              const matchedTags = tags.filter(t => linkedTagIds.includes(t.id));
              return { results: matchedTags as T[] };
            }
            if (query.includes('WHERE et.entry_id IN')) {
              const targetEntryIds = boundParams.map(Number);
              const results: any[] = [];
              for (const et of entryTags) {
                if (targetEntryIds.length > 0 && !targetEntryIds.includes(et.entry_id)) continue;
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
          if (query.includes('SELECT id, content, reading_time FROM entries')) {
            return {
              results: entries.map(e => ({
                id: e.id,
                content: e.content,
                reading_time: e.reading_time,
              })) as T[]
            };
          }
          if (query.includes('FROM entries') && query.trim().toUpperCase().startsWith('SELECT')) {
            let matched = applyEntriesWhere(entries, query, boundParams);
            if (query.includes('title COLLATE NOCASE ASC') || (query.includes('title COLLATE NOCASE') && query.includes('ASC'))) {
              matched.sort((a, b) => a.title.localeCompare(b.title));
            } else if (query.includes('reading_time ASC') || (query.includes('reading_time') && query.includes('ASC'))) {
              matched.sort((a, b) => (a.reading_time || 1) - (b.reading_time || 1));
            } else if (query.includes('reading_time DESC') || (query.includes('reading_time') && query.includes('DESC'))) {
              matched.sort((a, b) => (b.reading_time || 1) - (a.reading_time || 1));
            } else if (query.includes('ORDER BY created_at ASC') || query.includes('ORDER BY e.created_at ASC')) {
              matched.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            } else if (query.includes('ORDER BY created_at DESC') || query.includes('ORDER BY e.created_at DESC')) {
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
          if (query.includes('INSERT OR REPLACE INTO config') || query.includes('INSERT INTO config')) {
            const key = String(boundParams[0]);
            const value = String(boundParams[1]);
            configStore.set(key, { value, updated_at: new Date().toISOString() });
            return { meta: { changes: 1 } };
          }
          if (query.includes('DELETE FROM config WHERE key = ?')) {
            const key = String(boundParams[0]);
            const existed = configStore.delete(key);
            return { meta: { changes: existed ? 1 : 0 } };
          }
          if (query.includes('DELETE FROM entry_tags WHERE tag_id = ? AND entry_id IN')) {
            const tagId = Number(boundParams[0]);
            const targetIds = boundParams.slice(1).map(Number);
            const before = entryTags.length;
            entryTags.splice(0, entryTags.length, ...entryTags.filter(et => !(et.tag_id === tagId && targetIds.includes(et.entry_id))));
            return { meta: { changes: before - entryTags.length } };
          }
          if (query.includes('DELETE FROM entry_tags WHERE tag_id = ?')) {
            const tagId = Number(boundParams[0]);
            const before = entryTags.length;
            entryTags.splice(0, entryTags.length, ...entryTags.filter(et => et.tag_id !== tagId));
            return { meta: { changes: before - entryTags.length } };
          }
          if (query.includes('DELETE FROM tags WHERE id = ?')) {
            const tagId = Number(boundParams[0]);
            const before = tags.length;
            tags.splice(0, tags.length, ...tags.filter(t => t.id !== tagId));
            entryTags.splice(0, entryTags.length, ...entryTags.filter(et => et.tag_id !== tagId));
            return { meta: { changes: before - tags.length } };
          }
          if (query.includes('DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?')) {
            const entryId = Number(boundParams[0]);
            const tagId = Number(boundParams[1]);
            entryTags.splice(0, entryTags.length, ...entryTags.filter(et => !(et.entry_id === entryId && et.tag_id === tagId)));
            return { meta: { changes: 1 } };
          }
          if (query.includes('UPDATE entries SET')) {
            const setPart = query.split('SET')[1].split('WHERE')[0];
            const clauses = setPart.split(',').map(s => s.trim());
            const boundClauseCount = clauses.filter(c => c.includes('?')).length;
            const applySetClauses = (entry: EntryRow) => {
              let pIdx = 0;
              for (const c of clauses) {
                if (c.includes('content_revision = content_revision + 1')) {
                  entry.content_revision = (entry.content_revision || 1) + 1;
                  continue;
                }
                if (!c.includes('?')) continue;
                const val = boundParams[pIdx++];
                if (c.startsWith('title = ?')) entry.title = val;
                else if (c.startsWith('content = ?')) entry.content = val;
                else if (c.startsWith('author = ?')) entry.author = val;
                else if (c.startsWith('published_at = ?')) entry.published_at = val;
                else if (c.startsWith('preview_picture = ?')) entry.preview_picture = val;
                else if (c.startsWith('domain_name = ?')) entry.domain_name = val;
                else if (c.startsWith('language = ?')) entry.language = val;
                else if (c.startsWith('url = ?')) entry.url = val;
                else if (c.startsWith('is_archived = ?')) entry.is_archived = val;
                else if (c.startsWith('is_starred = ?')) entry.is_starred = val;
                else if (c.startsWith('reading_time = ?')) entry.reading_time = val;
                else if (c.startsWith('revision = ?')) entry.revision = val;
                else if (c.startsWith('bookmark = ?')) entry.bookmark = val;
                else if (c.startsWith('updated_at = ?')) entry.updated_at = val;
              }
              if (!clauses.some(c => c.startsWith('updated_at = ?'))) {
                entry.updated_at = new Date().toISOString();
              }
            };

            if (query.includes('WHERE id IN')) {
              const targetIds = boundParams.slice(boundClauseCount).map(Number);
              let changes = 0;
              entries.filter(e => targetIds.includes(e.id)).forEach(entry => {
                applySetClauses(entry);
                changes++;
              });
              return { meta: { changes } };
            } else {
              const id = Number(boundParams[boundParams.length - 1]);
              const entry = entries.find(e => e.id === id);
              if (entry) {
                applySetClauses(entry);
                return { meta: { changes: 1 } };
              }
              return { meta: { changes: 0 } };
            }
          }
          if (query.includes('DELETE FROM entries WHERE id IN') || query.includes('DELETE FROM entries WHERE id = ?')) {
            const targetIds = boundParams.map(Number);
            const beforeCount = entries.length;
            entries.splice(0, entries.length, ...entries.filter(e => !targetIds.includes(e.id)));
            entryTags.splice(0, entryTags.length, ...entryTags.filter(et => !targetIds.includes(et.entry_id)));
            annotations.splice(0, annotations.length, ...annotations.filter(a => !targetIds.includes(a.entry_id)));
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
          if (query.includes('UPDATE api_tokens SET label = ?')) {
            const newLabel = String(boundParams[0]);
            const id = Number(boundParams[1]);
            const tok = apiTokens.find(t => t.id === id && !t.revoked_at);
            if (tok) {
              tok.label = newLabel;
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
            const hasTwoMinWindow = query.includes("-2 minutes");
            const cutoff = Date.now() - 2 * 60 * 1000;
            const remaining = apiTokens.filter(t => {
              if (t.label !== label) return true;
              if (hasTwoMinWindow) {
                const createdMs = new Date(t.created_at).getTime();
                return Number.isFinite(createdMs) ? createdMs <= cutoff : false;
              }
              return false;
            });
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
