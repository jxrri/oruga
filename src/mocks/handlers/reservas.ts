/** Reservas: consultas por rango, simulación, alta, edición y transiciones (SPEC §4.2, §4.3, §11.2). */
import type { AccionTransicion, Reserva, ReservaCambios, ReservaNueva, TransicionBody, ValidarReservaBody } from '@/api/contrato';
import { cambioPermitido, evaluarTransicion, TRANSICIONES } from '@/domain/reservaFSM';
import { ahora, aMs, esInstanteUTC } from '@/shared/lib/fechas';
import { db, nuevoId } from '../db';
import { emitir } from '../eventos';
import { conflictosPara, montoDe, rechazoPorConflictos, registrarCambios } from '../reglas';
import { invalido, json, leerCuerpo, lista, noEncontrado, prohibido, ruta, versionVieja } from '../servidor';

/** Filtro de solape [desde, hasta) sobre un intervalo; sin rango válido no filtra. */
export const enRango = (q: URLSearchParams, inicio: string, fin: string) => {
  const desde = q.get('desde');
  const hasta = q.get('hasta');
  return (!desde || !esInstanteUTC(desde) || aMs(fin) > aMs(desde)) && (!hasta || !esInstanteUTC(hasta) || aMs(inicio) < aMs(hasta));
};

type Errores = [string, string][];

function erroresIntervalo(inicio: unknown, fin: unknown): Errores {
  if (typeof inicio !== 'string' || !esInstanteUTC(inicio)) return [['inicio', 'Fecha de inicio inválida (ISO UTC).']];
  if (typeof fin !== 'string' || !esInstanteUTC(fin)) return [['fin', 'Fecha de fin inválida (ISO UTC).']];
  return aMs(inicio) < aMs(fin) ? [] : [['fin', 'El fin debe ser posterior al inicio.']];
}

function erroresNueva(b: ReservaNueva | null): Errores {
  if (!b) return [['cuerpo', 'Cuerpo de la petición inválido.']];
  const e: Errores = [];
  if (!db.clientes.some((c) => c.id === b.clienteId)) e.push(['clienteId', 'El cliente no existe.']);
  if (!db.categorias.some((c) => c.id === b.categoriaId)) e.push(['categoriaId', 'La categoría no existe.']);
  if (!db.sedes.some((s) => s.id === b.sedeRetiroId)) e.push(['sedeRetiroId', 'La sede de retiro no existe.']);
  if (!db.sedes.some((s) => s.id === b.sedeDevolucionId)) e.push(['sedeDevolucionId', 'La sede de devolución no existe.']);
  if (b.activoId !== null) {
    const a = db.activos.find((x) => x.id === b.activoId);
    if (!a) e.push(['activoId', 'El activo no existe.']);
    else if (a.categoriaId !== b.categoriaId) e.push(['activoId', `${a.codigo} no pertenece a la categoría elegida.`]);
  }
  return [...e, ...erroresIntervalo(b.inicio, b.fin)];
}

const buscar = (id: string | undefined) => db.reservas.find((r) => r.id === id);

