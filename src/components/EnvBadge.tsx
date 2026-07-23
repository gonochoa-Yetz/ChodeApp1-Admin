import { Badge } from '@mantine/core';

// Recordatorio permanente de que este panel escribe datos reales — no hay
// ambiente de staging desplegado, solo producción.
export function EnvBadge() {
  return (
    <Badge color="red" variant="filled" size="lg" radius="sm">
      PRODUCCIÓN
    </Badge>
  );
}
