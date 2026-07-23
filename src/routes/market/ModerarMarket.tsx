import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Group, Modal, Select, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { getAllListingsAdmin, moderateDeleteListing } from '../../services/marketAdminService';
import type { ListingAdmin } from '../../types/market';

const ESTADO_COLOR: Record<string, string> = {
  activo: 'green',
  pausado: 'yellow',
  vendido: 'blue',
  cancelado: 'red',
  expirado: 'gray',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ModerarMarket() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<ListingAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ListingAdmin | null>(null);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await getAllListingsAdmin();
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    setListings(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = listings;
    if (estadoFilter) result = result.filter((l) => l.estado === estadoFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.titulo.toLowerCase().includes(q) ||
          `${l.seller?.nombre ?? ''} ${l.seller?.apellido ?? ''}`.toLowerCase().includes(q)
      );
    }
    return result;
  }, [listings, estadoFilter, search]);

  function openDelete(listing: ListingAdmin) {
    setMotivo('');
    setDeleteTarget(listing);
  }

  async function confirmDelete() {
    if (!deleteTarget || !profile?.id) return;
    if (!motivo.trim()) {
      notifications.show({ color: 'red', message: 'El motivo es requerido.' });
      return;
    }
    setSaving(true);
    const { error } = await moderateDeleteListing(deleteTarget.id, profile.id, motivo.trim());
    setSaving(false);
    setDeleteTarget(null);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: 'Publicación eliminada.' });
      load();
    }
  }

  return (
    <Stack>
      <Title order={2}>Moderación del Market</Title>

      <Group>
        <TextInput placeholder="Buscar por título o vendedor..." value={search} onChange={(e) => setSearch(e.currentTarget.value)} w={300} />
        <Select
          placeholder="Todos los estados"
          data={['activo', 'pausado', 'vendido', 'cancelado', 'expirado']}
          value={estadoFilter}
          onChange={setEstadoFilter}
          clearable
          w={200}
        />
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Título</Table.Th>
            <Table.Th>Vendedor</Table.Th>
            <Table.Th>Tipo</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th>Fecha</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {!loading && filtered.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed" ta="center" py="md">
                  No hay publicaciones.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {filtered.map((l) => (
            <Table.Tr key={l.id}>
              <Table.Td>{l.titulo}</Table.Td>
              <Table.Td>
                {l.seller ? `${l.seller.nombre} ${l.seller.apellido}` : '—'}
                {l.seller?.nickname && (
                  <Text size="xs" c="dimmed">
                    @{l.seller.nickname}
                  </Text>
                )}
              </Table.Td>
              <Table.Td>{l.tipo}</Table.Td>
              <Table.Td>
                <Badge color={ESTADO_COLOR[l.estado] ?? 'gray'} variant="light">
                  {l.estado}
                </Badge>
                {l.motivo_moderacion && (
                  <Text size="xs" c="dimmed">
                    Motivo: {l.motivo_moderacion}
                  </Text>
                )}
              </Table.Td>
              <Table.Td>{formatDate(l.created_at)}</Table.Td>
              <Table.Td>
                {l.estado !== 'cancelado' && (
                  <Button size="xs" color="red" variant="outline" onClick={() => openDelete(l)}>
                    Eliminar
                  </Button>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar publicación">
        <Stack>
          <Text size="sm">
            ¿Eliminar <strong>{deleteTarget?.titulo}</strong> de{' '}
            <strong>
              {deleteTarget?.seller?.nombre} {deleteTarget?.seller?.apellido}
            </strong>
            ?
          </Text>
          <Textarea
            label="Motivo"
            required
            value={motivo}
            onChange={(e) => setMotivo(e.currentTarget.value)}
            placeholder="Ej: contenido inadecuado, publicación duplicada..."
            minRows={3}
          />
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
