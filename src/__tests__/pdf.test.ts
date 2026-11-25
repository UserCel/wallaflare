import { describe, it, expect, vi, afterEach } from 'vitest';
import { generatePdf } from '../services/pdf';

describe('PDF Export Engine', () => {
  afterEach(() => vi.restoreAllMocks());

  it('generates a valid formatted PDF with metadata and content', async () => {
    const article = {
      title: 'Testing PDF Generator for Wallaflare',
      author: 'Antigravity AI',
      domain_name: 'wallaflare.example.com',
      url: 'https://wallaflare.example.com/articles/42',
      reading_time: 3,
      tags: [{ label: 'test' }, { label: 'pdf' }],
      content: `
        <h2>Introduction</h2>
        <p>This is a test article body paragraph for PDF generation.</p>
        <blockquote><p>Testing formatted blockquotes in PDF.</p></blockquote>
        <pre><code>const a = 123;</code></pre>
      `
    };

    const pdfBuffer = await generatePdf(article);
    expect(pdfBuffer).toBeInstanceOf(Uint8Array);
    expect(pdfBuffer.byteLength).toBeGreaterThan(1000);

    // Verify PDF header magic bytes "%PDF-"
    const header = String.fromCharCode(...pdfBuffer.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('skips unsupported WebP cover images without crashing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { 'content-type': 'image/webp' },
      })
    );

    const pdfBuffer = await generatePdf({
      title: 'WebP Cover Fallback',
      preview_picture: 'https://example.com/cover.webp',
      content: '<p>Article body</p>',
    });
    expect(String.fromCharCode(...pdfBuffer.slice(0, 5))).toBe('%PDF-');
  });
});
