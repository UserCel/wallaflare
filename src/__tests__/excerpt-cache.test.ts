import { describe, it, expect } from 'vitest';
import { extractPlainExcerpt } from '../client/utils/format';

describe('extractPlainExcerpt', () => {
  it('extracts and truncates plain text from HTML content', () => {
    const html = '<style>.x{color:red}</style><p>Hello <b>world</b> from Wallaflare.</p><script>alert(1)</script>';
    expect(extractPlainExcerpt({ content: html }, 160)).toBe('Hello world from Wallaflare.');
    expect(extractPlainExcerpt({ content: '<p>' + 'a'.repeat(200) + '</p>' }, 160)).toBe('a'.repeat(160) + '...');
  });

  it('prefers valid excerpt and skips JSON parts blobs', () => {
    expect(extractPlainExcerpt({ excerpt: 'Saved summary', content: '<p>Full body</p>' })).toBe('Saved summary');
    expect(extractPlainExcerpt({ excerpt: '{"parts":[{"text":"hi"}]}', content: '<p>Fallback body</p>' })).toBe('Fallback body');
  });

  it('returns empty string for empty entries', () => {
    expect(extractPlainExcerpt({})).toBe('');
    expect(extractPlainExcerpt(null)).toBe('');
  });
});
