import { EntryRow, WallabagEntry } from '../types';

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
  const plainText = (row?.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

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
    published_by: [],
    reading_time: row?.reading_time || 1,
    domain_name: row?.domain_name || '',
    preview_picture: row?.preview_picture || null,
    language: row?.language || 'en',
    mimetype: 'text/html',
    text: plainText,
    annotations: [],
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

  await db.prepare('UPDATE entries SET updated_at = ? WHERE id = ?').bind(new Date().toISOString(), entryId).run();
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
    await db.prepare('UPDATE entries SET updated_at = ? WHERE id = ?').bind(new Date().toISOString(), entryId).run();
  }

  return await getEntryTags(db, entryId);
}

export async function deleteTag(db: D1Database, tagId: number): Promise<boolean> {
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
  const sortCol = filter.sort === 'updated' ? 'updated_at' : 'created_at';
  const sortOrder = (filter.order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const selectQuery = `
    SELECT * FROM entries 
    ${whereClause} 
    ORDER BY ${sortCol} ${sortOrder} 
    LIMIT ? OFFSET ?
  `;

  const { results } = await db.prepare(selectQuery).bind(...params, limit, offset).all<EntryRow>();
  const entries = results || [];

  // Batch populate tags
  if (entries.length > 0) {
    const entryIds = entries.map(e => e.id);
    const tagsMap = await getAllEntryTagsBatch(db, entryIds);
    for (const entry of entries) {
      (entry as any).tags = tagsMap.get(entry.id) || [];
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
  }
  return entry;
}

export async function getEntryByUrl(db: D1Database, url: string): Promise<EntryRow | null> {
  const query = 'SELECT * FROM entries WHERE url = ? LIMIT 1';
  const entry = await db.prepare(query).bind(url).first<EntryRow>();
  if (entry) {
    (entry as any).tags = await getEntryTags(db, entry.id);
  }
  return entry;
}

export async function createEntry(
  db: D1Database,
  entry: Partial<EntryRow> & { tags?: string | string[] }
): Promise<EntryRow> {
  const now = new Date().toISOString();
  const query = `
    INSERT INTO entries (
      url, title, content, preview_picture, domain_name, 
      reading_time, language, is_archived, is_starred, 
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    now
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

  const now = new Date().toISOString();
  const setClauses: string[] = ['updated_at = ?'];
  const params: any[] = [now];

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

  params.push(id);
  const query = `UPDATE entries SET ${setClauses.join(', ')} WHERE id = ?`;
  await db.prepare(query).bind(...params).run();

  if (updates.tags !== undefined) {
    await addTagsToEntry(db, id, updates.tags);
  }

  return await getEntryById(db, id);
}

export async function deleteEntry(db: D1Database, id: number): Promise<boolean> {
  await db.prepare('DELETE FROM entry_tags WHERE entry_id = ?').bind(id).run();
  const query = 'DELETE FROM entries WHERE id = ?';
  const res = await db.prepare(query).bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}
