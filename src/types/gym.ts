export type RutinaSport = 'rugby' | 'hockey' | 'general';
export type RutinaDivision = 'PS' | 'M15' | 'M16' | 'M17' | 'M19' | 'general';

export interface Rutina {
  id: string;
  nombre: string;
  descripcion: string | null;
  fecha: string | null;
  pdf_path: string;
  sport: RutinaSport;
  division: RutinaDivision;
  created_by: string | null;
  created_at: string;
}

export const RUTINA_DIVISION_OPTIONS: { value: RutinaDivision; label: string }[] = [
  { value: 'PS', label: 'Plantel Superior' },
  { value: 'M15', label: 'M15' },
  { value: 'M16', label: 'M16' },
  { value: 'M17', label: 'M17' },
  { value: 'M19', label: 'M19' },
  { value: 'general', label: 'General' },
];

export const RUTINA_SPORT_OPTIONS: { value: RutinaSport; label: string }[] = [
  { value: 'rugby', label: 'Rugby' },
  { value: 'hockey', label: 'Hockey' },
  { value: 'general', label: 'General' },
];
