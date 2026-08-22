import { Hono } from 'hono';
import { Env } from '../types';
import { renderDashboardHtml } from '../views/dashboard';

export const webRouter = new Hono<{ Bindings: Env }>();

// -----------------------------------------------------------------
// Wallabag Android App Auto-Discovery & Web Login Compatibility
// -----------------------------------------------------------------

function renderWallabagLoginPage(): string {
  return `<!DOCTYPE html>
<!--[if lte IE 6]><html class="no-js ie6 ie67 ie678" lang="en"><![endif]-->
<!--[if lte IE 7]><html class="no-js ie7 ie678" lang="en"><![endif]-->
<!--[if IE 8]><html class="no-js ie8 ie678" lang="en"><![endif]-->
<!--[if gt IE 8]><html class="no-js" lang="en"><![endif]-->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="initial-scale=1.0">
  <meta name="generator" content="wallabag">
  <meta name="wallabag:version" content="2.6.9">
  <title>Welcome to wallabag! – wallabag</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 2rem; width: 100%; max-width: 380px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; }
    .input-field { margin: 1rem 0; text-align: left; }
    label { display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.3rem; }
    input { width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 0.6rem; color: #fff; outline: none; }
    .btn { width: 100%; background: #f97316; color: #fff; border: none; border-radius: 6px; padding: 0.7rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }
    .link-web { display: inline-block; margin-top: 1.25rem; color: #f97316; font-size: 0.85rem; text-decoration: none; }
  </style>
</head>
<body class="login">
  <div id="main">
    <main>
      <div class="card">
        <div class="center">
          <img src="/img/logo-wallabag.svg" alt="wallabag logo" style="width: 48px; height: 48px; margin-bottom: 1rem;" />
        </div>
        <h2 style="margin: 0 0 0.5rem 0; font-size: 1.25rem;">Wallaflare Login</h2>
        <form action="/login_check" method="post" name="loginform">
          <input type="hidden" name="_csrf_token" value="wallaflare_csrf_token_8a92b" />
          <div class="input-field col s12">
            <label for="username">Username</label>
            <input type="text" id="username" name="_username" value="" autofocus />
          </div>
          <div class="input-field col s12">
            <label for="password">Password / Token</label>
            <input type="password" id="password" name="_password" placeholder="AUTH_TOKEN" />
          </div>
          <button type="submit" class="btn">Log in</button>
        </form>
        <a href="/?view=dashboard" class="link-web">Open Web Reader Dashboard &rarr;</a>
      </div>
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
      <h2>API clients management</h2>
      <div class="card-panel">
        <div class="client-item">
          <h3>Client: Android app - #38185</h3>
          <p><strong>Name:</strong> Android app</p>
          <p><strong>Client ID:</strong> <span>wallaflare</span></p>
          <p><strong>Client secret:</strong> <span>${secret}</span></p>
        </div>
        <div class="client-item">
          <h3>Client: koreader - #36204</h3>
          <p><strong>Name:</strong> koreader</p>
          <p><strong>Client ID:</strong> <span>wallaflare</span></p>
          <p><strong>Client secret:</strong> <span>${secret}</span></p>
        </div>
      </div>
    </main>
  </div>
</body>
</html>`;
}

// Root page
webRouter.get('/', (c) => {
  const viewParam = c.req.query('view');
  const appName = c.env.APP_NAME || 'Wallaflare';

  // If explicit dashboard view
  if (viewParam === 'dashboard') {
    return c.html(renderDashboardHtml(appName));
  }

  // By default, serve the Wallabag login page so TestConnectionTask and Android App succeed immediately
  return c.html(renderWallabagLoginPage());
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

webRouter.get('/unread/list', (c) => {
  return c.html(renderWallabagDeveloperPage(c.env));
});
