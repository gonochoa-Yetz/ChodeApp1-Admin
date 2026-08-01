import { useEffect, useState } from 'react';
import { Badge, Button, Group, Loader, Modal, NumberInput, Stack, Switch, Table, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';
import {
  createProduct,
  getAllProductsAdmin,
  setProductActive,
  updateProduct,
} from '../../services/clubSalesAdminService';
import type { ClubProductRow } from '../../types/clubSale';

export function ClubProducts() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<ClubProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClubProductRow | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const { data, error } = await getAllProductsAdmin();
    if (error) notifications.show({ color: 'red', title: 'Error', message: error });
    setProducts(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditing(null);
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setModalOpen(true);
  }

  function openEdit(product: ClubProductRow) {
    setEditing(product);
    setNombre(product.nombre);
    setDescripcion(product.descripcion ?? '');
    setPrecio(product.precio);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!nombre.trim()) {
      notifications.show({ color: 'red', title: 'Falta el nombre', message: 'Ingresá un nombre para el producto.' });
      return;
    }
    if (precio === '' || precio < 0) {
      notifications.show({ color: 'red', title: 'Precio inválido', message: 'Ingresá un precio válido.' });
      return;
    }

    setSaving(true);
    const result = editing
      ? await updateProduct(editing.id, { nombre: nombre.trim(), descripcion: descripcion.trim() || null, precio })
      : await createProduct({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          precio,
          club_id: profile?.club_id ?? null,
          created_by: profile?.id ?? null,
        });
    setSaving(false);

    if (result.error) {
      notifications.show({ color: 'red', title: 'Error', message: result.error });
      return;
    }

    notifications.show({ color: 'green', message: editing ? 'Producto actualizado.' : 'Producto creado.' });
    setModalOpen(false);
    loadData();
  }

  async function handleToggleActive(product: ClubProductRow) {
    const { error } = await setProductActive(product.id, !product.activo);
    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, activo: !p.activo } : p)));
  }

  if (loading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Productos</Title>
        <Button onClick={openCreate}>Nuevo producto</Button>
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nombre</Table.Th>
            <Table.Th>Descripción</Table.Th>
            <Table.Th>Precio</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {products.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center" py="md">
                  No hay productos en el catálogo.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {products.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td>{p.nombre}</Table.Td>
              <Table.Td>{p.descripcion ?? '—'}</Table.Td>
              <Table.Td>${p.precio.toLocaleString('es-AR')}</Table.Td>
              <Table.Td>
                <Badge color={p.activo ? 'green' : 'gray'} variant="light">
                  {p.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button size="xs" variant="outline" onClick={() => openEdit(p)}>
                    Editar
                  </Button>
                  <Switch checked={p.activo} onChange={() => handleToggleActive(p)} />
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar producto' : 'Nuevo producto'}>
        <Stack>
          <TextInput
            label="Nombre"
            placeholder="Ej: Cinta de estribar"
            value={nombre}
            onChange={(e) => setNombre(e.currentTarget.value)}
          />
          <TextInput
            label="Descripción (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.currentTarget.value)}
          />
          <NumberInput label="Precio" value={precio} onChange={(v) => setPrecio(typeof v === 'number' ? v : '')} min={0} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={handleSave}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
