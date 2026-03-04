# skills.sentry.gg

Tiny proxy that gives pretty URLs to Sentry AI skills hosted on GitHub.

## URL Mapping

| Pretty URL | Resolves To |
|---|---|
| `https://skills.sentry.gg/sentry` | `https://raw.githubusercontent.com/getsentry/sentry-for-ai/refs/heads/main/sentry.md` |
| `https://skills.sentry.gg/sentry/issues` | `https://raw.githubusercontent.com/getsentry/sentry-for-ai/refs/heads/main/sentry/issues.md` |

Any path under `skills.sentry.gg` maps to the corresponding `.md` file under the repo root.

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
