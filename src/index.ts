import { sentry } from "@sentry/hono/node";
import { Hono } from "hono";
import type { Context } from "hono";
import { serve } from "@hono/node-server";
import { trimTrailingSlash } from "hono/trailing-slash";
import { getPath } from "hono/utils/url";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const BASE = "https://raw.githubusercontent.com/getsentry/sentry-for-ai/refs/heads/main";
const ORIGIN = "https://skills.sentry.dev";

// Appended to every markdown document we serve. Skill sources use plain relative
// links (e.g. `references/tracing.md`, `../sentry-node-sdk/SKILL.md`) and say
// nothing about HTTP or curl — that keeps them clean when bundled into the
// plugin distributions. When the same files are read over HTTP, though, an agent
// has no signal that those links are fetchable. This note supplies it, and it
// lives ONLY here so the curl instruction never leaks back into the sources.
//
// `notePath` is the document's own canonical path on this origin. For the pretty
// aliases (/instrument, /workflows, …) it is the real underlying file, not the alias,
// so relative links resolve correctly.
function navNote(notePath: string): string {
  const canonicalUrl = `${ORIGIN}${notePath}`;
  const dirUrl = canonicalUrl.replace(/\/[^/]*$/, "") || ORIGIN;
  return [
    "",
    "",
    "<!-- Navigation hint added by skills.sentry.dev; not part of the source file. -->",
    "> [!NOTE]",
    `> You fetched this over HTTP from \`${canonicalUrl}\`. The links in it are relative`,
    "> paths to other skill files. To follow one, resolve it against this document's URL",
    "> and fetch the full file with `curl -sL` — these files are large, and a summarizing",
    "> fetch tool will drop details you need. A link `<path>` resolves to",
    `> \`${dirUrl}/<path>\`, and \`../<path>\` steps up one level from \`${dirUrl}/\`.`,
    "",
  ].join("\n");
}

// Prepended to the index (`/`). This is the HTTP entry point, so it explains the
// pretty entry-point URLs and how to fetch skills over curl — guidance that used
// to live in SKILL_TREE.md but doesn't belong in the plugin-bundled sources. It
// supersedes the per-file note here, since it already covers link-following.
const INDEX_PREAMBLE = [
  "## How to Use These Skills",
  "",
  "Fetch each skill with `curl -sL` — they are detailed 10–20 KB markdown files, and",
  "summarizing fetch tools (like WebFetch) drop configuration details you need.",
  "",
  "### Entry Points",
  "",
  "| URL | What it loads |",
  "| --- | --- |",
  `| \`${ORIGIN}/\` | This index |`,
  `| \`${ORIGIN}/instrument\` | Instrument your app — detect the platform and install Sentry |`,
  `| \`${ORIGIN}/workflows\` | Workflows — debug issues, review code, upgrade SDKs |`,
  `| \`${ORIGIN}/features\` | Features — AI monitoring, alerts, OpenTelemetry |`,
  "",
  "### Following Links",
  "",
  "Every skill links to related files with relative paths. Resolve each link against the",
  "URL you fetched it from and download it the same way with `curl -sL`. For example, from",
  `\`${ORIGIN}/sentry-nextjs-sdk/SKILL.md\`, a link \`references/tracing.md\` resolves to`,
  `\`${ORIGIN}/sentry-nextjs-sdk/references/tracing.md\`. Do not guess or shorten paths.`,
  "",
  "---",
  "",
  "",
].join("\n");

function buildSkillUrl(pathname: string): string | null {
  if (!pathname.startsWith("/")) {
    return null;
  }
  const segments = pathname.slice(1).split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return null;
  }
  if (segments[0] === "skills") {
    return null;
  }
  return `${BASE}/skills${pathname}`;
}

interface ProxyOptions {
  // Canonical path of the document on this origin; when set and upstream
  // succeeded, the per-file navigation note is appended.
  notePath?: string;
  // Markdown prepended ahead of the body (used to front the index with usage
  // guidance). When a preamble is supplied the generic note is omitted, since
  // the preamble already explains how to navigate.
  preamble?: string;
  // Upstream URL to serve instead when the primary fetch misses. Used for the
  // references-library fallback (see the `/:skill/*` handler); fetched only when
  // the primary response is not ok, and only used if it itself succeeds.
  fallbackUrl?: string;
}

