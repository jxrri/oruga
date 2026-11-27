/** Sesión y catálogos. */
import type { LoginBody, RegistroBody } from '@/api/contrato';
import { autenticar, cerrarSesion, registrar } from '../cuentas';
import { db } from '../db';
import { invalido, json, leerCuerpo, ruta, tokenDe } from '../servidor';

export const catalogos = [
  ruta(
    'post',
    'auth/login',
    async ({ request }) => {
      const body = await leerCuerpo<LoginBody>(request);
      if (typeof body?.correo !== 'string' || typeof body.clave !== 'string')
        return invalido([['correo', 'Escribe tu correo y tu clave.']]);
      const sesion = await autenticar(body.correo, body.clave);
      // Un solo mensaje para correo desconocido y clave errada.
      return sesion ? json(sesion) : json({ codigo: 'CREDENCIALES', mensaje: 'Correo o clave incorrectos.' }, 401);
    },
    { forzable: false, publica: true },
  ),
  ruta(
    'post',
    'auth/registro',
    async ({ request }) => {
      const r = await registrar(await leerCuerpo<RegistroBody>(request));
      return 'errores' in r ? invalido(r.errores) : json(r, 201);
    },
    { forzable: false, publica: true },
  ),
  ruta(
    'post',
    'auth/logout',
    async ({ request }) => {
      const token = tokenDe(request);
      if (token) await cerrarSesion(token);
      return json({ ok: true });
    },
    { forzable: false, publica: true },
  ),
  // Sin sesión solo se listan las cuentas de demostración (las muestra el login); el resto, al entrar.
  ruta('get', 'usuarios', ({ usuario }) => json(usuario ? db.usuarios : db.usuarios.filter((u) => u.demo))),
  ruta('get', 'sedes', () => json(db.sedes)),
  ruta('get', 'categorias', () => json(db.categorias)),
  ruta('get', 'tasa-cambio', () => json(db.tasa)),
];
