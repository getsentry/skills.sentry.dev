import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const BASE = 'https://raw.githubusercontent.com/getsentry/sentry-for-ai/refs/heads/main';

// Cache
interface CacheEntry {
  body: string;
  status: number;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCache(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const ttl = entry.status === 200 ? 5 * 60 * 1000 : 1 * 60 * 1000;
  if (Date.now() - entry.fetchedAt > ttl) return null;
  return entry;
}

function setCache(key: string, body: string, status: number): void {
  cache.set(key, { body, status, fetchedAt: Date.now() });
}

// URL mapper
function mapPath(path: string): string | null {
  if (path.includes('..')) return null;
  if (path === '/' || path === '/SKILL_TREE.md') {
    return `${BASE}/SKILL_TREE.md`;
  }
  return `${BASE}/skills${path}`;
}

// App
const app = new Hono();

app.get('/health', (c) => c.text('ok'));

app.get('*', async (c) => {
  let path = c.req.path;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  const url = mapPath(path);
  if (!url) {
    return c.text('Bad Request', 400);
  }

  const cached = getCache(url);
  if (cached) {
    return c.text(cached.body, cached.status as any, {
      'Content-Type': 'text/plain; charset=utf-8',
    });
  }

  let body: string;
  let status: number;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    body = await res.text();
    status = res.status;
    if (status >= 500) {
      const stale = cache.get(url);
      if (stale) {
        return c.text(stale.body, stale.status as any, {
          'Content-Type': 'text/plain; charset=utf-8',
        });
      }
    }
    setCache(url, body, status);
  } catch (err) {
    const stale = cache.get(url);
    if (stale) {
      return c.text(stale.body, stale.status as any, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
    }
    return c.text('Bad Gateway', 502);
  }

  return c.text(body, status as any, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Listening on port ${port}`);
});
