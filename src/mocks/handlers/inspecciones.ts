/** Plantillas (todas las versiones), inspecciones con sus efectos (SPEC §4.4) y subida de evidencias (SPEC §9.4). */
import { delay } from 'msw';
import type { Evidencia, Inspeccion, InspeccionNueva, InspeccionRegistrada, OrdenMantenimiento, PlantillaInspeccion, Reserva } from '@/api/contrato';
import { calcularResultado, construirEsquema, fallas, limpiarOcultos, validarPlantilla } from '@/domain/inspeccion';
import { ahora, ahoraMs, aMs, MS_24H, sumarMs } from '@/shared/lib/fechas';
import { leerConfigMock } from '../config';
import { db, nuevoId } from '../db';
import { emitir } from '../eventos';
import { cambiarEstadoActivo, registrarCambios } from '../reglas';
import { invalido, json, leerCuerpo, noEncontrado, prohibido, ruta } from '../servidor';

/** Última versión de cada plantilla. */
export const ultimas = (): PlantillaInspeccion[] => {
  const m = new Map<string, PlantillaInspeccion>();
  for (const p of db.plantillas) if ((m.get(p.id)?.version ?? 0) < p.version) m.set(p.id, p);
  return [...m.values()];
};

export const buscarPlantilla = (id: string, version?: number) =>
  version ? db.plantillas.find((p) => p.id === id && p.version === version) : ultimas().find((p) => p.id === id);

const MOMENTO = { salida: 'salida', devolucion: 'devolución', rutina: 'rutina' } as const;
const ESTADO_PARA: Partial<Record<Inspeccion['momento'], Reserva['estado']>> = { salida: 'confirmada', devolucion: 'en_curso' };

// Fallas de subida reproducibles: generador congruencial con semilla fija.
let semillaSubidas = 2026;
const azarSubida = () => (semillaSubidas = (semillaSubidas * 1_664_525 + 1_013_904_223) % 4_294_967_296) / 4_294_967_296;

function registrar(b: InspeccionNueva, plantilla: PlantillaInspeccion, inspectorId: string): InspeccionRegistrada | Response {
  const activo = db.activos.find((a) => a.id === b.activoId);
  if (!activo) return invalido([['activoId', 'El activo no existe.']]);
  if (!(b.momento in MOMENTO)) return invalido([['momento', 'Momento inválido.']]);
  if (!(typeof b.lectura === 'number' && b.lectura >= activo.lecturaActual))
    return invalido([['lectura', `La lectura no puede ser menor que la última registrada (${activo.lecturaActual}).`]]);
  const reserva = b.reservaId ? db.reservas.find((r) => r.id === b.reservaId) : undefined;
  if (b.reservaId && (!reserva || reserva.activoId !== activo.id)) return invalido([['reservaId', 'La reserva no corresponde a este activo.']]);
  const exigido = ESTADO_PARA[b.momento];
  if (reserva && exigido && reserva.estado !== exigido)
    return invalido([['momento', `La inspección de ${MOMENTO[b.momento]} requiere una reserva ${exigido.replace('_', ' ')}.`]]);
  const respuestas = limpiarOcultos(plantilla, b.respuestas ?? {});
  const validacion = construirEsquema(plantilla).safeParse(respuestas);
  if (!validacion.success) return invalido(validacion.error.issues.map((i) => [['respuestas', ...i.path.map(String)], i.message]));

  const inspeccion: Inspeccion = {
    ...b,
    id: nuevoId('ins'),
    inspectorId,
    realizadaEn: ahora(),
    respuestas,
    evidencias: b.evidencias ?? [],
    resultado: calcularResultado(plantilla, respuestas, b.observaciones),
  };
  db.inspecciones.push(inspeccion);
  Object.assign(activo, { lecturaActual: b.lectura, version: activo.version + 1 });

  if (reserva && (b.momento === 'salida' || b.momento === 'devolucion')) {
    const antes = { ...reserva };
    if (b.momento === 'salida') reserva.inspeccionSalidaId = inspeccion.id;
    else reserva.inspeccionDevolucionId = inspeccion.id;
    reserva.version += 1;
    registrarCambios(antes, reserva, inspectorId, ['inspeccionSalidaId', 'inspeccionDevolucionId']);
    emitir({ tipo: 'reserva.actualizada', en: ahora(), datos: reserva });
  }

  let ordenCreada: OrdenMantenimiento | undefined;
  if (inspeccion.resultado === 'no_apto') {
    // Falla crítica: fuera de servicio, orden correctiva y reservas futuras listas para reasignar.
    const criticas = fallas(plantilla, respuestas).criticas.map((c) => c.etiqueta).join('; ');
    cambiarEstadoActivo(activo, 'fuera_de_servicio', inspectorId, `Inspección de ${MOMENTO[b.momento]} no apta: ${criticas}`);
    ordenCreada = {
      id: nuevoId('ord'),
      activoId: activo.id,
      tipo: 'correctivo',
      origen: 'inspeccion',
      inicio: inspeccion.realizadaEn,
      finEstimado: sumarMs(inspeccion.realizadaEn, 3 * MS_24H),
      estado: 'programada',
      descripcion: `Correctivo por inspección no apta: ${criticas}`,
      version: 1,
    };
    db.ordenes.push(ordenCreada);
    emitir({ tipo: 'orden.actualizada', en: ahora(), datos: ordenCreada });
  }
  const reservasAfectadas =
    inspeccion.resultado === 'no_apto'
      ? db.reservas.filter((r) => r.activoId === activo.id && (r.estado === 'borrador' || r.estado === 'confirmada') && aMs(r.fin) > ahoraMs())
      : [];
  return { inspeccion, activo, ...(ordenCreada ? { ordenCreada } : {}), reservasAfectadas };
}

