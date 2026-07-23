import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Group, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { useAuth } from '../../contexts/AuthContext';
import { getAdminDivisionGrupos, getGrupoTree } from '../../services/groupService';
import { getSociosAdmin, type SocioListItem } from '../../services/socioService';
import type { DeporteWithGrupos, Grupo } from '../../types/groups';

const ESTADO_COLOR: Record<string, string> = { activo: 'green', inactivo: 'red', pendiente: 'yellow' };
const ROLE_LABEL: Record<string, string> = { super_admin: 'Super Admin', admin_division: 'Admin Div.' };

function flattenGrupos(tree: DeporteWithGrupos[]): Grupo[] {
  return tree.flatMap((d) => [...d.grupos, ...d.grupos.flatMap((g) => g.children ?? [])]);
}

export function GestionarSocios() {
  const { profile } = useAuth();
  const [socios, setSocios] = useState<SocioListItem[]>([]);
  const [grupoTree, setGrupoTree] = useState<DeporteWithGrupos[]>([]);
  const [allowedGrupoIds, setAllowedGrupoIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [grupoFilter, setGrupoFilter] = useState<string | null>(null);

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
  }, []);

  const allGrupos = useMemo(() => flattenGrupos(grupoTree), [grupoTree]);

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
        return fullName.includes(q) || num.includes(q);
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

      <Group>
        <TextInput
          placeholder="Buscar por nombre o N° socio..."
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
            <Table.Th>N° socio</Table.Th>
            <Table.Th>Grupo</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th>Rol</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {!loading && filtered.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
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
