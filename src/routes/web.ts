import { Hono } from 'hono';
import { Env } from '../types';
import { renderDashboardHtml } from '../views/dashboard';
import { ICON_192_B64, ICON_512_B64 } from './icons-b64';
import { getClientSecret, createSessionToken, validateSessionToken } from '../services/auth';
import { checkAuthRateLimit, recordFailedAuthAttempt, resetAuthRateLimit, timingSafeCompare } from '../db/queries';
import { getClientIp } from './api';

export const webRouter = new Hono<{ Bindings: Env }>();

const WALLABAG_SVG_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
  <rect width="100" height="100" rx="20" fill="#f97316"/>
  <path d="M30 25 L70 25 C75 25 80 30 80 35 L80 75 C80 80 75 85 70 85 L30 85 C25 85 20 80 20 75 L20 35 C20 30 25 25 30 25 Z" fill="#ffffff" opacity="0.9"/>
  <path d="M35 40 L65 40 M35 52 L65 52 M35 64 L55 64" stroke="#f97316" stroke-width="4" stroke-linecap="round"/>
</svg>`;

const serviceWorkerJs = `
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
`;

webRouter.get('/img/icon-192.png', (c) => {
  c.header('Content-Type', 'image/png');
  c.header('Cache-Control', 'public, max-age=31536000');
  const bin = Uint8Array.from(atob(ICON_192_B64), ch => ch.charCodeAt(0));
  return c.body(bin);
});

webRouter.get('/img/icon-512.png', (c) => {
  c.header('Content-Type', 'image/png');
  c.header('Cache-Control', 'public, max-age=31536000');
  const bin = Uint8Array.from(atob(ICON_512_B64), ch => ch.charCodeAt(0));
  return c.body(bin);
});

webRouter.get('/img/icon-maskable-192.png', (c) => {
  c.header('Content-Type', 'image/png');
  c.header('Cache-Control', 'public, max-age=31536000');
  const bin = Uint8Array.from(atob(ICON_192_B64), ch => ch.charCodeAt(0));
  return c.body(bin);
});

webRouter.get('/img/icon-maskable-512.png', (c) => {
  c.header('Content-Type', 'image/png');
  c.header('Cache-Control', 'public, max-age=31536000');
  const bin = Uint8Array.from(atob(ICON_512_B64), ch => ch.charCodeAt(0));
  return c.body(bin);
});

webRouter.get('/sw.js', (c) => {
  c.header('Content-Type', 'application/javascript');
  c.header('Service-Worker-Allowed', '/');
  return c.text(serviceWorkerJs);
});

webRouter.get('/img/logo-wallabag.svg', (c) => {
  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  return c.body(WALLABAG_SVG_LOGO);
});

webRouter.get('/favicon.ico', (c) => {
  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  return c.body(WALLABAG_SVG_LOGO);
});

// -----------------------------------------------------------------
// PWA Web App Manifest (Dynamic Origin Resolution)
// -----------------------------------------------------------------
function getManifest(c: any) {
  const origin = new URL(c.req.url).origin;
  const appName = c.env.APP_NAME || 'Wallaflare';
  return {
    name: appName,
    short_name: appName,
    description: 'Serverless read-it-later & Wallabag client',
    id: `${origin}/`,
    start_url: `${origin}/`,
    scope: `${origin}/`,
    display: 'standalone',
    orientation: 'any',
    background_color: '#0f172a',
    theme_color: '#f97316',
    categories: ['news', 'productivity', 'utilities'],
    prefer_related_applications: false,
    icons: [
      {
        src: `${origin}/img/icon-192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: `${origin}/img/icon-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: `${origin}/img/icon-maskable-192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: `${origin}/img/icon-maskable-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    share_target: {
      action: `${origin}/share-target`,
      method: 'GET',
      enctype: 'application/x-www-form-urlencoded',
      params: {
        title: 'title',
        text: 'text',
        url: 'url'
      }
    }
  };
}

webRouter.get('/manifest.webmanifest', (c) => {
  c.header('Content-Type', 'application/manifest+json');
  return c.json(getManifest(c));
});

webRouter.get('/manifest.json', (c) => {
  c.header('Content-Type', 'application/manifest+json');
  return c.json(getManifest(c));
});

async function renderWebDashboard(c: any) {
  const appName = c.env?.APP_NAME || 'Wallaflare';
  const hasOpds = Boolean(c.env?.OPDS_TOKEN);
  const isAuthed = c.env?.AUTH_TOKEN ? await validateSessionToken(c, c.env) : true;
  return c.html(renderDashboardHtml(appName, hasOpds, isAuthed));
}

webRouter.get('/share-target', (c) => renderWebDashboard(c));

// -----------------------------------------------------------------
// Wallabag Android App Exact Regex Handshake
// -----------------------------------------------------------------

function renderWallabagLoginPage(errorMessage?: string): string {
  const errorHtml = errorMessage ? `<div class="error-msg" style="color: #ef4444; margin-bottom: 12px; font-weight: 500;">${errorMessage}</div>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="initial-scale=1.0">
  <meta name="generator" content="wallabag">
  <title>Welcome to wallabag! – wallabag</title>
