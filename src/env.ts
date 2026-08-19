export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env y completá los valores.'
  );
}

// Opcional: sin este valor, initSentry() (src/lib/sentry.ts) no hace nada.
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
