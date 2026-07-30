import { supabase } from '../lib/supabase';
import type { ServiceResult } from './userService';
import type { EventAttendance, EventInstallment, EventRow } from '../types/event';

const COMPROBANTES_BUCKET = 'comprobantes-eventos';

export async function getAllEventsAdmin(): Promise<ServiceResult<EventRow[]>> {
  const { data, error } = await supabase.from('events').select('*').order('fecha', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: (data as EventRow[]) ?? [], error: null };
}

export async function getEventById(eventId: string): Promise<ServiceResult<EventRow>> {
  const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
  if (error) return { data: null, error: error.message };
  return { data: data as EventRow, error: null };
}

export async function createEventWithGrupos(
  event: Omit<EventRow, 'id' | 'created_at' | 'estado'>,
  grupoIds: string[],
  esAbierto: boolean
): Promise<ServiceResult<EventRow>> {
  const { data: createdEvent, error: createError } = await supabase.from('events').insert(event).select('*').single();
  if (createError || !createdEvent) return { data: null, error: createError?.message ?? 'Error al crear el evento' };

  const eventId = (createdEvent as EventRow).id;

  if (esAbierto) {
    const { error } = await supabase.from('event_grupos').insert({ event_id: eventId, grupo_id: null });
    if (error) return { data: null, error: error.message };
  } else if (grupoIds.length > 0) {
    const rows = grupoIds.map((grupo_id) => ({ event_id: eventId, grupo_id }));
    const { error } = await supabase.from('event_grupos').insert(rows);
    if (error) return { data: null, error: error.message };
  }

  return { data: createdEvent as EventRow, error: null };
}

export async function updateEvent(
  eventId: string,
  updates: Pick<EventRow, 'nombre' | 'descripcion' | 'fecha' | 'ubicacion' | 'precio' | 'categoria'>
): Promise<ServiceResult<EventRow>> {
  const { data, error } = await supabase.from('events').update(updates).eq('id', eventId).select('*').single();
  if (error) return { data: null, error: error.message };
  return { data: data as EventRow, error: null };
}

export async function cancelEvent(eventId: string): Promise<ServiceResult<EventRow>> {
  const { data, error } = await supabase.from('events').update({ estado: 'cancelado' }).eq('id', eventId).select('*').single();
  if (error) return { data: null, error: error.message };
  return { data: data as EventRow, error: null };
}

export async function closeEvent(eventId: string): Promise<ServiceResult<EventRow>> {
  const { data, error } = await supabase.from('events').update({ estado: 'cerrado' }).eq('id', eventId).select('*').single();
  if (error) return { data: null, error: error.message };
  return { data: data as EventRow, error: null };
}

export async function archiveEvent(eventId: string): Promise<ServiceResult<EventRow>> {
  const { data, error } = await supabase.from('events').update({ estado: 'archivado' }).eq('id', eventId).select('*').single();
  if (error) return { data: null, error: error.message };
  return { data: data as EventRow, error: null };
}

