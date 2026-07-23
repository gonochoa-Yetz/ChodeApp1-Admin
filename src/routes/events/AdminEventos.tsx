import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Group, Modal, Stack, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { cancelEvent, deleteEvent, getAllEventsAdmin } from '../../services/eventAdminService';
import type { EventRow } from '../../types/event';

const ESTADO_COLOR: Record<string, string> = {
  activo: 'green',
  cancelado: 'red',
  finalizado: 'gray',
  cerrado: 'blue',
  archivado: 'gray',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMonto(n: number): string {
  return `$${n.toLocaleString('es-AR')}`;
}

export function AdminEventos() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<EventRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadEvents() {
    setLoading(true);
    const { data, error } = await getAllEventsAdmin();
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    setEvents(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function confirmCancel() {
    if (!cancelTarget) return;
    setBusy(true);
    const { error } = await cancelEvent(cancelTarget.id);
    setBusy(false);
    setCancelTarget(null);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: 'Evento cancelado.' });
      loadEvents();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const { error } = await deleteEvent(deleteTarget.id);
    setBusy(false);
    setDeleteTarget(null);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: 'Evento eliminado.' });
      loadEvents();
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Eventos</Title>
        <Button component={Link} to="/eventos/nuevo">
          Nuevo evento
        </Button>
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nombre</Table.Th>
            <Table.Th>Fecha</Table.Th>
            <Table.Th>Precio</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {!loading && events.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center" py="md">
                  No hay eventos todavía.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {events.map((ev) => (
            <Table.Tr key={ev.id}>
              <Table.Td>
                <Text component={Link} to={`/eventos/${ev.id}`} fw={600} c="inherit" td="none">
                  {ev.nombre}
                </Text>
              </Table.Td>
              <Table.Td>{formatDate(ev.fecha)}</Table.Td>
              <Table.Td>{formatMonto(ev.precio)}</Table.Td>
              <Table.Td>
                <Badge color={ESTADO_COLOR[ev.estado] ?? 'gray'} variant="light">
                  {ev.estado}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button size="xs" variant="light" component={Link} to={`/eventos/${ev.id}`}>
                    Gestionar
                  </Button>
                  <Button size="xs" variant="light" component={Link} to={`/eventos/${ev.id}/editar`}>
                    Editar
                  </Button>
                  {ev.estado === 'activo' && (
                    <Button size="xs" color="orange" variant="outline" onClick={() => setCancelTarget(ev)}>
                      Cancelar
                    </Button>
                  )}
                  <Button size="xs" color="red" variant="outline" onClick={() => setDeleteTarget(ev)}>
                    Eliminar
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancelar evento">
        <Stack>
          <Text size="sm">
            ¿Cancelar el evento <strong>{cancelTarget?.nombre}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCancelTarget(null)}>
              Volver
            </Button>
            <Button color="orange" loading={busy} onClick={confirmCancel}>
              Cancelar evento
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar evento">
        <Stack>
          <Text size="sm">
            ¿Eliminar permanentemente el evento <strong>{deleteTarget?.nombre}</strong>? Esto borra también sus inscripciones,
            cuotas y comprobantes. No se puede deshacer.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Volver
            </Button>
            <Button color="red" loading={busy} onClick={confirmDelete}>
              Eliminar definitivamente
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
