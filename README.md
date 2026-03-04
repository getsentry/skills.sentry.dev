# skills.sentry.gg

Tiny proxy that gives pretty URLs to Sentry AI skills hosted on GitHub.

## URL Mapping

| Pretty URL | GitHub Raw URL |
|---|---|
| `skills.sentry.gg/` | `.../main/SKILL_TREE.md` |
| `skills.sentry.gg/SKILL_TREE.md` | `.../main/SKILL_TREE.md` |
| `skills.sentry.gg/sentry-nextjs-sdk/SKILL.md` | `.../main/skills/sentry-nextjs-sdk/SKILL.md` |
| `skills.sentry.gg/sentry-nextjs-sdk/references/tracing.md` | `.../main/skills/sentry-nextjs-sdk/references/tracing.md` |

Root (`/`) serves the skill tree. All other paths map to `skills/<path>` in [`getsentry/sentry-for-ai`](https://github.com/getsentry/sentry-for-ai).

## Run Locally

```bash
npm install
npm run dev
```

## Docker

```bash
# Build
docker build -t skills-sentry-gg .

# Run
docker run -p 3000:3000 skills-sentry-gg
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port to listen on |

## Caching

Upstream responses are cached in-memory for 5 minutes to avoid hammering GitHub on repeated requests.
