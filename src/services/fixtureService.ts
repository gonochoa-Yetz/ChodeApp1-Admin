import { supabase } from '../lib/supabase';
import type { ServiceResult } from './userService';
import type { FixtureDivision, FixtureSport, MatchStatus, Partido, TablaPosicion } from '../types/fixture';

export async function getPartidos(sport: FixtureSport, division: FixtureDivision): Promise<ServiceResult<Partido[]>> {
  const { data, error } = await supabase
    .from('partidos')
    .select('*')
    .eq('sport', sport)
    .eq('division', division)
    .order('fecha', { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data as Partido[]) ?? [], error: null };
}

export function getMatchStatus(partido: Partido, partidos: Partido[]): MatchStatus {
  const isJugado = (p: Partido) => p.puntos_favor !== null && p.puntos_contra !== null;
  if (isJugado(partido)) return 'jugado';

  const pendientes = partidos.filter((p) => !isJugado(p));
  const proximo = pendientes.reduce<Partido | null>((earliest, p) => {
    if (!earliest) return p;
    return new Date(p.fecha).getTime() < new Date(earliest.fecha).getTime() ? p : earliest;
  }, null);

  return proximo?.id === partido.id ? 'proximo' : 'pendiente';
}

export async function upsertMatchResult(
  matchId: string,
  puntosFavor: number,
  puntosContra: number
): Promise<ServiceResult<Partido>> {
  const { data, error } = await supabase
    .from('partidos')
    .update({ puntos_favor: puntosFavor, puntos_contra: puntosContra })
    .eq('id', matchId)
    .select('*')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Partido, error: null };
}

export async function getTablaPosiciones(sport: FixtureSport, division: FixtureDivision): Promise<ServiceResult<TablaPosicion[]>> {
  const { data, error } = await supabase
    .from('tabla_posiciones')
    .select('*')
    .eq('sport', sport)
    .eq('division', division)
    .order('posicion', { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data as TablaPosicion[]) ?? [], error: null };
}

export async function upsertStandingsRow(
  row: Partial<Omit<TablaPosicion, 'created_by' | 'updated_at'>> & { id?: string }
): Promise<ServiceResult<TablaPosicion>> {
  const { data, error } = await supabase.from('tabla_posiciones').upsert(row).select('*').single();
  if (error) return { data: null, error: error.message };
  return { data: data as TablaPosicion, error: null };
}

export async function deleteStandingsRow(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('tabla_posiciones').delete().eq('id', id);
  return { error: error?.message ?? null };
}
