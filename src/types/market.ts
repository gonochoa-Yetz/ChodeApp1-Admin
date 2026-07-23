export type ListingType = 'venta_fija' | 'subasta' | 'servicio' | 'trabajo' | 'disponible';
export type ListingStatus = 'activo' | 'pausado' | 'vendido' | 'cancelado' | 'expirado';

export interface ListingAdmin {
  id: string;
  seller_id: string;
  tipo: ListingType;
  titulo: string;
  categoria: string;
  precio: number | null;
  moneda: string;
  estado: ListingStatus;
  created_at: string;
  moderado_por: string | null;
  moderado_at: string | null;
  motivo_moderacion: string | null;
  seller: { nombre: string; apellido: string; nickname: string | null } | null;
}
