# skills.sentry.dev

Tiny proxy that gives pretty URLs to Sentry AI skills hosted on GitHub.

## Usage

Tell your AI coding assistant:

```
Use curl to download, read and follow: https://skills.sentry.dev/instrument
```

**Why curl?** Skills are detailed 10–20 KB markdown files. Fetch tools (like WebFetch) often summarize them, losing critical configuration details. `curl -sL` guarantees the full content.

## Entry Points

| URL                                       | What it loads                                            |
| ----------------------------------------- | -------------------------------------------------------- |
| `skills.sentry.dev/`                      | Full skill index (SKILL_TREE.md)                         |
| `skills.sentry.dev/instrument`            | Instrument your app — detect platform and install Sentry |
| `skills.sentry.dev/workflows`             | Workflows — debug issues, review code, upgrade SDKs      |
| `skills.sentry.dev/features`              | Features — AI monitoring, alerts, OpenTelemetry          |
| `skills.sentry.dev/<skill-name>/SKILL.md` | Individual skill file                                    |

## URL Mapping

| Pretty URL                                                              | GitHub Raw URL                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `skills.sentry.dev/`                                                    | `.../main/src/SKILL_TREE.md`                                     |
| `skills.sentry.dev/instrument`                                          | `.../main/src/skills/sentry-instrument/SKILL.md`                 |
| `skills.sentry.dev/sdks`                                                | → `301` redirect to `/instrument`                                |
| `skills.sentry.dev/workflows`                                           | `.../main/src/skills/sentry-workflow/SKILL.md`                   |
| `skills.sentry.dev/features`                                            | `.../main/src/skills/sentry-feature-setup/SKILL.md`              |
| `skills.sentry.dev/sentry-instrument/SKILL.md`                          | `.../main/src/skills/sentry-instrument/SKILL.md`                 |
| `skills.sentry.dev/sentry-instrument/references/sdks/nextjs/tracing.md` | `.../main/src/references/sdks/nextjs/tracing.md` (fallback path) |

All paths resolve to files in [`getsentry/sentry-for-ai`](https://github.com/getsentry/sentry-for-ai).

## Run Locally

```bash
npm install
npm run dev
```

## Docker

```bash
docker build -t skills-sentry-dev .
docker run -p 3000:3000 skills-sentry-dev
```

## Environment Variables

| Variable | Default | Description       |
| -------- | ------- | ----------------- |
| `PORT`   | `3000`  | Port to listen on |
