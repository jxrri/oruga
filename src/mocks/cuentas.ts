/**
 * Cuentas de la API simulada: usuarios registrados, hashes de clave y sesiones.
 * Es la base de datos local de la demo: un registro en IndexedDB (idb-keyval) con copia en memoria,
 * para que los handlers resuelvan la sesión de cada petición sin esperar al disco.
 *
 * Cada pestaña tiene su propia copia en memoria, así que la verdad es lo guardado: toda escritura se
 * aplica sobre el registro actual dentro de una transacción (nunca se vuelca la copia en memoria) y las
 * lecturas que deciden algo vuelven a leerlo antes.
 *
 * Las claves nunca se guardan en claro: PBKDF2-SHA256 con sal por cuenta (Web Crypto). Aun así vive en el
 * navegador, así que protege la clave, no los datos: quien tenga el equipo puede leer IndexedDB.
 */
import { get, update } from 'idb-keyval';
import type { ID, RegistroBody, Rol, Sesion, Usuario } from '@/api/contrato';
import { ETIQUETA_ROL } from '@/app/permisos';
import { CLAVE_DEMO, CLAVE_MINIMA } from '@/features/auth/reglas';
import { db } from './db';

interface Credencial {
  /** 16 bytes aleatorios en hexadecimal */
  sal: string;
  /** 32 bytes derivados de la clave en hexadecimal */
  hash: string;
}

interface Almacen {
  /** Cuentas creadas desde el registro. Las de la semilla viven en el código. */
  usuarios: Usuario[];
  credenciales: Record<ID, Credencial>;
  /** token de sesión -> id de usuario */
  sesiones: Record<string, ID>;
}

export interface Persistencia {
  leer(): Promise<unknown>;
  /** Lee, transforma y escribe en una sola transacción: otra pestaña no puede escribir en medio. */
  actualizar(cambio: (previo: unknown) => Almacen): Promise<void>;
}

export type ErrorCampo = [campo: string, msg: string];

const CLAVE_IDB = 'oruga.cuentas';
/** Recomendación de OWASP para PBKDF2-HMAC-SHA256. */
const ITERACIONES = 600_000;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Clave que nunca se copia a un mapa: asignarla cambiaría el prototipo del objeto. */
const PROTO = '__proto__';
const CORREO_REPETIDO: ErrorCampo = ['correo', 'Ya existe una cuenta con ese correo.'];

const indexedDb: Persistencia = {
  leer: () => get(CLAVE_IDB),
  actualizar: (cambio) => update(CLAVE_IDB, cambio),
};

const vacio = (): Almacen => ({ usuarios: [], credenciales: {}, sesiones: {} });

let persistencia = indexedDb;
let almacen = vacio();

const aHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const deHex = (hex: string) => Uint8Array.from(hex.match(/../g) ?? [], (par) => parseInt(par, 16));
const normalizar = (correo: string) => correo.trim().toLowerCase();
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const esHex = (v: unknown, bytes: number): v is string => typeof v === 'string' && new RegExp(`^[0-9a-f]{${bytes * 2}}$`).test(v);

/**
 * Lo guardado es una entrada como cualquier otra: se reconstruye pieza a pieza y lo que no encaja se
 * descarta. Una cuenta registrada sin credencial válida se descarta entera (no podría entrar).
 */
function sanear(crudo: unknown): Almacen {
  const a = vacio();
  if (!esObjeto(crudo)) return a;
  if (esObjeto(crudo.credenciales))
    for (const [id, c] of Object.entries(crudo.credenciales))
      if (id !== PROTO && esObjeto(c) && esHex(c.sal, 16) && esHex(c.hash, 32)) a.credenciales[id] = { sal: c.sal, hash: c.hash };
  if (Array.isArray(crudo.usuarios))
    for (const u of crudo.usuarios) {
      if (!esObjeto(u)) continue;
      const { id, nombre, correo, sedeId, rol } = u;
      const textos = [id, nombre, correo, sedeId, rol].every((x) => typeof x === 'string');
      if (textos && Object.hasOwn(ETIQUETA_ROL, rol as string) && Object.hasOwn(a.credenciales, id as string))
        a.usuarios.push({ id, nombre, correo, sedeId, rol } as Usuario);
    }
  if (esObjeto(crudo.sesiones))
    for (const [token, id] of Object.entries(crudo.sesiones)) if (token !== PROTO && typeof id === 'string') a.sesiones[token] = id;
  return a;
}

/** Deja `a` como copia en memoria y sus cuentas registradas dentro de `db.usuarios`. */
function adoptar(a: Almacen): void {
  almacen = a;
  for (const u of a.usuarios) if (!db.usuarios.some((x) => x.id === u.id)) db.usuarios.push(u);
}

/** Vuelve a leer lo guardado: otra pestaña pudo registrar una cuenta, abrir o cerrar una sesión. */
export async function recargarCuentas(): Promise<void> {
  try {
    adoptar(sanear(await persistencia.leer()));
  } catch {
    /* sin IndexedDB (modo privado estricto): las cuentas viven solo en memoria */
  }
}

