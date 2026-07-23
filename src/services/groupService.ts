import { supabase } from '../lib/supabase';
import type { ServiceResult } from './userService';
import type { Deporte, DeporteWithGrupos, Grupo, GrupoWithDeporte } from '../types/groups';

export async function getDeportes(clubId?: string): Promise<ServiceResult<Deporte[]>> {
  let query = supabase.from('deportes').select('*').eq('activo', true).order('orden');
  if (clubId) query = query.eq('club_id', clubId);
  const { data, error } = await query;
  return { data: (data as Deporte[]) ?? null, error: error?.message ?? null };
}

export async function getGrupos(deporteId?: string): Promise<ServiceResult<GrupoWithDeporte[]>> {
  let query = supabase.from('grupos').select('*, deportes(*), parent:parent_id(*)').eq('activo', true).order('orden');
  if (deporteId) query = query.eq('deporte_id', deporteId);
  const { data, error } = await query;
  return { data: data as GrupoWithDeporte[] | null, error: error?.message ?? null };
}

export async function getGrupoTree(clubId?: string): Promise<ServiceResult<DeporteWithGrupos[]>> {
  const { data: deportes, error: deportesError } = await getDeportes(clubId);
  if (deportesError || !deportes) return { data: null, error: deportesError };

  const { data: grupos, error: gruposError } = await getGrupos();
  if (gruposError || !grupos) return { data: null, error: gruposError };

  const tree: DeporteWithGrupos[] = deportes.map((deporte) => {
    const deporteGrupos = grupos.filter((g) => g.deporte_id === deporte.id);
    const topLevel = deporteGrupos.filter((g) => g.parent_id === null);
    const withChildren: GrupoWithDeporte[] = topLevel.map((g) => ({
      ...g,
      children: deporteGrupos.filter((child) => child.parent_id === g.id),
    }));
    return { ...deporte, grupos: withChildren };
  });

  return { data: tree, error: null };
}

export async function getUserIdsByGrupoIds(
  grupoIds: string[],
  includeChildren = true
): Promise<{ userIds: string[]; error: string | null }> {
  let resolvedIds = [...grupoIds];

  if (includeChildren && grupoIds.length > 0) {
    const { data: children, error } = await supabase.from('grupos').select('id').in('parent_id', grupoIds);
    if (error) return { userIds: [], error: error.message };
    if (children) {
      const childIds = children.map((c) => c.id);
      resolvedIds = [...new Set([...resolvedIds, ...childIds])];
    }
  }

  const { data, error } = await supabase
    .from('memberships')
    .select('user_id')
    .in('grupo_id', resolvedIds)
    .eq('estado', 'activo');

  if (error) return { userIds: [], error: error.message };
  const userIds = [...new Set((data ?? []).map((m) => m.user_id))];
  return { userIds, error: null };
}

export async function getAdminDivisionGrupos(userId: string): Promise<ServiceResult<Grupo[]>> {
  const { data, error } = await supabase
    .from('admin_division_permisos')
    .select('grupo_id, grupos(*)')
    .eq('user_id', userId);

  if (error) return { data: null, error: error.message };
  const grupos = (data ?? []).map((row) => (row as unknown as { grupos: Grupo }).grupos).filter(Boolean);
  return { data: grupos, error: null };
}

export async function createGrupo(params: {
  club_id: string;
  deporte_id: string;
  parent_id?: string | null;
  nombre: string;
  slug: string;
  orden?: number;
}): Promise<ServiceResult<Grupo>> {
  const { data, error } = await supabase
    .from('grupos')
    .insert({ ...params, activo: true, orden: params.orden ?? 0 })
    .select()
    .single();
  return { data: data as Grupo | null, error: error?.message ?? null };
}

export async function updateGrupo(
  id: string,
  params: Partial<Pick<Grupo, 'nombre' | 'slug' | 'activo' | 'orden'>>
): Promise<ServiceResult<Grupo>> {
  const { data, error } = await supabase.from('grupos').update(params).eq('id', id).select().single();
  return { data: data as Grupo | null, error: error?.message ?? null };
}

export async function setAdminDivisionGrupos(
  userId: string,
  grupoIds: string[],
  clubId: string,
  createdBy: string
): Promise<{ error: string | null }> {
  const { error: deleteError } = await supabase.from('admin_division_permisos').delete().eq('user_id', userId);
  if (deleteError) return { error: deleteError.message };
  if (grupoIds.length === 0) return { error: null };

  const rows = grupoIds.map((grupo_id) => ({ user_id: userId, grupo_id, club_id: clubId, created_by: createdBy }));
  const { error } = await supabase.from('admin_division_permisos').insert(rows);
  return { error: error?.message ?? null };
}
