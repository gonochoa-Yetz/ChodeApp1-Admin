import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Group, Loader, Modal, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  addEventParticipant,
  getEventById,
  getEventParticipantsAdmin,
  removeEventParticipant,
  type ParticipantDetail,
} from '../../services/eventAdminService';
import { searchUsers } from '../../services/userService';
import type { EventRow } from '../../types/event';
import type { User } from '../../types/user';

const STATUS_COLOR: Record<string, string> = {
  Pagado: 'green',
  Parcial: 'yellow',
  'En revisión': 'blue',
  Rechazado: 'red',
  Pendiente: 'gray',
};

export function GestionarEvento() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ParticipantDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    const [{ data: eventData }, { data: participantsData, error }] = await Promise.all([
      getEventById(id),
      getEventParticipantsAdmin(id),
    ]);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    setEvent(eventData);
    setParticipants(participantsData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!userSearch.trim()) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(userSearch).then(({ data }) => setUserResults(data ?? []));
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const filtered = useMemo(() => {
    let result = participants;
    if (statusFilter) result = result.filter((p) => p.displayStatus === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) => `${p.nombre} ${p.apellido}`.toLowerCase().includes(q));
    }
    return result;
  }, [participants, statusFilter, search]);

  async function confirmRemove() {
    if (!removeTarget || !id) return;
    setBusy(true);
    const { error } = await removeEventParticipant(removeTarget.attendanceId, id, removeTarget.userId);
    setBusy(false);
    setRemoveTarget(null);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: 'Participante eliminado.' });
      loadData();
    }
  }

  async function handleAddUser(user: User) {
    if (!id) return;
    setAddingUserId(user.id);
    const { error } = await addEventParticipant(id, user.id);
    setAddingUserId(null);
    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      return;
    }
    notifications.show({ color: 'green', message: `${user.nombre} ${user.apellido} agregado.` });
    setAddModalOpen(false);
    setUserSearch('');
    setUserResults([]);
    loadData();
  }

  if (loading) return <Loader />;
  if (!event) return <Text c="dimmed">No se pudo cargar el evento.</Text>;

  return (
    <Stack>
      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={2}>{event.nombre}</Title>
          <Text size="sm" c="dimmed">
            {new Date(event.fecha).toLocaleDateString('es-AR')} · ${event.precio.toLocaleString('es-AR')}
          </Text>
        </Stack>
        <Group>
          <Button component={Link} to={`/pagos?event=${event.id}`} variant="light">
            Validar pagos de este evento
          </Button>
          <Button onClick={() => setAddModalOpen(true)}>Agregar participante</Button>
        </Group>
      </Group>

      <Group>
        <TextInput placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.currentTarget.value)} w={280} />
        <Select
          placeholder="Todos los estados"
          data={['Pagado', 'Parcial', 'En revisión', 'Rechazado', 'Pendiente']}
          value={statusFilter}
          onChange={setStatusFilter}
          clearable
          w={220}
        />
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Socio</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th>Cuotas</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filtered.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center" py="md">
                  No hay participantes.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {filtered.map((p) => (
            <Table.Tr key={p.attendanceId}>
              <Table.Td>
                {p.nombre} {p.apellido}
              </Table.Td>
              <Table.Td>{p.email}</Table.Td>
              <Table.Td>
                <Badge color={STATUS_COLOR[p.displayStatus] ?? 'gray'} variant="light">
                  {p.displayStatus}
                </Badge>
              </Table.Td>
              <Table.Td>{p.hasInstallments ? `${p.paidInstallments}/${p.totalInstallments}` : '—'}</Table.Td>
              <Table.Td>
                <Button size="xs" color="red" variant="outline" onClick={() => setRemoveTarget(p)}>
                  Quitar
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Quitar participante">
        <Stack>
          <Text size="sm">
            ¿Quitar a <strong>{removeTarget?.nombre} {removeTarget?.apellido}</strong> de este evento? Se borran también sus cuotas.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRemoveTarget(null)}>
              Cancelar
            </Button>
            <Button color="red" loading={busy} onClick={confirmRemove}>
              Quitar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={addModalOpen} onClose={() => setAddModalOpen(false)} title="Agregar participante">
        <Stack>
          <TextInput
            placeholder="Buscar por nombre, apellido o email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.currentTarget.value)}
          />
          <Stack gap="xs">
            {userResults.map((u) => (
              <Group key={u.id} justify="space-between">
                <Text size="sm">
                  {u.nombre} {u.apellido}
                </Text>
                <Button size="xs" loading={addingUserId === u.id} onClick={() => handleAddUser(u)}>
                  Agregar
                </Button>
              </Group>
            ))}
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
}
