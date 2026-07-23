import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, MultiSelect, Radio, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { getGrupoTree } from '../../services/groupService';
import { getUserIdsByAudienceTarget, sendBulkNotification } from '../../services/notificationService';
import type { DeporteWithGrupos } from '../../types/groups';
import type { NotifAudienceTarget } from '../../types/notification';

export function SendNotification() {
  const { profile } = useAuth();
  const [grupoTree, setGrupoTree] = useState<DeporteWithGrupos[]>([]);
  const [audience, setAudience] = useState<'todos' | 'grupos'>('todos');
  const [selectedGrupoIds, setSelectedGrupoIds] = useState<string[]>([]);
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  useEffect(() => {
    getGrupoTree(profile?.club_id ?? undefined).then(({ data }) => data && setGrupoTree(data));
  }, [profile?.club_id]);

  const grupoOptions = useMemo(
    () => grupoTree.flatMap((d) => d.grupos.map((g) => ({ value: g.id, label: `${d.nombre} · ${g.nombre}` }))),
    [grupoTree]
  );

  async function handleSend() {
    setError(null);
    if (!profile?.id) return;
    if (!titulo.trim() || !mensaje.trim()) {
      setError('Completá el título y el mensaje.');
      return;
    }
    if (audience === 'grupos' && selectedGrupoIds.length === 0) {
      setError('Seleccioná al menos un grupo.');
      return;
    }

    setSending(true);
    const target: NotifAudienceTarget = audience === 'todos' ? { type: 'todos' } : { type: 'grupos', grupoIds: selectedGrupoIds };

    const { userIds, error: audienceError } = await getUserIdsByAudienceTarget(target);
    if (audienceError) {
      setSending(false);
      setError(audienceError);
      return;
    }
    if (userIds.length === 0) {
      setSending(false);
      setError('No hay destinatarios para esta selección.');
      return;
    }

    const { error: sendError } = await sendBulkNotification({
      userIds,
      titulo: titulo.trim(),
      mensaje: mensaje.trim(),
      tipo: 'mensaje',
      senderId: profile.id,
    });
    setSending(false);

    if (sendError) {
      setError(sendError);
      return;
    }
    notifications.show({ color: 'green', message: `Notificación enviada a ${userIds.length} socios.` });
    setTitulo('');
    setMensaje('');
    setPreview(null);
  }

  async function handlePreview() {
    const target: NotifAudienceTarget = audience === 'todos' ? { type: 'todos' } : { type: 'grupos', grupoIds: selectedGrupoIds };
    const { userIds } = await getUserIdsByAudienceTarget(target);
    setPreview(userIds.length);
  }

  return (
    <Stack maw={560}>
      <Title order={2}>Enviar notificación</Title>

      {error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      <Radio.Group label="Destinatarios" value={audience} onChange={(v) => setAudience(v as 'todos' | 'grupos')}>
        <Stack gap="xs" mt="xs">
          <Radio value="todos" label="Todos los socios" />
          <Radio value="grupos" label="Grupos específicos" />
        </Stack>
      </Radio.Group>

      {audience === 'grupos' && (
        <MultiSelect
          label="Grupos"
          data={grupoOptions}
          value={selectedGrupoIds}
          onChange={setSelectedGrupoIds}
          placeholder="Seleccioná uno o más grupos"
        />
      )}

      <Button variant="subtle" size="xs" onClick={handlePreview} w="fit-content">
        Ver cantidad de destinatarios
      </Button>
      {preview !== null && (
        <Text size="sm" c="dimmed">
          Esta notificación llegaría a {preview} socio{preview === 1 ? '' : 's'}.
        </Text>
      )}

      <TextInput label="Título" required value={titulo} onChange={(e) => setTitulo(e.currentTarget.value)} />
      <Textarea label="Mensaje" required value={mensaje} onChange={(e) => setMensaje(e.currentTarget.value)} minRows={4} />

      <Button onClick={handleSend} loading={sending} w="fit-content">
        Enviar notificación
      </Button>
    </Stack>
  );
}
