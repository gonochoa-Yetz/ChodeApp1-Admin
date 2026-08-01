import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Chip, Group, Loader, Stack, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../contexts/AuthContext';
import { createSalesForUsers, getActiveProducts } from '../../services/clubSalesAdminService';
import { searchUsers } from '../../services/userService';
import type { ClubProductRow } from '../../types/clubSale';
import type { User } from '../../types/user';

export function VenderProducto() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<ClubProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ClubProductRow | null>(null);

  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Map<string, User>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getActiveProducts().then(({ data, error }) => {
      if (error) notifications.show({ color: 'red', title: 'Error', message: error });
      setProducts(data ?? []);
      if (data && data.length > 0) setSelectedProduct((prev) => prev ?? data[0]);
      setLoadingProducts(false);
    });
  }, []);

  useEffect(() => {
    if (!userSearch.trim()) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(userSearch).then(({ data }) => setUserResults(data ?? []));
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const selectedList = useMemo(() => Array.from(selectedUsers.values()), [selectedUsers]);

  function toggleUser(user: User) {
    setSelectedUsers((prev) => {
      const next = new Map(prev);
      if (next.has(user.id)) next.delete(user.id);
      else next.set(user.id, user);
      return next;
    });
  }

  async function handleSubmit() {
    if (!selectedProduct) {
      notifications.show({ color: 'red', title: 'Elegí un producto', message: 'Seleccioná un producto del catálogo.' });
      return;
    }
    if (selectedUsers.size === 0) {
      notifications.show({ color: 'red', title: 'Sin jugadores', message: 'Seleccioná al menos un jugador.' });
      return;
    }
    if (!profile?.id) return;

    setSubmitting(true);
    const { error } = await createSalesForUsers(
      selectedProduct,
      Array.from(selectedUsers.keys()),
      profile.club_id ?? null,
      profile.id
    );
    setSubmitting(false);

    if (error) {
      notifications.show({ color: 'red', title: 'Error', message: error });
      return;
    }

    notifications.show({ color: 'green', message: `Se cargó "${selectedProduct.nombre}" a ${selectedUsers.size} jugador(es).` });
    navigate('/ventas');
  }

  if (loadingProducts) return <Loader />;

  return (
    <Stack maw={640}>
      <Title order={2}>Nueva venta</Title>

      <Text fw={600}>1. Elegí el producto</Text>
      {products.length === 0 ? (
        <Stack gap={4}>
          <Text c="dimmed" size="sm">
            No hay productos activos en el catálogo.
          </Text>
          <Button component={Link} to="/ventas/productos" variant="light" w="fit-content">
            Ir a Productos
          </Button>
        </Stack>
      ) : (
        <Group>
          {products.map((p) => (
            <Chip key={p.id} checked={selectedProduct?.id === p.id} onChange={() => setSelectedProduct(p)}>
              {p.nombre} · ${p.precio.toLocaleString('es-AR')}
            </Chip>
          ))}
        </Group>
      )}

      <Text fw={600} mt="md">
        2. Seleccioná los jugadores
      </Text>

      {selectedList.length > 0 && (
        <Group gap="xs">
          {selectedList.map((u) => (
            <Badge key={u.id} variant="light" rightSection={
              <Text size="xs" style={{ cursor: 'pointer' }} onClick={() => toggleUser(u)}>×</Text>
            }>
              {u.nombre} {u.apellido}
            </Badge>
          ))}
        </Group>
      )}

      <TextInput
        placeholder="Buscar por nombre, apellido o email..."
        value={userSearch}
        onChange={(e) => setUserSearch(e.currentTarget.value)}
      />

      <Stack gap="xs">
        {userResults.map((u) => {
          const isSelected = selectedUsers.has(u.id);
          return (
            <Group key={u.id} justify="space-between">
              <Text size="sm">
                {u.nombre} {u.apellido} · {u.email}
              </Text>
              <Button size="xs" variant={isSelected ? 'filled' : 'outline'} onClick={() => toggleUser(u)}>
                {isSelected ? 'Quitar' : 'Agregar'}
              </Button>
            </Group>
          );
        })}
      </Stack>

      <Button mt="md" loading={submitting} onClick={handleSubmit} disabled={!selectedProduct || selectedUsers.size === 0}>
        Cargar venta a {selectedUsers.size} jugador{selectedUsers.size === 1 ? '' : 'es'}
      </Button>
    </Stack>
  );
}
