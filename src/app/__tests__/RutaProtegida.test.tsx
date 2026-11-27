// @vitest-environment jsdom
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import type { Rol, Sesion } from '@/api/contrato';
import auth from '@/features/auth/authSlice';
import RutaProtegida from '../RutaProtegida';

function Login() {
  const { pathname, search } = useLocation();
  return <p>login en {pathname + search}</p>;
}

function montar(rol: Rol | null, ruta: string) {
  const sesion: Sesion | null = rol
    ? { token: 't', usuario: { id: 'usr-x', nombre: 'Yelitza Camacho', sedeId: 'sede-mcbo', rol, correo: 'yelitza.camacho@oruga.com.ve' } }
    : null;
  const store = configureStore({ reducer: { auth }, preloadedState: { auth: { sesion } } });
  const router = createMemoryRouter(
    [
      { path: '/login', element: <Login /> },
      {
        path: '/tablero',
        element: (
          <RutaProtegida recurso="tablero">
            <h1>Tablero real</h1>
          </RutaProtegida>
        ),
      },
    ],
    { initialEntries: [ruta] },
  );
  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return router;
}

describe('RutaProtegida', () => {
  it('sin sesión redirige al login recordando la ruta pedida', async () => {
    const router = montar(null, '/tablero?vista=semana');
    expect(await screen.findByText('login en /login?volver=%2Ftablero%3Fvista%3Dsemana')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.queryByText('Tablero real')).not.toBeInTheDocument();
  });

  it('con un rol sin permiso muestra el 403 con los roles que sí pueden entrar', () => {
    montar('inspector', '/tablero');
    expect(screen.getByRole('heading', { name: 'Tu rol no tiene acceso a este módulo' })).toBeInTheDocument();
    expect(screen.queryByText('Tablero real')).not.toBeInTheDocument();
    const texto = screen.getByText(/Pueden abrirlo/).textContent;
    expect(texto).toContain('Inspector de patio');
    expect(texto).toContain('Administrador, Planificador, Jefe de mantenimiento y Gerente');
    expect(screen.getByRole('link', { name: 'Ir a mi inicio' })).toHaveAttribute('href', '/planificador');
  });

  it('con un rol con permiso muestra el módulo', () => {
    montar('gerente', '/tablero');
    expect(screen.getByRole('heading', { name: 'Tablero real' })).toBeInTheDocument();
  });
});
