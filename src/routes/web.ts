import { Hono } from 'hono';
import { Env } from '../types';
import { renderDashboardHtml } from '../views/dashboard';

export const webRouter = new Hono<{ Bindings: Env }>();

webRouter.get('/', (c) => {
  const appName = c.env.APP_NAME || 'Wallaflare';
  return c.html(renderDashboardHtml(appName));
});
