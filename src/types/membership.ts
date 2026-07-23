export type MembershipEstado = 'activo' | 'inactivo' | 'pendiente';
export type TipoMembresia = 'Socio Rugby' | 'Socio Hockey';

export interface Membership {
  id: string;
  user_id: string;
  club_id: string | null;
  numero_socio: number;
  division: string;
  tipo_membresia: TipoMembresia | string;
  anio_ingreso: number;
  estado: MembershipEstado;
  grupo_id: string | null;
  deporte_id: string | null;
}

export const ESTADO_OPTIONS: { label: string; value: MembershipEstado }[] = [
  { label: 'Activo', value: 'activo' },
  { label: 'Inactivo', value: 'inactivo' },
  { label: 'Pendiente', value: 'pendiente' },
];

export const ESTADO_META: Record<MembershipEstado, { label: string; color: string }> = {
  activo: { label: 'Activo', color: 'green' },
  inactivo: { label: 'Inactivo', color: 'red' },
  pendiente: { label: 'Pendiente', color: 'yellow' },
};

export function getEstadoMeta(estado?: MembershipEstado | string | null) {
  if (estado && estado in ESTADO_META) return ESTADO_META[estado as MembershipEstado];
  return { label: '—', color: 'gray' };
}

export const TIPO_MEMBRESIA_OPTIONS = [
  { label: 'Socio Rugby', value: 'Socio Rugby' },
  { label: 'Socio Hockey', value: 'Socio Hockey' },
];
