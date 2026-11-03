import { Hono } from 'hono';
import { Env } from '../types';
import { renderDashboardHtml } from '../views/dashboard';
import { ICON_192_B64, ICON_512_B64 } from './icons-b64';
import { KOPLUGIN_ZIP_B64 } from '../views/koplugin-bundle';
import { getClientSecret, createSessionToken, validateSessionToken } from '../services/auth';
import { checkAuthRateLimit, recordFailedAuthAttempt, resetAuthRateLimit, timingSafeCompare, verifyMasterPassword, isMasterPasswordConfigured, getApiTokens } from '../db/queries';
import { getClientIp } from './api';
import { escapeHtmlText } from '../services/extractor';

export const webRouter = new Hono<{ Bindings: Env }>();

const WALLABAG_SVG_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
  <rect width="100" height="100" rx="20" fill="#f97316"/>
  <path d="M30 25 L70 25 C75 25 80 30 80 35 L80 75 C80 80 75 85 70 85 L30 85 C25 85 20 80 20 75 L20 35 C20 30 25 25 30 25 Z" fill="#ffffff" opacity="0.9"/>
  <path d="M35 40 L65 40 M35 52 L65 52 M35 64 L55 64" stroke="#f97316" stroke-width="4" stroke-linecap="round"/>
</svg>`;

const WALLAFLARE_APP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">
  <rect width="108" height="108" rx="24" fill="#0f172a"/>
  <!-- Background Circle Accent -->
  <circle cx="54" cy="54" r="34" fill="#3b82f6"/>
  <!-- Open Book Left Page -->
  <path d="M34 42 C34 39.8 35.8 38 38 38 L52 38 L52 70 L38 70 C35.8 70 34 68.2 34 66 Z" fill="#FFFFFF"/>
  <!-- Open Book Right Page -->
  <path d="M56 38 L70 38 C72.2 38 74 39.8 74 42 L74 66 C74 68.2 72.2 70 70 70 L56 70 Z" fill="#E2E8F0"/>
  <!-- Center Spine / Divider -->
  <rect x="52.5" y="36" width="3" height="36" fill="#0f172a"/>
  <!-- Text Lines on Left Page -->
  <rect x="38" y="45" width="10" height="2.5" rx="1.25" fill="#0f172a"/>
  <rect x="38" y="51" width="10" height="2.5" rx="1.25" fill="#0f172a"/>
  <rect x="38" y="57" width="7" height="2.5" rx="1.25" fill="#0f172a"/>
  <!-- Text Lines on Right Page -->
  <rect x="60" y="45" width="10" height="2.5" rx="1.25" fill="#3b82f6"/>
  <rect x="60" y="51" width="10" height="2.5" rx="1.25" fill="#64748b"/>
  <rect x="60" y="57" width="7" height="2.5" rx="1.25" fill="#64748b"/>
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


webRouter.get('/download/wallaflare.koplugin.zip', (c) => {
  c.header('Content-Type', 'application/zip');
  c.header('Content-Disposition', 'attachment; filename="wallaflare.koplugin.zip"');
  c.header('Cache-Control', 'public, max-age=3600');
  const bin = Uint8Array.from(atob(KOPLUGIN_ZIP_B64), ch => ch.charCodeAt(0));
  return c.body(bin);
});

webRouter.get('/sw.js', (c) => {
  c.header('Content-Type', 'application/javascript; charset=utf-8');
  c.header('Service-Worker-Allowed', '/');
  return c.body(serviceWorkerJs);
});

webRouter.get('/img/logo-wallabag.svg', (c) => {
  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  return c.body(WALLABAG_SVG_LOGO);
});

webRouter.get('/favicon.ico', (c) => {
  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  return c.body(WALLAFLARE_APP_ICON_SVG);
});

webRouter.get('/favicon.svg', (c) => {
  c.header('Content-Type', 'image/svg+xml');
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
  return c.body(WALLAFLARE_APP_ICON_SVG);
});

// -----------------------------------------------------------------
// PWA Web App Manifest (Dynamic Origin Resolution)
// -----------------------------------------------------------------
function getManifest(c: any) {
  const appName = c.env?.APP_NAME || 'Wallaflare';
  return {
    name: appName,
    short_name: appName,
    description: 'Serverless read-it-later & Wallabag client',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    categories: ['news', 'productivity', 'utilities'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/img/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/img/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/img/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/img/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    share_target: {
      action: '/share-target',
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
  c.header('Content-Type', 'application/manifest+json; charset=utf-8');
  return c.body(JSON.stringify(getManifest(c)));
});

webRouter.get('/manifest.json', (c) => {
  c.header('Content-Type', 'application/manifest+json; charset=utf-8');
  return c.body(JSON.stringify(getManifest(c)));
});

async function renderWebDashboard(c: any) {
  const appName = c.env?.APP_NAME || 'Wallaflare';
  const hasReadToken = Boolean(c.env?.READ_TOKEN);
  const isAuthed = await validateSessionToken(c, c.env);
  return c.html(renderDashboardHtml(appName, hasReadToken, isAuthed));
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

function renderTokensListHtml(tokens: any[]): string {
  if (!tokens || tokens.length === 0) {
    return '<li style="padding: 12px; text-align: center; color: var(--text-secondary); font-size: 0.8rem; background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-color); border-radius: 10px;">No active tokens or connected devices yet.</li>';
  }
  return tokens.map(t => {
    const isPat = t.token_prefix && t.token_prefix.startsWith('wfl_pat_');
    const badge = isPat
      ? '<span style="font-size: 0.7rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 1px 6px; border-radius: 4px;">PAT</span>'
      : '<span style="font-size: 0.7rem; color: var(--text-secondary); background: rgba(255, 255, 255, 0.05); padding: 1px 6px; border-radius: 4px;">Device</span>';
    const date = t.created_at ? new Date(t.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    const lastUsed = t.last_used_at ? `Last used ${new Date(t.last_used_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}` : 'Never used';
    return `<li style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-color); border-radius: 10px; margin-bottom: 6px;">
      <div>
        <div style="font-weight: 600; font-size: 0.85rem; color: #fff; display: flex; align-items: center; gap: 6px;">
          ${escapeHtmlText(t.label || 'Token')} ${badge}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
          <code>${escapeHtmlText(t.token_prefix || 'wfl_...')}...</code> &bull; Created ${escapeHtmlText(date)} &bull; ${escapeHtmlText(lastUsed)}
        </div>
      </div>
    </li>`;
  }).join('');
}

function renderWallabagDeveloperPage(c: any, env: Env, clientSecret: string, isAppClient = false, tokens: any[] = []): string {
  const origin = new URL(c.req.url).origin;
  if (isAppClient) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="generator" content="wallabag">
  <title>API clients management – wallabag</title>
</head>
<body class="developer">
  <div id="main">
    <main>
      <div class="center">
        <img src="/img/logo-wallabag.svg" alt="wallabag logo" />
      </div>
      <a href="/logout">Logout</a>
      <h2>API clients management</h2>
      <ul class="collapsible">
        <li>
          <div class="collapsible-header">Android app - #38185</div>
          <div class="collapsible-body">
            <p><strong><code>wallaflare</code></strong></p>
            <p><strong><code>${clientSecret}</code></strong></p>
            <p><strong><code>${origin}</code></strong></p>
            <p><strong><code>token,password</code></strong></p>
            <a href="/developer/client/delete/38185">Delete</a>
          </div>
        </li>
        <li>
          <div class="collapsible-header">koreader - #36204</div>
          <div class="collapsible-body">
            <p><strong><code>wallaflare</code></strong></p>
            <p><strong><code>${clientSecret}</code></strong></p>
            <p><strong><code>${origin}</code></strong></p>
            <p><strong><code>token,password</code></strong></p>
            <a href="/developer/client/delete/36204">Delete</a>
          </div>
        </li>
      </ul>
      <form action="/developer/client/create" method="post">
        <input type="hidden" id="client__token" name="client[_token]" value="wallaflare_client_token_999" />
      </form>
    </main>
  </div>
</body>
</html>`;
  }
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
            <a href="/developer/client/delete/38185" class="delete-link">Delete</a>
          </div>
        </li>
        <li>
          <div class="collapsible-header">koreader - #36204</div>
          <div class="collapsible-body">
            <p><strong><code>wallaflare</code></strong></p>
            <p><strong><code>${clientSecret}</code></strong></p>
            <p><strong><code>${origin}</code></strong></p>
            <p><strong><code>token,password</code></strong></p>
            <a href="/developer/client/delete/36204" class="delete-link">Delete</a>
          </div>
        </li>
      </ul>
      <form action="/developer/client/create" method="post">
        <input type="hidden" id="client__token" name="client[_token]" value="wallaflare_client_token_999" />
      </form>
      <div style="margin-top: 28px; border-top: 1px solid var(--border-color); padding-top: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h2 style="margin-bottom: 0;">Personal Access Tokens</h2>
          <span style="font-size: 0.72rem; color: #4ade80; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); padding: 2px 8px; border-radius: 9999px; font-weight: 600;">Zero-Trust</span>
        </div>
        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.5;">
          Active tokens for third-party clients (e.g. KOReader Wallabag Plugin), FeedMe, automation scripts, or external integrations. To create, rename, or revoke tokens, open <strong>Settings &rarr; Apps &amp; Sync</strong> on your Dashboard.
        </p>

        <ul class="pat-list" style="list-style: none; display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
          ${renderTokensListHtml(tokens)}
        </ul>

        <a href="/?settings=integrations" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: rgba(255, 255, 255, 0.06); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); text-decoration: none; font-size: 0.82rem; font-weight: 500; transition: all 0.15s ease;">
          <span>Manage in Settings &rarr; Apps &amp; Sync &rarr;</span>
        </a>
      </div>
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
webRouter.get('/', (c) => {
  const cookie = c.req.header('Cookie') || '';
  const ua = c.req.header('user-agent') || '';
  const isAppClient = /okhttp|wallabag|InThePoche|Dalvik/i.test(ua);
  if (cookie.includes('PHPSESSID') && isAppClient) {
    return c.html(renderWallabagDeveloperPage(c, c.env, getClientSecret(c.env), true));
  }
  return renderWebDashboard(c);
});

