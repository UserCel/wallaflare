import { describe, it, expect } from 'vitest';
import { extractPlainExcerpt } from '../client/utils/format';

describe('extractPlainExcerpt', () => {
  it('prefers valid excerpt and strips HTML/style/script from content', () => {
    expect(extractPlainExcerpt({ excerpt: '  Clean excerpt  ', content: '<p>Ignored</p>' })).toBe('Clean excerpt');
    expect(
      extractPlainExcerpt({
        content: '<style>.a{color:red}</style><script>alert(1)</script><p>Hello <b>world</b> from Wallaflare.</p>',
      })
    ).toBe('Hello world from Wallaflare.');
  });

  it('ignores serialized JSON parts in excerpt and falls back to content', () => {
    expect(
      extractPlainExcerpt({
        excerpt: '{"parts":[{"text":"foo"}]}',
        content: '<p>Fallback content text</p>',
      })
    ).toBe('Fallback content text');
  });

  it('truncates with or without ellipsis based on addEllipsis', () => {
    const longText = 'a'.repeat(250);
    expect(extractPlainExcerpt({ text: longText }, 160, true)).toBe('a'.repeat(160) + '...');
    expect(extractPlainExcerpt({ text: longText }, 200, false)).toBe('a'.repeat(200));
  });
});
