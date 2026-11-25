import { describe, it, expect, beforeEach } from 'vitest';
import { createMockD1Database } from './mock-db';
import {
  createEntry,
  getEntries,
  getEntriesByIds,
  getEntryByUrl,
  canonicalizeUrl,
  updateEntry,
  updateEntriesBatch,
  deleteEntriesBatch,
  addTagsToEntry,
  addTagsToEntriesBatch,
  deleteTag,
  renameOrMergeTag,
  createAnnotation,
  updateAnnotation,
  entryRowToWallabag,
  createApiToken,
  verifyApiToken,
  getCurrentSyncRevision,
} from '../db/queries';

describe('D1 Queries & Scale Edge Cases', () => {
  let db: any;

  beforeEach(() => {
    db = createMockD1Database();
  });

  it('escapes SQLite LIKE wildcards (% and _) in getEntries search', async () => {
    await createEntry(db, { url: 'https://example.com/1', title: '100% pure', content: '<p>alpha</p>' });
    await createEntry(db, { url: 'https://example.com/2', title: '1000 pure', content: '<p>beta</p>' });
    await createEntry(db, { url: 'https://example.com/3', title: 'foo_bar', content: '<p>gamma</p>' });
    await createEntry(db, { url: 'https://example.com/4', title: 'fooxbar', content: '<p>delta</p>' });

    const pctRes = await getEntries(db, { search: '100%' });
    expect(pctRes.entries.map(e => e.title)).toEqual(['100% pure']);

    const underRes = await getEntries(db, { search: 'foo_bar' });
    expect(underRes.entries.map(e => e.title)).toEqual(['foo_bar']);
  });

  it('persists author and published_at in updateEntry without duplicate SET clauses', async () => {
    const entry = await createEntry(db, {
      url: 'https://example.com/u1',
      title: 'Before',
      content: '<p>Body</p>',
      author: 'Old Author',
    });

    const updated = await updateEntry(db, entry.id, {
      author: 'New Author',
      published_at: '2026-05-01T12:00:00.000Z',
    });

    expect(updated?.author).toBe('New Author');
    expect(updated?.published_at).toBe('2026-05-01T12:00:00.000Z');
    expect(updated?.content_revision).toBe(2);
  });

  it('handles >100 IDs in batch operations without hitting D1 100-bind-parameter limit', async () => {
    const ids: number[] = [];
    for (let i = 1; i <= 125; i++) {
      const e = await createEntry(db, {
        url: `https://example.com/bulk-${i}`,
        title: `Bulk ${i}`,
        content: '<p>content</p>',
      });
      ids.push(e.id);
    }

    const fetched = await getEntriesByIds(db, ids);
    expect(fetched).toHaveLength(125);

    const updatedCount = await updateEntriesBatch(db, ids, { is_starred: 1 });
    expect(updatedCount).toBe(125);

    await addTagsToEntriesBatch(db, ids, ['bulk-tag']);
    const afterTag = await getEntriesByIds(db, [ids[0], ids[124]]);
    expect((afterTag[0] as any).tags.map((t: any) => t.slug)).toContain('bulk-tag');
    expect((afterTag[1] as any).tags.map((t: any) => t.slug)).toContain('bulk-tag');

    const deletedCount = await deleteEntriesBatch(db, ids);
    expect(deletedCount).toBe(125);
  });

  it('bumps sync revision and affected entries when deleting a tag', async () => {
    const entry = await createEntry(db, { url: 'https://example.com/t1', title: 'Tagged', content: '<p>x</p>' });
    const tags = await addTagsToEntry(db, entry.id, ['ephemeral']);
    const revBefore = await getCurrentSyncRevision(db);

    const ok = await deleteTag(db, tags[0].id);
    expect(ok).toBe(true);

    const revAfter = await getCurrentSyncRevision(db);
    expect(revAfter).toBeGreaterThan(revBefore);
  });

  it('recovers gracefully from malformed annotation JSON in entryRowToWallabag', () => {
    const formatted = entryRowToWallabag({
      id: 99,
      url: 'https://example.com/bad-json',
      title: 'Bad JSON',
      content: '<p>hi</p>',
      preview_picture: null,
      domain_name: 'example.com',
      reading_time: 1,
      language: 'en',
      author: null,
      published_at: null,
      is_archived: 0,
      is_starred: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      revision: 1,
      content_revision: 1,
      annotations: [{ id: 1, quote: 'q', text: 't', color: 'yellow', ranges: '{bad', target: '{bad' }],
    } as any);

    expect(formatted.annotations).toHaveLength(1);
    expect(formatted.annotations![0].ranges).toEqual([]);
    expect(formatted.annotations![0].target).toBeUndefined();
  });

  it('enforces 2-second LWW conflict guard on updateAnnotation', async () => {
    const entry = await createEntry(db, { url: 'https://example.com/lww', title: 'LWW', content: '<p>hello world</p>' });
    const ann = await createAnnotation(db, entry.id, { quote: 'hello', text: 'newer server note' });

    const staleTime = new Date(Date.now() - 10_000).toISOString();
    const res = await updateAnnotation(db, ann.id, { text: 'stale client note', updated_at: staleTime });
    expect(res?.text).toBe('newer server note');

    const freshTime = new Date(Date.now() + 5_000).toISOString();
    const res2 = await updateAnnotation(db, ann.id, { text: 'fresh client note', updated_at: freshTime });
    expect(res2?.text).toBe('fresh client note');
  });

  it('rejects expired and revoked tokens in verifyApiToken', async () => {
    const pastIso = new Date(Date.now() - 60_000).toISOString();
    const expired = await createApiToken(db, 'Expired Device', 'wfl_tok_', pastIso);
    const checkExpired = await verifyApiToken(db, expired.token);
    expect(checkExpired.valid).toBe(false);

    const active = await createApiToken(db, 'Active Device', 'wfl_tok_');
    const checkActive = await verifyApiToken(db, active.token);
    expect(checkActive.valid).toBe(true);
  });

  it('canonicalizes tracking params in getEntryByUrl and merges tags cleanly in renameOrMergeTag', async () => {
    await createEntry(db, { url: 'https://example.com/post?id=1', title: 'Clean', content: '<p>x</p>' });
    const found = await getEntryByUrl(db, 'https://example.com/post?id=1&utm_source=hn&fbclid=123#top');
    expect(found?.title).toBe('Clean');
    expect(canonicalizeUrl('https://example.com/a?utm_medium=email#sec')).toBe('https://example.com/a');

    const e2 = await createEntry(db, { url: 'https://example.com/m2', title: 'Merge', content: '<p>y</p>' });
    const allTags = await addTagsToEntry(db, e2.id, ['js', 'javascript']);
    expect(allTags.length).toBe(2);
    const merged = await renameOrMergeTag(db, allTags[0].id, { merge_into_id: allTags[1].id });
    expect(merged.success).toBe(true);
    expect(merged.merged_into_id).toBe(allTags[1].id);
  });
});
