import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Loader, NumberInput, Select, Stack, Textarea, TextInput, Title } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { getEventById, updateEvent } from '../../services/eventAdminService';

const CATEGORIA_OPTIONS = [
  { value: 'plantel', label: 'Plantel' },
  { value: 'juveniles', label: 'Juveniles' },
  { value: 'abierto', label: 'Abierto' },
  { value: 'staff', label: 'Staff' },
  { value: 'grupos', label: 'Grupos (asignado al crear)' },
];

export function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loadingEvent, setLoadingEvent] = useState(true);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState<Date | null>(null);
  const [ubicacion, setUbicacion] = useState('');
  const [precio, setPrecio] = useState<number | ''>('');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getEventById(id).then(({ data, error: loadError }) => {
      if (loadError || !data) {
        setError(loadError ?? 'No se pudo cargar el evento.');
      } else {
        setNombre(data.nombre);
        setDescripcion(data.descripcion ?? '');
        setFecha(new Date(data.fecha));
        setUbicacion(data.ubicacion);
        setPrecio(data.precio);
        setCategoria(data.categoria);
      }
      setLoadingEvent(false);
    });
  }, [id]);

  async function handleSubmit() {
    if (!id) return;
    setError(null);

    if (!nombre.trim() || !ubicacion.trim() || precio === '' || !categoria) {
      setError('Completá todos los campos requeridos.');
      return;
    }
    if (typeof precio === 'number' && precio <= 0) {
      setError('El precio debe ser un número mayor a 0.');
      return;
    }
    if (!fecha) {
      setError('Ingresá una fecha.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await updateEvent(id, {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      fecha: fecha.toISOString(),
      ubicacion: ubicacion.trim(),
      precio: Number(precio),
      categoria,
    });
    setSaving(false);

    if (updateError) {
      setError(updateError);
      return;
    }
    notifications.show({ color: 'green', message: 'Evento actualizado.' });
    navigate('/eventos');
  }

  if (loadingEvent) {
    return <Loader />;
  }

  return (
    <Stack maw={560}>
      <Title order={2}>Editar evento</Title>

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
      <Select label="Categoría (legacy)" data={CATEGORIA_OPTIONS} value={categoria} onChange={setCategoria} />

      <Button onClick={handleSubmit} loading={saving} w="fit-content">
        Guardar cambios
      </Button>
    </Stack>
  );
}
