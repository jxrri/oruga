import type { RegistroBody } from '@/api/contrato';
import { CLAVE_DEMO } from '@/features/auth/reglas';
import { autenticar, cerrarSesion, iniciarCuentas, recargarCuentas, registrar, usuarioDeToken, type Persistencia } from './cuentas';
import { db, reiniciarDb } from './db';

const DEMO = 'mariana.urdaneta@oruga.com.ve';

const nueva: RegistroBody = {
  nombre: 'Yelitza Camacho',
  correo: 'yelitza.camacho@oruga.com.ve',
  clave: 'cabilla-y-cemento',
  rol: 'planificador',
  sedeId: 'sede-val',
};

interface Guardado {
  usuarios: unknown[];
  credenciales: Record<string, unknown>;
  sesiones: Record<string, unknown>;
}

/** Sustituto de IndexedDB: guarda copias, como haría el clonado estructurado del navegador. */
function memoria(inicial?: unknown): Persistencia & { crudo: () => string; otraPestana: (cambio: (a: Guardado) => void) => void } {
  let guardado: unknown = inicial;
  return {
    leer: async () => structuredClone(guardado),
    actualizar: async (cambio) => void (guardado = structuredClone(cambio(structuredClone(guardado)))),
    crudo: () => JSON.stringify(guardado),
    /** Escribe en la base sin pasar por este módulo, como haría la app abierta en otra pestaña. */
    otraPestana: (cambio) => {
      const copia = structuredClone(guardado) as Guardado;
      cambio(copia);
      guardado = copia;
    },
  };
}

