import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Checkbox, MultiSelect, NumberInput, Stack, Textarea, TextInput, Title } from '@mantine/core';
import { DateInput, DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { getGrupoTree } from '../../services/groupService';
import { createEventWithGrupos } from '../../services/eventAdminService';
import { notifyEventCreated } from '../../services/notificationService';
import type { DeporteWithGrupos } from '../../types/groups';

export function CreateEvent() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState<Date | null>(new Date(Date.now() + 60 * 60 * 1000));
  const [ubicacion, setUbicacion] = useState('');
  const [precio, setPrecio] = useState<number | ''>('');
  const [grupoTree, setGrupoTree] = useState<DeporteWithGrupos[]>([]);
  const [selectedGrupoIds, setSelectedGrupoIds] = useState<string[]>([]);
  const [esAbierto, setEsAbierto] = useState(false);
  const [allowInstallments, setAllowInstallments] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState<number | ''>(3);
  const [firstDueDate, setFirstDueDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGrupoTree(profile?.club_id ?? undefined).then(({ data }) => data && setGrupoTree(data));
  }, [profile?.club_id]);

  const grupoOptions = useMemo(
    () => grupoTree.flatMap((d) => d.grupos.map((g) => ({ value: g.id, label: `${d.nombre} · ${g.nombre}` }))),
    [grupoTree]
  );

  async function handleSubmit() {
    setError(null);
    if (!profile?.id) return;

    if (!nombre.trim() || !ubicacion.trim() || precio === '') {
      setError('Completá todos los campos requeridos.');
      return;
    }
    if (typeof precio === 'number' && precio <= 0) {
      setError('El precio debe ser un número mayor a 0.');
      return;
    }
    if (!fecha || fecha.getTime() <= Date.now()) {
      setError('La fecha del evento debe ser futura.');
      return;
    }
    if (allowInstallments && (!installmentsCount || installmentsCount < 2)) {
      setError('Ingresá una cantidad de cuotas válida (mínimo 2).');
      return;
    }
    if (allowInstallments && !firstDueDate) {
      setError('Ingresá la fecha de vencimiento de la primera cuota.');
      return;
    }
    if (!esAbierto && selectedGrupoIds.length === 0) {
      setError('Seleccioná al menos un grupo o marcá el evento como abierto.');
      return;
    }

    setLoading(true);
    const categoriaLegacy = esAbierto ? 'abierto' : selectedGrupoIds.length > 0 ? 'grupos' : 'abierto';

    const { data: createdEvent, error: createError } = await createEventWithGrupos(
      {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        fecha: fecha.toISOString(),
        ubicacion: ubicacion.trim(),
        precio: Number(precio),
        categoria: categoriaLegacy,
        club_id: profile.club_id,
        allow_installments: allowInstallments,
        installments_count: allowInstallments ? Number(installmentsCount) : 1,
        created_by: profile.id,
      },
      selectedGrupoIds,
      esAbierto
    );

    setLoading(false);

    if (createError || !createdEvent) {
      setError(createError ?? 'No se pudo crear el evento.');
      return;
    }

    void notifyEventCreated({
      id: createdEvent.id,
      nombre: createdEvent.nombre,
      grupoIds: selectedGrupoIds,
      esAbierto,
      senderId: profile.id,
    });

    notifications.show({ color: 'green', message: `Evento "${createdEvent.nombre}" creado.` });
    navigate('/eventos');
  }

  return (
    <Stack maw={560}>
      <Title order={2}>Nuevo evento</Title>

      {error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      <TextInput label="Nombre" required value={nombre} onChange={(e) => setNombre(e.currentTarget.value)} />
      <Textarea label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.currentTarget.value)} minRows={2} />
      <DateTimePicker label="Fecha y hora" required value={fecha} onChange={(v) => setFecha(v ? new Date(v) : null)} />
      <TextInput label="Ubicación" required value={ubicacion} onChange={(e) => setUbicacion(e.currentTarget.value)} />
      <NumberInput label="Precio" required min={0} value={precio} onChange={(v) => setPrecio(typeof v === 'number' ? v : '')} />

      <Checkbox label="Abierto a todos los socios" checked={esAbierto} onChange={(e) => setEsAbierto(e.currentTarget.checked)} />
      {!esAbierto && (
        <MultiSelect
          label="Grupos destinatarios"
          data={grupoOptions}
          value={selectedGrupoIds}
          onChange={setSelectedGrupoIds}
          placeholder="Seleccioná uno o más grupos"
        />
      )}

      <Checkbox label="Permitir pago en cuotas" checked={allowInstallments} onChange={(e) => setAllowInstallments(e.currentTarget.checked)} />
      {allowInstallments && (
        <>
          <NumberInput
            label="Cantidad de cuotas"
            min={2}
            value={installmentsCount}
            onChange={(v) => setInstallmentsCount(typeof v === 'number' ? v : '')}
          />
          <DateInput label="Vencimiento de la primera cuota" value={firstDueDate} onChange={(v) => setFirstDueDate(v ? new Date(v) : null)} />
        </>
      )}

      <Button onClick={handleSubmit} loading={loading} w="fit-content">
        Crear evento
      </Button>
    </Stack>
  );
}
