import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,
  });
  // Replay is the heaviest Sentry integration; pulling it in lazily keeps it
  // out of the critical bundle while replays still record once loaded.
  Sentry.lazyLoadIntegration("replayIntegration")
    .then((replayIntegration) => {
      Sentry.addIntegration(replayIntegration());
    })
    .catch(() => {
      // Replay unavailable (blocked CDN, offline) — error reporting still works.
    });
}
