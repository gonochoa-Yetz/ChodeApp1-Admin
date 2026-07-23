import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Same UX-only caveat as RequireAdmin — RLS (`role = 'super_admin'`) is the
// real boundary for groups/multi-club and market-moderation writes.
export function RequireSuperAdmin() {
  const { profile } = useAuth();

  if (profile?.role !== 'super_admin') return <Navigate to="/" replace />;

  return <Outlet />;
}
