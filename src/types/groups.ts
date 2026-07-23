export interface Club {
  id: string;
  nombre: string;
  slug: string;
  activo: boolean;
  logo_url: string | null;
  created_at: string;
}

export interface ClubMarketConnection {
  id: string;
  club_origen_id: string;
  club_destino_id: string;
  estado: 'activo' | 'inactivo' | 'pendiente';
  created_by: string | null;
  created_at: string;
}

export interface Deporte {
  id: string;
  club_id: string;
  nombre: string;
  slug: string;
  activo: boolean;
  orden: number;
  created_at: string;
}

export interface Grupo {
  id: string;
  club_id: string;
  deporte_id: string;
  parent_id: string | null;
  nombre: string;
  slug: string;
  activo: boolean;
  orden: number;
  created_at: string;
  children?: Grupo[];
}

export interface GrupoWithDeporte extends Grupo {
  deportes: Deporte;
  parent: Grupo | null;
  children?: Grupo[];
}

export interface DeporteWithGrupos extends Deporte {
  grupos: GrupoWithDeporte[];
}

export interface AdminDivisionPermiso {
  id: string;
  user_id: string;
  grupo_id: string;
  club_id: string;
  created_by: string | null;
  created_at: string;
}
