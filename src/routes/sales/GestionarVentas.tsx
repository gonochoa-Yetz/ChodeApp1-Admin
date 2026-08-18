import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Group, Loader, Modal, Select, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';
import {
  type SaleDisplayStatus,
  type SaleWithUser,
  computeSaleDisplayStatus,
  deleteSale,
  getSalesAdmin,
  resolveComprobanteUrl,
  validatePayment,
} from '../../services/clubSalesAdminService';

const STATUS_COLOR: Record<SaleDisplayStatus, string> = {
  Pagado: 'green',
  'En revisión': 'yellow',
  Pendiente: 'gray',
  Rechazado: 'red',
};

function fullName(s: SaleWithUser): string {
  if (!s.users) return 'Desconocido';
  return `${s.users.nombre} ${s.users.apellido}`.trim();
}

export function GestionarVentas() {
  const { profile } = useAuth();
  const [sales, setSales] = useState<SaleWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SaleWithUser | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SaleWithUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadData() {
    setLoading(true);
    const { data, error } = await getSalesAdmin();
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    setSales(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let result = sales;
    if (statusFilter) result = result.filter((s) => computeSaleDisplayStatus(s.estado_pago) === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((s) => fullName(s).toLowerCase().includes(q) || s.producto_nombre.toLowerCase().includes(q));
    }
    return result;
  }, [sales, statusFilter, search]);

  async function handleApprove(sale: SaleWithUser) {
    if (!profile?.id) return;
    setBusy(true);
    const { error } = await validatePayment(sale.id, profile.id, true);
    setBusy(false);
    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      return;
    }
    notifications.show({ color: 'green', message: 'Pago aprobado.' });
    loadData();
  }

  async function confirmReject() {
    if (!rejectTarget || !profile?.id) return;
    setBusy(true);
    const { error } = await validatePayment(rejectTarget.id, profile.id, false, rejectReason || undefined);
    setBusy(false);
    setRejectTarget(null);
    setRejectReason('');
    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      return;
    }
    notifications.show({ color: 'green', message: 'Pago rechazado.' });
    loadData();
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setBusy(true);
    const { error } = await deleteSale(removeTarget.id);
    setBusy(false);
    setRemoveTarget(null);
    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      return;
    }
    notifications.show({ color: 'green', message: 'Venta anulada.' });
    loadData();
  }

  async function handleViewComprobante(url: string) {
    const resolved = await resolveComprobanteUrl(url);
    window.open(resolved, '_blank');
  }

  if (loading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Ventas del club</Title>
        <Group>
          <Button component={Link} to="/ventas/productos" variant="light">
            Productos
          </Button>
          <Button component={Link} to="/ventas/nueva">
            Nueva venta
          </Button>
        </Group>
      </Group>

      <Group>
        <TextInput
          placeholder="Buscar por jugador o producto..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={280}
        />
        <Select
          placeholder="Todos los estados"
          data={['Pendiente', 'En revisión', 'Pagado', 'Rechazado']}
          value={statusFilter}
          onChange={setStatusFilter}
          clearable
          w={220}
        />
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Jugador</Table.Th>
            <Table.Th>Producto</Table.Th>
            <Table.Th>Precio</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th>Comprobante</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filtered.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed" ta="center" py="md">
                  {sales.length === 0 ? 'Todavía no se cargó ninguna venta.' : 'Sin resultados para los filtros aplicados.'}
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {filtered.map((s) => {
            const displayStatus = computeSaleDisplayStatus(s.estado_pago);
            return (
              <Table.Tr key={s.id}>
                <Table.Td>{fullName(s)}</Table.Td>
                <Table.Td>
                  {s.producto_nombre}
                  {s.cantidad > 1 && (
                    <Text size="xs" c="dimmed">
                      ×{s.cantidad}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  ${s.precio.toLocaleString('es-AR')}
                  {s.cantidad > 1 && (
                    <Text size="xs" c="dimmed">
                      ${s.precio_unitario.toLocaleString('es-AR')} c/u
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Stack gap={2}>
                    <Badge color={STATUS_COLOR[displayStatus]} variant="light">
                      {displayStatus}
                    </Badge>
                    {displayStatus === 'Rechazado' && s.motivo_rechazo ? (
                      <Text size="xs" c="dimmed">
                        {s.motivo_rechazo}
                      </Text>
                    ) : null}
                  </Stack>
                </Table.Td>
                <Table.Td>
                  {s.comprobante_url ? (
                    <Button size="xs" variant="subtle" onClick={() => handleViewComprobante(s.comprobante_url!)}>
                      Ver
                    </Button>
                  ) : (
                    '—'
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {s.estado_pago === 'en_revision' && (
                      <>
                        <Button size="xs" color="green" onClick={() => handleApprove(s)}>
                          Aprobar
                        </Button>
                        <Button size="xs" color="red" variant="outline" onClick={() => setRejectTarget(s)}>
                          Rechazar
                        </Button>
                      </>
                    )}
                    <Button size="xs" color="red" variant="subtle" onClick={() => setRemoveTarget(s)}>
                      Anular
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      <Modal opened={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Anular venta">
        <Stack>
          <Text size="sm">
            ¿Anular "{removeTarget?.producto_nombre}" de <strong>{removeTarget ? fullName(removeTarget) : ''}</strong>? Se
            eliminará el cargo por completo.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRemoveTarget(null)}>
              Cancelar
            </Button>
            <Button color="red" loading={busy} onClick={confirmRemove}>
              Anular
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Rechazar pago">
        <Stack>
          <Textarea
            label="Motivo de rechazo (opcional)"
            placeholder="Ej: Comprobante ilegible..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRejectTarget(null)}>
              Cancelar
            </Button>
            <Button color="red" loading={busy} onClick={confirmReject}>
              Rechazar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
