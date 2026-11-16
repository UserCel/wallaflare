import { describe, it, expect } from 'vitest';
import {
  clampReadingWpm,
  scaleReadingMinutes,
  DEFAULT_READING_WPM,
} from '../client/utils/reading-time';
import { createMockD1Database } from './mock-db';
import {
  backfillReadingTimesIfNeeded,
  createEntry,
  getEntryById,
  getConfig,
  setConfig,
  READING_TIME_ALGO_VERSION,
} from '../db/queries';

describe('Client Reading Time Utilities', () => {
  it('clamps WPM within [100, 600] and defaults invalid values to 200', () => {
    expect(clampReadingWpm(50)).toBe(100);
    expect(clampReadingWpm(900)).toBe(600);
    expect(clampReadingWpm(275.4)).toBe(275);
    expect(clampReadingWpm(Number.NaN)).toBe(DEFAULT_READING_WPM);
  });

  it('scales 200-WPM baseline reading_time to user WPM', () => {
    expect(scaleReadingMinutes(40, 200)).toBe(40);
    expect(scaleReadingMinutes(40, 400)).toBe(20);
    expect(scaleReadingMinutes(40, 100)).toBe(80);
    expect(scaleReadingMinutes(1, 600)).toBe(1);
    expect(scaleReadingMinutes(null, 200)).toBe(1);
  });

  it('backfills existing entries once and records reading_time_algo_version = 2', async () => {
    const db = createMockD1Database() as any;
    const denseContent = `<p>${Array(1000).fill('infrastructure').join(' ')}</p>`;

    // Initialize schema first, then simulate pre-v2 DB state and an older entry
    await setConfig(db, 'reading_time_algo_version', '1');
    const created = await createEntry(db, {
      url: 'https://example.com/dense',
      title: 'Dense',
      content: denseContent,
      reading_time: 5,
    });

    const updatedCount = await backfillReadingTimesIfNeeded(db);
    expect(updatedCount).toBe(1);
    expect(await getConfig(db, 'reading_time_algo_version')).toBe(READING_TIME_ALGO_VERSION);

    const row = await getEntryById(db, created.id);
    expect(row?.reading_time).toBeGreaterThan(5);

    // Second run is a no-op because version flag is already set
    const secondRun = await backfillReadingTimesIfNeeded(db);
    expect(secondRun).toBe(0);
  });
});