/** Aplica un cambio sobre lo guardado ahora mismo, no sobre la copia en memoria. */
async function mutar(cambio: (a: Almacen) => void): Promise<void> {
  let fresco: Almacen | undefined;
  try {
    await persistencia.actualizar((previo) => {
      fresco = sanear(previo);
      cambio(fresco);
      return fresco;
    });
  } catch (e) {
    console.warn('Oruga: no se pudo escribir en IndexedDB. Las cuentas y sesiones nuevas duran hasta recargar.', e);
    fresco = almacen;
    cambio(fresco);
  }
  adoptar(fresco ?? almacen);
}

async function derivar(clave: string, sal: string): Promise<string> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: deHex(sal), iterations: ITERACIONES },
    material,
    256,
  );
  return aHex(new Uint8Array(bits));
}

async function crearCredencial(clave: string): Promise<Credencial> {
  const sal = aHex(crypto.getRandomValues(new Uint8Array(16)));
  return { sal, hash: await derivar(clave, sal) };
}

/** Carga el almacén y da su credencial a las cuentas de demostración. Llamar una vez al arrancar. */
export async function iniciarCuentas(p: Persistencia = indexedDb): Promise<void> {
  persistencia = p;
  almacen = vacio();
  await recargarCuentas();

  // Solo las cuentas de la semilla reciben la clave de demo (es pública); una registrada, jamás.
  const sinClave = (a: Almacen) => db.usuarios.filter((u) => u.demo && !Object.hasOwn(a.credenciales, u.id));
  if (sinClave(almacen).length) {
    // Comparten sal y hash porque comparten clave: una sola derivación.
    const credencial = await crearCredencial(CLAVE_DEMO);
    await mutar((a) => {
      for (const u of sinClave(a)) a.credenciales[u.id] = credencial;
    });
  }
}

export async function autenticar(correo: string, clave: string): Promise<Sesion | null> {
  await recargarCuentas();
  const usuario = db.usuarios.find((u) => u.correo === normalizar(correo));
  const credencial = usuario && Object.hasOwn(almacen.credenciales, usuario.id) ? almacen.credenciales[usuario.id] : undefined;
  if (!usuario || !credencial) return null;
  if ((await derivar(clave, credencial.sal)) !== credencial.hash) return null;

  // ponytail: las sesiones no vencen; añadir caducidad cuando las emita un backend real.
  const token = crypto.randomUUID();
  await mutar((a) => {
    a.sesiones[token] = usuario.id;
  });
  return { usuario, token };
}

/** Crea la cuenta y abre su sesión, o devuelve los errores por campo sin tocar el almacén. */
export async function registrar(b: Partial<RegistroBody> | null): Promise<Sesion | { errores: ErrorCampo[] }> {
  const nombre = typeof b?.nombre === 'string' ? b.nombre.trim() : '';
  const correo = typeof b?.correo === 'string' ? normalizar(b.correo) : '';
  const clave = typeof b?.clave === 'string' ? b.clave : '';
  const rol = b?.rol;
  const sedeId = b?.sedeId;

  await recargarCuentas();
  const errores: ErrorCampo[] = [];
  if (nombre.length < 3 || nombre.length > 80) errores.push(['nombre', 'Escribe tu nombre y apellido.']);
  if (!CORREO.test(correo) || correo.length > 120) errores.push(['correo', 'Escribe un correo válido.']);
  else if (db.usuarios.some((u) => u.correo === correo)) errores.push(CORREO_REPETIDO);
  if (clave.length < CLAVE_MINIMA) errores.push(['clave', `La clave debe tener al menos ${CLAVE_MINIMA} caracteres.`]);
  if (typeof rol !== 'string' || !Object.hasOwn(ETIQUETA_ROL, rol)) errores.push(['rol', 'Elige un rol.']);
  if (!db.sedes.some((s) => s.id === sedeId)) errores.push(['sedeId', 'Elige una sede.']);
  if (errores.length) return { errores };

  const usuario: Usuario = { id: `usr-${crypto.randomUUID().slice(0, 8)}`, nombre, correo, sedeId: sedeId as ID, rol: rol as Rol };
  const credencial = await crearCredencial(clave);
  const token = crypto.randomUUID();
  // La derivación tarda: otro registro con el mismo correo pudo guardarse mientras tanto, así que se vuelve a mirar dentro de la transacción.
  let repetido = false;
  await mutar((a) => {
    repetido = a.usuarios.some((u) => u.correo === correo);
    if (repetido) return;
    a.usuarios.push(usuario);
    a.credenciales[usuario.id] = credencial;
    a.sesiones[token] = usuario.id;
  });
  return repetido ? { errores: [CORREO_REPETIDO] } : { usuario, token };
}

export async function cerrarSesion(token: string): Promise<void> {
  await mutar((a) => {
    delete a.sesiones[token];
  });
}

export const usuarioDeToken = (token: string): Usuario | null =>
  (Object.hasOwn(almacen.sesiones, token) && db.usuarios.find((u) => u.id === almacen.sesiones[token])) || null;