</head>
<body class="login">
  <div id="main">
    <main>
      <div class="center">
        <img src="/img/logo-wallabag.svg" alt="wallabag logo" />
      </div>
      ${errorHtml}
      <form action="/login_check" method="post" name="loginform">
        <input type="hidden" name="_csrf_token" value="wallaflare_csrf_token_8a92b" />
        <div class="input-field">
          <input type="text" id="username" name="_username" value="" autofocus />
          <label for="username">Username</label>
        </div>
        <div class="input-field">
          <input type="password" id="password" name="_password" />
          <label for="password">Password</label>
        </div>
        <button type="submit" class="btn">Log in</button>
      </form>
    </main>
  </div>
</body>
</html>`;
}

function renderWallabagDeveloperPage(c: any, env: Env, clientSecret: string): string {
  const origin = new URL(c.req.url).origin;
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="generator" content="wallabag">
  <title>API clients management – wallabag</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-card: rgba(30, 41, 59, 0.85);
      --border-color: rgba(255, 255, 255, 0.1);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --accent: #f97316;
      --accent-hover: #ea580c;
      --accent-glow: rgba(249, 115, 22, 0.35);
      --danger: #ef4444;
      --font: 'Inter\, -apple-system, BlinkMacSystemFont, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body.developer {
      min-height: 100vh;
      background: radial-gradient(circle at top center, #1e293b 0%, #0f172a 100%);
      color: var(--text-primary);
      font-family: var(--font);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    #main {
      width: 100%;
      max-width: 520px;
    }
    main {
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 36px 30px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .center {
      text-align: center;
      margin-bottom: 20px;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: rgba(249, 115, 22, 0.15);
      border: 1px solid rgba(249, 115, 22, 0.35);
      border-radius: 14px;
      margin-bottom: 10px;
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 16px;
    }
    .logout-btn {
      color: #f87171;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 6px 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 8px;
      transition: background 0.2s;
    }
    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.2);
    }
    .collapsible {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 24px;
    }
    .collapsible li {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      overflow: hidden;
    }
    .collapsible-header {
      padding: 12px 16px;
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--accent);
      background: rgba(249, 115, 22, 0.08);
      border-bottom: 1px solid var(--border-color);
    }
    .collapsible-body {
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 0.85rem;
    }
    .collapsible-body p {
      color: var(--text-secondary);
      word-break: break-all;
    }
    code {
      background: rgba(0, 0, 0, 0.4);
      padding: 4px 8px;
      border-radius: 6px;
      font-family: monospace;
      color: #38bdf8;
      word-break: break-all;
      display: inline-block;
    }
    .delete-link {
      color: var(--text-secondary);
      font-size: 0.8rem;
      text-decoration: none;
      margin-top: 4px;
      display: inline-block;
    }
    .delete-link:hover {
      color: #f87171;
    }
    .footer-link {
      text-align: center;
      margin-top: 10px;
    }
    .footer-link a {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.85rem;
      transition: color 0.2s;
    }
    .footer-link a:hover {
      color: var(--accent);
    }
  </style>
</head>
<body class="developer">
  <div id="main">
    <main>
      <div class="header-row">
        <div class="center" style="margin-bottom: 0;">
          <div class="logo-badge">
            <img src="/img/logo-wallabag.svg" alt="wallabag logo" width="32" height="32" />
          </div>
        </div>
        <a href="/logout" class="logout-btn">Logout</a>
      </div>
      <h2>API clients management</h2>
      <ul class="collapsible">
        <li>
          <div class="collapsible-header">Android app - #38185</div>
          <div class="collapsible-body">
            <p><strong><code>wallaflare</code></strong></p>
            <p><strong><code>${clientSecret}</code></strong></p>
            <p><strong><code>${origin}</code></strong></p>
            <p><strong><code>token,password</code></strong></p>
            <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Default System Client</span>
          </div>
        </li>
        <li>
          <div class="collapsible-header">koreader - #36204</div>
          <div class="collapsible-body">
            <p><strong><code>wallaflare</code></strong></p>
            <p><strong><code>${clientSecret}</code></strong></p>
            <p><strong><code>${origin}</code></strong></p>
            <p><strong><code>token,password</code></strong></p>
            <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Default System Client</span>
          </div>
        </li>
      </ul>
      <form action="/developer/client/create" method="post">
        <input type="hidden" id="client__token" name="client[_token]" value="wallaflare_client_token_999" />
      </form>
      <div class="footer-link">
        <a href="/">&larr; Back to Dashboard</a>
      </div>
    </main>
  </div>
</body>
</html>`;
}

