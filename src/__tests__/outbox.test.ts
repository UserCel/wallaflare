import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OUTBOX_STORAGE_KEY,
  DEAD_LETTER_STORAGE_KEY,
  getPendingMutations,
  savePendingMutations,
  processOutboxMutations,
} from '../client/storage/outbox';
import * as api from '../client/sync/api';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, String(v)); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => { map.clear(); },
  };
}

describe('Offline Outbox Queue (src/client/storage/outbox.ts)', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createMemoryStorage();
    vi.restoreAllMocks();
  });

  it('processes mutations in FIFO order and clears on 200 / 404', async () => {
    const calls: string[] = [];
    vi.spyOn(api, 'authFetch').mockImplementation(async (url: string) => {
      calls.push(url);
      if (url.includes('/101.json')) return new Response('{}', { status: 200 });
      return new Response('{}', { status: 404 });
    });

    savePendingMutations([
      { id: 'm1', action: 'toggle_star', payload: { id: 101, is_starred: 1 }, createdAt: 1, retryCount: 0 },
      { id: 'm2', action: 'delete', payload: { id: 102 }, createdAt: 2, retryCount: 0 },
    ]);

    await processOutboxMutations();
    expect(calls).toEqual(['/api/entries/101.json', '/api/entries/102.json']);
    expect(getPendingMutations()).toEqual([]);
  });

  it('persists retryCount + nextRetryAt on 5xx and moves to dead-letter after >10 retries', async () => {
    vi.spyOn(api, 'authFetch').mockResolvedValue(new Response('err', { status: 503 }));

    savePendingMutations([
      { id: 'm1', action: 'toggle_archive', payload: { id: 5, is_archived: 1 }, createdAt: 1, retryCount: 0 },
    ]);

    await processOutboxMutations();
    const afterFirst = getPendingMutations();
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0].retryCount).toBe(1);
    expect(afterFirst[0].nextRetryAt).toBeGreaterThan(Date.now());

    // Simulate item already at retryCount 10 with expired backoff
    savePendingMutations([
      { id: 'm1', action: 'toggle_archive', payload: { id: 5, is_archived: 1 }, createdAt: 1, retryCount: 10 },
    ]);
    await processOutboxMutations();
    expect(getPendingMutations()).toEqual([]);
    const dead = JSON.parse(localStorage.getItem(DEAD_LETTER_STORAGE_KEY) || '[]');
    expect(dead).toHaveLength(1);
    expect(dead[0].id).toBe('m1');
  });

  it('retains queued mutations on 401 Unauthorized or 429 Too Many Requests without silent data loss', async () => {
    vi.spyOn(api, 'authFetch').mockResolvedValue(new Response('unauth', { status: 401 }));

    savePendingMutations([
      { id: 'm1', action: 'edit_title', payload: { id: 9, title: 'Keep Me' }, createdAt: 1, retryCount: 0 },
    ]);

    await processOutboxMutations();
    expect(getPendingMutations()).toHaveLength(1);
    expect(localStorage.getItem(OUTBOX_STORAGE_KEY)).toContain('Keep Me');
  });

  it('prevents concurrent duplicate dispatch via re-entrancy lock', async () => {
    let resolveFetch!: (v: Response) => void;
    const spy = vi.spyOn(api, 'authFetch').mockImplementation(
      () => new Promise((r) => { resolveFetch = r; })
    );

    savePendingMutations([
      { id: 'm1', action: 'toggle_star', payload: { id: 1, is_starred: 1 }, createdAt: 1, retryCount: 0 },
    ]);

    const p1 = processOutboxMutations();
    const p2 = processOutboxMutations();
    expect(spy).toHaveBeenCalledTimes(1);

    resolveFetch(new Response('{}', { status: 200 }));
    await Promise.all([p1, p2]);
    expect(getPendingMutations()).toEqual([]);
  });
});