// Proxy a raw markdown file, optionally decorating it for HTTP readers.
async function proxyText(c: Context, url: string, opts: ProxyOptions = {}): Promise<Response> {
  try {
    let res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok && opts.fallbackUrl !== undefined) {
      // A failing fallback fetch must not discard the primary response (turning,
      // say, a received 404 into a 502), so swallow its errors and keep the primary.
      try {
        const fallback = await fetch(opts.fallbackUrl, { signal: AbortSignal.timeout(5000) });
        if (fallback.ok) {
          res = fallback;
        }
      } catch {
        // Keep the primary response.
      }
    }
    let body = await res.text();
    const headers: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
    };
    if (res.ok) {
      headers["Vercel-CDN-Cache-Control"] =
        "s-maxage=60, stale-while-revalidate=3600, stale-if-error=86400";
      headers["Cache-Control"] = "public, max-age=0, must-revalidate";
      if (opts.preamble !== undefined) {
        body = opts.preamble + body;
      } else if (opts.notePath !== undefined) {
        body += navNote(opts.notePath);
      }
    }
    return c.text(body, res.status as ContentfulStatusCode, headers);
  } catch {
    return c.text("Bad Gateway", 502);
  }
}

// Hono does not normalize double slashes in paths (https://github.com/honojs/hono/issues/3034),
// which can lead to open redirects via protocol-relative URLs (e.g. //evil.com).
const app = new Hono({
  getPath: (request) => getPath(request).replace(/\/+/g, "/"),
});

app.use(sentry(app));

app.use(trimTrailingSlash({ alwaysRedirect: true }));
app.get("/", (c) => proxyText(c, `${BASE}/SKILL_TREE.md`, { preamble: INDEX_PREAMBLE }));
app.get("/instrument", (c) =>
  proxyText(c, `${BASE}/skills/sentry-instrument/SKILL.md`, {
    notePath: "/sentry-instrument/SKILL.md",
  }),
);
// `/sdks` was the original alias for SDK setup; keep it working as a redirect to
// the canonical `/instrument` entry point.
app.get("/sdks", (c) => {
  const url = new URL(c.req.url);
  return c.redirect(`/instrument${url.search}`, 301);
});
app.get("/workflows", (c) =>
  proxyText(c, `${BASE}/skills/sentry-workflow/SKILL.md`, {
    notePath: "/sentry-workflow/SKILL.md",
  }),
);
app.get("/features", (c) =>
  proxyText(c, `${BASE}/skills/sentry-feature-setup/SKILL.md`, {
    notePath: "/sentry-feature-setup/SKILL.md",
  }),
);
// Skills link to the index with `../../SKILL_TREE.md`, which is right for the
// bundled layout (skills live under skills/) but resolves to /SKILL_TREE.md here,
// where the proxy flattens that prefix and serves the index at /. Redirect it to
// the canonical index so those breadcrumbs resolve.
app.get("/SKILL_TREE.md", (c) => {
  const url = new URL(c.req.url);
  return c.redirect(`/${url.search}`, 301);
});

app.get("/skills", (c) => {
  const url = new URL(c.req.url);
  return c.redirect(`/${url.search}`, 301);
});

app.get("/skills/*", (c) => {
  const url = new URL(c.req.url);
  const canonicalPath = c.req.path.slice("/skills".length) || "/";
  return c.redirect(`${canonicalPath}${url.search}`, 301);
});

app.get("/:skill/*", (c) => {
  const url = buildSkillUrl(c.req.path);
  if (!url) {
    return c.text("Bad Request", 400);
  }
  // The request path is already this document's canonical path. Only markdown
  // carries relative links worth annotating; leave other assets untouched.
  const notePath = c.req.path.endsWith(".md") ? c.req.path : undefined;

  // References-library fallback.
  //
  // Skills don't own most of their reference docs. Those live in one shared
  // library at the repo root (`references/`), and each skill declares which it
  // needs in a `references.yml` manifest. The plugin builds (plugin-claude,
  // plugin-cursor, plugin-codex, …) run a hydrate step that reads that manifest
  // and copies the declared references INTO each skill, so every shipped skill
  // is self-contained. Their SKILL.md files therefore link references with
  // skill-relative paths like `references/tracing.md`, expecting the file to sit
  // right beside them.
  //
  // This proxy serves the *un-built* sources straight from GitHub, so that copy
  // never happened — `skills/<skill>/references/<x>` usually doesn't exist. To
  // make those same relative links resolve over HTTP, a request for
  // `/<skill>/references/<rest>` that misses in the skill is retried against the
  // shared library at `${BASE}/references/<rest>` (repo root, no `skills/`
  // prefix). Because the rewrite only swaps that prefix, links inside the shared
  // docs (which are relative to the library root) keep resolving under the same
  // `/<skill>/references/…` namespace and hit this same fallback.
  //
  // A skill may still bundle its own references, so we try the skill-local path
  // first and only fall back to the shared library.
  const ref = c.req.path.match(/^\/[^/]+\/(references\/.+)$/);
  const fallbackUrl = ref ? `${BASE}/${ref[1]}` : undefined;

  return proxyText(c, url, { notePath, fallbackUrl });
});

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Listening on http://localhost:${port}`);
});
