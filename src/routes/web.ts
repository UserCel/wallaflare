import { Hono } from 'hono';
import { Env } from '../types';
import { renderDashboardHtml } from '../views/dashboard';

export const webRouter = new Hono<{ Bindings: Env }>();

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