export const inspecciones = [
  ruta('get', 'plantillas-inspeccion', () => json(ultimas())),
  ruta('get', 'plantillas-inspeccion/:id', ({ params, query }) => {
    const p = buscarPlantilla(params.id!, Number(query.get('version')) || undefined);
    return p ? json(p) : noEncontrado('La plantilla');
  }),
  ruta('put', 'plantillas-inspeccion/:id', async ({ request, params, usuario }) => {
    const sinPermiso = prohibido(usuario, 'editar', 'plantilla');
    if (sinPermiso) return sinPermiso;
    const r = validarPlantilla({ ...((await leerCuerpo<object>(request)) ?? {}), id: params.id });
    if (!r.ok)
      return invalido(
        r.errores.map((e) => {
          const i = e.indexOf(': ');
          return [e.slice(0, i), e.slice(i + 2)];
        }),
      );
    // Cada guardado es una versión nueva; las anteriores se conservan para las inspecciones viejas.
    const version = Math.max(0, ...db.plantillas.filter((p) => p.id === params.id).map((p) => p.version)) + 1;
    const nueva: PlantillaInspeccion = { ...r.plantilla, version };
    db.plantillas.push(nueva);
    return json(nueva);
  }),
  ruta('get', 'inspecciones', ({ query }) => {
    const activoId = query.get('activoId');
    const reservaId = query.get('reservaId');
    return json(db.inspecciones.filter((i) => (!activoId || i.activoId === activoId) && (!reservaId || i.reservaId === reservaId)));
  }),
  ruta('get', 'inspecciones/:id', ({ params }) => {
    const i = db.inspecciones.find((x) => x.id === params.id);
    return i ? json(i) : noEncontrado('La inspección');
  }),
  ruta('post', 'inspecciones', async ({ request, usuario }) => {
    const sinPermiso = prohibido(usuario, 'crear', 'inspeccion');
    if (sinPermiso) return sinPermiso;
    const b = await leerCuerpo<InspeccionNueva>(request);
    if (!b) return invalido([['cuerpo', 'Cuerpo de la petición inválido.']]);
    const plantilla = buscarPlantilla(b.plantillaId, b.plantillaVersion);
    if (!plantilla) return invalido([['plantillaVersion', 'La plantilla o su versión no existe.']]);
    const r = registrar(b, plantilla, b.inspectorId || usuario!.id);
    return r instanceof Response ? r : json(r, 201);
  }),
  ruta(
    'post',
    'evidencias',
    async ({ request, usuario }) => {
      const sinPermiso = prohibido(usuario, 'crear', 'inspeccion');
      if (sinPermiso) return sinPermiso;
      const form = await request.formData().catch(() => null);
      const archivo = form && [...form.values()].find((v): v is File => typeof v !== 'string');
      if (!form || !archivo) return invalido([['archivo', 'Adjunta una imagen.']]);
      await delay(600 + Math.random() * 1200);
      if (azarSubida() < leerConfigMock().fallaEvidencias) return json({ mensaje: 'No se pudo subir la foto. Reintenta.' }, 500);
      const evidencia: Evidencia = {
        id: nuevoId('evi'),
        campoId: String(form.get('campoId') ?? ''),
        nombre: archivo.name,
        mime: archivo.type,
        bytes: archivo.size,
        url: URL.createObjectURL(archivo),
        estado: 'lista',
        progreso: 100,
      };
      return json(evidencia, 201);
    },
    { forzable: false },
  ),
];
