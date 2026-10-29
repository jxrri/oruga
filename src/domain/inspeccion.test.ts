import { describe, expect, it } from 'vitest';
import {
  calcularResultado,
  camposVisibles,
  compararInspecciones,
  construirEsquema,
  limpiarOcultos,
  validarPlantilla,
} from './inspeccion';
import { plantillaRetro } from './fixtures';

describe('formulario dinámico (SPEC §9.2)', () => {
  it('marcar fuga muestra ubicación y fotos; el resultado es no apto', () => {
    const r = { fuga: true, fuga_ubicacion: 'Brazo', fuga_fotos: ['e1', 'e2'], nivel_aceite: 60 };
    expect([...camposVisibles(plantillaRetro, r)]).toEqual(['fuga', 'fuga_ubicacion', 'fuga_fotos', 'nivel_aceite']);
    expect(calcularResultado(plantillaRetro, r)).toBe('no_apto');
  });

  it('sin fuga, los campos dependientes se ocultan y no se validan ni envían', () => {
    const r = { fuga: false, fuga_ubicacion: 'Brazo', nivel_aceite: 60 };
    expect(camposVisibles(plantillaRetro, r).has('fuga_fotos')).toBe(false);
    expect(construirEsquema(plantillaRetro).safeParse(r).success).toBe(true);
    expect(limpiarOcultos(plantillaRetro, r)).toEqual({ fuga: false, nivel_aceite: 60 });
    expect(calcularResultado(plantillaRetro, r)).toBe('apto');
  });

  it('exige fotosMin solo cuando el campo está visible', () => {
    const datos = { fuga: true, fuga_ubicacion: 'Bomba', fuga_fotos: ['e1'], nivel_aceite: 60 };
    const r = construirEsquema(plantillaRetro).safeParse(datos);
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => [i.path[0], i.message])).toEqual([['fuga_fotos', 'Se necesitan al menos 2 fotos.']]);
  });

  it('una falla no crítica u observaciones dan apto con observaciones', () => {
    expect(calcularResultado(plantillaRetro, { fuga: false, nivel_aceite: 20 })).toBe('apto_con_observaciones');
    expect(calcularResultado(plantillaRetro, { fuga: false, nivel_aceite: 70 }, 'Rayón en la cabina')).toBe(
      'apto_con_observaciones',
    );
  });

  it('valida rango de nivel y obligatorios', () => {
    const r = construirEsquema(plantillaRetro).safeParse({ nivel_aceite: 140 });
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(['fuga', 'nivel_aceite']);
  });
});

describe('comparación salida contra devolución', () => {
  it('reporta diferencias de lectura, combustible y daños nuevos', () => {
    const salida = { lectura: 1_180, combustiblePct: 90, respuestas: { fuga: false, nivel_aceite: 70 } };
    const devolucion = {
      lectura: 1_236,
      combustiblePct: 35,
      respuestas: { fuga: true, fuga_ubicacion: 'Brazo', nivel_aceite: 70 },
    };
    const c = compararInspecciones(salida, devolucion, plantillaRetro);
    expect(c.difLectura).toBe(56);
    expect(c.difCombustible).toBe(-55);
    expect(c.daniosNuevos.map((x) => x.id)).toEqual(['fuga']);
  });
});

describe('editor de plantillas', () => {
  it('acepta la plantilla de la spec y rechaza referencias rotas e ids repetidos', () => {
    expect(validarPlantilla(plantillaRetro).ok).toBe(true);
    const rota = structuredClone(plantillaRetro);
    rota.secciones[0]!.campos[1]!.visibleSi = { campo: 'no_existe', op: 'eq', valor: true };
    rota.secciones[0]!.campos[3]!.id = 'fuga';
    const r = validarPlantilla(rota);
    expect(r.ok).toBe(false);
    const texto = r.ok ? '' : r.errores.join('\n');
    expect(texto).toContain('Id de campo repetido: fuga');
    expect(texto).toContain('campo inexistente: no_existe');
  });
});
