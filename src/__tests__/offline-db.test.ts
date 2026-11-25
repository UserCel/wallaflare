import { describe, it, expect, beforeEach } from 'vitest';
import {
  deduplicateEntries,
  saveEntriesToIndexedDB,
  loadEntriesFromIndexedDB,
  clearIndexedDB,
} from '../client/storage/db';

describe('Offline IndexedDB Storage (src/client/storage/db.ts)', () => {
  beforeEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).indexedDB;
  });

  it('deduplicates entries by id preserving order', () => {
    const out = deduplicateEntries([
      { id: 1, title: 'First' },
      { id: 2, title: 'Second' },
      { id: 1, title: 'Duplicate' },
      null,
      { title: 'No ID' },
    ]);
    expect(out).toEqual([
      { id: 1, title: 'First' },
      { id: 2, title: 'Second' },
    ]);
  });

  it('falls back gracefully when indexedDB is unavailable', async () => {
    await expect(saveEntriesToIndexedDB([{ id: 1, title: 'A' }])).resolves.toBeUndefined();
    await expect(clearIndexedDB()).resolves.toBeUndefined();
    await expect(loadEntriesFromIndexedDB()).resolves.toEqual([]);
  });

  it('awaits transaction completion on saveEntriesToIndexedDB', async () => {
    let txCompleted = false;
    const stored: any[] = [];
    const fakeTx: any = {
      oncomplete: null,
      onerror: null,
      onabort: null,
      objectStore: () => ({
        clear: () => { stored.length = 0; },
        put: (item: any) => { stored.push(item); },
      }),
    };
    const fakeDb: any = {
      objectStoreNames: { contains: () => true },
      transaction: () => {
        setTimeout(() => {
          txCompleted = true;
          fakeTx.oncomplete?.();
        }, 15);
        return fakeTx;
      },
    };
    const fakeIdb = {
      open: () => {
        const req: any = { result: fakeDb, onsuccess: null, onerror: null, onupgradeneeded: null };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      },
    };
    (globalThis as any).indexedDB = fakeIdb;
    (globalThis as any).window = { indexedDB: fakeIdb };

    await saveEntriesToIndexedDB([{ id: 42, title: 'Persisted' }]);
    expect(txCompleted).toBe(true);
    expect(stored).toEqual([{ id: 42, title: 'Persisted' }]);
  });
});
