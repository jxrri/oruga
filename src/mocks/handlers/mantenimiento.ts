/** Mantenimiento: órdenes por rango, alta, cambios de estado (RF-MNT-04) y planes. */
import type { Activo, EstadoOrden, OrdenCambios, OrdenMantenimiento, OrdenNueva } from '@/api/contrato';
import { aMs, esInstanteUTC } from '@/shared/lib/fechas';
import { db, nuevoId } from '../db';
import { cambiarEstadoActivo, hoyDelActivo } from '../reglas';
import { invalido, json, leerCuerpo, noEncontrado, prohibido, ruta, versionVieja } from '../servidor';
import { enRango } from './reservas';

const ESTADOS: EstadoOrden[] = ['programada', 'en_proceso', 'completada', 'cancelada'];
const cerrada = (o: OrdenMantenimiento) => o.estado === 'completada' || o.estado === 'cancelada';

function erroresIntervalo(inicio: unknown, fin: unknown): [string, string][] {
  if (typeof inicio !== 'string' || !esInstanteUTC(inicio)) return [['inicio', 'Fecha de inicio inválida (ISO UTC).']];
  if (typeof fin !== 'string' || !esInstanteUTC(fin)) return [['finEstimado', 'Fecha de fin inválida (ISO UTC).']];
  return aMs(inicio) < aMs(fin) ? [] : [['finEstimado', 'El fin debe ser posterior al inicio.']];
}

/** Efecto de la orden sobre el activo: en proceso lo bloquea; al cerrarse vuelve a operativo si nada más lo retiene. */
function aplicarAlActivo(o: OrdenMantenimiento, activo: Activo, usuarioId: string): void {
  if (o.estado === 'en_proceso' && activo.estadoOperativo === 'operativo')
    cambiarEstadoActivo(activo, 'en_mantenimiento', usuarioId, `Orden ${o.id} en proceso: ${o.descripcion}`);
  if (!cerrada(o) || activo.estadoOperativo === 'baja' || activo.estadoOperativo === 'operativo') return;
  const retiene = db.ordenes.some(
    (x) => x.id !== o.id && x.activoId === activo.id && (x.estado === 'en_proceso' || (x.tipo === 'correctivo' && x.estado === 'programada')),
  );
  if (!retiene) cambiarEstadoActivo(activo, 'operativo', usuarioId, `Orden ${o.id} ${o.estado}.`);
}

export const mantenimiento = [
  ruta('get', 'mantenimiento/ordenes', ({ query }) => {
    const activoId = query.get('activoId');
    return json(db.ordenes.filter((o) => enRango(query, o.inicio, o.finEstimado) && (!activoId || o.activoId === activoId)));
  }),
  ruta('get', 'mantenimiento/planes', () => json(db.planes)),

  ruta('post', 'mantenimiento/ordenes', async ({ request, usuario }) => {
    const sinPermiso = prohibido(usuario, 'crear', 'orden');
    if (sinPermiso) return sinPermiso;
    const b = await leerCuerpo<OrdenNueva>(request);
    if (!b) return invalido([['cuerpo', 'Cuerpo de la petición inválido.']]);
    const activo = db.activos.find((a) => a.id === b.activoId);
    const errores: [string, string][] = [...erroresIntervalo(b.inicio, b.finEstimado)];
    if (!activo) errores.push(['activoId', 'El activo no existe.']);
    if (b.tipo !== 'preventivo' && b.tipo !== 'correctivo') errores.push(['tipo', 'Tipo de orden inválido.']);
    if (!b.descripcion?.trim()) errores.push(['descripcion', 'Describe el trabajo a realizar.']);
    if (b.estado && !ESTADOS.includes(b.estado)) errores.push(['estado', 'Estado inválido.']);
    if (errores.length || !activo) return invalido(errores);
    const orden: OrdenMantenimiento = { ...b, origen: b.origen ?? 'manual', id: nuevoId('ord'), estado: b.estado ?? 'programada', version: 1 };
    db.ordenes.push(orden);
    aplicarAlActivo(orden, activo, usuario!.id);
    return json(orden, 201);
  }),

  ruta('patch', 'mantenimiento/ordenes/:id', async ({ request, params, usuario }) => {
    const sinPermiso = prohibido(usuario, 'editar', 'orden');
    if (sinPermiso) return sinPermiso;
    const o = db.ordenes.find((x) => x.id === params.id);
    if (!o) return noEncontrado('La orden');
    const c = await leerCuerpo<OrdenCambios>(request);
    if (!c) return invalido([['cuerpo', 'Cuerpo de la petición inválido.']]);
    const vieja = versionVieja(c.version, o.version);
    if (vieja) return vieja;
    if (cerrada(o)) return invalido([['estado', 'La orden ya está cerrada.']]);
    if (c.estado && !ESTADOS.includes(c.estado)) return invalido([['estado', 'Estado inválido.']]);
    const inicio = c.inicio ?? o.inicio;
    const finEstimado = c.finEstimado ?? o.finEstimado;
    const errores = erroresIntervalo(inicio, finEstimado);
    if (errores.length) return invalido(errores);
    const activo = db.activos.find((a) => a.id === o.activoId)!;
    if (c.lecturaCierre !== undefined && !(c.lecturaCierre >= 0)) return invalido([['lecturaCierre', 'Lectura inválida.']]);
    Object.assign(o, { inicio, finEstimado, estado: c.estado ?? o.estado, version: o.version + 1 });
    if (o.estado === 'completada' && o.tipo === 'preventivo') {
      const lectura = Math.max(activo.lecturaActual, c.lecturaCierre ?? activo.lecturaActual);
      Object.assign(activo, { lecturaActual: lectura, ultimoServicio: { lectura, fecha: hoyDelActivo(activo) }, version: activo.version + 1 });
    }
    aplicarAlActivo(o, activo, usuario!.id);
    return json(o);
  }),
];
