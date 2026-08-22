import { Hono } from 'hono';
import { Env } from '../types';
import { renderDashboardHtml } from '../views/dashboard';

export const webRouter = new Hono<{ Bindings: Env }>();

const serveHtml = (c: any) => {
  const appName = c.env.APP_NAME || 'Wallaflare';
  c.header('X-Wallabag-Version', '2.6.9');
  c.header('X-Powered-By', 'wallabag');
  return c.html(renderDashboardHtml(appName));
};

webRouter.get('/', serveHtml);
webRouter.get('/login', serveHtml);
webRouter.post('/login_check', (c) => c.redirect('/'));
