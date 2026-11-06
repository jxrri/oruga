import { describe, expect, it } from 'vitest';
import { conflictosAbiertos } from '@/domain/conflictos';
import { validarPlantilla } from '@/domain/inspeccion';
import { vencimientoMasCercano } from '@/domain/mantenimiento';
import { aMs, diasEntreCiviles, fechaCivilDe } from '@/shared/lib/fechas';
import { ESCENARIOS } from './escenarios';
import { generarSemilla } from './seed';

const HOY = '2026-11-02T13:30:00Z';
const s = generarSemilla(HOY);
const hoyCivil = fechaCivilDe(HOY, 'America/Caracas');

describe('semilla', () => {
  it('es determinista', () => {
    expect(generarSemilla(HOY)).toEqual(s);
  });

  it('tiene el volumen de SPEC §11.1', () => {
    expect(s.sedes).toHaveLength(4);
    expect(s.categorias).toHaveLength(12);
    expect(s.activos).toHaveLength(120);
    expect(s.clientes).toHaveLength(60);
    expect(s.ordenes).toHaveLength(25);
    expect(s.reservas.length).toBeGreaterThan(330);
    expect(s.reservas.length).toBeLessThan(470);
  });

  it('siembra exactamente 3 conflictos abiertos', () => {
    const c = conflictosAbiertos({ reservas: s.reservas, activos: s.activos, ordenes: s.ordenes, ahoraMs: aMs(HOY) });
    expect(c.map((x) => x.conflicto.codigo).sort()).toEqual(['MANTENIMIENTO', 'SOLAPE', 'SOLAPE']);
  });

  it('siembra los demás escenarios', () => {
    expect(s.reservas.filter((r) => r.activoId === null).length).toBeGreaterThanOrEqual(2);
    expect(s.clientes.some((c) => c.estado === 'bloqueado')).toBe(true);
    const enCurso = s.reservas.filter((r) => r.estado === 'en_curso');
    expect(enCurso.length).toBeGreaterThanOrEqual(3);
    expect(enCurso.every((r) => s.inspecciones.some((i) => i.id === r.inspeccionSalidaId && i.resultado === 'apto'))).toBe(true);
    const seguro = s.activos.find((a) => a.id === ESCENARIOS.activoSeguroPorVencer)!.documentos.find((d) => d.tipo === 'seguro')!;
    expect(diasEntreCiviles(hoyCivil, seguro.venceEl)).toBeLessThanOrEqual(10);
    const vencido = s.activos.find((a) => a.id === ESCENARIOS.activoMantenimientoVencido)!;
    const cat = s.categorias.find((c) => c.id === vencido.categoriaId)!;
    expect(vencimientoMasCercano(vencido, s.planes, cat, hoyCivil)?.vencido).toBe(true);
    const salida = s.reservas.find((r) => r.id === ESCENARIOS.reservaSalidaHoy)!;
    expect(salida).toMatchObject({ estado: 'confirmada', activoId: ESCENARIOS.activoDemo });
    expect(fechaCivilDe(salida.inicio, 'America/Caracas')).toBe(hoyCivil);
    expect(s.reservas.find((r) => r.id === ESCENARIOS.reservaTraslado)).toMatchObject({ sedeRetiroId: 'sede-mcbo', sedeDevolucionId: 'sede-cuc' });
  });

  it('conserva todas las versiones válidas de plantillas', () => {
    expect(s.plantillas.filter((p) => p.id === 'plt-retro').map((p) => p.version)).toEqual([2, 3]);
    for (const p of s.plantillas) expect(validarPlantilla(p)).toMatchObject({ ok: true });
  });
});
