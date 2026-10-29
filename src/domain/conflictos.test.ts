import { describe, expect, it } from 'vitest';
import type { Cliente, PlanMantenimiento } from '@/api/contrato';
import { aMs } from '@/shared/lib/fechas';
import { clasificar, conflictosAbiertos, detectarConflictos, type ContextoActivo, type Propuesta } from './conflictos';
import { activo, orden, reserva, retro } from './fixtures';

const prop = (inicio: string, fin: string, o: Partial<Propuesta> = {}): Propuesta => ({
  activoId: 'act-1',
  inicio: aMs(inicio),
  fin: aMs(fin),
  ...o,
});

const ctx = (o: Partial<ContextoActivo> = {}): ContextoActivo => ({
  activo: activo(),
  categoria: retro,
  reservas: [reserva()],
  ordenes: [],
  ...o,
});

const codigos = (p: Propuesta, c: ContextoActivo) => detectarConflictos(p, c).map((x) => x.codigo);

describe('detectarConflictos', () => {
  it('SOLAPE bloqueante con otra reserva del mismo activo', () => {
    const out = detectarConflictos(prop('2026-11-04T12:00:00Z', '2026-11-06T12:00:00Z'), ctx());
    expect(out[0]).toMatchObject({ codigo: 'SOLAPE', severidad: 'bloqueante', con: 'res-1' });
    expect(clasificar(out)).toBe('bloqueado');
  });

  it('contiguo no solapa pero invade el tiempo de preparación (BUFFER, advertencia)', () => {
    const out = detectarConflictos(prop('2026-11-05T22:00:00Z', '2026-11-07T22:00:00Z'), ctx());
    expect(out.map((c) => c.codigo)).toEqual(['BUFFER']);
    expect(clasificar(out)).toBe('advertencia');
  });

  it('respetando las 8 h de preparación es válido', () => {
    expect(codigos(prop('2026-11-06T06:00:00Z', '2026-11-07T22:00:00Z'), ctx())).toEqual([]);
  });

  it('se ignora a sí misma y a las canceladas', () => {
    expect(codigos(prop('2026-11-04T00:00:00Z', '2026-11-05T00:00:00Z', { id: 'res-1' }), ctx())).toEqual([]);
    const cancelada = ctx({ reservas: [reserva({ estado: 'cancelada' })] });
    expect(codigos(prop('2026-11-04T00:00:00Z', '2026-11-05T00:00:00Z'), cancelada)).toEqual([]);
  });

  it('MANTENIMIENTO cuando una orden pendiente se cruza; las completadas no cuentan', () => {
    const p = prop('2026-11-10T00:00:00Z', '2026-11-12T00:00:00Z');
    expect(codigos(p, ctx({ ordenes: [orden()] }))).toEqual(['MANTENIMIENTO']);
    expect(codigos(p, ctx({ ordenes: [orden({ estado: 'completada' })] }))).toEqual([]);
  });

  it('NO_OPERATIVO si el activo está fuera de servicio', () => {
    const c = ctx({ activo: activo({ estadoOperativo: 'fuera_de_servicio' }), reservas: [] });
    expect(codigos(prop('2026-11-20T00:00:00Z', '2026-11-21T00:00:00Z'), c)).toEqual(['NO_OPERATIVO']);
  });

  it('DOCUMENTO_VENCIDO si el seguro vence antes del fin; el día del vencimiento aún cubre', () => {
    const c = ctx({ reservas: [], activo: activo({ documentos: [{ tipo: 'seguro', numero: 'P-1', venceEl: '2026-11-20' }] }) });
    expect(codigos(prop('2026-11-19T12:00:00Z', '2026-11-21T03:59:00Z'), c)).toEqual([]);
    expect(codigos(prop('2026-11-19T12:00:00Z', '2026-11-21T12:00:00Z'), c)).toEqual(['DOCUMENTO_VENCIDO']);
  });

  it('MANT_PROYECTADO cuando la lectura proyectada supera el umbral del plan', () => {
    const plan: PlanMantenimiento = { id: 'pl-250', categoriaId: retro.id, nombre: 'Servicio 250 h', cadaLectura: 250, avisoAntes: 25 };
    // 1180 + 6 h/día × 12 días = 1252 > 1000 + 250
    const c = ctx({ reservas: [], planes: [plan] });
    expect(codigos(prop('2026-11-20T00:00:00Z', '2026-12-02T00:00:00Z'), c)).toEqual(['MANT_PROYECTADO']);
    expect(codigos(prop('2026-11-20T00:00:00Z', '2026-11-24T00:00:00Z'), c)).toEqual([]);
  });

  it('TRASLADO si al retiro el activo estará en otra sede', () => {
    const c = ctx({ reservas: [reserva({ sedeDevolucionId: 'sede-cuc' })], nombreSede: () => 'Cúcuta' });
    const out = detectarConflictos(prop('2026-11-08T00:00:00Z', '2026-11-09T00:00:00Z', { sedeRetiroId: 'sede-mcbo' }), c);
    expect(out.map((x) => x.codigo)).toEqual(['TRASLADO']);
    expect(out[0]!.mensaje).toContain('Cúcuta');
  });

  it('CLIENTE_BLOQUEADO solo al confirmar', () => {
    const cliente: Cliente = {
      id: 'cli-1', tipo: 'empresa', nombre: 'Vialca Obras Civiles', documento: 'J-40123456-7',
      telefono: '+58 261 7412290', email: 'compras@vialca.com.ve', estado: 'bloqueado', version: 1,
    };
    const c = ctx({ reservas: [], cliente });
    const p = prop('2026-11-20T00:00:00Z', '2026-11-21T00:00:00Z');
    expect(codigos({ ...p, estado: 'borrador' }, c)).toEqual([]);
    expect(codigos({ ...p, estado: 'confirmada' }, c)).toEqual(['CLIENTE_BLOQUEADO']);
  });
});

describe('conflictosAbiertos (panel)', () => {
  it('detecta solapes encadenados por el mayor fin visto y reservas de activos no operativos', () => {
    const ahoraMs = aMs('2026-11-01T00:00:00Z');
    const reservas = [
      reserva({ id: 'a', codigo: 'R-A', inicio: '2026-11-03T00:00:00Z', fin: '2026-11-10T00:00:00Z' }),
      reserva({ id: 'b', codigo: 'R-B', inicio: '2026-11-04T00:00:00Z', fin: '2026-11-05T00:00:00Z' }),
      reserva({ id: 'c', codigo: 'R-C', inicio: '2026-11-06T00:00:00Z', fin: '2026-11-07T00:00:00Z' }),
      reserva({ id: 'd', activoId: 'act-2', inicio: '2026-11-20T00:00:00Z', fin: '2026-11-21T00:00:00Z' }),
      reserva({ id: 'vieja', inicio: '2026-10-01T00:00:00Z', fin: '2026-10-02T00:00:00Z' }),
    ];
    const activos = [activo(), activo({ id: 'act-2', codigo: 'RET-002', estadoOperativo: 'fuera_de_servicio' })];
    const out = conflictosAbiertos({ reservas, activos, ordenes: [], ahoraMs });
    expect(out.map((x) => [x.reservaId, x.conflicto.codigo, x.conflicto.con])).toEqual([
      ['b', 'SOLAPE', 'a'],
      ['c', 'SOLAPE', 'a'],
      ['d', 'NO_OPERATIVO', undefined],
    ]);
  });
});
