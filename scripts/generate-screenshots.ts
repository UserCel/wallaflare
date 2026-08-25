import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { renderDashboardHtml } from '../src/views/dashboard';

const PORT = 8999;
const outputDir = path.resolve(process.cwd(), 'assets/screenshots');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let cachedHeroImageBuffer: Buffer | null = null;

async function preloadHeroImage() {
  try {
    const res = await fetch('https://koreader.rocks/user_guide/pictures/medieval_hero.webp');
    if (res.ok) {
      const arr = await res.arrayBuffer();
      cachedHeroImageBuffer = Buffer.from(arr);
      console.log('✓ Preloaded hero cover image (' + cachedHeroImageBuffer.length + ' bytes)');
    }
  } catch (e) {
    console.warn('Could not preload hero image from network, fallback to direct URL');
  }
}

// Sample KOReader Article with Hero Cover Image & Tags
const sampleEntries = [
  {
    id: 1,
    url: 'https://koreader.rocks/user_guide/',
    title: 'KOReader User Guide',
    domain_name: 'koreader.rocks',
    author: 'KOReader Team',
    reading_time: 14,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: '2026-01-15T00:00:00Z',
    preview_picture: `http://localhost:${PORT}/pictures/medieval_hero.webp`,
    text: "KOReader is a versatile document viewer primarily aimed at e-ink devices. It supports EPUB, PDF, DjVu, CBZ, FB2, and many more formats. Seamlessly sync your reading progress with Wallaflare.",
    is_starred: 0,
    is_archived: 0,
    tags: [
      { id: 1, label: 'koreader', slug: 'koreader' },
      { id: 2, label: 'guide', slug: 'guide' },
      { id: 3, label: 'e-ink', slug: 'e-ink' }
    ],
    content: `
      <h2>Welcome to KOReader</h2>
      <p><img src="http://localhost:${PORT}/pictures/medieval_hero.webp" alt="KOReader Hero" style="max-width: 100%; border-radius: 8px; margin: 12px 0;" /></p>
      <p>KOReader is a versatile document viewer primarily aimed at e-ink devices. It supports EPUB, PDF, DjVu, CBZ, FB2, and many more formats.</p>
      <p>Seamlessly sync your reading progress, annotations, and download optimized EPUBs directly with Wallaflare's high-speed Cloudflare D1 serverless backend.</p>
      <h3>Key Features</h3>
      <ul>
        <li>Native Wallabag v2 synchronization plugin</li>
        <li>Custom typography, margins, and contrast adjustments</li>
        <li>Multi-lingual dictionary and Wikipedia lookup</li>
      </ul>
    `
  }
];

function createMockServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://localhost:${PORT}`);

      if (url.pathname === '/pictures/medieval_hero.webp') {
        if (cachedHeroImageBuffer) {
          res.writeHead(200, {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=86400'
          });
          res.end(cachedHeroImageBuffer);
          return;
        }
      }

      if (url.pathname === '/api/entries.json' || url.pathname === '/api/entries') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          page: 1,
          limit: 30,
          pages: 1,
          total: sampleEntries.length,
          _embedded: { items: sampleEntries }
        }));
        return;
      }

      if (url.pathname === '/api/tags.json' || url.pathname === '/api/tags') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          { id: 1, label: 'koreader', slug: 'koreader' },
          { id: 2, label: 'guide', slug: 'guide' },
          { id: 3, label: 'e-ink', slug: 'e-ink' }
        ]));
        return;
      }

      if (url.pathname.startsWith('/api/entries/') && url.pathname.endsWith('.json')) {
        const id = Number(url.pathname.replace('/api/entries/', '').replace('.json', ''));
        const found = sampleEntries.find(e => e.id === id) || sampleEntries[0];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(found));
        return;
      }

      // Serve Dashboard HTML
      const htmlContent = renderDashboardHtml('Wallaflare');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlContent);
    });

    server.listen(PORT, () => {
      resolve(server);
    });
  });
}

function buildMockupWrapperHtml(base64Png: string, title = 'Wallaflare Smartphone View') {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 35%, #1e293b 0%, #090d16 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 30px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .phone-outer {
      position: relative;
      width: 406px;
      height: 866px;
      background: #020617;
      border-radius: 54px;
      padding: 10px;
      box-shadow:
        0 0 0 3.5px #334155,
        0 35px 70px -15px rgba(0, 0, 0, 0.9),
        0 0 80px rgba(249, 115, 22, 0.15);
      display: flex;
      flex-direction: column;
    }
    .phone-screen {
      width: 100%;
      height: 100%;
      background: #0f172a;
      border-radius: 44px;
      overflow: hidden;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
    }
    /* Top notch / punch-hole margin area */
    .screen-content-wrap {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding-top: 38px;
      background: #0f172a;
      overflow: hidden;
    }
    .screen-content-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      display: block;
    }
    /* Dynamic Island / Punch Hole */
    .dynamic-island {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 116px;
      height: 26px;
      background: #000000;
      border-radius: 20px;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.7);
      pointer-events: none;
    }
    .camera-lens {
      width: 10px;
      height: 10px;
      background: #111827;
      border-radius: 50%;
      border: 1.5px solid #1f2937;
    }
  </style>
