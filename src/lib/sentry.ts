import * as Sentry from '@sentry/react';
import { SENTRY_DSN } from '../env';

/** Sin VITE_SENTRY_DSN seteado, no inicializa nada (ver .env.example). */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) console.warn('[sentry] VITE_SENTRY_DSN no seteado, Sentry deshabilitado.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    enabled: !import.meta.env.DEV,
  });
}
