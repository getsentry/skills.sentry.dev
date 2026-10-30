// Checks that every public URL still works. Agents request these directly, and
// sentry-docs links to some of them (its SKILL.md and the agent setup callout),
// so a 404 here means an agent hits a dead end.
//
// Usage: node scripts/check-urls.mjs [origin]
//
// Redirects on the same origin are followed. A redirect to docs.sentry.io counts
// as ok without fetching it, so a docs outage can't fail this check. Every
// redirect must carry a body, so agents that don't follow redirects still learn
// where to go.

const origin = process.argv[2] ?? "http://localhost:3000";

// Keep in sync with the routes in src/index.ts and the links in sentry-docs.
const PATHS = [
  "/",
  "/SKILL_TREE.md",
  "/instrument",
  "/sdks",
  "/workflows",
  "/features",
  "/cloudflare",
  "/cloudflare/tracing.md",
  "/sentry-get-started/SKILL.md",
  "/sentry-debug-issue/SKILL.md",
  "/sentry-create-alert/SKILL.md",
  "/sentry-otel-exporter-setup/SKILL.md",
  "/sentry-instrument/references/sdk-docs.md",
];

async function check(path) {
  let url = new URL(path, origin);
  for (let hops = 0; hops < 5; hops++) {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10000) });
    const body = await res.text();
    if (res.status >= 300 && res.status < 400) {
      if (body.trim() === "") {
        return `${res.status} with an empty body at ${url}`;
      }
      const next = new URL(res.headers.get("location") ?? "", url);
      if (next.origin !== url.origin) {
        return next.hostname === "docs.sentry.io" ? null : `redirects to ${next}`;
      }
      url = next;
      continue;
    }
    return res.status === 200 ? null : `${res.status} at ${url}`;
  }
  return "too many redirects";
}

let failed = 0;
for (const path of PATHS) {
  const error = await check(path).catch((err) => String(err));
  console.log(`${error ? "FAIL" : "ok  "} ${path}${error ? ` - ${error}` : ""}`);
  if (error) failed++;
}
if (failed > 0) {
  console.error(`\n${failed} URL(s) failed.`);
  process.exit(1);
}
