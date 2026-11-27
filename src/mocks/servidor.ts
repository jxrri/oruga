/** Utilidades comunes de los handlers: latencia, errores forzados, sesión y respuestas (SPEC §11.1, §11.3). */
import { delay, http } from 'msw';
import type { Usuario } from '@/api/contrato';
import { type Accion, ETIQUETA_ROL, puede, type Recurso } from '@/app/permisos';
import { cambiarConfigMock, leerConfigMock } from './config';
import { recargarCuentas, usuarioDeToken } from './cuentas';
import { guardarDb } from './db';

export const json = (data: unknown, status = 200) => Response.json(data, { status });

export const noEncontrado = (que = 'El registro') => json({ mensaje: `${que} no existe.` }, 404);

/** 422 con el formato por defecto de FastAPI. */
export const invalido = (errores: [campo: string | (string | number)[], msg: string][]) =>
  json(
    { detail: errores.map(([campo, msg]) => ({ loc: ['body', ...(Array.isArray(campo) ? campo : [campo])], msg, type: 'value_error' })) },
    422,
  );

export const prohibido = (usuario: Usuario | null, accion: Accion, recurso: Recurso): Response | null =>
  puede(usuario, accion, recurso)
    ? null
    : json(
        { codigo: 'PERMISO', mensaje: usuario ? `El rol ${ETIQUETA_ROL[usuario.rol]} no tiene permiso para esta acción.` : 'Inicia sesión para continuar.' },
        403,
      );

/** Concurrencia optimista: la versión enviada debe ser la guardada. */
export const versionVieja = (enviada: unknown, actual: number): Response | null => {
  if (typeof enviada !== 'number') return invalido([['version', 'Falta la versión del registro.']]);
  return enviada === actual ? null : json({ codigo: 'VERSION', actual, mensaje: 'El registro cambió mientras lo editabas.' }, 409);
};

export async function leerCuerpo<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/** Token de "Authorization: Bearer <token>", emitido al entrar o al registrarse (cuentas.ts). */
export const tokenDe = (request: Request): string | null =>
  /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1] ?? null;

export function usuarioDe(request: Request): Usuario | null {
  const token = tokenDe(request);
  return token ? usuarioDeToken(token) : null;
}

function errorForzado(): Response | null {
  const { forzar } = leerConfigMock();
  if (!forzar) return null;
  if (forzar.modo === 'proxima') cambiarConfigMock({ forzar: null });
  return forzar.codigo === 500
    ? json({ mensaje: 'Error 500 simulado desde el panel de desarrollo.' }, 500)
    : json({ codigo: 'CONFLICTO', mensaje: 'Conflicto 409 simulado desde el panel de desarrollo.', conflictos: [] }, 409);
}

export interface Contexto {
  request: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  usuario: Usuario | null;
}

type Metodo = 'get' | 'post' | 'put' | 'patch';

/** Ruta bajo `${BASE_URL}api/`, con latencia aleatoria y, en escrituras, el error forzado del panel. */
export function ruta(metodo: Metodo, path: string, resolver: (c: Contexto) => Response | Promise<Response>, opciones: { forzable?: boolean; publica?: boolean } = {}) {
  return http[metodo](`${import.meta.env.BASE_URL}api/${path}`, async ({ request, params }) => {
    const { latencia } = leerConfigMock();
    await delay(latencia.min + Math.random() * Math.max(0, latencia.max - latencia.min));
    if (metodo !== 'get' && opciones.forzable !== false) {
      const forzado = errorForzado();
      if (forzado) return forzado;
    }
    let usuario = usuarioDe(request);
    // Antes de dar un token por desconocido se vuelve a leer la base: la sesión pudo abrirse en otra pestaña.
    if (!usuario && tokenDe(request)) {
      await recargarCuentas();
      usuario = usuarioDe(request);
    }
    // Token que el servidor no reconoce (sesión cerrada o base local borrada): 401 para que la app vuelva al login.
    if (!usuario && !opciones.publica && tokenDe(request))
      return json({ codigo: 'SESION', mensaje: 'Tu sesión venció. Vuelve a entrar.' }, 401);
    const res = await resolver({ request, params: params as Record<string, string>, query: new URL(request.url).searchParams, usuario });
    if (metodo !== 'get' && res.ok && !path.startsWith('auth/')) await guardarDb();
    return res;
  });
}

/** Parámetro de lista: admite "a,b" y repetidos. */
export const lista = (q: URLSearchParams, clave: string) => q.getAll(clave).flatMap((v) => v.split(',')).filter(Boolean);
