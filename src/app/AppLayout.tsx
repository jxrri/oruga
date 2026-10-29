// Marcador temporal: lo reemplaza la tarea T4 (barra lateral, cabecera, selector de rol).
import { Outlet } from 'react-router';

export default function AppLayout() {
  return (
    <main className="min-h-dvh bg-canvas p-6 text-ink">
      <Outlet />
    </main>
  );
}
