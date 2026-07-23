import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import { signIn } from '../services/authService';
import { EnvBadge } from '../components/EnvBadge';

export function LoginPage() {
  const { session, profile, loading, profileError, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session && profile) {
    if (profile.role === 'user') {
      return (
        <Center h="100vh">
          <Alert color="red" title="Sin acceso">
            Tu usuario no tiene permisos de administrador.
          </Alert>
        </Center>
      );
    }
    return <Navigate to="/" replace />;
  }

  if (!loading && session && !profile) {
    return (
      <Center h="100vh">
        <Paper withBorder shadow="sm" p="xl" radius="md" w={420}>
          <Stack gap="md">
            <Alert color="red" title="No se pudo cargar tu perfil">
              <Text size="sm">
                El login funcionó, pero hubo un error al leer tu perfil de administrador desde la base de datos:
              </Text>
              <Text size="sm" ff="monospace" mt="xs">
                {profileError}
              </Text>
            </Alert>
            <Button variant="light" onClick={() => signOut()}>
              Volver al login
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } catch {
      setError('No se pudo conectar con el servidor. Revisá tu conexión a internet (o VPN/firewall) e intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Center h="100vh">
      <Paper withBorder shadow="sm" p="xl" radius="md" w={360}>
        <Stack gap="md">
          <Stack gap="xs" align="center">
            <Title order={3}>ChodeApp Admin</Title>
            <EnvBadge />
          </Stack>
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />
              <PasswordInput
                label="Contraseña"
                required
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
              {error && (
                <Alert color="red" title="Error al iniciar sesión">
                  {error}
                </Alert>
              )}
              <Button type="submit" loading={submitting} fullWidth mt="sm">
                Ingresar
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Center>
  );
}
