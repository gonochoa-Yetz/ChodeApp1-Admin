import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAdmin } from './routes/guards/RequireAdmin';
import { RequireSuperAdmin } from './routes/guards/RequireSuperAdmin';
import { LoginPage } from './routes/LoginPage';
import { DashboardLayout } from './routes/DashboardLayout';
import { HomePage } from './routes/HomePage';
import { ValidarPagos } from './routes/payments/ValidarPagos';
import { GestionarSocios } from './routes/members/GestionarSocios';
import { DetalleSocio } from './routes/members/DetalleSocio';
import { AdminEventos } from './routes/events/AdminEventos';
import { CreateEvent } from './routes/events/CreateEvent';
import { EditEvent } from './routes/events/EditEvent';
import { GestionarEvento } from './routes/events/GestionarEvento';
import { SendNotification } from './routes/notifications/SendNotification';
import { FixtureTabla } from './routes/fixture/FixtureTabla';
import { Rutinas } from './routes/gym/Rutinas';
import { GestionarGrupos } from './routes/groups/GestionarGrupos';
import { ConfigMarketClubes } from './routes/groups/ConfigMarketClubes';
import { ModerarMarket } from './routes/market/ModerarMarket';
import { GestionarVentas } from './routes/sales/GestionarVentas';
import { VenderProducto } from './routes/sales/VenderProducto';
import { ClubProducts } from './routes/sales/ClubProducts';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

const queryClient = new QueryClient();

export default function App() {
  return (
    <MantineProvider defaultColorScheme="auto">
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAdmin />}>
                <Route element={<DashboardLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="/pagos" element={<ValidarPagos />} />
                  <Route path="/eventos" element={<AdminEventos />} />
                  <Route path="/eventos/nuevo" element={<CreateEvent />} />
                  <Route path="/eventos/:id" element={<GestionarEvento />} />
                  <Route path="/eventos/:id/editar" element={<EditEvent />} />
                  <Route path="/notificaciones" element={<SendNotification />} />
                  <Route path="/fixture" element={<FixtureTabla />} />
                  <Route path="/gym" element={<Rutinas />} />
                  <Route path="/ventas" element={<GestionarVentas />} />
                  <Route path="/ventas/nueva" element={<VenderProducto />} />
                  <Route path="/ventas/productos" element={<ClubProducts />} />
                  <Route element={<RequireSuperAdmin />}>
                    <Route path="/socios" element={<GestionarSocios />} />
                    <Route path="/socios/:id" element={<DetalleSocio />} />
                    <Route path="/grupos" element={<GestionarGrupos />} />
                    <Route path="/grupos/clubes" element={<ConfigMarketClubes />} />
                    <Route path="/market" element={<ModerarMarket />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}
