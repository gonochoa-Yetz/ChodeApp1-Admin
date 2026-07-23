import { supabase } from '../lib/supabase';
import type { ServiceResult } from './userService';
import type { Club, ClubMarketConnection } from '../types/groups';

export async function getClub(clubId: string): Promise<ServiceResult<Club>> {
  const { data, error } = await supabase.from('clubs').select('*').eq('id', clubId).single();
  return { data: data as Club | null, error: error?.message ?? null };
}

export async function getClubMarketConnections(
  clubId: string
): Promise<ServiceResult<(ClubMarketConnection & { club_destino: Club })[]>> {
  const { data, error } = await supabase
    .from('club_market_connections')
    .select('*, club_destino:club_destino_id(*)')
    .eq('club_origen_id', clubId)
    .order('created_at');
  return { data: data as (ClubMarketConnection & { club_destino: Club })[] | null, error: error?.message ?? null };
}

export async function createMarketConnection(clubOrigenId: string, clubDestinoSlug: string, createdBy: string): Promise<{ error: string | null }> {
  const { data: destino, error: lookupError } = await supabase.from('clubs').select('id').eq('slug', clubDestinoSlug).eq('activo', true).single();
  if (lookupError || !destino) return { error: lookupError?.message ?? 'Club no encontrado' };
  if (destino.id === clubOrigenId) return { error: 'No se puede conectar un club consigo mismo' };

  const { error } = await supabase
    .from('club_market_connections')
    .insert({ club_origen_id: clubOrigenId, club_destino_id: destino.id, estado: 'activo', created_by: createdBy });
  return { error: error?.message ?? null };
}

export async function updateMarketConnectionEstado(connectionId: string, estado: 'activo' | 'inactivo' | 'pendiente'): Promise<{ error: string | null }> {
  const { error } = await supabase.from('club_market_connections').update({ estado }).eq('id', connectionId);
  return { error: error?.message ?? null };
}

export async function deleteMarketConnection(connectionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('club_market_connections').delete().eq('id', connectionId);
  return { error: error?.message ?? null };
}
