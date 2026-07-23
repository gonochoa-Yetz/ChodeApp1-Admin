export type FixtureSport = 'rugby' | 'hockey';
export type MatchStatus = 'jugado' | 'proximo' | 'pendiente';

export type RugbyCategoria = 'plantel-superior' | 'juveniles';

export type RugbyDivision =
  | 'PS-PRIMERA'
  | 'PS-INTERMEDIA'
  | 'PS-PRE-A'
  | 'PS-PRE-B'
  | 'PS-PRE-C'
  | 'PS-PRE-D'
  | 'PS-PRE-E'
  | 'M19-A'
  | 'M19-B'
  | 'M19-C'
  | 'M17-A'
  | 'M17-B'
  | 'M16-A'
  | 'M16-B'
  | 'M15-A'
  | 'M15-B';

export const RUGBY_DIVISION_LABEL: Record<RugbyDivision, string> = {
  'PS-PRIMERA': 'Primera',
  'PS-INTERMEDIA': 'Intermedia',
  'PS-PRE-A': 'Pre A',
  'PS-PRE-B': 'Pre B',
  'PS-PRE-C': 'Pre C',
  'PS-PRE-D': 'Pre D',
  'PS-PRE-E': 'Pre E',
  'M19-A': 'M19 A',
  'M19-B': 'M19 B',
  'M19-C': 'M19 C',
  'M17-A': 'M17 A',
  'M17-B': 'M17 B',
  'M16-A': 'M16 A',
  'M16-B': 'M16 B',
  'M15-A': 'M15 A',
  'M15-B': 'M15 B',
};

export const RUGBY_CATEGORIA_LABEL: Record<RugbyCategoria, string> = {
  'plantel-superior': 'Plantel Superior',
  juveniles: 'Juveniles',
};

export const RUGBY_TREE: { categoria: RugbyCategoria; divisions: RugbyDivision[] }[] = [
  {
    categoria: 'plantel-superior',
    divisions: ['PS-PRIMERA', 'PS-INTERMEDIA', 'PS-PRE-A', 'PS-PRE-B', 'PS-PRE-C', 'PS-PRE-D', 'PS-PRE-E'],
  },
  {
    categoria: 'juveniles',
    divisions: ['M19-A', 'M19-B', 'M19-C', 'M17-A', 'M17-B', 'M16-A', 'M16-B', 'M15-A', 'M15-B'],
  },
];

export type HockeyDivision = 'PS-G1' | 'PS-G23' | 'M15' | 'M16' | 'M17' | 'M19';

export const HOCKEY_DIVISION_LABEL: Record<HockeyDivision, string> = {
  'PS-G1': 'PS G1',
  'PS-G23': 'PS G2/3',
  M15: 'M15',
  M16: 'M16',
  M17: 'M17',
  M19: 'M19',
};

export const HOCKEY_DIVISIONS: HockeyDivision[] = ['PS-G1', 'PS-G23', 'M15', 'M16', 'M17', 'M19'];

export type FixtureDivision = RugbyDivision | HockeyDivision;

export const FIXTURE_DIVISION_LABEL: Record<FixtureDivision, string> = {
  ...RUGBY_DIVISION_LABEL,
  ...HOCKEY_DIVISION_LABEL,
};

export interface Partido {
  id: string;
  sport: FixtureSport;
  division: FixtureDivision;
  jornada: number;
  fecha: string;
  rival: string;
  condicion: 'local' | 'visitante';
  puntos_favor: number | null;
  puntos_contra: number | null;
  created_by: string | null;
  created_at: string;
}

export interface TablaPosicion {
  id: string;
  sport: FixtureSport;
  division: FixtureDivision;
  equipo: string;
  es_club: boolean;
  pj: number;
  g: number;
  e: number;
  p: number;
  puntos: number;
  posicion: number;
  created_by: string | null;
  updated_at: string;
}
