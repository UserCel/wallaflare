import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../index';
import { sanitizeHtmlFragment, sanitizeArticleDom, parseHtmlIsomorphic, escapeHtmlText, extractArticleFromUrl } from '../services/extractor';

function createNoopDb() {
  return {
    prepare(_query: string) {
      const stmt: any = {
        bind() { return stmt; },
        async first() { return null; },
        async all() { return { results: [] }; },
        async run() { return { meta: { changes: 1 } }; },
      };
      return stmt;
    },
  } as any;
}

const SECRET = 'a_real_operator_secret_123';
const env = () => ({ DB: createNoopDb(), AUTH_TOKEN: SECRET });
const post = (path: string, body: any, e: any = env()) =>
  app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
    body: JSON.stringify(body),
  }, e);

describe('Auth: no built-in default credentials when AUTH_TOKEN is configured', () => {
  it('rejects the legacy hardcoded bearer token on protected routes', async () => {
    const res = await app.request('/api/entries.json', {
      headers: { Authorization: 'Bearer wallaflare_bearer_token_secret', 'CF-Connecting-IP': '203.0.113.7' },
    }, env());
    expect(res.status).toBe(401);
  });

  it('still accepts the real token', async () => {
    const res = await app.request('/api/entries.json', {
      headers: { Authorization: `Bearer ${SECRET}`, 'CF-Connecting-IP': '203.0.113.7' },
    }, env());
    expect(res.status).toBe(200);
  });

  it('rejects the legacy hardcoded token on /api/auth/verify', async () => {
    const res = await post('/api/auth/verify', { token: 'wallaflare_bearer_token_secret' });
    expect(res.status).toBe(400);
    expect((await res.json<any>()).success).toBe(false);
  });

  it('rejects default username/password on the OAuth password grant', async () => {
    const res = await post('/oauth/v2/token', {
      grant_type: 'password', client_id: 'wallaflare', client_secret: 'wallaflare',
      username: 'wallaflare', password: 'wallaflare',
    });
    expect(res.status).toBe(400);
  });

  it('rejects client_credentials using the public default client secret', async () => {
    const res = await post('/oauth/v2/token', {
      grant_type: 'client_credentials', client_id: 'wallaflare', client_secret: 'wallaflare',
    });
    expect(res.status).toBe(400);
  });

  it('rejects unknown grant types presenting only a public identifier', async () => {
    const res = await post('/oauth/v2/token', { grant_type: 'anything', client_id: 'wallaflare' });
    expect(res.status).toBe(400);
  });

  it('still issues a token for the correct password grant', async () => {
    const res = await post('/oauth/v2/token', {
      grant_type: 'password', client_id: 'wallaflare', client_secret: 'wallaflare',
      username: 'wallaflare', password: SECRET,
    });
    expect(res.status).toBe(200);
    expect((await res.json<any>()).access_token).toBe(SECRET);
  });

  it('rejects wallaflare/wallaflare on the web login form', async () => {
    const res = await app.request('/login_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': '203.0.113.7' },
      body: '_username=wallaflare&_password=wallaflare',
    }, env());
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('/login?error=1');
    expect(res.headers.get('Set-Cookie') || '').not.toContain('PHPSESSID=wfl');
  });
});

describe('HTML sanitizer hardening', () => {
  it('strips javascript: URLs obfuscated with tabs/newlines/control chars', () => {
    const out = sanitizeHtmlFragment(
      '<a href="java\tscript:alert(1)">a</a><a href="  JaVa\nScRiPt:alert(1)">b</a><img src="java&#x09;script:alert(1)">'
    );
    expect(out.toLowerCase()).not.toContain('javascript');
    expect(out).not.toMatch(/href="[^"]*script/i);
  });

  it('removes srcdoc, formaction, event handlers, <base> and <script>', () => {
    const out = sanitizeHtmlFragment(
      '<base href="https://evil.example/"><p onclick="x()">hi</p><div srcdoc="<script>1</script>">d</div><script>alert(1)</script>'
    );
    expect(out).not.toContain('<base');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('srcdoc');
    expect(out).not.toContain('<script');
    expect(out).toContain('hi');
  });

  it('keeps ordinary links and images intact', () => {
    const out = sanitizeHtmlFragment('<p><a href="https://example.com/a">x</a><img src="https://example.com/i.png"></p>');
    expect(out).toContain('href="https://example.com/a"');
    expect(out).toContain('src="https://example.com/i.png"');
  });

  it('sanitizeArticleDom is applied on a parsed document', () => {
    const { document } = parseHtmlIsomorphic('<html><body><a href="javascript:alert(1)">x</a></body></html>');
    sanitizeArticleDom(document);
    expect(document.body.innerHTML).not.toContain('javascript');
  });

  it('escapeHtmlText neutralises attribute/markup injection', () => {
    expect(escapeHtmlText('https://x.com/"><script>alert(1)</script>')).not.toMatch(/[<>"]/);
  });
});

describe('Server-side article fetch limits', () => {
  afterEach(() => vi.restoreAllMocks());

  it('passes a timeout signal to fetch', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html><body><p>hello world</p></body></html>', { headers: { 'content-type': 'text/html' } })
    );
    await extractArticleFromUrl('https://example.com/a');
    expect((spy.mock.calls[0][1] as any).signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects non-text content types (e.g. binary downloads)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('x', { headers: { 'content-type': 'application/zip' } })
    );
    await expect(extractArticleFromUrl('https://example.com/file.zip')).rejects.toThrow(/content type/i);
  });

  it('rejects responses whose declared Content-Length exceeds the cap', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('x', { headers: { 'content-type': 'text/html', 'content-length': String(50 * 1024 * 1024) } })
    );
    await expect(extractArticleFromUrl('https://example.com/huge')).rejects.toThrow(/too large/i);
  });

  it('aborts streaming bodies that exceed the cap without a Content-Length', async () => {
    const chunk = new Uint8Array(1024 * 1024).fill(97);
    let sent = 0;
    const stream = new ReadableStream({
      pull(controller) {
        if (sent++ < 10) controller.enqueue(chunk); else controller.close();
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, { headers: { 'content-type': 'text/html' } })
    );
    await expect(extractArticleFromUrl('https://example.com/stream')).rejects.toThrow(/too large/i);
  });

  it('rejects non-http(s) protocols', async () => {
    await expect(extractArticleFromUrl('file:///etc/passwd')).rejects.toThrow(/protocol/i);
  });
});
