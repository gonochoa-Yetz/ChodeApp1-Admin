import { supabase } from '../lib/supabase';
import type { ServiceResult } from './userService';

const COMPROBANTES_BUCKET = 'comprobantes-eventos';

export type PaymentItemType = 'attendance' | 'installment';

export interface PaymentItem {
  itemType: PaymentItemType;
  id: string;
  user_id: string;
  event_id: string;
  estado_pago?: string;
  validado_por?: string | null;
  validado_at?: string | null;
  status?: string;
  installment_number?: number;
  total_installments?: number;
  amount?: number;
  approved_by?: string | null;
  approved_at?: string | null;
  metodo_pago: string | null;
  comprobante_url: string | null;
  pago_efectivo_a: string | null;
  motivo_rechazo: string | null;
  created_at: string;
  events: { id: string; nombre: string; precio: number } | null;
  socio: { nombre: string; apellido: string } | null;
  validador: { nombre: string; apellido: string } | null;
}

export interface EventOption {
  id: string;
  nombre: string;
}

export function getItemStatus(item: PaymentItem): string {
  return item.itemType === 'attendance' ? (item.estado_pago ?? '') : (item.status ?? '');
}

export function getApprovedAt(item: PaymentItem): string | null {
  return item.itemType === 'attendance' ? (item.validado_at ?? null) : (item.approved_at ?? null);
}

export async function getPayments(): Promise<ServiceResult<PaymentItem[]>> {
  const [{ data: attData, error: attError }, { data: instData, error: instError }] = await Promise.all([
    supabase
      .from('event_attendances')
      .select(
        `
        id, user_id, event_id, estado_pago,
        metodo_pago, comprobante_url, pago_efectivo_a,
        validado_por, validado_at, motivo_rechazo, created_at,
        events (id, nombre, precio),
        socio:users!event_attendances_user_id_fkey (nombre, apellido),
        validador:users!event_attendances_validado_por_fkey (nombre, apellido)
      `
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('event_installments')
      .select(
        `
        id, user_id, event_id, installment_number, total_installments, amount, status,
        metodo_pago, comprobante_url, pago_efectivo_a,
        approved_by, approved_at, motivo_rechazo, created_at,
        events (id, nombre, precio),
        socio:users!user_id (nombre, apellido)
      `
      )
      .not('metodo_pago', 'is', null)
      .order('created_at', { ascending: false }),
  ]);

  if (attError) return { data: null, error: attError.message };
  if (instError) return { data: null, error: instError.message };

  const attendanceItems: PaymentItem[] = (attData ?? []).map((item) => ({
    ...(item as unknown as PaymentItem),
    itemType: 'attendance' as const,
  }));
  const installmentItems: PaymentItem[] = (instData ?? []).map((item) => ({
    ...(item as unknown as PaymentItem),
    itemType: 'installment' as const,
  }));

  const merged = [...attendanceItems, ...installmentItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return { data: merged, error: null };
}

export async function getEventOptions(): Promise<ServiceResult<EventOption[]>> {
  const { data, error } = await supabase.from('events').select('id, nombre').order('fecha', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: (data as EventOption[]) ?? [], error: null };
}

async function deleteComprobante(
  pathOrUrl: string,
  table: 'event_attendances' | 'event_installments',
  id: string
): Promise<void> {
  const path = pathOrUrl.startsWith('http')
    ? (() => {
        try {
          const url = new URL(pathOrUrl);
          const match = url.pathname.match(/\/storage\/v1\/object\/sign\/[^/]+\/(.+)/);
          return match ? decodeURIComponent(match[1]) : null;
        } catch {
          return null;
        }
      })()
    : pathOrUrl;

  if (path) await supabase.storage.from(COMPROBANTES_BUCKET).remove([path]);
  await supabase.from(table).update({ comprobante_url: null }).eq('id', id);
}

export async function getComprobanteSignedUrl(pathOrUrl: string): Promise<string> {
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  const { data } = await supabase.storage.from(COMPROBANTES_BUCKET).createSignedUrl(pathOrUrl, 5 * 60);
  return data?.signedUrl ?? pathOrUrl;
}

async function notify(userId: string, titulo: string, mensaje: string, adminId: string): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: userId,
    titulo,
    mensaje,
    tipo: 'pago',
    leida: false,
    sender_id: adminId,
  });
}

export async function approvePayment(payment: PaymentItem, adminId: string): Promise<ServiceResult<null>> {
  const now = new Date().toISOString();
  const table = payment.itemType === 'attendance' ? 'event_attendances' : 'event_installments';
  const patch =
    payment.itemType === 'attendance'
      ? { estado_pago: 'aprobado', validado_por: adminId, validado_at: now }
      : { status: 'aprobado', approved_by: adminId, approved_at: now };

  const { data: updated, error } = await supabase.from(table).update(patch).eq('id', payment.id).select('id');
  if (error) return { data: null, error: error.message };
  if (!updated || updated.length === 0) {
    return { data: null, error: 'No se pudo aprobar. Verificá los permisos (RLS) de tu rol en Supabase.' };
  }

  if (payment.comprobante_url) await deleteComprobante(payment.comprobante_url, table, payment.id);

  const eventName = payment.events?.nombre ?? 'este evento';
  const cuotaLabel =
    payment.itemType === 'installment' ? ` (cuota ${payment.installment_number}/${payment.total_installments})` : '';
  await notify(payment.user_id, 'Pago aprobado', `Tu pago para ${eventName}${cuotaLabel} fue aprobado.`, adminId);

  return { data: null, error: null };
}

export async function rejectPayment(
  payment: PaymentItem,
  adminId: string,
  motivo: string
): Promise<ServiceResult<null>> {
  const now = new Date().toISOString();
  const table = payment.itemType === 'attendance' ? 'event_attendances' : 'event_installments';
  const patch =
    payment.itemType === 'attendance'
      ? { estado_pago: 'rechazado', validado_por: adminId, validado_at: now, motivo_rechazo: motivo || null }
      : { status: 'rechazado', approved_by: adminId, approved_at: now, motivo_rechazo: motivo || null };

  const { data: updated, error } = await supabase.from(table).update(patch).eq('id', payment.id).select('id');
  if (error) return { data: null, error: error.message };
  if (!updated || updated.length === 0) {
    return { data: null, error: 'No se pudo rechazar. Verificá los permisos (RLS) de tu rol en Supabase.' };
  }

  if (payment.comprobante_url) await deleteComprobante(payment.comprobante_url, table, payment.id);

  const eventName = payment.events?.nombre ?? 'este evento';
  const cuotaLabel =
    payment.itemType === 'installment' ? ` (cuota ${payment.installment_number}/${payment.total_installments})` : '';
  const mensaje = motivo
    ? `Tu pago para ${eventName}${cuotaLabel} fue rechazado. Motivo: ${motivo}`
    : `Tu pago para ${eventName}${cuotaLabel} fue rechazado.`;
  await notify(payment.user_id, 'Pago rechazado', mensaje, adminId);

  return { data: null, error: null };
}
