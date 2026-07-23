import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';
import {
  approvePayment,
  getApprovedAt,
  getComprobanteSignedUrl,
  getEventOptions,
  getItemStatus,
  getPayments,
  rejectPayment,
  type EventOption,
  type PaymentItem,
} from '../../services/paymentService';

type TabKey = 'pending' | 'approved' | 'rejected';

const TAB_ESTADOS: Record<TabKey, string[]> = {
  pending: ['pendiente', 'en_revision'],
  approved: ['aprobado'],
  rejected: ['rechazado'],
};

function formatMonto(n: number): string {
  return `$${n.toLocaleString('es-AR')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ValidarPagos() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(searchParams.get('event'));
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<PaymentItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [{ data: pData, error: pError }, { data: eData }] = await Promise.all([getPayments(), getEventOptions()]);
    if (pError) notifications.show({ color: 'red', title: 'Error', message: pError });
    setPayments(pData ?? []);
    setEvents(eData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const counts = useMemo(
    () => ({
      pending: payments.filter((p) => TAB_ESTADOS.pending.includes(getItemStatus(p))).length,
      approved: payments.filter((p) => getItemStatus(p) === 'aprobado').length,
      rejected: payments.filter((p) => getItemStatus(p) === 'rechazado').length,
    }),
    [payments]
  );

  const displayed = useMemo(
    () =>
      payments.filter((p) => {
        const matchTab = TAB_ESTADOS[activeTab].includes(getItemStatus(p));
        const matchEvent = !selectedEventId || p.event_id === selectedEventId;
        return matchTab && matchEvent;
      }),
    [payments, activeTab, selectedEventId]
  );

  async function confirmApprove() {
    if (!approveTarget || !profile?.id) return;
    const payment = approveTarget;
    setApproveTarget(null);

    setBusyId(payment.id);
    const { error } = await approvePayment(payment, profile.id);
    setBusyId(null);
    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      return;
    }
    notifications.show({ color: 'green', message: 'Pago aprobado.' });
    loadData();
  }

  function handleRejectPress(payment: PaymentItem) {
    setRejectReason('');
    setRejectTarget(payment);
  }

  async function confirmReject() {
    if (!rejectTarget || !profile?.id) return;
    if (!rejectReason.trim()) {
      notifications.show({ color: 'red', message: 'El motivo del rechazo es requerido.' });
      return;
    }
    setBusyId(rejectTarget.id);
    const { error } = await rejectPayment(rejectTarget, profile.id, rejectReason.trim());
    setBusyId(null);
    setRejectTarget(null);
    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      return;
    }
    notifications.show({ color: 'green', message: 'Pago rechazado.' });
    loadData();
  }

  async function handleViewComprobante(url: string) {
    const signed = await getComprobanteSignedUrl(url);
    setComprobanteUrl(signed);
  }

  return (
    <Stack>
      <Title order={2}>Validar pagos</Title>

      <Group justify="space-between" wrap="wrap">
        <Tabs value={activeTab} onChange={(v) => setActiveTab((v as TabKey) ?? 'pending')}>
          <Tabs.List>
            <Tabs.Tab value="pending">Pendientes ({counts.pending})</Tabs.Tab>
            <Tabs.Tab value="approved">Aprobados ({counts.approved})</Tabs.Tab>
            <Tabs.Tab value="rejected">Rechazados ({counts.rejected})</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <Select
          placeholder="Todos los eventos"
          data={events.map((e) => ({ value: e.id, label: e.nombre }))}
          value={selectedEventId}
          onChange={setSelectedEventId}
          clearable
          w={260}
        />
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Socio</Table.Th>
            <Table.Th>Evento</Table.Th>
            <Table.Th>Monto</Table.Th>
            <Table.Th>Método</Table.Th>
            <Table.Th>Fecha</Table.Th>
            <Table.Th>Comprobante</Table.Th>
            <Table.Th>{activeTab === 'pending' ? 'Acciones' : 'Info'}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {!loading && displayed.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={7}>
                <Text c="dimmed" ta="center" py="md">
                  No hay pagos en esta categoría.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {displayed.map((p) => {
            const socioName = p.socio ? `${p.socio.nombre} ${p.socio.apellido}` : 'Socio';
            const eventName = p.events?.nombre ?? 'Evento';
            const monto = p.itemType === 'installment' ? (p.amount ?? 0) : (p.events?.precio ?? 0);
            const cuotaLabel = p.itemType === 'installment' ? ` (cuota ${p.installment_number}/${p.total_installments})` : '';
            const status = getItemStatus(p);
            const isPending = TAB_ESTADOS.pending.includes(status);
            return (
              <Table.Tr key={p.id}>
                <Table.Td>{socioName}</Table.Td>
                <Table.Td>
                  {eventName}
                  {cuotaLabel}
                </Table.Td>
                <Table.Td>{formatMonto(monto)}</Table.Td>
                <Table.Td>{p.metodo_pago === 'efectivo' ? `Efectivo (${p.pago_efectivo_a ?? '—'})` : 'Transferencia'}</Table.Td>
                <Table.Td>{formatDate(p.created_at)}</Table.Td>
                <Table.Td>
                  {p.metodo_pago === 'transferencia' && p.comprobante_url ? (
                    <Button size="xs" variant="light" onClick={() => handleViewComprobante(p.comprobante_url!)}>
                      Ver
                    </Button>
                  ) : (
                    '—'
                  )}
                </Table.Td>
                <Table.Td>
                  {isPending ? (
                    <Group gap="xs">
                      <Button size="xs" color="green" loading={busyId === p.id} onClick={() => setApproveTarget(p)}>
                        Aprobar
                      </Button>
                      <Button size="xs" color="red" variant="outline" onClick={() => handleRejectPress(p)}>
                        Rechazar
                      </Button>
                    </Group>
                  ) : status === 'aprobado' ? (
                    <Badge color="green" variant="light">
                      {getApprovedAt(p) ? formatDate(getApprovedAt(p)!) : 'Aprobado'}
                    </Badge>
                  ) : (
                    <Text size="xs" c="dimmed">
                      {p.motivo_rechazo ?? 'Sin motivo'}
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      <Modal opened={!!approveTarget} onClose={() => setApproveTarget(null)} title="Aprobar pago">
        <Stack>
          <Text size="sm">
            ¿Aprobar el pago de{' '}
            <strong>{approveTarget?.socio ? `${approveTarget.socio.nombre} ${approveTarget.socio.apellido}` : 'el socio'}</strong>?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setApproveTarget(null)}>
              Cancelar
            </Button>
            <Button color="green" loading={busyId === approveTarget?.id} onClick={confirmApprove}>
              Confirmar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={!!comprobanteUrl} onClose={() => setComprobanteUrl(null)} title="Comprobante" size="lg">
        {comprobanteUrl && (
          <img src={comprobanteUrl} alt="Comprobante" style={{ width: '100%', borderRadius: 8 }} />
        )}
      </Modal>

      <Modal opened={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Rechazar pago">
        <Stack>
          <Textarea
            label="Motivo del rechazo"
            required
            value={rejectReason}
            onChange={(e) => setRejectReason(e.currentTarget.value)}
            placeholder="Ej: Comprobante ilegible, monto incorrecto..."
            minRows={3}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRejectTarget(null)}>
              Cancelar
            </Button>
            <Button color="red" loading={busyId === rejectTarget?.id} onClick={confirmReject}>
              Confirmar rechazo
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
