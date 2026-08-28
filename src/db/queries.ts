let schemaEnsured = false;
export async function ensureDatabaseSchema(db: D1Database): Promise<void> {
  if (schemaEnsured || !db) return;
  try {
    const stmts = [
      `CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        preview_picture TEXT,
        domain_name TEXT,
        reading_time INTEGER DEFAULT 1,
        language TEXT DEFAULT 'en',
        author TEXT,
        published_at TEXT,
        is_archived INTEGER DEFAULT 0,
        is_starred INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        revision INTEGER DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE
      )`,
      `CREATE TABLE IF NOT EXISTS entry_tags (
        entry_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (entry_id, tag_id),
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS auth_rate_limits (
        ip TEXT PRIMARY KEY,
        failed_attempts INTEGER DEFAULT 0,
        last_attempt_at INTEGER NOT NULL,
        locked_until INTEGER DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS annotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL,
        user_id TEXT DEFAULT 'wallaflare',
        text TEXT DEFAULT '',
        quote TEXT NOT NULL,
        ranges TEXT DEFAULT '[]',
        target TEXT DEFAULT NULL,
        color TEXT DEFAULT 'yellow',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS sync_state (
        id INTEGER PRIMARY KEY,
        revision INTEGER NOT NULL DEFAULT 1,
        instance_id INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS deleted_entries (
        entry_id INTEGER PRIMARY KEY,
        revision INTEGER NOT NULL,
        deleted_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS site_cookies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT UNIQUE NOT NULL,
        site_name TEXT,
        cookie_value TEXT NOT NULL,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        revision INTEGER NOT NULL DEFAULT 1,
        user_id TEXT DEFAULT 'wallaflare',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `INSERT OR IGNORE INTO sync_state (id, revision, instance_id) VALUES (1, 1, 1)`
    ];

    if (typeof (db as any).batch === 'function') {
      await (db as any).batch(stmts.map(s => db.prepare(s)));
    } else {
      for (const s of stmts) {
        await db.prepare(s).run().catch(() => {});
      }
    }

    try { await db.prepare('ALTER TABLE sync_state ADD COLUMN instance_id INTEGER NOT NULL DEFAULT 1').run(); } catch {}
    try { await db.prepare('ALTER TABLE entries ADD COLUMN revision INTEGER DEFAULT 1').run(); } catch {}
    try { await db.prepare('ALTER TABLE site_cookies ADD COLUMN is_enabled INTEGER NOT NULL DEFAULT 1').run(); } catch {}
    try { await db.prepare('ALTER TABLE site_cookies ADD COLUMN revision INTEGER NOT NULL DEFAULT 1').run(); } catch {}

    schemaEnsured = true;
  } catch (err) {
    console.error('Error ensuring database schema:', err);
  }
}

import { EntryRow, WallabagEntry, AnnotationItem } from '../types';

export interface TagItem {
  id: number;
  label: string;
  slug: string;
  entry_count?: number;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'tag';
}

function formatRfc3339(d?: string | null): string {
  if (!d) return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const date = new Date(d);
  if (isNaN(date.getTime())) return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function entryRowToWallabag(row: EntryRow, tags: TagItem[] = []): WallabagEntry {
  const createdAt = formatRfc3339(row?.created_at);
  const updatedAt = formatRfc3339(row?.updated_at);
  const publishedAt = row?.published_at ? formatRfc3339(row.published_at) : null;
  let plainText = (row?.content || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\{"parts":[\s\S]*?\}\}\]\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawAnnotations = (row as any)?.annotations || [];
  const entryAnnotations = Array.isArray(rawAnnotations)
    ? rawAnnotations.map((a: any) => ({
        id: Number(a.id || 0),
        annotator_schema_version: 'v1.0',
        quote: String(a.quote || ''),
        text: String(a.text || ''),
        color: String(a.color || 'yellow'),
        ranges: typeof a.ranges === 'string' ? JSON.parse(a.ranges || '[]') : (a.ranges || []),
        created_at: formatRfc3339(a.created_at),
        updated_at: formatRfc3339(a.updated_at),
        user: 'wallaflare'
      }))
    : [];
  const rawTags = (row as any)?.tags || tags || [];
  const entryTags = Array.isArray(rawTags)
    ? rawTags.map((t: any) => ({
        id: Number(t.id || 0),
        label: String(t.label || ''),
        slug: String(t.slug || '')
      }))
    : [];

  return {
    id: row?.id || 0,
    title: row?.title || 'Untitled',
    url: row?.url || '',
    hashed_url: null,
    given_url: row?.url || null,
    hashed_given_url: null,
    content: row?.content || '',
    is_archived: row?.is_archived ? 1 : 0,
    archived_at: row?.is_archived ? updatedAt : null,
    is_starred: row?.is_starred ? 1 : 0,
    starred_at: row?.is_starred ? updatedAt : null,
    user_name: 'wallaflare',
    user_email: 'user@wallaflare.local',
    user_id: 1,
    tags: entryTags,
    is_public: false,
    uid: null,
    created_at: createdAt,
    updated_at: updatedAt,
    published_at: publishedAt,
    published_by: row?.author ? [row.author] : [],
    author: row?.author || null,
    reading_time: row?.reading_time || 1,
    domain_name: row?.domain_name || '',
    preview_picture: row?.preview_picture || null,
    language: row?.language || 'en',
    mimetype: 'text/html',
    text: plainText,
    annotations: entryAnnotations,
    origin_url: row?.url || null,
  };
}

export interface GetEntriesFilter {
  is_archived?: number;
  is_starred?: number;
  page?: number;
  perPage?: number;
  order?: 'asc' | 'desc';
  sort?: 'created' | 'updated' | 'archived';
  search?: string;
  domain_name?: string;
  since?: string | number;
  tags?: string | string[];
  tag?: string;
}

export async function getTags(db: D1Database): Promise<TagItem[]> {
  try {
    const query = `
      SELECT t.id, t.label, t.slug, COUNT(et.entry_id) as entry_count
      FROM tags t
      LEFT JOIN entry_tags et ON t.id = et.tag_id
      GROUP BY t.id, t.label, t.slug
      ORDER BY t.label ASC
    `;
    const { results } = await db.prepare(query).all<TagItem>();
    return results || [];
  } catch {
    return [];
  }
}

export async function getEntryTags(db: D1Database, entryId: number): Promise<TagItem[]> {
  try {
    const query = `
      SELECT t.id, t.label, t.slug 
      FROM tags t
      JOIN entry_tags et ON t.id = et.tag_id
      WHERE et.entry_id = ?
      ORDER BY t.label ASC
    `;
    const { results } = await db.prepare(query).bind(entryId).all<TagItem>();
    return results || [];
  } catch {
    return [];
  }
}


export function formatAnnotationResponse(row: any): AnnotationItem {
  return {
    id: Number(row.id || 0),
    entry_id: Number(row.entry_id || 0),
    annotator_schema_version: 'v1.0',
    quote: String(row.quote || ''),
    text: String(row.text || ''),
    color: String(row.color || 'yellow'),
    ranges: typeof row.ranges === 'string' ? JSON.parse(row.ranges || '[]') : (row.ranges || []),
    target: row.target ? (typeof row.target === 'string' ? JSON.parse(row.target) : row.target) : undefined,
    created_at: formatRfc3339(row.created_at),
    updated_at: formatRfc3339(row.updated_at),
    user: row.user_id || 'wallaflare'
  };
}

export async function getAllEntryAnnotationsBatch(db: D1Database, entryIds: number[]): Promise<Map<number, AnnotationItem[]>> {
  const map = new Map<number, AnnotationItem[]>();
  if (entryIds.length === 0) return map;

  try {
    const placeholders = entryIds.map(() => '?').join(',');
    const query = `
      SELECT id, entry_id, user_id, quote, text, color, ranges, target, created_at, updated_at
      FROM annotations
      WHERE entry_id IN (${placeholders})
      ORDER BY id ASC
    `;
    const { results } = await db.prepare(query).bind(...entryIds).all<any>();
    if (results) {
      for (const r of results) {
        if (!map.has(r.entry_id)) map.set(r.entry_id, []);
        map.get(r.entry_id)!.push(formatAnnotationResponse(r));
      }
    }
  } catch {}
  return map;
}

export async function getEntryAnnotations(db: D1Database, entryId: number): Promise<AnnotationItem[]> {
  try {
    const query = `
      SELECT id, entry_id, user_id, quote, text, color, ranges, target, created_at, updated_at
      FROM annotations
      WHERE entry_id = ?
      ORDER BY id ASC
    `;
    const { results } = await db.prepare(query).bind(entryId).all<any>();
    return (results || []).map(formatAnnotationResponse);
  } catch {
    return [];
  }
}

export async function createAnnotation(
  db: D1Database,
  entryId: number,
  data: { quote: string; text?: string; color?: string; ranges?: any[]; target?: any; user_id?: string }
): Promise<AnnotationItem> {
  const now = new Date().toISOString();
  const rangesStr = JSON.stringify(data.ranges || []);
  const targetStr = data.target ? JSON.stringify(data.target) : null;
  const color = data.color || 'yellow';
  const text = data.text || '';
  const quote = data.quote || '';
  const userId = data.user_id || 'wallaflare';

  const res = await db.prepare(`
    INSERT INTO annotations (entry_id, user_id, quote, text, color, ranges, target, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(entryId, userId, quote, text, color, rangesStr, targetStr, now, now).run();

  const id = res.meta.last_row_id || 0;
  return formatAnnotationResponse({
    id,
    entry_id: entryId,
    user_id: userId,
    quote,
    text,
    color,
    ranges: data.ranges || [],
    target: data.target,
    created_at: now,
    updated_at: now
  });
}

export async function updateAnnotation(db: D1Database, id: number, data: { text?: string; color?: string; target?: any }): Promise<AnnotationItem | null> {
  const existing = await db.prepare('SELECT * FROM annotations WHERE id = ? LIMIT 1').bind(id).first<any>();
  if (!existing) return null;

  const now = new Date().toISOString();
  const text = data.text !== undefined ? data.text : existing.text;
  const color = data.color !== undefined ? data.color : existing.color;
  const targetStr = data.target !== undefined ? (data.target ? JSON.stringify(data.target) : null) : existing.target;

  await db.prepare(`
    UPDATE annotations SET text = ?, color = ?, target = ?, updated_at = ? WHERE id = ?
  `).bind(text, color, targetStr, now, id).run();

  return formatAnnotationResponse({
    ...existing,
    text,
    color,
    target: targetStr,
    updated_at: now
  });
}

export async function deleteAnnotation(db: D1Database, id: number): Promise<boolean> {
  const res = await db.prepare('DELETE FROM annotations WHERE id = ?').bind(id).run();
  return (res.meta.changes || 0) > 0;
}

export async function getAllEntryTagsBatch(db: D1Database, entryIds: number[]): Promise<Map<number, TagItem[]>> {
  const map = new Map<number, TagItem[]>();
  if (entryIds.length === 0) return map;

  try {
    const placeholders = entryIds.map(() => '?').join(',');
    const query = `
      SELECT et.entry_id, t.id, t.label, t.slug 
      FROM tags t
      JOIN entry_tags et ON t.id = et.tag_id
      WHERE et.entry_id IN (${placeholders})
      ORDER BY t.label ASC
    `;
    const { results } = await db.prepare(query).bind(...entryIds).all<{ entry_id: number; id: number; label: string; slug: string }>();
    if (results) {
      for (const r of results) {
        if (!map.has(r.entry_id)) map.set(r.entry_id, []);
        map.get(r.entry_id)!.push({ id: r.id, label: r.label, slug: r.slug });
      }
    }
  } catch {}
  return map;
}

export async function addTagsToEntry(db: D1Database, entryId: number, rawTags: string | string[]): Promise<TagItem[]> {
  const tagsList = (Array.isArray(rawTags) ? rawTags : String(rawTags).split(','))
    .map(t => t.trim())
    .filter(Boolean);

  if (tagsList.length === 0) {
    return await getEntryTags(db, entryId);
  }

  for (const label of tagsList) {
    const slug = slugify(label);
    try {
      await db.prepare('INSERT OR IGNORE INTO tags (label, slug) VALUES (?, ?)').bind(label, slug).run();
      const tag = await db.prepare('SELECT id, label, slug FROM tags WHERE slug = ? LIMIT 1').bind(slug).first<TagItem>();
      if (tag) {
        await db.prepare('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)').bind(entryId, tag.id).run();
      }
    } catch (e) {
      console.warn('Error saving tag:', e);
    }
  }

  const tagRev = await bumpSyncRevision(db);
  await db.prepare('UPDATE entries SET updated_at = ?, revision = ? WHERE id = ?').bind(new Date().toISOString(), tagRev, entryId).run();
  return await getEntryTags(db, entryId);
}

export async function removeTagFromEntry(db: D1Database, entryId: number, tagIdOrSlug: number | string): Promise<TagItem[]> {
  let tagId: number | null = null;
  const num = Number(tagIdOrSlug);
  if (!isNaN(num) && num > 0) {
    tagId = num;
  } else {
    const tag = await db.prepare('SELECT id FROM tags WHERE slug = ? OR label = ? LIMIT 1').bind(String(tagIdOrSlug), String(tagIdOrSlug)).first<{ id: number }>();
    if (tag) tagId = tag.id;
  }

  if (tagId) {
    await db.prepare('DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?').bind(entryId, tagId).run();
    const tagRev = await bumpSyncRevision(db);
  await db.prepare('UPDATE entries SET updated_at = ?, revision = ? WHERE id = ?').bind(new Date().toISOString(), tagRev, entryId).run();
  }

  return await getEntryTags(db, entryId);
}

export interface LibraryCounts {
  unread: number;
  starred: number;
  archive: number;
  total: number;
}

export async function getLibraryCounts(db: D1Database): Promise<LibraryCounts> {
  const row = await db.prepare(`
    SELECT 
      SUM(CASE WHEN is_archived = 0 THEN 1 ELSE 0 END) as unread,
      SUM(CASE WHEN is_starred = 1 THEN 1 ELSE 0 END) as starred,
      SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archive,
      COUNT(*) as total
    FROM entries
  `).first<{ unread: number | null; starred: number | null; archive: number | null; total: number | null }>();

  return {
    unread: row?.unread || 0,
    starred: row?.starred || 0,
    archive: row?.archive || 0,
    total: row?.total || 0,
  };
}

export async function deleteTag(db: D1Database, tagIdOrSlug: number | string): Promise<boolean> {
  let tagId: number | null = null;
  const num = Number(tagIdOrSlug);
  if (!isNaN(num) && num > 0) {
    tagId = num;
  } else {
    const tag = await db.prepare('SELECT id FROM tags WHERE slug = ? OR label = ? LIMIT 1').bind(String(tagIdOrSlug), String(tagIdOrSlug)).first<{ id: number }>();
    if (tag) tagId = tag.id;
  }
  if (!tagId) return false;
  await db.prepare('DELETE FROM entry_tags WHERE tag_id = ?').bind(tagId).run();
  const res = await db.prepare('DELETE FROM tags WHERE id = ?').bind(tagId).run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function getEntries(
  db: D1Database,
  filter: GetEntriesFilter = {}
): Promise<{ entries: EntryRow[]; total: number; page: number; limit: number; pages: number }> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filter.is_archived !== undefined) {
    conditions.push('is_archived = ?');
    params.push(filter.is_archived);
  }

  if (filter.is_starred !== undefined) {
    conditions.push('is_starred = ?');
    params.push(filter.is_starred);
  }

  if (filter.domain_name) {
    conditions.push('domain_name = ?');
    params.push(filter.domain_name);
  }

  // Filter by tags
  const rawTagFilter = filter.tags || filter.tag;
  if (rawTagFilter) {
    const tagList = (Array.isArray(rawTagFilter) ? rawTagFilter : String(rawTagFilter).split(','))
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    if (tagList.length > 0) {
      const tagPlaceholders = tagList.map(() => '?').join(',');
      conditions.push(`id IN (
        SELECT et.entry_id 
        FROM entry_tags et 
        JOIN tags t ON et.tag_id = t.id 
        WHERE t.slug IN (${tagPlaceholders}) OR t.label IN (${tagPlaceholders})
      )`);
      params.push(...tagList, ...tagList);
    }
  }

  // Handle since parameter: ignore 0 / empty, handle numeric unix timestamps
  if (filter.since !== undefined && filter.since !== '' && filter.since !== '0' && filter.since !== 0) {
    let sinceIso = String(filter.since);
    const num = Number(filter.since);
    if (!isNaN(num) && num > 0) {
      const ms = num < 10000000000 ? num * 1000 : num;
      sinceIso = new Date(ms).toISOString();
    }
    conditions.push('updated_at >= ?');
    params.push(sinceIso);
  }

  if (filter.since_rev !== undefined && !isNaN(filter.since_rev) && filter.since_rev > 0) {
    conditions.push('revision > ?');
    params.push(filter.since_rev);
  }

  if (filter.search) {
    conditions.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${filter.search}%`);
    params.push(`%${filter.search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Total count
  const countQuery = `SELECT COUNT(*) as total FROM entries ${whereClause}`;
  const countResult = await db.prepare(countQuery).bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

  // Pagination & Sorting
  const page = Math.max(1, filter.page || 1);
  const limit = Math.max(1, Math.min(100, filter.perPage || 30));
  const offset = (page - 1) * limit;

  let sortCol = 'created_at';
  let sortOrder = (filter.order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const rawSort = String(filter.sort || '').toLowerCase();
  if (rawSort === 'updated' || rawSort === 'updated_at') {
    sortCol = 'updated_at';
  } else if (rawSort === 'title') {
    sortCol = 'title COLLATE NOCASE';
    if (!filter.order) sortOrder = 'ASC';
  } else if (rawSort === 'shortest') {
    sortCol = 'reading_time';
    sortOrder = 'ASC';
  } else if (rawSort === 'longest') {
    sortCol = 'reading_time';
    sortOrder = 'DESC';
  } else if (rawSort === 'reading_time') {
    sortCol = 'reading_time';
  } else if (rawSort === 'oldest') {
    sortCol = 'created_at';
    sortOrder = 'ASC';
  } else if (rawSort === 'newest') {
    sortCol = 'created_at';
    sortOrder = 'DESC';
  }

  const selectQuery = `
    SELECT * FROM entries 
    ${whereClause} 
    ORDER BY ${sortCol} ${sortOrder} 
    LIMIT ? OFFSET ?
  `;

  const { results } = await db.prepare(selectQuery).bind(...params, limit, offset).all<EntryRow>();
  const entries = results || [];

  // Batch populate tags & annotations in 1 single pass
  if (entries.length > 0) {
    const entryIds = entries.map(e => e.id);
    const tagsMap = await getAllEntryTagsBatch(db, entryIds);
    const annotationsMap = await getAllEntryAnnotationsBatch(db, entryIds);
    for (const entry of entries) {
      (entry as any).tags = tagsMap.get(entry.id) || [];
      (entry as any).annotations = annotationsMap.get(entry.id) || [];
    }
  }

  return {
    entries,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  };
}

export async function getEntryById(db: D1Database, id: number): Promise<EntryRow | null> {
  const query = 'SELECT * FROM entries WHERE id = ? LIMIT 1';
  const entry = await db.prepare(query).bind(id).first<EntryRow>();
  if (entry) {
    (entry as any).tags = await getEntryTags(db, entry.id);
    (entry as any).annotations = await getEntryAnnotations(db, entry.id);
  }
  return entry;
}

export async function getEntryByUrl(db: D1Database, url: string): Promise<EntryRow | null> {
  const query = 'SELECT * FROM entries WHERE url = ? LIMIT 1';
  const entry = await db.prepare(query).bind(url).first<EntryRow>();
  if (entry) {
    (entry as any).tags = await getEntryTags(db, entry.id);
    (entry as any).annotations = await getEntryAnnotations(db, entry.id);
  }
  return entry;
}

export async function createEntry(
  db: D1Database,
  entry: Partial<EntryRow> & { tags?: string | string[] }
): Promise<EntryRow> {
  const newRev = await bumpSyncRevision(db);
  const now = new Date().toISOString();
  const query = `
    INSERT INTO entries (
      url, title, content, preview_picture, domain_name, 
      reading_time, language, is_archived, is_starred, 
      created_at, updated_at, author, published_at, revision
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const res = await db.prepare(query).bind(
    entry.url || null,
    entry.title || 'Untitled',
    entry.content || '',
    entry.preview_picture || null,
    entry.domain_name || null,
    entry.reading_time || 1,
    entry.language || 'en',
    entry.is_archived ?? 0,
    entry.is_starred ?? 0,
    now,
    now,
    entry.author || null,
    entry.published_at || null,
    newRev
  ).run();

  const id = res.meta?.last_row_id;
  let created: EntryRow | null = null;
  if (id) {
    created = await getEntryById(db, id);
  }

  if (!created) {
    const latest = await db.prepare('SELECT * FROM entries WHERE id = (SELECT MAX(id) FROM entries)').first<EntryRow>();
    if (latest) created = latest;
  }

  const resultEntry: EntryRow = created || {
    id: id || 1,
    url: entry.url || null,
    title: entry.title || 'Untitled',
    content: entry.content || '',
    preview_picture: entry.preview_picture || null,
    domain_name: entry.domain_name || null,
    reading_time: entry.reading_time || 1,
    language: entry.language || 'en',
    is_archived: entry.is_archived ?? 0,
    is_starred: entry.is_starred ?? 0,
    created_at: now,
    updated_at: now,
    author: entry.author || null,
    published_at: entry.published_at || null,
  };

  if (entry.tags) {
    (resultEntry as any).tags = await addTagsToEntry(db, resultEntry.id, entry.tags);
  } else {
    (resultEntry as any).tags = [];
  }

  return resultEntry;
}

export async function updateEntry(
  db: D1Database,
  id: number,
  updates: Partial<EntryRow> & { tags?: string | string[] }
): Promise<EntryRow | null> {
  const existing = await getEntryById(db, id);
  if (!existing) return null;

  const newRev = await bumpSyncRevision(db);
  const now = new Date().toISOString();
  const setClauses: string[] = ['updated_at = ?', 'revision = ?'];
  const params: any[] = [now, newRev];

  if (updates.title !== undefined) {
    setClauses.push('title = ?');
    params.push(updates.title);
  }
  if (updates.content !== undefined) {
    setClauses.push('content = ?');
    params.push(updates.content);
  }
  if (updates.is_archived !== undefined) {
    setClauses.push('is_archived = ?');
    params.push(updates.is_archived);
  }
  if (updates.is_starred !== undefined) {
    setClauses.push('is_starred = ?');
    params.push(updates.is_starred);
  }
  if (updates.author !== undefined) {
    setClauses.push('author = ?');
    params.push(updates.author);
  }
  if (updates.reading_time !== undefined) {
    setClauses.push('reading_time = ?');
    params.push(updates.reading_time);
  }
  if (updates.preview_picture !== undefined) {
    setClauses.push('preview_picture = ?');
    params.push(updates.preview_picture);
  }
  if (updates.domain_name !== undefined) {
    setClauses.push('domain_name = ?');
    params.push(updates.domain_name);
  }
  if (updates.language !== undefined) {
    setClauses.push('language = ?');
    params.push(updates.language);
  }

  params.push(id);
  const query = `UPDATE entries SET ${setClauses.join(', ')} WHERE id = ?`;
  await db.prepare(query).bind(...params).run();

  if (updates.tags !== undefined) {
    await addTagsToEntry(db, id, updates.tags);
  }

  return await getEntryById(db, id);
}

export async function deleteEntriesBatch(db: D1Database, ids: number[]): Promise<number> {
  const validIds = ids.filter(id => typeof id === 'number' && !isNaN(id) && id > 0);
  if (validIds.length === 0) return 0;
  const placeholders = validIds.map(() => '?').join(',');
  await db.prepare(`DELETE FROM entry_tags WHERE entry_id IN (${placeholders})`).bind(...validIds).run();
  const res = await db.prepare(`DELETE FROM entries WHERE id IN (${placeholders})`).bind(...validIds).run();
  await recordDeletedEntriesBatch(db, validIds);
  return res.meta?.changes ?? validIds.length;
}

export async function updateEntriesBatch(db: D1Database, ids: number[], updates: { is_starred?: number; is_archived?: number }): Promise<number> {
  const validIds = ids.filter(id => typeof id === 'number' && !isNaN(id) && id > 0);
  if (validIds.length === 0) return 0;
  const newRev = await bumpSyncRevision(db);
  const setClauses: string[] = ['updated_at = ?', 'revision = ?'];
  const params: any[] = [new Date().toISOString(), newRev];

  if (updates.is_starred !== undefined) {
    setClauses.push('is_starred = ?');
    params.push(updates.is_starred ? 1 : 0);
  }
  if (updates.is_archived !== undefined) {
    setClauses.push('is_archived = ?');
    params.push(updates.is_archived ? 1 : 0);
  }

  const placeholders = validIds.map(() => '?').join(',');
  params.push(...validIds);

  const query = `UPDATE entries SET ${setClauses.join(', ')} WHERE id IN (${placeholders})`;
  const res = await db.prepare(query).bind(...params).run();
  return res.meta?.changes ?? validIds.length;
}

export async function addTagsToEntriesBatch(db: D1Database, ids: number[], rawTags: any): Promise<void> {
  const validIds = ids.filter(id => typeof id === 'number' && !isNaN(id) && id > 0);
  if (validIds.length === 0) return;
  for (const id of validIds) {
    await addTagsToEntry(db, id, rawTags);
  }
}

export async function removeTagFromEntriesBatch(db: D1Database, ids: number[], tagParam: string | number): Promise<void> {
  const validIds = ids.filter(id => typeof id === 'number' && !isNaN(id) && id > 0);
  if (validIds.length === 0) return;
  for (const id of validIds) {
    await removeTagFromEntry(db, id, tagParam);
  }
}

export async function deleteEntry(db: D1Database, id: number): Promise<boolean> {
  await db.prepare('DELETE FROM entry_tags WHERE entry_id = ?').bind(id).run();
  const query = 'DELETE FROM entries WHERE id = ?';
  const res = await db.prepare(query).bind(id).run();
  const deleted = (res.meta?.changes ?? 0) > 0;
  if (deleted) {
    await recordDeletedEntry(db, id);
  }
  return deleted;
}

// -------------------------------------------------------------
// Authentication Rate Limiting & Brute Force Protection
// -------------------------------------------------------------

export interface RateLimitStatus {
  allowed: boolean;
  attempts_left: number;
  locked: boolean;
  remaining_seconds?: number;
  remaining_minutes?: number;
}

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
export const FAILURE_WINDOW_MS = 15 * 60 * 1000;   // 15 minutes window without attempts resets counter

let rateLimitsTableEnsured = false;
export async function ensureAuthRateLimitsTable(db: D1Database): Promise<void> {
  if (rateLimitsTableEnsured) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS auth_rate_limits (
        ip TEXT PRIMARY KEY,
        failed_attempts INTEGER DEFAULT 0,
        last_attempt_at INTEGER NOT NULL,
        locked_until INTEGER DEFAULT 0
      )
    `).run();
    rateLimitsTableEnsured = true;
  } catch (err) {
    console.error('Failed ensuring auth_rate_limits table:', err);
  }
}

export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    let dummy = 0;
    for (let i = 0; i < a.length; i++) {
      dummy |= a.charCodeAt(i) ^ a.charCodeAt(i);
    }
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function checkAuthRateLimit(db: D1Database, ip: string): Promise<RateLimitStatus> {
  await ensureAuthRateLimitsTable(db);
  try {
    const row = await db.prepare(
      'SELECT failed_attempts, last_attempt_at, locked_until FROM auth_rate_limits WHERE ip = ? LIMIT 1'
    ).bind(ip).first<{ failed_attempts: number; last_attempt_at: number; locked_until: number }>();

    if (!row) {
      return { allowed: true, attempts_left: MAX_FAILED_ATTEMPTS, locked: false };
    }

    const now = Date.now();

    // If currently locked
    if (row.locked_until > now) {
      const remainingSeconds = Math.max(1, Math.ceil((row.locked_until - now) / 1000));
      const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
      return {
        allowed: false,
        attempts_left: 0,
        locked: true,
        remaining_seconds: remainingSeconds,
        remaining_minutes: remainingMinutes
      };
    }

    // If locked_until expired, or window expired (e.g. 15 min since last attempt), reset counter
    if (row.locked_until > 0 || (now - row.last_attempt_at > FAILURE_WINDOW_MS)) {
      await db.prepare('DELETE FROM auth_rate_limits WHERE ip = ?').bind(ip).run().catch(() => {});
      return { allowed: true, attempts_left: MAX_FAILED_ATTEMPTS, locked: false };
    }

    const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - row.failed_attempts);
    return {
      allowed: attemptsLeft > 0,
      attempts_left: attemptsLeft,
      locked: false
    };
  } catch {
    return { allowed: true, attempts_left: MAX_FAILED_ATTEMPTS, locked: false };
  }
}

export async function recordFailedAuthAttempt(db: D1Database, ip: string): Promise<RateLimitStatus> {
  await ensureAuthRateLimitsTable(db);
  const now = Date.now();
  try {
    const row = await db.prepare(
      'SELECT failed_attempts, last_attempt_at, locked_until FROM auth_rate_limits WHERE ip = ? LIMIT 1'
    ).bind(ip).first<{ failed_attempts: number; last_attempt_at: number; locked_until: number }>();

    let newCount = 1;
    if (row) {
      if (now - row.last_attempt_at <= FAILURE_WINDOW_MS && row.locked_until <= now) {
        newCount = row.failed_attempts + 1;
      }
    }

    const locked = newCount >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = locked ? now + LOCKOUT_DURATION_MS : 0;

    await db.prepare(`
      INSERT INTO auth_rate_limits (ip, failed_attempts, last_attempt_at, locked_until)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(ip) DO UPDATE SET
        failed_attempts = excluded.failed_attempts,
        last_attempt_at = excluded.last_attempt_at,
        locked_until = excluded.locked_until
    `).bind(ip, newCount, now, lockedUntil).run();

    const attemptsLeft = Math.max(0, MAX_FAILED_ATTEMPTS - newCount);
    const remainingMinutes = locked ? 15 : undefined;
    const remainingSeconds = locked ? 15 * 60 : undefined;

    return {
      allowed: !locked,
      attempts_left: attemptsLeft,
      locked,
      remaining_minutes: remainingMinutes,
      remaining_seconds: remainingSeconds
    };
  } catch (err) {
    console.error('Error recording auth rate limit:', err);
    return { allowed: true, attempts_left: MAX_FAILED_ATTEMPTS, locked: false };
  }
}

export async function resetAuthRateLimit(db: D1Database, ip: string): Promise<void> {
  await ensureAuthRateLimitsTable(db);
  try {
    await db.prepare('DELETE FROM auth_rate_limits WHERE ip = ?').bind(ip).run();
  } catch {}
}

// -------------------------------------------------------------
// Monotonic Revision & Tombstone Sync Engine
// -------------------------------------------------------------

let syncTablesEnsured = false;
export async function ensureSyncRevisionTables(db: D1Database): Promise<void> {
  if (syncTablesEnsured) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS sync_state (
        id INTEGER PRIMARY KEY,
        revision INTEGER NOT NULL DEFAULT 1,
        instance_id INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
    try {
      await db.prepare('ALTER TABLE sync_state ADD COLUMN instance_id INTEGER NOT NULL DEFAULT 1').run();
    } catch {}
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS deleted_entries (
        entry_id INTEGER PRIMARY KEY,
        revision INTEGER NOT NULL,
        deleted_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS site_cookies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT UNIQUE NOT NULL,
        site_name TEXT,
        cookie_value TEXT NOT NULL,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        revision INTEGER NOT NULL DEFAULT 1,
        user_id TEXT DEFAULT 'wallaflare',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `).run();
    await db.prepare(`
      INSERT OR IGNORE INTO sync_state (id, revision, instance_id) VALUES (1, 1, 1)
    `).run();
    try {
      await db.prepare('ALTER TABLE entries ADD COLUMN revision INTEGER DEFAULT 1').run();
    } catch {
      // Column already exists
    }
    syncTablesEnsured = true;
  } catch (e) {
    console.error('Error ensuring sync tables:', e);
  }
}

export async function bumpSyncRevision(db: D1Database): Promise<number> {
  await ensureSyncRevisionTables(db);
  try {
    await db.prepare(`
      UPDATE sync_state 
      SET revision = revision + 1, updated_at = datetime('now') 
      WHERE id = 1
    `).run();
    const res = await db.prepare('SELECT revision FROM sync_state WHERE id = 1').first<{ revision: number }>();
    return res?.revision || 2;
  } catch (e) {
    console.error('Error bumping sync revision:', e);
    return Date.now();
  }
}

export async function getCurrentSyncRevision(db: D1Database): Promise<number> {
  await ensureSyncRevisionTables(db);
  try {
    const res = await db.prepare('SELECT revision FROM sync_state WHERE id = 1').first<{ revision: number }>();
    return res?.revision || 1;
  } catch (e) {
    return 1;
  }
}

export async function recordDeletedEntry(db: D1Database, entryId: number): Promise<number> {
  await ensureSyncRevisionTables(db);
  const newRev = await bumpSyncRevision(db);
  try {
    await db.prepare(`
      INSERT OR REPLACE INTO deleted_entries (entry_id, revision, deleted_at) 
      VALUES (?, ?, datetime('now'))
    `).bind(entryId, newRev).run();
  } catch (e) {}
  return newRev;
}

export async function recordDeletedEntriesBatch(db: D1Database, entryIds: number[]): Promise<number> {
  if (entryIds.length === 0) return await getCurrentSyncRevision(db);
  await ensureSyncRevisionTables(db);
  const newRev = await bumpSyncRevision(db);
  for (const id of entryIds) {
    try {
      await db.prepare(`
        INSERT OR REPLACE INTO deleted_entries (entry_id, revision, deleted_at) 
        VALUES (?, ?, datetime('now'))
      `).bind(id, newRev).run();
    } catch (e) {}
  }
  return newRev;
}

export async function getDeletedEntriesSince(db: D1Database, sinceRevision: number): Promise<number[]> {
  await ensureSyncRevisionTables(db);
  try {
    const { results } = await db.prepare(`
      SELECT entry_id FROM deleted_entries WHERE revision > ?
    `).bind(sinceRevision).all<{ entry_id: number }>();
    return (results || []).map(r => r.entry_id);
  } catch (e) {
    return [];
  }
}


export async function getSyncState(db: D1Database): Promise<{ revision: number; instance_id: number }> {
  await ensureSyncRevisionTables(db);
  try {
    const res = await db.prepare('SELECT revision, instance_id FROM sync_state WHERE id = 1').first<{ revision: number; instance_id: number }>();
    return {
      revision: res?.revision || 1,
      instance_id: res?.instance_id || 0
    };
  } catch (e) {
    return { revision: 1, instance_id: 0 };
  }
}

export async function wipeDatabase(db: D1Database): Promise<{ instance_id: number; revision: number }> {
  await ensureDatabaseSchema(db);
  const now = new Date().toISOString();
  const currentSync = await getSyncState(db);
  const newInstanceId = (currentSync.instance_id || 1) + 1;
  await db.prepare('DELETE FROM entry_tags').run();
  await db.prepare('DELETE FROM annotations').run();
  await db.prepare('DELETE FROM entries').run();
  await db.prepare('DELETE FROM tags').run();
  await db.prepare('DELETE FROM deleted_entries').run();
  await db.prepare('DELETE FROM sync_state').run();
  await db.prepare('INSERT INTO sync_state (id, revision, instance_id, updated_at) VALUES (1, 1, ?, ?)').bind(newInstanceId, now).run();
  return { instance_id: newInstanceId, revision: 1 };
}


// -------------------------------------------------------------
// Site Cookies Vault (Paywall & Logged-In Sites)
// -------------------------------------------------------------

export interface SiteCookieItem {
  id?: number;
  domain: string;
  site_name?: string;
  cookie_value?: string;
  is_enabled?: number;
  has_cookie?: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getSiteCookies(db: D1Database, includeValues: boolean = false): Promise<SiteCookieItem[]> {
  await ensureDatabaseSchema(db);
  try {
    try { await db.prepare('ALTER TABLE site_cookies ADD COLUMN is_enabled INTEGER NOT NULL DEFAULT 1').run(); } catch {}
    try { await db.prepare('ALTER TABLE site_cookies ADD COLUMN revision INTEGER NOT NULL DEFAULT 1').run(); } catch {}

    const query = includeValues
      ? `SELECT id, domain, site_name, cookie_value, is_enabled, revision, created_at, updated_at, 1 as has_cookie FROM site_cookies ORDER BY domain ASC`
      : `SELECT id, domain, site_name, is_enabled, revision, created_at, updated_at, 1 as has_cookie FROM site_cookies ORDER BY domain ASC`;

    const { results } = await db.prepare(query).all<SiteCookieItem>();
    
    return (results || []).map(r => ({
      ...r,
      is_enabled: r.is_enabled !== undefined ? Number(r.is_enabled) : 1
    }));
  } catch (e) {
    console.error('[CookieVault] getSiteCookies error:', e);
    return [];
  }
}

export async function getSiteCookieForDomain(db: D1Database, targetDomain: string): Promise<string | null> {
  await ensureDatabaseSchema(db);
  try {
    const normalized = targetDomain.toLowerCase().replace(/^www\./, '');
    try { await db.prepare('ALTER TABLE site_cookies ADD COLUMN is_enabled INTEGER NOT NULL DEFAULT 1').run(); } catch {}
    try { await db.prepare('ALTER TABLE site_cookies ADD COLUMN revision INTEGER NOT NULL DEFAULT 1').run(); } catch {}

    const { results } = await db.prepare(`
      SELECT domain, cookie_value, is_enabled
      FROM site_cookies
      WHERE is_enabled = 1
    `).all<{ domain: string; cookie_value: string; is_enabled: number }>();

    if (!results || results.length === 0) return null;

    for (const row of results) {
      const rowDomain = row.domain.toLowerCase().replace(/^www\./, '');
      if (normalized === rowDomain || normalized.endsWith('.' + rowDomain)) {
        return row.cookie_value;
      }
    }
    return null;
  } catch (e) {
    console.error('[CookieVault] getSiteCookieForDomain error:', e);
    return null;
  }
}

export async function saveSiteCookie(
  db: D1Database,
  domain: string,
  siteName: string,
  cookieValue: string
): Promise<void> {
  await ensureDatabaseSchema(db);
  const newRev = await bumpSyncRevision(db);
  const now = new Date().toISOString();
  const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  
  try {
    await db.prepare(`
      INSERT INTO site_cookies (domain, site_name, cookie_value, is_enabled, revision, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(domain) DO UPDATE SET
        site_name = excluded.site_name,
        cookie_value = excluded.cookie_value,
        is_enabled = 1,
        revision = excluded.revision,
        updated_at = excluded.updated_at
    `).bind(cleanDomain, siteName || cleanDomain, cookieValue, newRev, now, now).run();
  } catch (err: any) {
    try { await db.prepare('ALTER TABLE site_cookies ADD COLUMN is_enabled INTEGER NOT NULL DEFAULT 1').run(); } catch {}
    try { await db.prepare('ALTER TABLE site_cookies ADD COLUMN revision INTEGER NOT NULL DEFAULT 1').run(); } catch {}
    
    await db.prepare(`
      INSERT INTO site_cookies (domain, site_name, cookie_value, is_enabled, revision, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(domain) DO UPDATE SET
        site_name = excluded.site_name,
        cookie_value = excluded.cookie_value,
        is_enabled = 1,
        revision = excluded.revision,
        updated_at = excluded.updated_at
    `).bind(cleanDomain, siteName || cleanDomain, cookieValue, newRev, now, now).run();
  }
}

export async function toggleSiteCookie(db: D1Database, domain: string, isEnabled: boolean): Promise<boolean> {
  await ensureDatabaseSchema(db);
  const newRev = await bumpSyncRevision(db);
  const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const now = new Date().toISOString();
  try { await db.prepare('ALTER TABLE site_cookies ADD COLUMN is_enabled INTEGER NOT NULL DEFAULT 1').run(); } catch {}
  try { await db.prepare('ALTER TABLE site_cookies ADD COLUMN revision INTEGER NOT NULL DEFAULT 1').run(); } catch {}

  const res = await db.prepare(`
    UPDATE site_cookies SET is_enabled = ?, revision = ?, updated_at = ? WHERE domain = ?
  `).bind(isEnabled ? 1 : 0, newRev, now, cleanDomain).run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function deleteSiteCookie(db: D1Database, domain: string): Promise<boolean> {
  await ensureDatabaseSchema(db);
  await bumpSyncRevision(db);
  const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const res = await db.prepare('DELETE FROM site_cookies WHERE domain = ?').bind(cleanDomain).run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function clearAllSiteCookies(db: D1Database): Promise<boolean> {
  await ensureDatabaseSchema(db);
  try {
    await bumpSyncRevision(db);
    await db.prepare('DELETE FROM site_cookies').run();
    return true;
  } catch (e) {
    console.error('[CookieVault] clearAllSiteCookies error:', e);
    return false;
  }
}
