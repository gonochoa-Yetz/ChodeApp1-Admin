import { supabase } from '../lib/supabase';
import type { User } from '../types/user';

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

const PROFILE_COLUMNS = 'id, auth_id, nombre, apellido, email, avatar, nickname, role, club_id';

export async function searchUsers(query: string): Promise<ServiceResult<User[]>> {
  const q = query.trim();
  if (!q) return { data: [], error: null };

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,email.ilike.%${q}%,nickname.ilike.%${q}%`)
    .limit(10);

  if (error) return { data: null, error: error.message };
  return { data: (data as User[]) ?? [], error: null };
}

export async function getProfileByAuthId(authId: string): Promise<ServiceResult<User>> {
  const { data, error } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS)
    .eq('auth_id', authId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'No se encontró el perfil del usuario.' };
  return { data: data as User, error: null };
}
