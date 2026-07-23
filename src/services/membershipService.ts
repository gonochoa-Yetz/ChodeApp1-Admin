import { supabase } from '../lib/supabase';
import type { ServiceResult } from './userService';
import type { Membership } from '../types/membership';

export async function updateMembership(
  membershipId: string,
  fields: Partial<Membership>
): Promise<ServiceResult<Membership>> {
  const { data, error } = await supabase
    .from('memberships')
    .update(fields)
    .eq('id', membershipId)
    .select('*')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Membership, error: null };
}

export async function updateMembershipGrupo(
  membershipId: string,
  grupoId: string | null
): Promise<ServiceResult<Membership>> {
  let deporte_id: string | null = null;
  let club_id: string | null = null;

  if (grupoId) {
    const { data: grupo } = await supabase.from('grupos').select('deporte_id, club_id').eq('id', grupoId).single();
    if (grupo) {
      deporte_id = grupo.deporte_id;
      club_id = grupo.club_id;
    }
  }

  const { data, error } = await supabase
    .from('memberships')
    .update({ grupo_id: grupoId, deporte_id, ...(club_id ? { club_id } : {}) })
    .eq('id', membershipId)
    .select('*')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Membership, error: null };
}
