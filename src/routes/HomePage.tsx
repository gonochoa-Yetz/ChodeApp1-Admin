import { Stack, Text, Title } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';

export function HomePage() {
  const { profile } = useAuth();
  return (
    <Stack>
      <Title order={2}>Hola, {profile?.nombre}</Title>
      <Text c="dimmed">Elegí una sección en el menú de la izquierda.</Text>
    </Stack>
  );
}
