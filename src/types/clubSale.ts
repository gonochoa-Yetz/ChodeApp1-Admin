export interface ClubProductRow {
  id: string;
  club_id: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number;
  activo: boolean;
  created_by: string | null;
  created_at: string;
}

export type ClubSalePaymentStatus = 'sin_pagar' | 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';

export interface ClubSaleRow {
  id: string;
  club_id: string | null;
  product_id: string | null;
  user_id: string;
  producto_nombre: string;
  precio: number;
  metodo_pago: 'transferencia' | 'efectivo' | null;
  estado_pago: ClubSalePaymentStatus;
  comprobante_url: string | null;
  pago_efectivo_a: string | null;
  validado_por: string | null;
  validado_at: string | null;
  motivo_rechazo: string | null;
  created_by: string | null;
  created_at: string;
}
