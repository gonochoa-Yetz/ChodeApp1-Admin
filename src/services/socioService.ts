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
  nickname: string | null;
  role: UserRol;
  memberships: MembershipRow[];
}

export interface SocioDetalle {
  id: string;
  nombre: string;
  apellido: string;
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
    .select(`id, nombre, apellido, nickname, role, ${MEMBERSHIP_JOIN}`)
    .order('nombre', { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data as unknown as SocioListItem[]) ?? [], error: null };
}

export async function getSocioDetalle(socioId: string): Promise<ServiceResult<SocioDetalle>> {
  const { data, error } = await supabase
    .from('users')
    .select(`id, nombre, apellido, nickname, role, ${MEMBERSHIP_JOIN}`)
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

export async function deleteSocio(userId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.rpc('delete_socio', { target_user_id: userId });
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}
