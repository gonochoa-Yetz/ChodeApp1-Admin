import { supabase } from '../lib/supabase';
import type { ServiceResult } from './userService';
import type { ClubProductRow, ClubSaleRow } from '../types/clubSale';

const COMPROBANTES_BUCKET = 'comprobantes-eventos';

// ─── Catálogo ───────────────────────────────────────────────────────────────

export async function getAllProductsAdmin(): Promise<ServiceResult<ClubProductRow[]>> {
  const { data, error } = await supabase
    .from('club_products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data as ClubProductRow[]) ?? [], error: null };
}

export async function getActiveProducts(): Promise<ServiceResult<ClubProductRow[]>> {
  const { data, error } = await supabase
    .from('club_products')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data as ClubProductRow[]) ?? [], error: null };
}

export async function createProduct(
  product: Omit<ClubProductRow, 'id' | 'created_at' | 'activo'>
): Promise<ServiceResult<ClubProductRow>> {
  const { data, error } = await supabase.from('club_products').insert(product).select('*').single();
  if (error) return { data: null, error: error.message };
  return { data: data as ClubProductRow, error: null };
}

export async function updateProduct(
  productId: string,
  updates: Pick<ClubProductRow, 'nombre' | 'descripcion' | 'precio'>
): Promise<ServiceResult<ClubProductRow>> {
  const { data, error } = await supabase.from('club_products').update(updates).eq('id', productId).select('*').single();
  if (error) return { data: null, error: error.message };
  return { data: data as ClubProductRow, error: null };
}

export async function setProductActive(productId: string, activo: boolean): Promise<ServiceResult<ClubProductRow>> {
  const { data, error } = await supabase.from('club_products').update({ activo }).eq('id', productId).select('*').single();
  if (error) return { data: null, error: error.message };
  return { data: data as ClubProductRow, error: null };
}

// ─── Venta masiva ───────────────────────────────────────────────────────────

export async function createSalesForUsers(
  product: ClubProductRow,
  userIds: string[],
  cantidad: number,
  clubId: string | null,
  createdBy: string
): Promise<ServiceResult<ClubSaleRow[]>> {
  if (userIds.length === 0) return { data: [], error: null };
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return { data: null, error: 'La cantidad debe ser un número entero mayor o igual a 1.' };
  }

  const rows = userIds.map((user_id) => ({
    club_id: clubId,
    product_id: product.id,
    user_id,
    producto_nombre: product.nombre,
    cantidad,
    precio_unitario: product.precio,
    precio: product.precio * cantidad,
    metodo_pago: null,
    estado_pago: 'sin_pagar' as const,
    created_by: createdBy,
  }));

  const { data, error } = await supabase.from('club_sales').insert(rows).select('*');
  if (error) return { data: null, error: error.message };
  return { data: (data as ClubSaleRow[]) ?? [], error: null };
}

// ─── Gestión y validación ───────────────────────────────────────────────────

export type SaleDisplayStatus = 'Pendiente' | 'En revisión' | 'Pagado' | 'Rechazado';

export type SaleWithUser = ClubSaleRow & {
  users: { nombre: string; apellido: string; email: string } | null;
};

export function computeSaleDisplayStatus(estadoPago: ClubSaleRow['estado_pago']): SaleDisplayStatus {
  switch (estadoPago) {
    case 'aprobado':
      return 'Pagado';
    case 'en_revision':
      return 'En revisión';
    case 'rechazado':
      return 'Rechazado';
    default:
      return 'Pendiente';
  }
}

export async function getSalesAdmin(): Promise<ServiceResult<SaleWithUser[]>> {
  const { data, error } = await supabase
    .from('club_sales')
    .select('*, users:user_id (nombre, apellido, email)')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data as SaleWithUser[]) ?? [], error: null };
}

export async function validatePayment(
  saleId: string,
  adminId: string,
  approved: boolean,
  motivoRechazo?: string
): Promise<ServiceResult<ClubSaleRow>> {
  const nowIso = new Date().toISOString();
  const payload = approved
    ? { estado_pago: 'aprobado' as const, validado_por: adminId, validado_at: nowIso }
    : { estado_pago: 'rechazado' as const, validado_por: adminId, validado_at: nowIso, motivo_rechazo: motivoRechazo ?? null };

  const { data, error } = await supabase
    .from('club_sales')
    .update(payload)
    .eq('id', saleId)
    .eq('estado_pago', 'en_revision')
    .select('*')
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: 'La venta ya fue procesada por otro administrador o no está en revisión.' };
  return { data: data as ClubSaleRow, error: null };
}

export async function deleteSale(saleId: string): Promise<ServiceResult<null>> {
  const { data: sale } = await supabase.from('club_sales').select('comprobante_url').eq('id', saleId).maybeSingle();

  if (sale?.comprobante_url && !sale.comprobante_url.startsWith('http')) {
    await supabase.storage.from(COMPROBANTES_BUCKET).remove([sale.comprobante_url]);
  }

  const { error } = await supabase.from('club_sales').delete().eq('id', saleId);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export async function resolveComprobanteUrl(pathOrUrl: string): Promise<string> {
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  const { data } = await supabase.storage.from(COMPROBANTES_BUCKET).createSignedUrl(pathOrUrl, 5 * 60);
  return data?.signedUrl ?? pathOrUrl;
}
