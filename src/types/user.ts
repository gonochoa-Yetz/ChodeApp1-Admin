export type UserRol = 'user' | 'admin_division' | 'super_admin';

export interface User {
  id: string;
  auth_id: string;
  nombre: string;
  apellido: string;
  email: string;
  avatar: string | null;
  nickname?: string | null;
  role: UserRol;
  club_id: string | null;
  // Optional until the Module E migration (market_banned column) lands in Supabase.
  market_banned?: boolean;
}
