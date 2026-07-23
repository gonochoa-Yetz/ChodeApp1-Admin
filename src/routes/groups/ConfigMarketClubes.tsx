import { useEffect, useState } from 'react';
import { Badge, Button, Group, Modal, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { createMarketConnection, deleteMarketConnection, getClubMarketConnections, updateMarketConnectionEstado } from '../../services/clubService';
import type { Club, ClubMarketConnection } from '../../types/groups';

type ConnectionWithClub = ClubMarketConnection & { club_destino: Club };

export function ConfigMarketClubes() {
  const { profile } = useAuth();
  const [connections, setConnections] = useState<ConnectionWithClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  const [slugInput, setSlugInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConnectionWithClub | null>(null);

  async function load() {
    if (!profile?.club_id) return;
    setLoading(true);
    const { data, error } = await getClubMarketConnections(profile.club_id);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    setConnections(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.club_id]);

  async function confirmConnect() {
    if (!profile?.club_id || !profile.id || !slugInput.trim()) return;
    setSaving(true);
    const { error } = await createMarketConnection(profile.club_id, slugInput.trim(), profile.id);
    setSaving(false);
    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      return;
    }
    setConnectOpen(false);
    setSlugInput('');
    notifications.show({ color: 'green', message: 'Conexión creada.' });
    load();
  }

  async function toggleEstado(conn: ConnectionWithClub) {
    const next = conn.estado === 'activo' ? 'inactivo' : 'activo';
    setSaving(true);
    const { error } = await updateMarketConnectionEstado(conn.id, next);
    setSaving(false);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: 'Conexión actualizada.' });
      load();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const { error } = await deleteMarketConnection(deleteTarget.id);
    setSaving(false);
    setDeleteTarget(null);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: 'Conexión eliminada.' });
      load();
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Conexiones de Market entre clubes</Title>
        <Button onClick={() => setConnectOpen(true)}>Conectar club</Button>
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Club</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {!loading && connections.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={3}>
                <Text c="dimmed" ta="center" py="md">
                  Sin conexiones con otros clubes todavía.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {connections.map((c) => (
            <Table.Tr key={c.id}>
              <Table.Td>{c.club_destino?.nombre ?? '—'}</Table.Td>
              <Table.Td>
                <Badge color={c.estado === 'activo' ? 'green' : 'gray'} variant="light">
                  {c.estado}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button size="xs" variant="light" loading={saving} onClick={() => toggleEstado(c)}>
                    {c.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button size="xs" color="red" variant="outline" onClick={() => setDeleteTarget(c)}>
                    Eliminar
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={connectOpen} onClose={() => setConnectOpen(false)} title="Conectar club">
        <Stack>
          <TextInput label="Slug del club destino" value={slugInput} onChange={(e) => setSlugInput(e.currentTarget.value)} placeholder="ej: club-otro" />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConnectOpen(false)}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={confirmConnect}>
              Conectar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar conexión">
        <Stack>
          <Text size="sm">
            ¿Eliminar la conexión con <strong>{deleteTarget?.club_destino?.nombre}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button color="red" loading={saving} onClick={confirmDelete}>
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
