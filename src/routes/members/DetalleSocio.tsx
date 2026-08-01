import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { getAdminDivisionGrupos, getGrupoTree, setAdminDivisionGrupos } from '../../services/groupService';
import { updateMembership, updateMembershipGrupo } from '../../services/membershipService';
import { getMarketBanned, setMarketBanned } from '../../services/marketAdminService';
import {
  deleteSocio,
  getRecentPayments,
  getSocioDetalle,
  updateUserRole,
  type RecentPayment,
  type SocioDetalle,
} from '../../services/socioService';
import { ESTADO_OPTIONS, TIPO_MEMBRESIA_OPTIONS } from '../../types/membership';
import type { UserRol } from '../../types/user';
import type { DeporteWithGrupos } from '../../types/groups';

const ROLE_OPTIONS: { label: string; value: UserRol }[] = [
  { label: 'Socio (sin rol admin)', value: 'user' },
  { label: 'Admin de División', value: 'admin_division' },
  { label: 'Super Admin', value: 'super_admin' },
];

const ROLE_LABEL: Record<UserRol, string> = {
  user: 'Socio',
  admin_division: 'Admin de División',
  super_admin: 'Super Admin',
};

export function DetalleSocio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [socio, setSocio] = useState<SocioDetalle | null>(null);
  const [payments, setPayments] = useState<RecentPayment[]>([]);
  const [grupoTree, setGrupoTree] = useState<DeporteWithGrupos[]>([]);
  const [selectedDeporteId, setSelectedDeporteId] = useState<string | null>(null);
  const [selectedGruposForAdmin, setSelectedGruposForAdmin] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRol | null>(null);
  const [marketBanned, setMarketBannedState] = useState(false);
  const [banTogglePending, setBanTogglePending] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePending, setDeletePending] = useState(false);

  async function loadSocio() {
    if (!id) return;
    const [{ data: socioData }, { data: payData }, { data: permisos }, { data: bannedData }] = await Promise.all([
      getSocioDetalle(id),
      getRecentPayments(id),
      getAdminDivisionGrupos(id),
      getMarketBanned(id),
    ]);
    if (socioData) {
      setSocio(socioData);
      const mem = socioData.memberships?.[0];
      if (mem?.deporte_id) setSelectedDeporteId(mem.deporte_id);
    }
    setPayments(payData ?? []);
    setSelectedGruposForAdmin((permisos ?? []).map((g) => g.id));
    setMarketBannedState(bannedData ?? false);
    setLoading(false);
  }

  useEffect(() => {
    loadSocio();
    getGrupoTree(profile?.club_id ?? undefined).then(({ data }) => data && setGrupoTree(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }
  if (!socio) return <Text c="dimmed">No se pudo cargar el socio.</Text>;

  const membership = socio.memberships?.[0];
  const gruposForSelectedDeporte = grupoTree.find((d) => d.id === selectedDeporteId)?.grupos ?? [];
  const allGrupoOptions = grupoTree.flatMap((d) =>
    [...d.grupos, ...d.grupos.flatMap((g) => g.children ?? [])].map((g) => ({ value: g.id, label: `${d.nombre} · ${g.nombre}` }))
  );
  const isSuperAdmin = profile?.role === 'super_admin';

  async function handleMembershipField(fields: Record<string, unknown>) {
    if (!membership) return;
    setSaving(true);
    const { error } = await updateMembership(membership.id, fields);
    setSaving(false);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else loadSocio();
  }

  async function handleGrupoChange(grupoId: string | null) {
    if (!membership) return;
    setSaving(true);
    const { error } = await updateMembershipGrupo(membership.id, grupoId);
    setSaving(false);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else loadSocio();
  }

  async function confirmRoleChange() {
    if (!pendingRole) return;
    const newRole = pendingRole;
    setPendingRole(null);
    if (!socio || !profile || !isSuperAdmin) return;

    setSaving(true);
    const { error } = await updateUserRole(socio.id, newRole);
    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      setSaving(false);
      return;
    }

    if (newRole === 'admin_division' && profile.club_id) {
      await setAdminDivisionGrupos(socio.id, selectedGruposForAdmin, profile.club_id, profile.id);
    }
    if (newRole === 'user') {
      await setAdminDivisionGrupos(socio.id, [], profile.club_id ?? '', profile.id);
    }
    setSaving(false);
    notifications.show({ color: 'green', message: 'Rol actualizado.' });
    loadSocio();
  }

  async function confirmToggleMarketBan() {
    if (!socio) return;
    const newValue = !marketBanned;
    setBanTogglePending(true);
    const { error } = await setMarketBanned(socio.id, newValue);
    setBanTogglePending(false);
    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      return;
    }
    setMarketBannedState(newValue);
    notifications.show({ color: 'green', message: newValue ? 'Usuario baneado del Market.' : 'Usuario desbaneado del Market.' });
  }

  async function handleSavePermisos() {
    if (!profile?.club_id || !socio) return;
    setSaving(true);
    const { error } = await setAdminDivisionGrupos(socio.id, selectedGruposForAdmin, profile.club_id, profile.id);
    setSaving(false);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else notifications.show({ color: 'green', message: 'Permisos de grupos actualizados.' });
  }

  const fullName = `${socio.nombre} ${socio.apellido}`;

  async function confirmDeleteSocio() {
    if (!socio || deleteConfirmText.trim() !== fullName) return;
    setDeletePending(true);
    const { error } = await deleteSocio(socio.id);
    setDeletePending(false);
    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      return;
    }
    notifications.show({ color: 'green', message: `${fullName} fue eliminado permanentemente.` });
    navigate('/socios');
  }

  return (
    <Stack maw={640}>
      <Stack gap={0}>
        <Title order={2}>
          {socio.nombre} {socio.apellido}
        </Title>
        <Text c="dimmed" size="sm">
          {socio.nickname ? `@${socio.nickname} · ` : ''}
          {membership?.numero_socio ? `#${String(membership.numero_socio).padStart(4, '0')}` : 'Sin N° de socio'}
        </Text>
      </Stack>

      <Card withBorder>
        <Title order={4} mb="sm">
          Datos de membresía
        </Title>
        <Stack gap="sm">
          <Select
            label="Deporte"
            data={grupoTree.map((d) => ({ value: d.id, label: d.nombre }))}
            value={selectedDeporteId}
            onChange={setSelectedDeporteId}
          />
          <Select
            label="Grupo"
            data={gruposForSelectedDeporte.flatMap((g) => [
              { value: g.id, label: g.nombre },
              ...(g.children ?? []).map((c) => ({ value: c.id, label: `↳ ${c.nombre}` })),
            ])}
            value={membership?.grupo_id ?? null}
            onChange={handleGrupoChange}
            disabled={!selectedDeporteId}
            placeholder={selectedDeporteId ? 'Seleccionar grupo' : 'Elegí un deporte primero'}
          />
          <NumberInput
            label="N° de socio"
            placeholder="Sin asignar"
            value={membership?.numero_socio ?? undefined}
            onBlur={(e) => {
              const raw = e.currentTarget.value.trim();
              const n = raw === '' ? null : parseInt(raw, 10);
              if (n === null || !isNaN(n)) {
                if (n !== (membership?.numero_socio ?? null)) handleMembershipField({ numero_socio: n });
              }
            }}
          />
          <NumberInput
            label="Camada (año)"
            value={membership?.anio_ingreso ?? undefined}
            onBlur={(e) => {
              const n = parseInt(e.currentTarget.value, 10);
              if (!isNaN(n) && n !== membership?.anio_ingreso) handleMembershipField({ anio_ingreso: n });
            }}
          />
          <Select
            label="Tipo de socio"
            data={TIPO_MEMBRESIA_OPTIONS}
            value={membership?.tipo_membresia ?? null}
            onChange={(v) => v && handleMembershipField({ tipo_membresia: v })}
          />
          <Select
            label="Estado"
            data={ESTADO_OPTIONS}
            value={membership?.estado ?? null}
            onChange={(v) => v && handleMembershipField({ estado: v })}
          />
        </Stack>
      </Card>

      <Card withBorder>
        <Title order={4} mb="sm">
          Rol y acceso
        </Title>
        <Stack gap="sm">
          {isSuperAdmin ? (
            <Select data={ROLE_OPTIONS} value={socio.role} onChange={(v) => v && setPendingRole(v as UserRol)} disabled={saving} />
          ) : (
            <Badge variant="light">{ROLE_LABEL[socio.role]}</Badge>
          )}

          {socio.role === 'admin_division' && isSuperAdmin && (
            <>
              <MultiSelect
                label="Grupos con permiso"
                data={allGrupoOptions}
                value={selectedGruposForAdmin}
                onChange={setSelectedGruposForAdmin}
              />
              <Button size="xs" variant="light" loading={saving} onClick={handleSavePermisos} w="fit-content">
                Guardar permisos
              </Button>
            </>
          )}
        </Stack>
      </Card>

      {isSuperAdmin && (
        <Card withBorder>
          <Title order={4} mb="sm">
            Market
          </Title>
          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="sm">{marketBanned ? 'Baneado del Market' : 'Puede publicar en el Market'}</Text>
              <Text size="xs" c="dimmed">
                {marketBanned ? 'No puede crear publicaciones nuevas.' : 'Sin restricciones para publicar.'}
              </Text>
            </Stack>
            <Button size="xs" color={marketBanned ? 'green' : 'red'} variant="outline" loading={banTogglePending} onClick={confirmToggleMarketBan}>
              {marketBanned ? 'Desbanear' : 'Banear del Market'}
            </Button>
          </Group>
        </Card>
      )}

      <Card withBorder>
        <Title order={4} mb="sm">
          Historial de pagos
        </Title>
        {payments.length === 0 ? (
          <Text c="dimmed" size="sm">
            Sin pagos registrados.
          </Text>
        ) : (
          <Stack gap="xs">
            {payments.map((p) => (
              <Group key={p.id} justify="space-between">
                <Text size="sm">{p.events?.nombre ?? 'Evento'}</Text>
                <Badge variant="light" color={p.estado_pago === 'aprobado' ? 'green' : p.estado_pago === 'rechazado' ? 'red' : 'yellow'}>
                  {p.estado_pago}
                </Badge>
              </Group>
            ))}
          </Stack>
        )}
      </Card>

      {isSuperAdmin && (
        <Card withBorder style={{ borderColor: 'var(--mantine-color-red-6)' }}>
          <Title order={4} mb="sm" c="red">
            Zona de peligro
          </Title>
          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="sm">Eliminar socio</Text>
              <Text size="xs" c="dimmed">
                Borra la cuenta y todo su historial (eventos, pagos, Market, mensajes). No se puede deshacer.
              </Text>
            </Stack>
            <Button
              size="xs"
              color="red"
              variant="outline"
              onClick={() => {
                setDeleteConfirmText('');
                setDeleteModalOpen(true);
              }}
            >
              Eliminar socio
            </Button>
          </Group>
        </Card>
      )}

      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Eliminar socio permanentemente"
      >
        <Stack>
          <Text size="sm">
            Esto elimina a <strong>{fullName}</strong> y todo su historial: eventos, cuotas, publicaciones y mensajes del
            Market, notificaciones. <strong>No se puede deshacer.</strong>
          </Text>
          <Text size="sm">
            Para confirmar, escribí el nombre completo: <strong>{fullName}</strong>
          </Text>
          <TextInput value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.currentTarget.value)} placeholder={fullName} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              color="red"
              loading={deletePending}
              disabled={deleteConfirmText.trim() !== fullName}
              onClick={confirmDeleteSocio}
            >
              Eliminar definitivamente
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={!!pendingRole} onClose={() => setPendingRole(null)} title="Confirmar cambio de rol">
        <Stack>
          <Text size="sm">
            ¿Asignar el rol <strong>{pendingRole ? ROLE_LABEL[pendingRole] : ''}</strong> a {socio.nombre} {socio.apellido}?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPendingRole(null)}>
              Cancelar
            </Button>
            <Button color={pendingRole === 'user' ? 'red' : 'blue'} loading={saving} onClick={confirmRoleChange}>
              Confirmar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
