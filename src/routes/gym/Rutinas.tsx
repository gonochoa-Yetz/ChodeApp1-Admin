import { useEffect, useRef, useState } from 'react';
import { Button, FileInput, Group, Modal, Select, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { createRutina, deleteRutina, getRutinaSignedUrl, getRutinas, updateRutina } from '../../services/gymService';
import { RUTINA_DIVISION_OPTIONS, RUTINA_SPORT_OPTIONS, type Rutina, type RutinaDivision, type RutinaSport } from '../../types/gym';

interface FormState {
  id?: string;
  nombre: string;
  descripcion: string;
  fecha: Date | null;
  sport: RutinaSport;
  division: RutinaDivision;
  oldPdfPath: string;
  file: File | null;
}

const EMPTY_FORM: FormState = {
  nombre: '',
  descripcion: '',
  fecha: new Date(),
  sport: 'rugby',
  division: 'PS',
  oldPdfPath: '',
  file: null,
};

export function Rutinas() {
  const { profile } = useAuth();
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Rutina | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputKey = useRef(0);

  async function load() {
    setLoading(true);
    const { data, error } = await getRutinas();
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    setRutinas(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    fileInputKey.current += 1;
    setForm(EMPTY_FORM);
  }

  function openEdit(r: Rutina) {
    fileInputKey.current += 1;
    setForm({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion ?? '',
      fecha: r.fecha ? new Date(`${r.fecha}T00:00:00`) : null,
      sport: r.sport,
      division: r.division,
      oldPdfPath: r.pdf_path,
      file: null,
    });
  }

  async function handleView(pdfPath: string) {
    const { data, error } = await getRutinaSignedUrl(pdfPath);
    if (error || !data) {
      notifications.show({ color: 'red', title: 'Error', message: error ?? 'No se pudo abrir el PDF.' });
      return;
    }
    window.open(data, '_blank');
  }

  async function confirmSave() {
    if (!form || !profile?.id) return;
    if (!form.nombre.trim()) {
      notifications.show({ color: 'red', message: 'El nombre es requerido.' });
      return;
    }
    if (!form.id && !form.file) {
      notifications.show({ color: 'red', message: 'Subí un PDF.' });
      return;
    }

    setSaving(true);
    const fechaIso = form.fecha ? form.fecha.toISOString().slice(0, 10) : null;

    const { error } = form.id
      ? await updateRutina(form.id, {
          nombre: form.nombre,
          descripcion: form.descripcion,
          fecha: fechaIso,
          sport: form.sport,
          division: form.division,
          createdBy: profile.id,
          oldPdfPath: form.oldPdfPath,
          file: form.file,
        })
      : await createRutina({
          nombre: form.nombre,
          descripcion: form.descripcion,
          fecha: fechaIso,
          sport: form.sport,
          division: form.division,
          createdBy: profile.id,
          file: form.file!,
        });

    setSaving(false);
    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      return;
    }
    notifications.show({ color: 'green', message: form.id ? 'Rutina actualizada.' : 'Rutina creada.' });
    setForm(null);
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const { error } = await deleteRutina(deleteTarget.id, deleteTarget.pdf_path);
    setSaving(false);
    setDeleteTarget(null);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: 'Rutina eliminada.' });
      load();
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Rutinas de gym</Title>
        <Button onClick={openCreate}>Nueva rutina</Button>
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nombre</Table.Th>
            <Table.Th>Deporte / División</Table.Th>
            <Table.Th>Fecha</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {!loading && rutinas.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={4}>
                <Text c="dimmed" ta="center" py="md">
                  No hay rutinas cargadas.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {rutinas.map((r) => (
            <Table.Tr key={r.id}>
              <Table.Td>{r.nombre}</Table.Td>
              <Table.Td>
                {RUTINA_SPORT_OPTIONS.find((o) => o.value === r.sport)?.label} · {RUTINA_DIVISION_OPTIONS.find((o) => o.value === r.division)?.label}
              </Table.Td>
              <Table.Td>{r.fecha ? new Date(`${r.fecha}T00:00:00`).toLocaleDateString('es-AR') : '—'}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button size="xs" variant="light" onClick={() => handleView(r.pdf_path)}>
                    Ver PDF
                  </Button>
                  <Button size="xs" variant="light" onClick={() => openEdit(r)}>
                    Editar
                  </Button>
                  <Button size="xs" color="red" variant="outline" onClick={() => setDeleteTarget(r)}>
                    Eliminar
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar rutina' : 'Nueva rutina'}>
        {form && (
          <Stack>
            <TextInput label="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.currentTarget.value })} />
            <Textarea label="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.currentTarget.value })} minRows={2} />
            <Group grow>
              <Select label="Deporte" data={RUTINA_SPORT_OPTIONS} value={form.sport} onChange={(v) => v && setForm({ ...form, sport: v as RutinaSport })} />
              <Select label="División" data={RUTINA_DIVISION_OPTIONS} value={form.division} onChange={(v) => v && setForm({ ...form, division: v as RutinaDivision })} />
            </Group>
            <DateInput label="Fecha" value={form.fecha} onChange={(v) => setForm({ ...form, fecha: v ? new Date(v) : null })} />
            <FileInput
              key={fileInputKey.current}
              label={form.id ? 'Reemplazar PDF (opcional)' : 'PDF'}
              required={!form.id}
              accept="application/pdf"
              value={form.file}
              onChange={(f) => setForm({ ...form, file: f })}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setForm(null)}>
                Cancelar
              </Button>
              <Button loading={saving} onClick={confirmSave}>
                Guardar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar rutina">
        <Stack>
          <Text size="sm">
            ¿Eliminar la rutina <strong>{deleteTarget?.nombre}</strong>? Se borra también el PDF.
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
