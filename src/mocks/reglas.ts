/** Reglas de servidor simuladas: reutilizan `domain/` para rechazar lo inválido como hará el backend (SPEC §11.1). */
import type { Activo, CambioReserva, Conflicto, CodigoConflicto, EstadoOperativo, ID, Reserva } from '@/api/contrato';
import { advertenciasPendientes, detectarConflictos } from '@/domain/conflictos';
import { cotizar } from '@/domain/tarifas';
import { ahora, aMs, hoyCivil } from '@/shared/lib/fechas';
import { db } from './db';
import { emitir } from './eventos';
import { json } from './servidor';

type DatosConflicto = Pick<Reserva, 'activoId' | 'clienteId' | 'sedeRetiroId' | 'inicio' | 'fin' | 'estado'> & { id?: ID };

export function conflictosPara(r: DatosConflicto): Conflicto[] {
  const activo = r.activoId ? db.activos.find((a) => a.id === r.activoId) : undefined;
  const categoria = activo && db.categorias.find((c) => c.id === activo.categoriaId);
  if (!activo || !categoria) return [];
  return detectarConflictos(
    { id: r.id, activoId: activo.id, clienteId: r.clienteId, sedeRetiroId: r.sedeRetiroId, estado: r.estado, inicio: aMs(r.inicio), fin: aMs(r.fin) },
    {
      activo,
      categoria,
      reservas: db.reservas.filter((x) => x.activoId === activo.id),
      ordenes: db.ordenes.filter((o) => o.activoId === activo.id),
      planes: db.planes,
      cliente: db.clientes.find((c) => c.id === r.clienteId),
      zona: db.sedes.find((s) => s.id === activo.sedeBaseId)?.zonaHoraria,
      nombreSede: (id) => db.sedes.find((s) => s.id === id)?.nombre ?? 'otra sede',
    },
  );
}

const codigoDe = (id: ID) => db.reservas.find((r) => r.id === id)?.codigo ?? id;

/** 409 CONFLICTO con los bloqueantes y las advertencias aún no aceptadas; null si se puede guardar. */
export function rechazoPorConflictos(conflictos: Conflicto[], aceptadas: readonly CodigoConflicto[] = []): Response | null {
  const lista = [...conflictos.filter((c) => c.severidad === 'bloqueante'), ...advertenciasPendientes(conflictos, aceptadas)];
  if (!lista.length) return null;
  return json(
    {
      codigo: 'CONFLICTO',
      mensaje: lista.map((c) => c.mensaje).join(' '),
      conflictos: lista.map((c) => ({ codigo: c.codigo, ...(c.con ? { con: codigoDe(c.con) } : {}) })),
    },
    409,
  );
}

export const montoDe = (categoriaId: ID, inicio: string, fin: string) => {
  const cat = db.categorias.find((c) => c.id === categoriaId);
  return cat ? cotizar(cat.tarifas, aMs(fin) - aMs(inicio)).total : 0;
};

/** Historial de la reserva: una entrada por campo que cambió. */
export function registrarCambios(antes: Partial<Reserva> | null, despues: Reserva, usuarioId: ID, campos: (keyof Reserva)[]): void {
  const en = ahora();
  for (const campo of campos) {
    const a = antes ? antes[campo] : null;
    if (JSON.stringify(a) === JSON.stringify(despues[campo])) continue;
    db.historialReservas.push({ reservaId: despues.id, en, usuarioId, campo, antes: a ?? null, despues: despues[campo] } satisfies CambioReserva);
  }
}

/** Cambia el estado operativo, lo registra (RF-INV-05) y avisa en tiempo real. */
export function cambiarEstadoActivo(activo: Activo, despues: EstadoOperativo, usuarioId: ID, motivo: string): void {
  if (activo.estadoOperativo === despues) return;
  db.historialEstados.push({ activoId: activo.id, en: ahora(), usuarioId, antes: activo.estadoOperativo, despues, motivo });
  activo.estadoOperativo = despues;
  activo.version += 1;
  emitir({ tipo: 'activo.estado', en: ahora(), datos: { id: activo.id, estadoOperativo: despues, version: activo.version } });
}

export const hoyDelActivo = (activo: Activo) => hoyCivil(db.sedes.find((s) => s.id === activo.sedeBaseId)?.zonaHoraria ?? 'America/Caracas');
