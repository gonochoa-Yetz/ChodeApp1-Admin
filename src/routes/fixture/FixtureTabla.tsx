import { useEffect, useState } from 'react';
import { Badge, Button, Group, Modal, NumberInput, SegmentedControl, Select, Stack, Table, Tabs, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  deleteStandingsRow,
  getMatchStatus,
  getPartidos,
  getTablaPosiciones,
  upsertMatchResult,
  upsertStandingsRow,
} from '../../services/fixtureService';
import {
  FIXTURE_DIVISION_LABEL,
  HOCKEY_DIVISIONS,
  RUGBY_CATEGORIA_LABEL,
  RUGBY_TREE,
  type FixtureDivision,
  type FixtureSport,
  type Partido,
  type RugbyCategoria,
  type TablaPosicion,
} from '../../types/fixture';

const STATUS_COLOR: Record<string, string> = { jugado: 'gray', proximo: 'blue', pendiente: 'gray' };
const STATUS_LABEL: Record<string, string> = { jugado: 'Jugado', proximo: 'Próximo', pendiente: 'Pendiente' };

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function FixtureTabla() {
  const [sport, setSport] = useState<FixtureSport>('rugby');
  const [rugbyCategoria, setRugbyCategoria] = useState<RugbyCategoria>('plantel-superior');
  const [division, setDivision] = useState<FixtureDivision>(RUGBY_TREE[0].divisions[0]);

  const divisionesDeCategoria = RUGBY_TREE.find((c) => c.categoria === rugbyCategoria)?.divisions ?? [];
  const divisionOptions = sport === 'rugby' ? divisionesDeCategoria : HOCKEY_DIVISIONS;

  function handleSportChange(v: string) {
    const newSport = v as FixtureSport;
    setSport(newSport);
    setDivision(newSport === 'rugby' ? RUGBY_TREE[0].divisions[0] : HOCKEY_DIVISIONS[0]);
  }

  function handleCategoriaChange(v: string) {
    const c = v as RugbyCategoria;
    setRugbyCategoria(c);
    const divisiones = RUGBY_TREE.find((t) => t.categoria === c)?.divisions ?? [];
    setDivision(divisiones[0]);
  }

  return (
    <Stack>
      <Title order={2}>Fixture y tabla de posiciones</Title>

      <Group>
        <SegmentedControl value={sport} onChange={handleSportChange} data={[{ label: 'Rugby', value: 'rugby' }, { label: 'Hockey', value: 'hockey' }]} />
        {sport === 'rugby' && (
          <Select
            data={RUGBY_TREE.map((c) => ({ value: c.categoria, label: RUGBY_CATEGORIA_LABEL[c.categoria] }))}
            value={rugbyCategoria}
            onChange={(v) => v && handleCategoriaChange(v)}
            w={180}
          />
        )}
        <Select data={divisionOptions.map((d) => ({ value: d, label: FIXTURE_DIVISION_LABEL[d] }))} value={division} onChange={(v) => v && setDivision(v as FixtureDivision)} w={160} />
      </Group>

      <Tabs defaultValue="fixture">
        <Tabs.List>
          <Tabs.Tab value="fixture">Fixture</Tabs.Tab>
          <Tabs.Tab value="tabla">Tabla de posiciones</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="fixture" pt="md">
          <FixturePanel sport={sport} division={division} />
        </Tabs.Panel>
        <Tabs.Panel value="tabla" pt="md">
          <StandingsPanel sport={sport} division={division} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function FixturePanel({ sport, division }: { sport: FixtureSport; division: FixtureDivision }) {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Partido | null>(null);
  const [favor, setFavor] = useState<number | ''>('');
  const [contra, setContra] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await getPartidos(sport, division);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    setPartidos(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, division]);

  function openEdit(p: Partido) {
    setFavor(p.puntos_favor ?? '');
    setContra(p.puntos_contra ?? '');
    setEditTarget(p);
  }

  async function confirmSave() {
    if (!editTarget || favor === '' || contra === '') return;
    setSaving(true);
    const { error } = await upsertMatchResult(editTarget.id, Number(favor), Number(contra));
    setSaving(false);
    setEditTarget(null);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: 'Resultado guardado.' });
      load();
    }
  }

  if (!loading && partidos.length === 0) {
    return (
      <Text c="dimmed" py="md">
        No hay partidos cargados para {sport} / {FIXTURE_DIVISION_LABEL[division]}.
      </Text>
    );
  }

  return (
    <>
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Fecha</Table.Th>
            <Table.Th>Jornada</Table.Th>
            <Table.Th>Rival</Table.Th>
            <Table.Th>Cond.</Table.Th>
            <Table.Th>Resultado</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {partidos.map((p) => {
            const status = getMatchStatus(p, partidos);
            return (
              <Table.Tr key={p.id}>
                <Table.Td>{formatDate(p.fecha)}</Table.Td>
                <Table.Td>{p.jornada}</Table.Td>
                <Table.Td>{p.rival}</Table.Td>
                <Table.Td>{p.condicion === 'local' ? 'Local' : 'Visitante'}</Table.Td>
                <Table.Td>{p.puntos_favor !== null ? `${p.puntos_favor} - ${p.puntos_contra}` : '—'}</Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLOR[status]} variant="light">
                    {STATUS_LABEL[status]}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Button size="xs" variant="light" onClick={() => openEdit(p)}>
                    Cargar resultado
                  </Button>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      <Modal opened={!!editTarget} onClose={() => setEditTarget(null)} title={`Resultado vs. ${editTarget?.rival ?? ''}`}>
        <Stack>
          <Group grow>
            <NumberInput label="Puntos a favor" min={0} value={favor} onChange={(v) => setFavor(typeof v === 'number' ? v : '')} />
            <NumberInput label="Puntos en contra" min={0} value={contra} onChange={(v) => setContra(typeof v === 'number' ? v : '')} />
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditTarget(null)}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={confirmSave}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

type StandingsForm = Omit<TablaPosicion, 'id' | 'sport' | 'division' | 'created_by' | 'updated_at'> & { id?: string };

const EMPTY_ROW: StandingsForm = { equipo: '', es_club: false, pj: 0, g: 0, e: 0, p: 0, puntos: 0, posicion: 1 };

function StandingsPanel({ sport, division }: { sport: FixtureSport; division: FixtureDivision }) {
  const [rows, setRows] = useState<TablaPosicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<StandingsForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TablaPosicion | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await getTablaPosiciones(sport, division);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, division]);

  async function confirmSave() {
    if (!editTarget) return;
    setSaving(true);
    const { error } = await upsertStandingsRow({ ...editTarget, sport, division });
    setSaving(false);
    setEditTarget(null);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: 'Fila guardada.' });
      load();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const { error } = await deleteStandingsRow(deleteTarget.id);
    setSaving(false);
    setDeleteTarget(null);
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    else {
      notifications.show({ color: 'green', message: 'Fila eliminada.' });
      load();
    }
  }

  return (
    <>
      <Group justify="flex-end" mb="sm">
        <Button size="xs" onClick={() => setEditTarget(EMPTY_ROW)}>
          Agregar equipo
        </Button>
      </Group>

      {!loading && rows.length === 0 && (
        <Text c="dimmed" py="md">
          No hay tabla cargada para {sport} / {FIXTURE_DIVISION_LABEL[division]}.
        </Text>
      )}

      {rows.length > 0 && (
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Pos.</Table.Th>
              <Table.Th>Equipo</Table.Th>
              <Table.Th>PJ</Table.Th>
              <Table.Th>G</Table.Th>
              <Table.Th>E</Table.Th>
              <Table.Th>P</Table.Th>
              <Table.Th>Pts</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.id} bg={r.es_club ? 'var(--mantine-color-blue-light)' : undefined}>
                <Table.Td>{r.posicion}</Table.Td>
                <Table.Td>{r.equipo}</Table.Td>
                <Table.Td>{r.pj}</Table.Td>
                <Table.Td>{r.g}</Table.Td>
                <Table.Td>{r.e}</Table.Td>
                <Table.Td>{r.p}</Table.Td>
                <Table.Td>{r.puntos}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button size="xs" variant="light" onClick={() => setEditTarget(r)}>
                      Editar
                    </Button>
                    <Button size="xs" color="red" variant="outline" onClick={() => setDeleteTarget(r)}>
                      Quitar
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal opened={!!editTarget} onClose={() => setEditTarget(null)} title={editTarget?.id ? 'Editar equipo' : 'Agregar equipo'}>
        {editTarget && (
          <Stack>
            <TextInput label="Equipo" value={editTarget.equipo} onChange={(e) => setEditTarget({ ...editTarget, equipo: e.currentTarget.value })} />
            <Group grow>
              <NumberInput label="Posición" min={1} value={editTarget.posicion} onChange={(v) => setEditTarget({ ...editTarget, posicion: typeof v === 'number' ? v : 1 })} />
              <NumberInput label="PJ" min={0} value={editTarget.pj} onChange={(v) => setEditTarget({ ...editTarget, pj: typeof v === 'number' ? v : 0 })} />
            </Group>
            <Group grow>
              <NumberInput label="G" min={0} value={editTarget.g} onChange={(v) => setEditTarget({ ...editTarget, g: typeof v === 'number' ? v : 0 })} />
              <NumberInput label="E" min={0} value={editTarget.e} onChange={(v) => setEditTarget({ ...editTarget, e: typeof v === 'number' ? v : 0 })} />
              <NumberInput label="P" min={0} value={editTarget.p} onChange={(v) => setEditTarget({ ...editTarget, p: typeof v === 'number' ? v : 0 })} />
            </Group>
            <NumberInput label="Puntos" min={0} value={editTarget.puntos} onChange={(v) => setEditTarget({ ...editTarget, puntos: typeof v === 'number' ? v : 0 })} />
            <Select
              label="¿Es el club?"
              data={[{ value: 'no', label: 'No' }, { value: 'si', label: 'Sí — resaltar esta fila' }]}
              value={editTarget.es_club ? 'si' : 'no'}
              onChange={(v) => setEditTarget({ ...editTarget, es_club: v === 'si' })}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setEditTarget(null)}>
                Cancelar
              </Button>
              <Button loading={saving} onClick={confirmSave}>
                Guardar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Quitar equipo">
        <Stack>
          <Text size="sm">
            ¿Quitar a <strong>{deleteTarget?.equipo}</strong> de la tabla?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button color="red" loading={saving} onClick={confirmDelete}>
              Quitar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
