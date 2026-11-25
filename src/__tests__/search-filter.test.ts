import { describe, it, expect } from 'vitest';
import { matchesArticleSearch } from '../client/utils/search-filter';

describe('Client-Side Search Operators & Metadata Matching', () => {
  const sample = [
    {
      id: 1,
      title: 'Edge Computing Guide',
      domain_name: 'blog.cloudflare.com',
      author: 'Jane Doe',
      text: 'Workers and D1 SQLite.',
      reading_time: 4,
      tags: [{ label: 'Cloudflare', slug: 'cloudflare' }, { label: 'SQLite', slug: 'sqlite' }],
      annotations: [{ quote: 'D1 SQLite', text: 'Great edge database note' }],
    },
    {
      id: 2,
      title: 'Deep Dive into Distributed Systems',
      domain_name: 'arxiv.org',
      author: 'Alan Turing',
      text: 'Consensus protocols and Raft.',
      reading_time: 22,
      tags: [],
      annotations: [],
    },
  ];

  it('matches author, tags, and annotation quotes/notes', () => {
    expect(sample.filter(e => matchesArticleSearch(e, 'jane')).map(e => e.id)).toEqual([1]);
    expect(sample.filter(e => matchesArticleSearch(e, 'edge database note')).map(e => e.id)).toEqual([1]);
    expect(sample.filter(e => matchesArticleSearch(e, 'sqlite')).map(e => e.id)).toEqual([1]);
  });

  it('supports tag:, multi-tag AND, domain:, is:untagged, is:annotated, time:<N, time:>N', () => {
    expect(sample.filter(e => matchesArticleSearch(e, 'tag:cloudflare tag:sqlite')).map(e => e.id)).toEqual([1]);
    expect(sample.filter(e => matchesArticleSearch(e, 'tag:cloudflare tag:missing')).map(e => e.id)).toEqual([]);
    expect(sample.filter(e => matchesArticleSearch(e, 'domain:arxiv.org')).map(e => e.id)).toEqual([2]);
    expect(sample.filter(e => matchesArticleSearch(e, 'is:untagged')).map(e => e.id)).toEqual([2]);
    expect(sample.filter(e => matchesArticleSearch(e, 'is:annotated')).map(e => e.id)).toEqual([1]);
    expect(sample.filter(e => matchesArticleSearch(e, 'time:<10')).map(e => e.id)).toEqual([1]);
    expect(sample.filter(e => matchesArticleSearch(e, 'time:>15')).map(e => e.id)).toEqual([2]);
  });
});