// Login page (renders Wallabag login form for mobile scrapers, or unified Wallaflare UI for browsers)
webRouter.get('/login', (c) => {
  const ua = c.req.header('user-agent') || '';
  const isAppClient = /okhttp|wallabag|InThePoche|Dalvik/i.test(ua);
  if (isAppClient) {
    return c.html(renderWallabagLoginPage());
  }
  return renderWebDashboard(c);
});

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

  const isConfigured = await isMasterPasswordConfigured(c.env.DB, c.env);
  const expectedUsername = (c.env.USERNAME || 'wallaflare').toLowerCase();

  if (isConfigured) {
    const isUserValid = String(username || '').trim().toLowerCase() === expectedUsername;
    const passCheck = await verifyMasterPassword(c.env.DB, c.env, password);
    if (!isUserValid || !passCheck.valid) {
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
  const ua = c.req.header('user-agent') || '';
  const isAppClient = /okhttp|wallabag|InThePoche|Dalvik/i.test(ua);
  const isConfigured = await isMasterPasswordConfigured(c.env.DB, c.env);
  if (!isAuthed && isConfigured && !isAppClient) {
    const origin = new URL(c.req.url).origin;
    return c.redirect(`${origin}/login`, 302);
  }
  const clientSecret = getClientSecret(c.env);
  let tokens: any[] = [];
  if (!isAppClient && c.env.DB) {
    try {
      tokens = await getApiTokens(c.env.DB);
    } catch {}
  }
  return c.html(renderWallabagDeveloperPage(c, c.env, clientSecret, isAppClient, tokens));
});

webRouter.get('/developer/client/create', async (c) => {
  const clientSecret = getClientSecret(c.env);
  return c.html(renderWallabagDeveloperPage(c, c.env, clientSecret, true));
});

webRouter.post('/developer/client/create', async (c) => {
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
