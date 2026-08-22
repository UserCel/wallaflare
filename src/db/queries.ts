import { EntryRow, WallabagEntry } from '../types';

function formatDate(d?: string | null): string {
  if (!d) return new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
  const date = new Date(d);
  if (isNaN(date.getTime())) return new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
  return date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

export function entryRowToWallabag(row: EntryRow): WallabagEntry {
  const createdAt = formatDate(row?.created_at);
  const updatedAt = formatDate(row?.updated_at);
  const publishedAt = formatDate(row?.published_at || row?.created_at);
  const plainText = (row?.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    id: row?.id || 0,
    title: row?.title || 'Untitled',
    url: row?.url || '',
    content: row?.content || '',
    is_archived: row?.is_archived ? 1 : 0,
    is_starred: row?.is_starred ? 1 : 0,
    user_name: 'wallaflare',
    user_email: 'user@wallaflare.local',
    user_id: 1,
    tags: [],
    is_public: 0,
    created_at: createdAt,
    updated_at: updatedAt,
    published_at: publishedAt,
    published_by: [],
    reading_time: row?.reading_time || 1,
    domain_name: row?.domain_name || '',
    preview_picture: row?.preview_picture || null,
    language: row?.language || 'en',
    starred_at: row?.is_starred ? updatedAt : null,
    archived_at: row?.is_archived ? updatedAt : null,
    mimetype: 'text/html',
    text: plainText,
    annotations: [],
    origin_url: row?.url || null,
    given_url: row?.url || null,
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

  return {
    entries: results || [],
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  };
}

export async function getEntryById(db: D1Database, id: number): Promise<EntryRow | null> {
  const query = 'SELECT * FROM entries WHERE id = ? LIMIT 1';
  return await db.prepare(query).bind(id).first<EntryRow>();
}

export async function getEntryByUrl(db: D1Database, url: string): Promise<EntryRow | null> {
  const query = 'SELECT * FROM entries WHERE url = ? LIMIT 1';
  return await db.prepare(query).bind(url).first<EntryRow>();
}

export async function createEntry(
  db: D1Database,
  entry: Partial<EntryRow>
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
  if (id) {
    const created = await getEntryById(db, id);
    if (created) return created;
  }

  const latest = await db.prepare('SELECT * FROM entries WHERE id = (SELECT MAX(id) FROM entries)').first<EntryRow>();
  if (latest) return latest;

  return {
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
}

export async function updateEntry(
  db: D1Database,
  id: number,
  updates: Partial<EntryRow>
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

  return await getEntryById(db, id);
}

export async function deleteEntry(db: D1Database, id: number): Promise<boolean> {
  const query = 'DELETE FROM entries WHERE id = ?';
  const res = await db.prepare(query).bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}
