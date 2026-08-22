import { EntryRow, WallabagEntry, WallabagEntriesResponse } from '../types';

export function entryRowToWallabag(row: EntryRow): WallabagEntry {
  // Strip tags or use simple regex for text representation
  const plainText = row.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    id: row.id,
    title: row.title,
    url: row.url || '',
    is_archived: row.is_archived,
    is_starred: row.is_starred,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reading_time: row.reading_time || 1,
    domain_name: row.domain_name || (row.url ? new URL(row.url).hostname : 'direct-input'),
    preview_picture: row.preview_picture,
    user_id: 1,
    user_name: 'wallaflare',
    user_email: 'user@wallaflare.local',
    language: row.language || 'en',
    tags: [],
    mimetype: 'text/html',
    text: plainText,
  };
}

export interface GetEntriesParams {
  archive?: number; // 0 or 1
  starred?: number; // 0 or 1
  sort?: 'created' | 'updated' | 'archived' | string;
  order?: 'asc' | 'desc' | string;
  page?: number;
  perPage?: number;
  since?: number | string;
}

export async function getEntries(
  db: D1Database,
  params: GetEntriesParams = {}
): Promise<WallabagEntriesResponse> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.perPage) || 30));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const bindings: any[] = [];

  if (params.archive !== undefined && params.archive !== null && !isNaN(Number(params.archive))) {
    conditions.push('is_archived = ?');
    bindings.push(Number(params.archive));
  }

  if (params.starred !== undefined && params.starred !== null && !isNaN(Number(params.starred))) {
    conditions.push('is_starred = ?');
    bindings.push(Number(params.starred));
  }

  if (params.since) {
    const sinceTimestamp = typeof params.since === 'number'
      ? new Date(params.since * 1000).toISOString()
      : isNaN(Number(params.since))
        ? new Date(params.since).toISOString()
        : new Date(Number(params.since) * 1000).toISOString();

    conditions.push('updated_at >= ?');
    bindings.push(sinceTimestamp);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching items
  const countSql = `SELECT COUNT(*) as total FROM entries ${whereClause}`;
  const countResult = await db.prepare(countSql).bind(...bindings).first<{ total: number }>();
  const total = countResult?.total || 0;
  const pages = Math.ceil(total / limit) || 1;

  // Sorting
  const sortCol = params.sort === 'updated' ? 'updated_at' : 'created_at';
  const sortDir = (params.order?.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

  const selectSql = `
    SELECT * FROM entries
    ${whereClause}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ? OFFSET ?
  `;

  const queryBindings = [...bindings, limit, offset];
  const { results } = await db.prepare(selectSql).bind(...queryBindings).all<EntryRow>();

  const items = (results || []).map(entryRowToWallabag);

  return {
    page,
    limit,
    pages,
    total,
    _links: {
      self: { href: `/api/entries.json?page=${page}&perPage=${limit}` },
      first: { href: `/api/entries.json?page=1&perPage=${limit}` },
      last: { href: `/api/entries.json?page=${pages}&perPage=${limit}` },
      ...(page > 1 ? { prev: { href: `/api/entries.json?page=${page - 1}&perPage=${limit}` } } : {}),
      ...(page < pages ? { next: { href: `/api/entries.json?page=${page + 1}&perPage=${limit}` } } : {}),
    },
    _embedded: {
      items,
    },
  };
}

export async function getEntryById(db: D1Database, id: number): Promise<EntryRow | null> {
  const result = await db.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first<EntryRow>();
  return result || null;
}

export async function createEntry(
  db: D1Database,
  data: {
    url?: string | null;
    title: string;
    content: string;
    preview_picture?: string | null;
    domain_name?: string | null;
    reading_time?: number;
    language?: string;
    is_archived?: number;
    is_starred?: number;
  }
): Promise<EntryRow> {
  const now = new Date().toISOString();
  const res = await db.prepare(`
    INSERT INTO entries (
      url, title, content, preview_picture, domain_name,
      reading_time, language, is_archived, is_starred,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `).bind(
    data.url || null,
    data.title,
    data.content,
    data.preview_picture || null,
    data.domain_name || null,
    data.reading_time || 1,
    data.language || 'en',
    data.is_archived ? 1 : 0,
    data.is_starred ? 1 : 0,
    now,
    now
  ).first<EntryRow>();

  if (!res) {
    throw new Error('Failed to insert entry into database');
  }

  return res;
}

export async function updateEntry(
  db: D1Database,
  id: number,
  updates: {
    title?: string;
    content?: string;
    is_archived?: number;
    is_starred?: number;
    preview_picture?: string | null;
    reading_time?: number;
  }
): Promise<EntryRow | null> {
  const existing = await getEntryById(db, id);
  if (!existing) return null;

  const setClauses: string[] = ['updated_at = ?'];
  const now = new Date().toISOString();
  const bindings: any[] = [now];

  if (updates.title !== undefined) {
    setClauses.push('title = ?');
    bindings.push(updates.title);
  }
  if (updates.content !== undefined) {
    setClauses.push('content = ?');
    bindings.push(updates.content);
  }
  if (updates.is_archived !== undefined) {
    setClauses.push('is_archived = ?');
    bindings.push(updates.is_archived ? 1 : 0);
  }
  if (updates.is_starred !== undefined) {
    setClauses.push('is_starred = ?');
    bindings.push(updates.is_starred ? 1 : 0);
  }
  if (updates.preview_picture !== undefined) {
    setClauses.push('preview_picture = ?');
    bindings.push(updates.preview_picture);
  }
  if (updates.reading_time !== undefined) {
    setClauses.push('reading_time = ?');
    bindings.push(updates.reading_time);
  }

  bindings.push(id);

  const updateSql = `
    UPDATE entries
    SET ${setClauses.join(', ')}
    WHERE id = ?
    RETURNING *
  `;

  const res = await db.prepare(updateSql).bind(...bindings).first<EntryRow>();
  return res || null;
}

export async function deleteEntry(db: D1Database, id: number): Promise<boolean> {
  const res = await db.prepare('DELETE FROM entries WHERE id = ?').bind(id).run();
  return (res.meta.changes ?? 0) > 0;
}
