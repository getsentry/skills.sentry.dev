import * as Sentry from "@sentry/hono/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  dataCollection: {},
  tracesSampleRate: 1.0,
});
