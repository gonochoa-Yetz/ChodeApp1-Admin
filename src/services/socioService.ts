import { supabase } from '../lib/supabase';
import type { ServiceResult } from './userService';
import type { UserRol } from '../types/user';
import type { Membership } from '../types/membership';

export interface MembershipRow {
  id: string;
  numero_socio: number;
  division: string | null;
  tipo_membresia: string | null;
  anio_ingreso: number | null;
  estado: string;
  grupo_id: string | null;
  deporte_id: string | null;
}

export interface SocioListItem {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  nickname: string | null;
  role: UserRol;
  memberships: MembershipRow[];
}

export interface SocioDetalle {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  nickname: string | null;
  role: UserRol;
  memberships: Membership[];
}

export interface RecentPayment {
  id: string;
  estado_pago: string;
  events: { nombre: string } | null;
}

const MEMBERSHIP_JOIN =
  'memberships!memberships_user_id_fkey(id, numero_socio, division, tipo_membresia, anio_ingreso, estado, grupo_id, deporte_id)';

export async function getSociosAdmin(): Promise<ServiceResult<SocioListItem[]>> {
  const { data, error } = await supabase
    .from('users')
    .select(`id, nombre, apellido, email, nickname, role, ${MEMBERSHIP_JOIN}`)
    .order('nombre', { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data as unknown as SocioListItem[]) ?? [], error: null };
}

export async function getSocioDetalle(socioId: string): Promise<ServiceResult<SocioDetalle>> {
  const { data, error } = await supabase
    .from('users')
    .select(`id, nombre, apellido, email, nickname, role, ${MEMBERSHIP_JOIN}`)
    .eq('id', socioId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as unknown as SocioDetalle, error: null };
}

export async function getRecentPayments(socioId: string, limit = 5): Promise<ServiceResult<RecentPayment[]>> {
  const { data, error } = await supabase
    .from('event_attendances')
    .select('id, estado_pago, events (nombre)')
    .eq('user_id', socioId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { data: null, error: error.message };
  return { data: (data as unknown as RecentPayment[]) ?? [], error: null };
}

export async function updateUserRole(userId: string, role: UserRol): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('users').update({ role }).eq('id', userId);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export async function updateSocioIdentity(userId: string, nombre: string, apellido: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('users').update({ nombre: nombre.trim(), apellido: apellido.trim() }).eq('id', userId);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export async function deleteSocio(userId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.rpc('delete_socio', { target_user_id: userId });
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export interface SociosActivityCounts {
  activos7d: number;
  activos30d: number;
}

// "Actividad" = interacción real con la app (no hay tracking de login):
// asistió a un evento, generó/pagó una cuota, o publicó en el Market.
export async function getSociosActivityCounts(): Promise<ServiceResult<SociosActivityCounts>> {
  const now = Date.now();
  const cutoff30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [attendances, installments, listings] = await Promise.all([
    supabase.from('event_attendances').select('user_id, created_at').gte('created_at', cutoff30),
    supabase.from('event_installments').select('user_id, created_at').gte('created_at', cutoff30),
    supabase.from('market_listings').select('seller_id, created_at').gte('created_at', cutoff30),
  ]);

  if (attendances.error) return { data: null, error: attendances.error.message };
  if (installments.error) return { data: null, error: installments.error.message };
  if (listings.error) return { data: null, error: listings.error.message };

  type Row = { userId: string; createdAt: string };
  const rows: Row[] = [
    ...(attendances.data ?? []).map((r) => ({ userId: r.user_id as string, createdAt: r.created_at as string })),
    ...(installments.data ?? []).map((r) => ({ userId: r.user_id as string, createdAt: r.created_at as string })),
    ...(listings.data ?? []).map((r) => ({ userId: r.seller_id as string, createdAt: r.created_at as string })),
  ];

  const cutoff7Time = new Date(cutoff7).getTime();
  const activos30d = new Set(rows.map((r) => r.userId)).size;
  const activos7d = new Set(rows.filter((r) => new Date(r.createdAt).getTime() >= cutoff7Time).map((r) => r.userId)).size;

  return { data: { activos7d, activos30d }, error: null };
}
