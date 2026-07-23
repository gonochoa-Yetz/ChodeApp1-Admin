import { Fragment, useEffect, useState } from 'react';
import { Badge, Button, Group, Modal, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { createGrupo, getGrupoTree, updateGrupo } from '../../services/groupService';
import type { DeporteWithGrupos, Grupo, GrupoWithDeporte } from '../../types/groups';

function slugify(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function GestionarGrupos() {
  const { profile } = useAuth();
  const [grupoTree, setGrupoTree] = useState<DeporteWithGrupos[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Grupo | GrupoWithDeporte | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newDeporteId, setNewDeporteId] = useState<string | null>(null);
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [newNombre, setNewNombre] = useState('');

  async function load() {
    setLoading(true);
    const { data, error } = await getGrupoTree(profile?.club_id ?? undefined);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    setGrupoTree(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.club_id]);

  async function toggleActivo(grupo: Grupo) {
    setSaving(true);
    const { error } = await updateGrupo(grupo.id, { activo: !grupo.activo });
    setSaving(false);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: grupo.activo ? 'Grupo desactivado.' : 'Grupo activado.' });
      load();
    }
  }

  function openEdit(grupo: Grupo) {
    setEditNombre(grupo.nombre);
    setEditTarget(grupo);
  }

  async function confirmEdit() {
    if (!editTarget || !editNombre.trim()) return;
    setSaving(true);
    const { error } = await updateGrupo(editTarget.id, { nombre: editNombre.trim() });
    setSaving(false);
    setEditTarget(null);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: 'Grupo actualizado.' });
      load();
    }
  }

  function openCreate(deporteId?: string, parentId?: string | null) {
    setNewDeporteId(deporteId ?? grupoTree[0]?.id ?? null);
    setNewParentId(parentId ?? null);
    setNewNombre('');
    setCreateOpen(true);
  }

  async function confirmCreate() {
    if (!profile?.club_id || !newDeporteId || !newNombre.trim()) {
      notifications.show({ color: 'red', message: 'Completá el deporte y el nombre.' });
      return;
    }
    setSaving(true);
    const { error } = await createGrupo({
      club_id: profile.club_id,
      deporte_id: newDeporteId,
      parent_id: newParentId,
      nombre: newNombre.trim(),
      slug: slugify(newNombre),
    });
    setSaving(false);
    setCreateOpen(false);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: 'Grupo creado.' });
      load();
    }
  }

  const allTopLevelForParentPicker = grupoTree.find((d) => d.id === newDeporteId)?.grupos ?? [];

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Grupos y clubes</Title>
        <Button onClick={() => openCreate()}>Nuevo grupo</Button>
      </Group>

      {grupoTree.map((deporte) => (
        <Stack key={deporte.id} gap="xs">
          <Title order={4}>{deporte.nombre}</Title>
          <Table striped highlightOnHover verticalSpacing="xs">
            <Table.Tbody>
              {deporte.grupos.map((g) => (
                <Fragment key={g.id}>
                  <Table.Tr>
                    <Table.Td>{g.nombre}</Table.Td>
                    <Table.Td>
                      <Badge color={g.activo ? 'green' : 'gray'} variant="light">
                        {g.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <Button size="xs" variant="light" onClick={() => openCreate(deporte.id, g.id)}>
                          + Subgrupo
                        </Button>
                        <Button size="xs" variant="light" onClick={() => openEdit(g)}>
                          Editar
                        </Button>
                        <Button size="xs" variant="outline" color={g.activo ? 'red' : 'green'} loading={saving} onClick={() => toggleActivo(g)}>
                          {g.activo ? 'Desactivar' : 'Activar'}
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  {(g.children ?? []).map((child) => (
                    <Table.Tr key={child.id}>
                      <Table.Td pl="xl">↳ {child.nombre}</Table.Td>
                      <Table.Td>
                        <Badge color={child.activo ? 'green' : 'gray'} variant="light">
                          {child.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end">
                          <Button size="xs" variant="light" onClick={() => openEdit(child)}>
                            Editar
                          </Button>
                          <Button size="xs" variant="outline" color={child.activo ? 'red' : 'green'} loading={saving} onClick={() => toggleActivo(child)}>
                            {child.activo ? 'Desactivar' : 'Activar'}
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Fragment>
              ))}
              {deporte.grupos.length === 0 && !loading && (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text c="dimmed" size="sm">
                      Sin grupos.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Stack>
      ))}

      <Modal opened={!!editTarget} onClose={() => setEditTarget(null)} title="Editar grupo">
        <Stack>
          <TextInput label="Nombre" value={editNombre} onChange={(e) => setEditNombre(e.currentTarget.value)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditTarget(null)}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={confirmEdit}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo grupo">
        <Stack>
          <Select
            label="Deporte"
            data={grupoTree.map((d) => ({ value: d.id, label: d.nombre }))}
            value={newDeporteId}
            onChange={(v) => {
              setNewDeporteId(v);
              setNewParentId(null);
            }}
          />
          <Select
            label="Grupo padre (opcional)"
            data={allTopLevelForParentPicker.map((g) => ({ value: g.id, label: g.nombre }))}
            value={newParentId}
            onChange={setNewParentId}
            clearable
            placeholder="Ninguno — grupo de nivel superior"
          />
          <TextInput label="Nombre" required value={newNombre} onChange={(e) => setNewNombre(e.currentTarget.value)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={confirmCreate}>
              Crear
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
