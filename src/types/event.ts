export interface EventRow {
  id: string;
  nombre: string;
  descripcion: string | null;
  fecha: string;
  ubicacion: string;
  precio: number;
  categoria: string;
  estado: 'activo' | 'cancelado' | 'finalizado' | 'cerrado' | 'archivado';
  allow_installments?: boolean;
  installments_count?: number;
  created_by: string;
  created_at: string;
  club_id?: string | null;
}

export type EstadoPago = 'sin_pagar' | 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';

export interface EventAttendance {
  id: string;
  event_id: string;
  user_id: string;
  metodo_pago: 'transferencia' | 'efectivo' | null;
  estado_pago: EstadoPago;
  comprobante_url: string | null;
  pago_efectivo_a: string | null;
  validado_por: string | null;
  validado_at: string | null;
  motivo_rechazo: string | null;
  created_at: string;
}

export type InstallmentStatus = 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';

export interface EventInstallment {
  id: string;
  event_id: string;
  user_id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  status: InstallmentStatus;
  metodo_pago: 'transferencia' | 'efectivo' | null;
  comprobante_url: string | null;
  pago_efectivo_a: string | null;
  approved_by: string | null;
  approved_at: string | null;
  motivo_rechazo: string | null;
  created_at: string;
}