export async function deleteEvent(eventId: string): Promise<ServiceResult<null>> {
  const [attendances, installments] = await Promise.all([
    supabase.from('event_attendances').select('comprobante_url').eq('event_id', eventId),
    supabase.from('event_installments').select('comprobante_url').eq('event_id', eventId),
  ]);

  const paths = [...(attendances.data ?? []), ...(installments.data ?? [])]
    .map((r) => r.comprobante_url)
    .filter((p): p is string => !!p && !p.startsWith('http'));

  if (paths.length > 0) await supabase.storage.from(COMPROBANTES_BUCKET).remove(paths);

  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// ─── Participantes ────────────────────────────────────────────────────────────

export type ParticipantDisplayStatus = 'Pagado' | 'Parcial' | 'En revisión' | 'Rechazado' | 'Pendiente';

export interface ParticipantDetail {
  attendanceId: string;
  userId: string;
  nombre: string;
  apellido: string;
  email: string;
  estadoPago: EventAttendance['estado_pago'];
  metodoPago: 'transferencia' | 'efectivo' | null;
  hasInstallments: boolean;
  totalInstallments: number;
  paidInstallments: number;
  displayStatus: ParticipantDisplayStatus;
  createdAt: string;
  montoTotal: number;
  montoPagado: number;
  montoAdeudado: number;
}

function computeDisplayStatus(
  estadoPago: EventAttendance['estado_pago'],
  userInstallments: EventInstallment[]
): ParticipantDisplayStatus {
  if (userInstallments.length > 0) {
    const total = userInstallments.length;
    const approved = userInstallments.filter((i) => i.status === 'aprobado').length;
    const inReview = userInstallments.filter((i) => i.status === 'en_revision').length;
    const rejected = userInstallments.filter((i) => i.status === 'rechazado').length;
    if (approved === total) return 'Pagado';
    if (approved > 0) return 'Parcial';
    if (inReview > 0) return 'En revisión';
    if (rejected > 0) return 'Rechazado';
    return 'Pendiente';
  }
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

export async function getEventParticipantsAdmin(eventId: string): Promise<ServiceResult<ParticipantDetail[]>> {
  const [{ data: eventRow, error: eventErr }, { data: attendances, error: attErr }, { data: installments, error: instErr }] =
    await Promise.all([
      supabase.from('events').select('precio').eq('id', eventId).single(),
      supabase
        .from('event_attendances')
        .select('*, users:user_id (nombre, apellido, email)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true }),
      supabase.from('event_installments').select('*').eq('event_id', eventId),
    ]);

  if (eventErr) return { data: null, error: eventErr.message };
  if (attErr) return { data: null, error: attErr.message };
  if (instErr) return { data: null, error: instErr.message };

  const precioEvento = (eventRow as { precio: number } | null)?.precio ?? 0;

  const installmentsByUser: Record<string, EventInstallment[]> = {};
  for (const inst of (installments ?? []) as EventInstallment[]) {
    if (!installmentsByUser[inst.user_id]) installmentsByUser[inst.user_id] = [];
    installmentsByUser[inst.user_id].push(inst);
  }

  type AttendanceRow = EventAttendance & { users: { nombre: string; apellido: string; email: string } | null };

  const result: ParticipantDetail[] = ((attendances ?? []) as AttendanceRow[]).map((att) => {
    const userInsts = installmentsByUser[att.user_id] ?? [];
    const montoTotal = userInsts.length > 0 ? userInsts.reduce((sum, i) => sum + i.amount, 0) : precioEvento;
    const montoPagado =
      userInsts.length > 0
        ? userInsts.filter((i) => i.status === 'aprobado').reduce((sum, i) => sum + i.amount, 0)
        : att.estado_pago === 'aprobado'
          ? precioEvento
          : 0;
    return {
      attendanceId: att.id,
      userId: att.user_id,
      nombre: att.users?.nombre ?? 'Desconocido',
      apellido: att.users?.apellido ?? '',
      email: att.users?.email ?? '',
      estadoPago: att.estado_pago,
      metodoPago: att.metodo_pago,
      hasInstallments: userInsts.length > 0,
      totalInstallments: userInsts.length,
      paidInstallments: userInsts.filter((i) => i.status === 'aprobado').length,
      displayStatus: computeDisplayStatus(att.estado_pago, userInsts),
      createdAt: att.created_at,
      montoTotal,
      montoPagado,
      montoAdeudado: montoTotal - montoPagado,
    };
  });

  return { data: result, error: null };
}

export async function removeEventParticipant(attendanceId: string, eventId: string, userId: string): Promise<ServiceResult<null>> {
  const { error: instErr } = await supabase.from('event_installments').delete().eq('event_id', eventId).eq('user_id', userId);
  if (instErr) return { data: null, error: instErr.message };

  const { error: attErr } = await supabase.from('event_attendances').delete().eq('id', attendanceId);
  if (attErr) return { data: null, error: attErr.message };
  return { data: null, error: null };
}

export async function addEventParticipant(eventId: string, userId: string): Promise<ServiceResult<EventAttendance>> {
  const { data, error } = await supabase
    .from('event_attendances')
    .insert({ event_id: eventId, user_id: userId, metodo_pago: null, estado_pago: 'sin_pagar' })
    .select('*')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as EventAttendance, error: null };
}
