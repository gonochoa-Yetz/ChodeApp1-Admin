import { supabase } from '../lib/supabase';
import type { ServiceResult } from './userService';
import type { ListingAdmin, ListingStatus } from '../types/market';

export interface ListingAdminFilters {
  estado?: ListingStatus;
  search?: string;
}

export async function getAllListingsAdmin(filters: ListingAdminFilters = {}): Promise<ServiceResult<ListingAdmin[]>> {
  let query = supabase
    .from('market_listings')
    .select('*, seller:seller_id (nombre, apellido, nickname)')
    .order('created_at', { ascending: false });

  if (filters.estado) query = query.eq('estado', filters.estado);
  if (filters.search) query = query.ilike('titulo', `%${filters.search}%`);

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: (data as ListingAdmin[]) ?? [], error: null };
}

export async function moderateDeleteListing(listingId: string, adminId: string, motivo: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('market_listings')
    .update({
      estado: 'cancelado',
      moderado_por: adminId,
      moderado_at: new Date().toISOString(),
      motivo_moderacion: motivo,
    })
    .eq('id', listingId);

  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export async function setMarketBanned(userId: string, banned: boolean): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('users').update({ market_banned: banned }).eq('id', userId);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export async function getMarketBanned(userId: string): Promise<ServiceResult<boolean>> {
  const { data, error } = await supabase.from('users').select('market_banned').eq('id', userId).single();
  if (error) return { data: null, error: error.message };
  return { data: (data as { market_banned: boolean }).market_banned, error: null };
}
