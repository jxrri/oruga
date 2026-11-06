import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { configurarReloj } from '@/shared/lib/fechas';
import { Providers } from '@/app/providers';
import { store } from '@/app/store';
import { iniciarTiempoReal } from '@/app/tiempoReal';

async function arrancar() {
  const hoy = import.meta.env.VITE_DEMO_HOY as string | undefined;
  if (hoy) configurarReloj({ hoy });

  // Sin backend configurado, MSW intercepta fetch('/api/...') (SPEC §11).
  if (!import.meta.env.VITE_API_URL) {
    const { iniciarMocks } = await import('@/mocks/browser');
    await iniciarMocks();
  }
  iniciarTiempoReal(store);

  const { router } = await import('@/app/router');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  );
}

void arrancar();
