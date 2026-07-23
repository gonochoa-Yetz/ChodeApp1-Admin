export type NotificationTipo = 'mensaje' | 'invitacion_evento' | 'pago' | 'sistema';

export type NotifAudienceTarget = { type: 'todos' } | { type: 'grupos'; grupoIds: string[] };
