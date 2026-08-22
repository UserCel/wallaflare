import { describe, it, expect } from 'vitest';
import { generateEpub } from '../services/epub';

describe('EPUB 3 Generator', () => {
  it('generates a valid, readable EPUB zip package', async () => {
    const epubData = await generateEpub({
      id: 42,
      title: 'Edge Computing and the Future of Web',
      content: '<p>Cloudflare Workers provide sub-millisecond cold starts across 300+ edge locations globally.</p>',
      url: 'https://blog.cloudflare.com/edge-computing',
      domain_name: 'blog.cloudflare.com',
      created_at: '2026-08-22T08:00:00Z',
      language: 'en',
    });

    expect(epubData).toBeInstanceOf(Uint8Array);
    expect(epubData.byteLength).toBeGreaterThan(500);

    // Verify magic EPUB signature (PK ZIP header)
    expect(epubData[0]).toBe(0x50); // 'P'
    expect(epubData[1]).toBe(0x4B); // 'K'
  });
});
