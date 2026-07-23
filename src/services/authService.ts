import { supabase } from '../lib/supabase';
import type { ServiceResult } from './userService';

const REQUEST_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export async function signIn(email: string, password: string): Promise<ServiceResult<null>> {
  try {
    const { error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      REQUEST_TIMEOUT_MS
    );
    if (error) return { data: null, error: error.message };
    return { data: null, error: null };
  } catch {
    return { data: null, error: 'No se pudo conectar con el servidor (timeout). Revisá tu conexión.' };
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
