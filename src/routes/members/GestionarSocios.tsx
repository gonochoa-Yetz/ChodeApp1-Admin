import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, Group, Select, SimpleGrid, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { useAuth } from '../../contexts/AuthContext';
import { getAdminDivisionGrupos, getGrupoTree } from '../../services/groupService';
import { getSociosActivityCounts, getSociosAdmin, type SociosActivityCounts, type SocioListItem } from '../../services/socioService';
import type { DeporteWithGrupos, Grupo } from '../../types/groups';

const ESTADO_COLOR: Record<string, string> = { activo: 'green', inactivo: 'red', pendiente: 'yellow' };
const ROLE_LABEL: Record<string, string> = { super_admin: 'Super Admin', admin_division: 'Admin Div.' };

function flattenGrupos(tree: DeporteWithGrupos[]): Grupo[] {
  return tree.flatMap((d) => [...d.grupos, ...d.grupos.flatMap((g) => g.children ?? [])]);
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card withBorder padding="sm">
      <Text size="xl" fw={700} c={color}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Card>
  );
}

export function GestionarSocios() {
  const { profile } = useAuth();
  const [socios, setSocios] = useState<SocioListItem[]>([]);
  const [grupoTree, setGrupoTree] = useState<DeporteWithGrupos[]>([]);
  const [allowedGrupoIds, setAllowedGrupoIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [grupoFilter, setGrupoFilter] = useState<string | null>(null);
  const [activity, setActivity] = useState<SociosActivityCounts | null>(null);

  useEffect(() => {
    if (!profile) return;
    getGrupoTree(profile.club_id ?? undefined).then(({ data }) => data && setGrupoTree(data));
    if (profile.role === 'admin_division') {
      getAdminDivisionGrupos(profile.id).then(({ data }) => setAllowedGrupoIds((data ?? []).map((g) => g.id)));
    }
  }, [profile]);

  useEffect(() => {
    setLoading(true);
    getSociosAdmin().then(({ data }) => {
      setSocios(data ?? []);
      setLoading(false);
    });
    getSociosActivityCounts().then(({ data }) => setActivity(data));
  }, []);

  const allGrupos = useMemo(() => flattenGrupos(grupoTree), [grupoTree]);

  const metrics = useMemo(() => {
    const porEstado = { activo: 0, inactivo: 0, pendiente: 0 };
    const porRol = { user: 0, admin_division: 0, super_admin: 0 };
    const porGrupo = new Map<string, { label: string; count: number }>();

    for (const s of socios) {
      const estado = s.memberships?.[0]?.estado ?? 'pendiente';
      if (estado in porEstado) porEstado[estado as keyof typeof porEstado] += 1;
      porRol[s.role] = (porRol[s.role] ?? 0) + 1;

      const membership = s.memberships?.[0];
      const deporte = grupoTree.find((d) => d.id === membership?.deporte_id);
      const grupo = allGrupos.find((g) => g.id === membership?.grupo_id);
      const label = grupo ? `${deporte?.nombre ?? ''} · ${grupo.nombre}` : (membership?.division ?? 'Sin grupo');
      porGrupo.set(label, { label, count: (porGrupo.get(label)?.count ?? 0) + 1 });
    }

    return {
      total: socios.length,
      porEstado,
      porRol,
      porGrupo: [...porGrupo.values()].sort((a, b) => b.count - a.count),
    };
  }, [socios, grupoTree, allGrupos]);

  const grupoOptions = useMemo(
    () => [
      { value: 'inactivos', label: 'Inactivos' },
      ...grupoTree.flatMap((d) => d.grupos.map((g) => ({ value: g.id, label: `${d.nombre} · ${g.nombre}` }))),
    ],
    [grupoTree]
  );

  const filtered = useMemo(() => {
    let result = socios;

    if (allowedGrupoIds !== null) {
      const childIds = allGrupos.filter((g) => allowedGrupoIds.includes(g.id)).flatMap((g) => (g.children ?? []).map((c) => c.id));
      const scopedIds = [...allowedGrupoIds, ...childIds];
      result = result.filter((s) => {
        const gId = s.memberships?.[0]?.grupo_id ?? null;
        return gId !== null && scopedIds.includes(gId);
      });
    }

    if (grupoFilter === 'inactivos') {
      result = result.filter((s) => s.memberships?.[0]?.estado === 'inactivo');
    } else if (grupoFilter) {
      const parentGrupo = allGrupos.find((g) => g.id === grupoFilter);
      const childIds = (parentGrupo?.children ?? []).map((c) => c.id);
      const targetIds = [grupoFilter, ...childIds];
      result = result.filter((s) => targetIds.includes(s.memberships?.[0]?.grupo_id ?? ''));
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((s) => {
        const fullName = `${s.nombre} ${s.apellido}`.toLowerCase();
        const num = s.memberships?.[0]?.numero_socio?.toString() ?? '';
        const email = s.email?.toLowerCase() ?? '';
        return fullName.includes(q) || num.includes(q) || email.includes(q);
      });
    }

    return result;
  }, [socios, grupoFilter, search, allowedGrupoIds, allGrupos]);

  function grupoLabel(socio: SocioListItem): string {
    const membership = socio.memberships?.[0];
    const deporte = grupoTree.find((d) => d.id === membership?.deporte_id);
    const grupo = allGrupos.find((g) => g.id === membership?.grupo_id);
    return grupo ? `${deporte?.nombre ?? ''} · ${grupo.nombre}` : (membership?.division ?? '—');
  }

  return (
    <Stack>
      <Title order={2}>Socios</Title>
      <Text c="dimmed" size="sm" mt={-8}>
        {metrics.total} socio{metrics.total === 1 ? '' : 's'} en total
      </Text>

      <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="sm">
        <StatCard label="Cuota al día" value={metrics.porEstado.activo} color="green" />
        <StatCard label="Cuota pendiente" value={metrics.porEstado.pendiente} color="yellow" />
        <StatCard label="Inactivos" value={metrics.porEstado.inactivo} color="red" />
        <StatCard label="Admins (div. + super)" value={metrics.porRol.admin_division + metrics.porRol.super_admin} color="blue" />
        <StatCard label="Con actividad (7 días)" value={activity?.activos7d ?? 0} />
        <StatCard label="Con actividad (30 días)" value={activity?.activos30d ?? 0} />
      </SimpleGrid>

      {metrics.porGrupo.length > 0 && (
        <Card withBorder padding="sm">
          <Text size="xs" fw={700} c="dimmed" mb="xs">
            SOCIOS POR GRUPO
          </Text>
          <Group gap="xs">
            {metrics.porGrupo.map((g) => (
              <Badge key={g.label} variant="light" size="lg">
                {g.label} · {g.count}
              </Badge>
            ))}
          </Group>
        </Card>
      )}

      <Group>
        <TextInput
          placeholder="Buscar por nombre, email o N° socio..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={300}
        />
        <Select
          placeholder="Todos los grupos"
          data={grupoOptions}
          value={grupoFilter}
          onChange={setGrupoFilter}
          clearable
          w={260}
        />
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nombre</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>N° socio</Table.Th>
            <Table.Th>Grupo</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th>Rol</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {!loading && filtered.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed" ta="center" py="md">
                  No se encontraron socios.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {filtered.map((s) => {
            const membership = s.memberships?.[0];
            const estado = membership?.estado ?? 'pendiente';
            const socioNum = membership?.numero_socio ? `#${String(membership.numero_socio).padStart(4, '0')}` : '—';
            return (
              <Table.Tr key={s.id} style={{ cursor: 'pointer' }}>
                <Table.Td>
                  <Text component={Link} to={`/socios/${s.id}`} fw={600} c="inherit" td="none">
                    {s.nombre} {s.apellido}
                  </Text>
                  {s.nickname && (
                    <Text size="xs" c="dimmed">
                      @{s.nickname}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {s.email}
                  </Text>
                </Table.Td>
                <Table.Td>{socioNum}</Table.Td>
                <Table.Td>{grupoLabel(s)}</Table.Td>
                <Table.Td>
                  <Badge color={ESTADO_COLOR[estado] ?? 'gray'} variant="light">
                    {estado}
                  </Badge>
                </Table.Td>
                <Table.Td>{ROLE_LABEL[s.role] ?? '—'}</Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
