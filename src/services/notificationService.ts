import { supabase } from '../lib/supabase';
import { getUserIdsByGrupoIds } from './groupService';
import type { NotifAudienceTarget } from '../types/notification';

export async function getUserIdsByAudienceTarget(
  target: NotifAudienceTarget
): Promise<{ userIds: string[]; error: string | null }> {
  if (target.type === 'todos') {
    const { data, error } = await supabase.from('users').select('id');
    if (error) return { userIds: [], error: error.message };
    return { userIds: (data ?? []).map((u) => u.id as string), error: null };
  }
  return getUserIdsByGrupoIds(target.grupoIds, true);
}

export async function sendBulkNotification(params: {
  userIds: string[];
  titulo: string;
  mensaje: string;
  tipo: 'mensaje' | 'invitacion_evento';
  senderId: string;
  eventoId?: string;
}): Promise<{ error: string | null }> {
  const { userIds, titulo, mensaje, tipo, senderId, eventoId } = params;
  const rows = userIds.map((userId) => ({
    user_id: userId,
    titulo,
    mensaje,
    tipo,
    sender_id: senderId,
    evento_id: eventoId ?? null,
    leida: false,
  }));

  const { error } = await supabase.from('notifications').insert(rows);
  return { error: error?.message ?? null };
}

export async function notifyEventCreated(event: {
  id: string;
  nombre: string;
  grupoIds: string[];
  esAbierto?: boolean;
  senderId: string;
}): Promise<{ error: string | null }> {
  const target: NotifAudienceTarget =
    event.esAbierto || event.grupoIds.length === 0 ? { type: 'todos' } : { type: 'grupos', grupoIds: event.grupoIds };

  const { userIds, error: audienceError } = await getUserIdsByAudienceTarget(target);
  if (audienceError) return { error: audienceError };
  if (userIds.length === 0) return { error: null };

  return sendBulkNotification({
    userIds,
    titulo: 'Nuevo evento disponible',
    mensaje: `Se creó el evento "${event.nombre}". ¡Sumate ahora!`,
    tipo: 'invitacion_evento',
    senderId: event.senderId,
    eventoId: event.id,
  });
}
