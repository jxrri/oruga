import { describe, expect, it } from 'vitest';
import { diasCiviles, ingresosPorMes, ocupacionPorDia, sumaPorDia } from './useMetricasTablero';

describe('series del tablero', () => {
  // 30 y 31 de octubre, 1 y 2 de noviembre: cruza el fin de mes
  const dias = diasCiviles('2026-10-30', 4);

  it('diasCiviles devuelve días consecutivos', () => {
    expect(dias).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });

  it('ocupacionPorDia cuenta los tramos [inicio, fin) que tocan cada día UTC', () => {
    const tramos = [
      { inicio: '2026-10-30T10:00:00Z', fin: '2026-11-01T00:00:00Z', clave: 'a' }, // el fin es exclusivo: no toca el día 1
      { inicio: '2026-10-31T08:00:00Z', fin: '2026-10-31T12:00:00Z', clave: 'a' }, // misma clave el mismo día
      { inicio: '2026-10-31T23:00:00Z', fin: '2026-11-02T01:00:00Z', clave: 'b' },
    ];
    // Con clave cuenta claves distintas (activos); sin clave, tramos (órdenes)
    expect(ocupacionPorDia(dias, tramos)).toEqual([1, 2, 1, 1]);
    expect(ocupacionPorDia(dias, tramos.map(({ inicio, fin }) => ({ inicio, fin })))).toEqual([1, 3, 1, 1]);
  });

  it('sumaPorDia suma por día UTC y descarta lo que cae fuera del rango', () => {
    const puntos = [
      { en: '2026-10-30T00:00:00Z', valor: 5 },
      { en: '2026-10-30T23:59:00Z', valor: 2 },
      { en: '2026-11-02T12:00:00Z', valor: 1 },
      { en: '2026-11-03T00:00:00Z', valor: 9 },
    ];
    expect(sumaPorDia(dias, puntos)).toEqual([7, 0, 0, 1]);
  });

  it('ingresosPorMes agrupa por mes de inicio y estado, en USD, sin las canceladas', () => {
    const meses = ingresosPorMes([
      { inicio: '2026-11-03T12:00:00Z', estado: 'confirmada', montoEstimado: 150_000 },
      { inicio: '2026-10-28T12:00:00Z', estado: 'finalizada', montoEstimado: 100_050 },
      { inicio: '2026-10-30T12:00:00Z', estado: 'en_curso', montoEstimado: 20_000 },
      { inicio: '2026-11-10T12:00:00Z', estado: 'borrador', montoEstimado: 9_900 },
      { inicio: '2026-11-11T12:00:00Z', estado: 'cancelada', montoEstimado: 999_900 },
    ]);
    expect(meses).toEqual([
      { mes: '2026-10', periodo: 'oct 26', finalizadas: 1001, enCurso: 200, confirmadas: 0, borradores: 0, reservasCount: 2 },
      { mes: '2026-11', periodo: 'nov 26', finalizadas: 0, enCurso: 0, confirmadas: 1500, borradores: 99, reservasCount: 2 },
    ]);
  });
});
