import { NavLink as RouterNavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell, Burger, Group, NavLink, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuth } from '../contexts/AuthContext';
import { EnvBadge } from '../components/EnvBadge';

const NAV_ITEMS = [
  { to: '/pagos', label: 'Validar pagos' },
  { to: '/socios', label: 'Socios' },
  { to: '/eventos', label: 'Eventos' },
  { to: '/notificaciones', label: 'Notificaciones' },
  { to: '/fixture', label: 'Fixture y tabla' },
  { to: '/gym', label: 'Rutinas de gym' },
];

const SUPER_ADMIN_NAV_ITEMS = [
  { to: '/grupos', label: 'Grupos' },
  { to: '/grupos/clubes', label: 'Conexiones de clubes' },
  { to: '/market', label: 'Moderación del Market' },
];

export function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [opened, { toggle, close }] = useDisclosure();
  const isSuperAdmin = profile?.role === 'super_admin';

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700}>ChodeApp Admin</Text>
            <EnvBadge />
          </Group>
          <Group>
            <Text size="sm" c="dimmed">
              {profile?.nombre} {profile?.apellido} · {profile?.role}
            </Text>
            <UnstyledButton onClick={handleSignOut}>
              <Text size="sm" c="red">
                Cerrar sesión
              </Text>
            </UnstyledButton>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <ScrollArea>
          <Stack gap={4}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                component={RouterNavLink}
                to={item.to}
                label={item.label}
                active={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
                onClick={close}
              />
            ))}
            {isSuperAdmin && (
              <>
                <Text size="xs" c="dimmed" mt="md" mb={2}>
                  Solo super_admin
                </Text>
                {SUPER_ADMIN_NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    component={RouterNavLink}
                    to={item.to}
                    label={item.label}
                    active={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
                    onClick={close}
                  />
                ))}
              </>
            )}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
