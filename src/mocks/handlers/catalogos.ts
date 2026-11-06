/** Sesión y catálogos. */
import type { LoginBody, Sesion } from '@/api/contrato';
import { db } from '../db';
import { invalido, json, leerCuerpo, ruta } from '../servidor';

export const catalogos = [
  ruta(
    'post',
    'auth/login',
    async ({ request }) => {
      const body = await leerCuerpo<LoginBody>(request);
      const usuario = db.usuarios.find((u) => u.id === body?.usuarioId);
      if (!usuario) return invalido([['usuarioId', 'El usuario no existe.']]);
      return json({ usuario, token: `demo.${usuario.id}` } satisfies Sesion);
    },
    { forzable: false },
  ),
  ruta('get', 'usuarios', () => json(db.usuarios)),
  ruta('get', 'sedes', () => json(db.sedes)),
  ruta('get', 'categorias', () => json(db.categorias)),
  ruta('get', 'tasa-cambio', () => json(db.tasa)),
];
