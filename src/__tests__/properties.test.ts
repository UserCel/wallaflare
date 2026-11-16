import { describe, it, expect } from 'vitest';
import { computeArticleTextStats, computeBatchProperties } from '../client/modals/properties';

describe('Article Properties & Batch Summary', () => {
  it('computes plain-text words, chars, and image count from HTML', () => {
    const html = '<p>Hello <strong>world!</strong></p><img src="a.png" /><p>Second paragraph.</p>';
    const stats = computeArticleTextStats(html);
    expect(stats.words).toBe(4);
    expect(stats.chars).toBe('Hello world! Second paragraph.'.length);
    expect(stats.images).toBe(1);
  });

  it('aggregates batch properties across multiple selected articles', () => {
    const items = [
      {
        id: 1,
        content: '<p>One two three four</p>',
        reading_time: 10,
        is_archived: 0,
        is_starred: 1,
        domain_name: 'example.com',
        tags: [{ label: 'fiction', slug: 'fiction' }],
        annotations: [{ id: 1 }, { id: 2 }],
        created_at: '2026-01-01T10:00:00Z',
      },
      {
        id: 2,
        content: '<p>Five six</p><img src="x.jpg">',
        reading_time: 20,
        is_archived: 1,
        is_starred: 0,
        domain_name: 'royalroad.com',
        tags: ['fantasy', 'fiction'],
        annotations: [],
        created_at: '2026-01-05T10:00:00Z',
      },
    ];

    const summary = computeBatchProperties(items, 400);
    expect(summary.count).toBe(2);
    expect(summary.totalWords).toBe(6);
    expect(summary.totalImages).toBe(1);
    expect(summary.totalBaseMinutes).toBe(30);
    expect(summary.totalScaledMinutes).toBe(15);
    expect(summary.unreadCount).toBe(1);
    expect(summary.archivedCount).toBe(1);
    expect(summary.starredCount).toBe(1);
    expect(summary.totalAnnotations).toBe(2);
    expect(summary.uniqueDomains).toEqual(['example.com', 'royalroad.com']);
    expect(summary.uniqueTags).toEqual(['fiction', 'fantasy']);
    expect(summary.earliestSaved).toBe('2026-01-01T10:00:00Z');
    expect(summary.latestSaved).toBe('2026-01-05T10:00:00Z');
  });
});