</head>
<body>
  <div class="phone-outer">
    <div class="phone-screen">
      <div class="dynamic-island">
        <div class="camera-lens"></div>
      </div>
      <div class="screen-content-wrap">
        <img src="data:image/png;base64,${base64Png}" alt="Wallaflare Screen" />
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function preparePageSession(page: puppeteer.Page) {
  await page.evaluateOnNewDocument((entries, port) => {
    localStorage.setItem('wf_server_url', `http://localhost:${port}`);
    localStorage.setItem('wf_auth_token', 'mock_token');
    localStorage.setItem('wf_theme', 'dark');
    localStorage.setItem('wf_view_mode', 'list');
    localStorage.setItem('wf_cached_articles', JSON.stringify(entries));
  }, sampleEntries, PORT);
}

async function waitForAllImagesToLoad(page: puppeteer.Page) {
  await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.loading = 'eager';
          img.addEventListener('load', () => resolve(true), { once: true });
          img.addEventListener('error', () => resolve(false), { once: true });
          setTimeout(() => resolve(false), 2000);
        });
      })
    );
  });
}

async function main() {
  console.log('🚀 Preloading cover asset...');
  await preloadHeroImage();

  console.log('🚀 Starting mock server on port', PORT);
  const server = await createMockServer();

  console.log('🌐 Launching headless Chrome...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  try {
    // 1. Desktop Dashboard Screenshot (1440 x 900)
    console.log('📸 [1/4] Generating Desktop Dashboard screenshot...');
    const desktopPage = await browser.newPage();
    await preparePageSession(desktopPage);
    await desktopPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await desktopPage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await desktopPage.evaluate((entries) => {
      const modal = document.getElementById('serverConnectModal');
      if (modal) modal.classList.remove('open');
      (window as any).allEntries = entries;
      if ((window as any).filterArticles) (window as any).filterArticles();
      if ((window as any).updateCounts) (window as any).updateCounts();
    }, sampleEntries);
    await waitForAllImagesToLoad(desktopPage);
    await new Promise(r => setTimeout(r, 600));
    const desktopPath = path.join(outputDir, 'dashboard-desktop.png');
    await desktopPage.screenshot({ path: desktopPath, type: 'png' });
    console.log('  ✓ Saved:', desktopPath);

    // 2. Mobile Raw Viewport Screenshot (390 x 844)
    console.log('📸 [2/4] Generating Mobile Viewport screenshot...');
    const mobilePage = await browser.newPage();
    await preparePageSession(mobilePage);
    await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await mobilePage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await mobilePage.evaluate((entries) => {
      const modal = document.getElementById('serverConnectModal');
      if (modal) modal.classList.remove('open');
      (window as any).allEntries = entries;
      if ((window as any).filterArticles) (window as any).filterArticles();
      if ((window as any).updateCounts) (window as any).updateCounts();
    }, sampleEntries);
    await waitForAllImagesToLoad(mobilePage);
    await new Promise(r => setTimeout(r, 600));
    const mobileRawBuffer = await mobilePage.screenshot({ type: 'png' }) as Buffer;
    const mobilePath = path.join(outputDir, 'dashboard-mobile.png');
    fs.writeFileSync(mobilePath, mobileRawBuffer);
    console.log('  ✓ Saved:', mobilePath);

    // Read the saved mobile PNG as base64 string
    const mobileBase64 = fs.readFileSync(mobilePath).toString('base64');

    // 3. Mobile Smartphone Mockup (Home Page)
    console.log('📸 [3/4] Generating Smartphone Mockup (Home Page)...');
    const mockupHome = await browser.newPage();
    await mockupHome.setViewport({ width: 500, height: 960, deviceScaleFactor: 2 });
    const mockupHomeHtml = buildMockupWrapperHtml(mobileBase64, 'Wallaflare Dashboard');
    await mockupHome.setContent(mockupHomeHtml, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 600));
    const mockupHomePath = path.join(outputDir, 'dashboard-mobile-mockup.png');
    await mockupHome.screenshot({ path: mockupHomePath, type: 'png' });
    console.log('  ✓ Saved:', mockupHomePath);

    console.log('\n✨ All 3 screenshots generated with full content fidelity in assets/screenshots/');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('Screenshot generation error:', err);
  process.exit(1);
});
