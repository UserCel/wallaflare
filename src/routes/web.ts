import { ICON_192_B64, ICON_512_B64 } from './icons-b64';
import { Hono } from 'hono';
import { Env } from '../types';
import { renderDashboardHtml } from '../views/dashboard';

export const webRouter = new Hono<{ Bindings: Env }>();

const WALLABAG_SVG_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
  <rect width="100" height="100" rx="20" fill="#f97316"/>
  <path d="M30 25 L70 25 C75 25 80 30 80 35 L80 75 C80 80 75 85 70 85 L30 85 C25 85 20 80 20 75 L20 35 C20 30 25 25 30 25 Z" fill="#ffffff" opacity="0.9"/>
  <path d="M35 40 L65 40 M35 52 L65 52 M35 64 L55 64" stroke="#f97316" stroke-width="4" stroke-linecap="round"/>
</svg>`;


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
  return c.text("\nself.addEventListener('install', (event) => {\n  self.skipWaiting();\n});\n\nself.addEventListener('activate', (event) => {\n  event.waitUntil(self.clients.claim());\n});\n\nself.addEventListener('fetch', (event) => {\n  // Let network handle all requests normally\n  event.respondWith(fetch(event.request));\n});\n");
});

webRouter.get('/img/logo-wallabag.svg', (c) => {
  c.header('Content-Type', 'image/svg+xml');
  return c.body(WALLABAG_SVG_LOGO);
});

webRouter.get('/favicon.ico', (c) => {
  c.header('Content-Type', 'image/svg+xml');
  return c.body(WALLABAG_SVG_LOGO);
});


// -----------------------------------------------------------------
// Wallabag Android App Exact Regex Handshake
// -----------------------------------------------------------------

function renderWallabagLoginPage(): string {
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

function renderWallabagDeveloperPage(env: Env): string {
  const secret = env.AUTH_TOKEN || env.CLIENT_SECRET || 'wallaflare';
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
            <p><strong><code>${secret}</code></strong></p>
            <p><strong><code>https://wallaflare.example.com</code></strong></p>
            <p><strong><code>token,password</code></strong></p>
            <a href="/developer/client/delete/38185">Delete</a>
          </div>
        </li>
        <li>
          <div class="collapsible-header">koreader - #36204</div>
          <div class="collapsible-body">
            <p><strong><code>wallaflare</code></strong></p>
            <p><strong><code>${secret}</code></strong></p>
            <p><strong><code>https://wallaflare.example.com</code></strong></p>
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


// -----------------------------------------------------------------
// PWA Web App Manifest & Web Share Target API
// -----------------------------------------------------------------
const PWA_MANIFEST = {
  name: 'Wallaflare',
  short_name: 'Wallaflare',
  description: 'Serverless read-it-later & Wallabag client',
  id: '/',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'any',
  background_color: '#0f172a',
  theme_color: '#f97316',
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
    params: {
      title: 'title',
      text: 'text',
      url: 'url'
    }
  }
};

webRouter.get('/manifest.webmanifest', (c) => {
  c.header('Content-Type', 'application/manifest+json');
  return c.json(PWA_MANIFEST);
});

webRouter.get('/manifest.json', (c) => {
  c.header('Content-Type', 'application/manifest+json');
  return c.json(PWA_MANIFEST);
});

webRouter.get('/share-target', (c) => {
  return c.html(renderDashboardHtml(c.env.APP_NAME || 'Wallaflare'));
});

// Direct article & filter sub-URLs
webRouter.get('/read/:id', (c) => c.html(renderDashboardHtml(c.env.APP_NAME || 'Wallaflare')));
webRouter.get('/view/:id', (c) => c.html(renderDashboardHtml(c.env.APP_NAME || 'Wallaflare')));
webRouter.get('/unread', (c) => c.html(renderDashboardHtml(c.env.APP_NAME || 'Wallaflare')));
webRouter.get('/starred', (c) => c.html(renderDashboardHtml(c.env.APP_NAME || 'Wallaflare')));
webRouter.get('/archive', (c) => c.html(renderDashboardHtml(c.env.APP_NAME || 'Wallaflare')));

// Root page
webRouter.get('/', (c) => {
  const cookie = c.req.header('Cookie') || '';
  const appName = c.env.APP_NAME || 'Wallaflare';

  // If authenticated via cookie (from login_check), render Wallabag regular page (with /logout and logo)
  // so WallabagWebService.testConnection() immediately verifies isRegularPage() == true
  if (cookie.includes('PHPSESSID')) {
    return c.html(renderWallabagDeveloperPage(c.env));
  }

  // Dashboard for browser / default root
  return c.html(renderDashboardHtml(appName));
});

// Login page
webRouter.get('/login', (c) => {
  return c.html(renderWallabagLoginPage());
});

// Login submission by Android app
webRouter.post('/login_check', (c) => {
  const host = c.req.header('host') || 'wallaflare.example.com';
  const proto = c.req.header('x-forwarded-proto') || 'https';
  const origin = `${proto}://${host}`;

  c.header('Set-Cookie', 'PHPSESSID=wallaflare_session_authenticated; Path=/; HttpOnly; SameSite=Lax');
  return c.redirect(`${origin}/developer`, 302);
});

// Developer page (used by Android app to auto-fetch Client ID / Secret)
webRouter.get('/developer', (c) => {
  return c.html(renderWallabagDeveloperPage(c.env));
});

webRouter.get('/developer/client/create', (c) => {
  return c.html(renderWallabagDeveloperPage(c.env));
});

webRouter.post('/developer/client/create', (c) => {
  const host = c.req.header('host') || 'wallaflare.example.com';
  const proto = c.req.header('x-forwarded-proto') || 'https';
  const origin = `${proto}://${host}`;
  return c.redirect(`${origin}/developer`, 302);
});

webRouter.get('/logout', (c) => {
  c.header('Set-Cookie', 'PHPSESSID=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  return c.redirect('/login', 302);
});
