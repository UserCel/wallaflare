import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../index';
import { createMockD1Database } from './mock-db';
import {
  PROGRESS_SYNC_STORAGE_KEY,
  isReadingProgressSyncEnabled,
  setReadingProgressSyncEnabled,
  getEffectiveRestoreProgress,
  syncReadingProgressIfEnabled,
} from '../client/reader/progress-sync';
import { getPendingMutations, savePendingMutations } from '../client/storage/outbox';
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

describe('Client-Controlled Reading Progress Sync', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createMemoryStorage();
    (globalThis as any).window = {};
    vi.restoreAllMocks();
  });

  it('defaults to disabled and neither syncs to server nor reads server reading_progress', () => {
    expect(isReadingProgressSyncEnabled()).toBe(false);
    localStorage.setItem('wf_scroll_42', '0.1500');

    // Ignores server reading_progress when disabled
    expect(getEffectiveRestoreProgress({ id: 42, reading_progress: 0.85 })).toBeCloseTo(0.15, 4);

    // Does not queue any outbox mutation when disabled
    const synced = syncReadingProgressIfEnabled(42, 0.55);
    expect(synced).toBe(false);
    expect(getPendingMutations()).toEqual([]);
  });

  it('syncs and coalesces outbox mutations and restores server progress when enabled', () => {
    vi.spyOn(api, 'authFetch').mockResolvedValue(new Response('{}', { status: 503 }));
    setReadingProgressSyncEnabled(true);
    expect(localStorage.getItem(PROGRESS_SYNC_STORAGE_KEY)).toBe('1');

    localStorage.setItem('wf_scroll_99', '0.1000');
    expect(getEffectiveRestoreProgress({ id: 99, reading_progress: 0.72 })).toBeCloseTo(0.72, 4);

    // Coalesces multiple updates for the same entry into a single outbox item
    savePendingMutations([
      { id: 'old_prog', action: 'set_reading_progress', payload: { id: 99, reading_progress: 0.2 }, createdAt: 1, retryCount: 0 },
    ]);
    expect(syncReadingProgressIfEnabled(99, 0.45)).toBe(true);
    // Tiny <2% delta is skipped
    expect(syncReadingProgressIfEnabled(99, 0.46)).toBe(false);
    // Larger delta replaces prior queued mutation
    expect(syncReadingProgressIfEnabled(99, 0.8)).toBe(true);

    const queue = getPendingMutations().filter(m => m.action === 'set_reading_progress');
    expect(queue).toHaveLength(1);
    expect(queue[0].payload.reading_progress).toBe(0.8);
  });

  it('persists and clamps reading_progress via PATCH /api/entries/:id.json', async () => {
    const db = createMockD1Database();
    const createRes = await app.request('/api/entries.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/prog', title: 'Prog', content: '<p>Hi</p>' }),
    }, { DB: db });
    const entry = await createRes.json<any>();

    const patchRes = await app.request(`/api/entries/${entry.id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reading_progress: 1.5 }),
    }, { DB: db });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json<any>();
    expect(updated.reading_progress).toBe(1);
  });
});
