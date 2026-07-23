import { Navigate, Outlet } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { useAuth } from '../../contexts/AuthContext';

// UX-only gate. The real security boundary is Postgres RLS (`role <> 'user'`
// on every admin-write policy) — a bug here can at most show the wrong UI,
// it can never grant a write Supabase itself would reject.
export function RequireAdmin() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (!profile || profile.role === 'user') return <Navigate to="/login" replace />;

  return <Outlet />;
}
