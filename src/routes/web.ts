import { Hono } from 'hono';
import { Env } from '../types';
import { renderDashboardHtml } from '../views/dashboard';

export const webRouter = new Hono<{ Bindings: Env }>();

// -----------------------------------------------------------------
// Wallabag Android App Auto-Discovery & Web Login Compatibility
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
        <div class="input-field col s12">
          <input type="text" id="username" name="_username" value="" autofocus />
          <label for="username">Username</label>
        </div>
        <div class="input-field col s12">
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
</body>
</html>`;
}

// Root page: serve dashboard for browser, or login page if Android app requests /
webRouter.get('/', (c) => {
  const userAgent = c.req.header('User-Agent') || '';
  const acceptHeader = c.req.header('Accept') || '';
  const appName = c.env.APP_NAME || 'Wallaflare';

  // If requested by InThePoche or client expecting HTML login
  if (userAgent.includes('InThePoche') || userAgent.includes('wallabag')) {
    return c.html(renderWallabagLoginPage());
  }

  return c.html(renderDashboardHtml(appName));
});

// Login page
webRouter.get('/login', (c) => {
  return c.html(renderWallabagLoginPage());
});

// Login submission by Android app (MUST redirect to /developer, without returning login form!)
webRouter.post('/login_check', (c) => {
  c.header('Set-Cookie', 'PHPSESSID=wallaflare_session_authenticated; Path=/; HttpOnly; SameSite=Lax');
  return c.redirect('/developer', 302);
});

// Developer page: renders API clients list (does NOT contain login form, so isLoginPage(body) is FALSE)
webRouter.get('/developer', (c) => {
  return c.html(renderWallabagDeveloperPage(c.env));
});

webRouter.get('/developer/client/create', (c) => {
  return c.html(renderWallabagDeveloperPage(c.env));
});

webRouter.post('/developer/client/create', (c) => {
  return c.redirect('/developer', 302);
});
