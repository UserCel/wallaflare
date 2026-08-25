import { OTA_VERSION, OTA_MIN_NATIVE_VERSION } from './views/ota-bundle';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { apiRouter } from './routes/api';
import { webRouter } from './routes/web';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS and Wallabag identification headers
app.use('*', async (c, next) => {
  c.header('X-Wallabag-Version', '2.6.9');
  c.header('X-Powered-By', 'wallabag');
  c.header('X-Wallaflare-Web-Version', OTA_VERSION);
  c.header('X-Wallaflare-Min-Native', OTA_MIN_NATIVE_VERSION);
  c.header('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  c.header(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' https: data: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: http: data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self';"
  );
  return next();
});

// Search Engine Crawlers Exclusion
app.get('/robots.txt', (c) => {
  c.header('Content-Type', 'text/plain');
  return c.text('User-agent: *\nDisallow: /\n');
});

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposeHeaders: ['Content-Length', 'Content-Disposition', 'X-Wallabag-Version', 'X-Powered-By', 'X-Wallaflare-Web-Version', 'X-Wallaflare-Min-Native'],
  maxAge: 86400,
}));

// Route groups
app.route('/', webRouter);
app.route('/', apiRouter);

// Global Error Handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
  }, 500);
});

// 404 Fallback
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

export default app;