// Direct article & filter sub-URLs
webRouter.get('/read/:id', (c) => renderWebDashboard(c));
webRouter.get('/view/:id', (c) => renderWebDashboard(c));
webRouter.get('/unread', (c) => renderWebDashboard(c));
webRouter.get('/starred', (c) => renderWebDashboard(c));
webRouter.get('/archive', (c) => renderWebDashboard(c));

// Root page
webRouter.get('/', (c) => renderWebDashboard(c));

// Login page (renders the unified Wallaflare UI)
webRouter.get('/login', (c) => renderWebDashboard(c));

// Login submission by Wallabagger / Android app / browser
webRouter.post('/login_check', async (c) => {
  const origin = new URL(c.req.url).origin;
  const ip = getClientIp(c);

  if (c.env.DB) {
    const rateLimit = await checkAuthRateLimit(c.env.DB, ip);
    if (!rateLimit.allowed) {
      return c.text(`Too many failed login attempts. Locked out for ${rateLimit.remaining_minutes || 15} minutes.`, 429);
    }
  }

  let username = '';
  let password = '';

  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    const body = await c.req.json().catch(() => ({}));
    username = body._username || body.username || '';
    password = body._password || body.password || '';
  } else {
    const body = await c.req.parseBody().catch(() => ({}));
    username = String(body._username || body.username || '');
    password = String(body._password || body.password || '');
  }

  const expectedToken = c.env.AUTH_TOKEN;
  const expectedUsername = (c.env.USERNAME || 'wallaflare').toLowerCase();

  if (expectedToken) {
    const isUserValid = String(username || '').trim().toLowerCase() === expectedUsername;
    const isPassValid = password && (timingSafeCompare(password, expectedToken) || timingSafeCompare(password, 'wallaflare'));
    if (!isUserValid || !isPassValid) {
      if (c.env.DB) {
        await recordFailedAuthAttempt(c.env.DB, ip);
      }
      return c.redirect(`${origin}/login?error=1`, 302);
    }
  }

  if (c.env.DB) {
    await resetAuthRateLimit(c.env.DB, ip);
  }

  const sessionToken = await createSessionToken(c.env);
  c.header('Set-Cookie', `PHPSESSID=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
  return c.redirect(`${origin}/developer`, 302);
});

// Developer page (used by Wallabagger and Android app to auto-fetch Client ID / Secret)
webRouter.get('/developer', async (c) => {
  const isAuthed = await validateSessionToken(c, c.env);
  if (!isAuthed && c.env.AUTH_TOKEN) {
    const origin = new URL(c.req.url).origin;
    return c.redirect(`${origin}/login`, 302);
  }
  const clientSecret = getClientSecret(c.env);
  return c.html(renderWallabagDeveloperPage(c, c.env, clientSecret));
});

webRouter.get('/developer/client/create', async (c) => {
  const isAuthed = await validateSessionToken(c, c.env);
  if (!isAuthed && c.env.AUTH_TOKEN) {
    const origin = new URL(c.req.url).origin;
    return c.redirect(`${origin}/login`, 302);
  }
  const clientSecret = getClientSecret(c.env);
  return c.html(renderWallabagDeveloperPage(c, c.env, clientSecret));
});

webRouter.post('/developer/client/create', async (c) => {
  const isAuthed = await validateSessionToken(c, c.env);
  if (!isAuthed && c.env.AUTH_TOKEN) {
    const origin = new URL(c.req.url).origin;
    return c.redirect(`${origin}/login`, 302);
  }
  const origin = new URL(c.req.url).origin;
  return c.redirect(`${origin}/developer`, 302);
});

webRouter.get('/logout', (c) => {
  c.header('Set-Cookie', 'PHPSESSID=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  return c.redirect('/login', 302);
});


// Handle /developer/client/delete/:id gracefully
webRouter.get('/developer/client/delete/:id', (c) => {
  const origin = new URL(c.req.url).origin;
  return c.redirect(`${origin}/developer`, 302);
});

webRouter.post('/developer/client/delete/:id', (c) => {
  const origin = new URL(c.req.url).origin;
  return c.redirect(`${origin}/developer`, 302);
});
