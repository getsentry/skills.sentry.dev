import { Hono } from "hono";
import type { Context } from "hono";
import { serve } from "@hono/node-server";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const BASE = "https://raw.githubusercontent.com/getsentry/sentry-for-ai/refs/heads/main";

function buildSkillUrl(pathname: string): string | null {
  if (!pathname.startsWith("/")) {
    return null;
  }

  const segments = pathname.slice(1).split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return null;
  }

  return `${BASE}/skills${pathname}`;
}

async function proxyText(c: Context, url: string): Promise<Response> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const body = await res.text();
    return c.text(body, res.status as ContentfulStatusCode, {
      "Content-Type": "text/plain; charset=utf-8",
    });
  } catch {
    return c.text("Bad Gateway", 502);
  }
}

// App
const app = new Hono();

app.get("/", (c) => proxyText(c, `${BASE}/SKILL_TREE.md`));
app.get("/SKILL_TREE.md", (c) => proxyText(c, `${BASE}/SKILL_TREE.md`));
app.get("/sdks", (c) => proxyText(c, `${BASE}/skills/sentry-sdk-setup/SKILL.md`));
app.get("/workflows", (c) => proxyText(c, `${BASE}/skills/sentry-workflow/SKILL.md`));
app.get("/features", (c) => proxyText(c, `${BASE}/skills/sentry-feature-setup/SKILL.md`));

app.get("/:skill/SKILL.md", (c) => {
  const url = buildSkillUrl(c.req.path);
  if (!url) {
    return c.text("Bad Request", 400);
  }
  return proxyText(c, url);
});

app.get("/:skill/*", (c) => {
  const url = buildSkillUrl(c.req.path);
  if (!url) {
    return c.text("Bad Request", 400);
  }
  return proxyText(c, url);
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Listening on http://localhost:${port}`);
});
