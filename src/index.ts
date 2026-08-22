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
  return next();
});

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposeHeaders: ['Content-Length', 'Content-Disposition', 'X-Wallabag-Version', 'X-Powered-By'],
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
