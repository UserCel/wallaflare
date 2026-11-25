import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { createMockD1Database } from './mock-db';
import { parseImportFile } from '../client/modals/import';

describe('Library Import & Backup', () => {
  let db: any;

  beforeEach(() => {
    db = createMockD1Database();
  });

  it('parses Wallabag/Wallaflare JSON, Pocket CSV, and Netscape Bookmarks HTML client-side', () => {
    const jsonItems = parseImportFile(JSON.stringify([
      { url: 'https://example.com/1', title: 'One', tags: [{ label: 'tech' }], is_starred: 1 },
    ]), 'wallabag.json');
    expect(jsonItems).toHaveLength(1);
    expect(jsonItems[0].tags).toEqual(['tech']);
    expect(jsonItems[0].is_starred).toBe(1);

    const pocketCsv = `title,url,time_added,tags,status\n"Quoted, Title",https://example.com/2,1700000000,"ai|reading",archive`;
    const csvItems = parseImportFile(pocketCsv, 'ril_export.csv');
    expect(csvItems).toHaveLength(1);
    expect(csvItems[0].title).toBe('Quoted, Title');
    expect(csvItems[0].tags).toEqual(['ai', 'reading']);
    expect(csvItems[0].is_archived).toBe(1);

    const htmlBookmarks = `<!DOCTYPE NETSCAPE-Bookmark-file-1><DL><DT><A HREF="https://example.com/3" TAGS="news,web">Bookmark 3</A></DL>`;
    const htmlItems = parseImportFile(htmlBookmarks, 'bookmarks.html');
    expect(htmlItems).toHaveLength(1);
    expect(htmlItems[0].url).toBe('https://example.com/3');
    expect(htmlItems[0].tags).toEqual(['news', 'web']);
  });

  it('imports chunks via POST /api/import/batch with tags/annotations, skips duplicates, and caps at 50 items', async () => {
    const res = await app.request('/api/import/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          {
            url: 'https://example.com/imp-1',
            title: 'Imported 1',
            content: '<p>Hello imported world</p>',
            tags: ['imported'],
            is_starred: 1,
            annotations: [{ quote: 'imported world', text: 'my note', color: 'green' }],
          },
          {
            url: 'https://example.com/imp-1',
            title: 'Duplicate URL',
          },
        ],
      }),
    }, { DB: db });

    expect(res.status).toBe(200);
    const data = await res.json<any>();
    expect(data).toEqual({ success: true, imported: 1, skipped: 1, total: 2 });

    const oversized = Array.from({ length: 51 }, (_, i) => ({ url: `https://example.com/${i}` }));
    const errRes = await app.request('/api/import/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: oversized }),
    }, { DB: db });
    expect(errRes.status).toBe(400);
  });
});