// Cada entrada o registro deriva una clave con 600 000 iteraciones: holgura para equipos cargados.
describe('cuentas (base de datos local)', { timeout: 60_000 }, () => {
  let bd: ReturnType<typeof memoria>;

  beforeEach(async () => {
    reiniciarDb();
    bd = memoria();
    await iniciarCuentas(bd);
  });

  it('entra con la clave correcta y rechaza la incorrecta o un correo desconocido', async () => {
    const sesion = await autenticar(`  ${DEMO.toUpperCase()} `, CLAVE_DEMO);
    expect(sesion?.usuario.id).toBe('usr-admin');
    expect(usuarioDeToken(sesion!.token)?.id).toBe('usr-admin');

    expect(await autenticar(DEMO, 'otra-clave')).toBeNull();
    expect(await autenticar(DEMO, '')).toBeNull();
    expect(await autenticar('nadie@oruga.com.ve', CLAVE_DEMO)).toBeNull();
  });

  it('registra una cuenta, guarda solo el hash y la recupera tras recargar', async () => {
    const sesion = await registrar(nueva);
    if ('errores' in sesion) throw new Error(JSON.stringify(sesion.errores));
    expect(sesion.usuario).toMatchObject({ nombre: nueva.nombre, correo: nueva.correo, rol: 'planificador', sedeId: 'sede-val' });

    expect(bd.crudo()).toContain(nueva.correo);
    expect(bd.crudo()).not.toContain(nueva.clave);
    expect(bd.crudo()).not.toContain(CLAVE_DEMO);

    // Recarga de la página: la base en memoria vuelve a la semilla y las cuentas se leen del almacén.
    reiniciarDb();
    expect(db.usuarios).toHaveLength(5);
    await iniciarCuentas(bd);

    expect(db.usuarios).toHaveLength(6);
    expect(usuarioDeToken(sesion.token)?.correo).toBe(nueva.correo);
    expect((await autenticar(nueva.correo, nueva.clave))?.usuario.id).toBe(sesion.usuario.id);
    expect(await autenticar(nueva.correo, CLAVE_DEMO)).toBeNull();
  });

  it('rechaza registros inválidos sin guardar nada', async () => {
    const antes = bd.crudo();
    const campos = async (cambios: Partial<RegistroBody>) => {
      const r = await registrar({ ...nueva, ...cambios });
      return 'errores' in r ? r.errores.map(([campo]) => campo) : [];
    };

    expect(await campos({ correo: DEMO.toUpperCase() })).toEqual(['correo']);
    expect(await campos({ correo: 'sin-arroba' })).toEqual(['correo']);
    expect(await campos({ clave: 'corta' })).toEqual(['clave']);
    expect(await campos({ nombre: ' ' })).toEqual(['nombre']);
    expect(await campos({ rol: 'jefe' as RegistroBody['rol'], sedeId: 'sede-x' })).toEqual(['rol', 'sedeId']);
    expect(await registrar(null)).toHaveProperty('errores');

    expect(db.usuarios).toHaveLength(5);
    expect(bd.crudo()).toBe(antes);
  });

  it('cerrar sesión invalida el token', async () => {
    const sesion = await autenticar(DEMO, CLAVE_DEMO);
    await cerrarSesion(sesion!.token);
    expect(usuarioDeToken(sesion!.token)).toBeNull();
    expect(bd.crudo()).not.toContain(sesion!.token);
  });

  it('no pisa lo que otra pestaña escribió en la base y lo reconoce', async () => {
    const otra = { id: 'usr-otra0001', nombre: 'Nelson Rincón', correo: 'nelson.rincon@oruga.com.ve', sedeId: 'sede-ccs', rol: 'inspector' };
    bd.otraPestana((a) => {
      a.usuarios.push(otra);
      a.credenciales[otra.id] = { sal: 'ab'.repeat(16), hash: 'cd'.repeat(32) };
      a.sesiones['token-de-la-otra-pestana'] = otra.id;
    });

    // Esta pestaña escribe después (abre una sesión): lo de la otra debe seguir ahí.
    const sesion = await autenticar(DEMO, CLAVE_DEMO);
    const guardado = JSON.parse(bd.crudo());
    expect(guardado.usuarios.map((u: { correo: string }) => u.correo)).toEqual([otra.correo]);
    expect(guardado.credenciales[otra.id]).toEqual({ sal: 'ab'.repeat(16), hash: 'cd'.repeat(32) });
    expect(guardado.sesiones).toMatchObject({ 'token-de-la-otra-pestana': otra.id, [sesion!.token]: 'usr-admin' });

    // Y la reconoce: su token resuelve y su correo ya no se puede registrar de nuevo.
    expect(usuarioDeToken('token-de-la-otra-pestana')?.correo).toBe(otra.correo);
    const repetida = await registrar({ ...nueva, correo: otra.correo.toUpperCase() });
    expect('errores' in repetida && repetida.errores.map(([campo]) => campo)).toEqual(['correo']);

    // Un cierre de sesión hecho en la otra pestaña no revive cuando esta escribe.
    bd.otraPestana((a) => delete a.sesiones[sesion!.token]);
    await autenticar(DEMO, CLAVE_DEMO);
    expect(bd.crudo()).not.toContain(sesion!.token);
    await recargarCuentas();
    expect(usuarioDeToken(sesion!.token)).toBeNull();
  });

  it('arranca con un registro guardado mal formado y nunca regala la clave de demo a una cuenta registrada', async () => {
    const sinCredencial = { id: 'usr-rota0001', nombre: 'Cuenta Rota', correo: 'rota@oruga.com.ve', sedeId: 'sede-mcbo', rol: 'admin' };
    for (const roto of [
      'texto',
      { usuarios: [null, 7, sinCredencial], credenciales: 'x', sesiones: true },
      { usuarios: 'x', credenciales: { 'usr-admin': { sal: 5, hash: 'zz' } }, sesiones: { t: 9 } },
    ]) {
      reiniciarDb();
      await iniciarCuentas(memoria(roto));
      expect((await autenticar(DEMO, CLAVE_DEMO))?.usuario.id).toBe('usr-admin');
      expect(await autenticar(sinCredencial.correo, CLAVE_DEMO)).toBeNull();
    }
  });
});
