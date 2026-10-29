import { describe, expect, it } from 'vitest';
import { enVentana, fusionar, huecos, indexarPor, seSolapan } from './intervalos';
import { reserva } from './fixtures';

describe('intervalos semiabiertos [inicio, fin)', () => {
  it('una reserva que termina a las 10:00 no choca con otra que empieza a las 10:00', () => {
    expect(seSolapan({ inicio: 0, fin: 10 }, { inicio: 10, fin: 20 })).toBe(false);
    expect(seSolapan({ inicio: 0, fin: 11 }, { inicio: 10, fin: 20 })).toBe(true);
  });

  it('fusiona tramos que se tocan o solapan', () => {
    expect(fusionar([{ inicio: 5, fin: 8 }, { inicio: 0, fin: 5 }, { inicio: 10, fin: 12 }])).toEqual([
      { inicio: 0, fin: 8 },
      { inicio: 10, fin: 12 },
    ]);
  });

  it('encuentra los huecos libres dentro de un rango', () => {
    expect(huecos([{ inicio: 2, fin: 4 }, { inicio: 6, fin: 12 }], { inicio: 0, fin: 10 })).toEqual([
      { inicio: 0, fin: 2 },
      { inicio: 4, fin: 6 },
    ]);
  });

  it('índice por fila con búsqueda binaria devuelve solo lo que cruza la ventana', () => {
    const lista = [
      reserva({ id: 'a', inicio: '2026-11-01T00:00:00Z', fin: '2026-11-20T00:00:00Z' }),
      reserva({ id: 'b', inicio: '2026-11-05T00:00:00Z', fin: '2026-11-06T00:00:00Z' }),
      reserva({ id: 'c', inicio: '2026-11-25T00:00:00Z', fin: '2026-11-26T00:00:00Z' }),
      reserva({ id: 'd', activoId: 'otro', inicio: '2026-11-10T00:00:00Z', fin: '2026-11-11T00:00:00Z' }),
    ];
    const indice = indexarPor(lista, (r) => r.activoId);
    const ventana = { inicio: Date.parse('2026-11-10T00:00:00Z'), fin: Date.parse('2026-11-24T00:00:00Z') };
    expect(enVentana(indice.get('act-1'), ventana).map((r) => r.id)).toEqual(['a']);
    expect(enVentana(indice.get('otro'), ventana).map((r) => r.id)).toEqual(['d']);
    expect(enVentana(indice.get('nadie'), ventana)).toEqual([]);
  });
});