export const reservas = [
  ruta('get', 'reservas', ({ query }) => {
    const ids = lista(query, 'activoIds');
    return json(db.reservas.filter((r) => enRango(query, r.inicio, r.fin) && (!ids.length || (r.activoId !== null && ids.includes(r.activoId)))));
  }),
  ruta('get', 'reservas/:id', ({ params }) => {
    const r = buscar(params.id);
    return r ? json(r) : noEncontrado('La reserva');
  }),
  ruta('get', 'reservas/:id/historial', ({ params }) => json(db.historialReservas.filter((h) => h.reservaId === params.id))),

  ruta(
    'post',
    'reservas/validar',
    async ({ request }) => {
      const b = await leerCuerpo<ValidarReservaBody>(request);
      const errores = erroresNueva(b);
      if (errores.length || !b) return invalido(errores);
      const estado = buscar(b.id)?.estado ?? 'borrador';
      return json({ conflictos: conflictosPara({ ...b, estado }), montoEstimado: montoDe(b.categoriaId, b.inicio, b.fin) });
    },
    { forzable: false },
  ),

  ruta('post', 'reservas', async ({ request, usuario }) => {
    const sinPermiso = prohibido(usuario, 'crear', 'reserva');
    if (sinPermiso) return sinPermiso;
    const b = await leerCuerpo<ReservaNueva>(request);
    const errores = erroresNueva(b);
    if (errores.length || !b) return invalido(errores);
    const aceptadas = b.advertenciasAceptadas ?? [];
    const rechazo = rechazoPorConflictos(conflictosPara({ ...b, estado: 'borrador' }), aceptadas);
    if (rechazo) return rechazo;
    const numero = Math.max(0, ...db.reservas.map((r) => Number(r.codigo.slice(-5)) || 0)) + 1;
    const r: Reserva = {
      ...b,
      id: nuevoId('res'),
      codigo: `R-2026-${String(numero).padStart(5, '0')}`,
      estado: 'borrador',
      advertenciasAceptadas: aceptadas,
      montoEstimado: montoDe(b.categoriaId, b.inicio, b.fin),
      version: 1,
    };
    db.reservas.push(r);
    registrarCambios(null, r, usuario!.id, ['estado']);
    return json(r, 201);
  }),

  ruta('patch', 'reservas/:id', async ({ request, params, usuario }) => {
    const sinPermiso = prohibido(usuario, 'mover', 'reserva');
    if (sinPermiso) return sinPermiso;
    const r = buscar(params.id);
    if (!r) return noEncontrado('La reserva');
    const c = await leerCuerpo<ReservaCambios>(request);
    if (!c) return invalido([['cuerpo', 'Cuerpo de la petición inválido.']]);
    const vieja = versionVieja(c.version, r.version);
    if (vieja) return vieja;
    const permitido = cambioPermitido(r, c);
    if (!permitido.ok) return invalido([[c.activoId !== undefined ? 'activoId' : 'inicio', permitido.motivo]]);
    const activo = c.activoId ? db.activos.find((a) => a.id === c.activoId) : null;
    if (c.activoId && !activo) return invalido([['activoId', 'El activo no existe.']]);
    const nueva: Reserva = {
      ...r,
      ...(c.inicio !== undefined ? { inicio: c.inicio } : {}),
      ...(c.fin !== undefined ? { fin: c.fin } : {}),
      ...(c.activoId !== undefined ? { activoId: c.activoId } : {}),
      ...(activo ? { categoriaId: activo.categoriaId } : {}),
      advertenciasAceptadas: c.advertenciasAceptadas ?? r.advertenciasAceptadas,
    };
    const errores = erroresIntervalo(nueva.inicio, nueva.fin);
    if (errores.length) return invalido(errores);
    const rechazo = rechazoPorConflictos(conflictosPara(nueva), nueva.advertenciasAceptadas);
    if (rechazo) return rechazo;
    const antes = { ...r };
    Object.assign(r, nueva, { montoEstimado: montoDe(nueva.categoriaId, nueva.inicio, nueva.fin), version: r.version + 1 });
    registrarCambios(antes, r, usuario!.id, ['inicio', 'fin', 'activoId', 'categoriaId', 'advertenciasAceptadas']);
    return json(r);
  }),

  ruta('post', 'reservas/:id/transiciones', async ({ request, params, usuario }) => {
    const b = await leerCuerpo<TransicionBody>(request);
    if (!b || !(b.accion in TRANSICIONES)) return invalido([['accion', 'Acción desconocida.']]);
    const accion: AccionTransicion = b.accion;
    const sinPermiso = prohibido(usuario, accion, 'reserva');
    if (sinPermiso) return sinPermiso;
    const r = buscar(params.id);
    if (!r) return noEncontrado('La reserva');
    const vieja = versionVieja(b.version, r.version);
    if (vieja) return vieja;
    const hacia = TRANSICIONES[accion].hacia;
    const bloqueantes = accion === 'cancelar' ? [] : conflictosPara({ ...r, estado: hacia }).filter((x) => x.severidad === 'bloqueante');
    const res = evaluarTransicion(r, accion, {
      bloqueantes: bloqueantes.length,
      clienteBloqueado: db.clientes.find((x) => x.id === r.clienteId)?.estado === 'bloqueado',
      resultadoSalida: db.inspecciones.find((i) => i.id === r.inspeccionSalidaId)?.resultado,
    });
    if (!res.ok) {
      const porConflictos = /conflictos/.test(res.motivo) ? rechazoPorConflictos(bloqueantes) : null;
      return porConflictos ?? invalido([['accion', res.motivo]]);
    }
    const antes = { ...r };
    Object.assign(r, { estado: res.hacia, version: r.version + 1 });
    registrarCambios(antes, r, usuario!.id, ['estado']);
    const activo = db.activos.find((a) => a.id === r.activoId);
    const sede = db.sedes.find((s) => s.id === (accion === 'entregar' ? r.sedeRetiroId : r.sedeDevolucionId));
    if (activo && sede && (accion === 'entregar' || accion === 'devolver')) {
      // Al entregar sale a una obra cercana a la sede; al devolver queda en el patio de devolución.
      const base = sede.coordenadas;
      if (accion === 'entregar') db.obras[activo.id] = { lat: +(base.lat + 0.03).toFixed(5), lng: +(base.lng + 0.04).toFixed(5) };
      else delete db.obras[activo.id];
      activo.ubicacion = { ...(db.obras[activo.id] ?? base), registradaEn: ahora() };
      emitir({ tipo: 'activo.posicion', en: activo.ubicacion.registradaEn, datos: { id: activo.id, ubicacion: activo.ubicacion } });
    }
    return json(r);
  }),
];
