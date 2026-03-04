# skills.sentry.gg

Tiny proxy that gives pretty URLs to Sentry AI skills hosted on GitHub.

## Usage

Tell your AI coding assistant:

```
Use curl to download, read and follow: https://skills.sentry.gg/sdks
```

**Why curl?** Skills are detailed 10–20 KB markdown files. Fetch tools (like WebFetch) often summarize them, losing critical configuration details. `curl -sL` guarantees the full content.

## Entry Points

| URL | What it loads |
|---|---|
| `skills.sentry.gg/` | Full skill index (SKILL_TREE.md) |
| `skills.sentry.gg/sdks` | SDK setup — detect platform and install Sentry |
| `skills.sentry.gg/workflows` | Workflows — debug issues, review code, upgrade SDKs |
| `skills.sentry.gg/features` | Features — AI monitoring, alerts, OpenTelemetry |
| `skills.sentry.gg/<skill-name>/SKILL.md` | Individual skill file |

## URL Mapping

| Pretty URL | GitHub Raw URL |
|---|---|
| `skills.sentry.gg/` | `.../main/SKILL_TREE.md` |
| `skills.sentry.gg/sdks` | `.../main/skills/sentry-sdk-setup/SKILL.md` |
| `skills.sentry.gg/workflows` | `.../main/skills/sentry-workflow/SKILL.md` |
| `skills.sentry.gg/features` | `.../main/skills/sentry-feature-setup/SKILL.md` |
| `skills.sentry.gg/sentry-nextjs-sdk/SKILL.md` | `.../main/skills/sentry-nextjs-sdk/SKILL.md` |
| `skills.sentry.gg/sentry-nextjs-sdk/references/tracing.md` | `.../main/skills/sentry-nextjs-sdk/references/tracing.md` |

All paths resolve to files in [`getsentry/sentry-for-ai`](https://github.com/getsentry/sentry-for-ai).

## Run Locally

```bash
npm install
npm run dev
```

## Docker

```bash
docker build -t skills-sentry-gg .
docker run -p 3000:3000 skills-sentry-gg
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port to listen on |

## Caching

Upstream responses are cached in-memory for 5 minutes to avoid hammering GitHub on repeated requests.
