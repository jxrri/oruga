import { volverSeguro } from './navegacion';

describe('volverSeguro', () => {
  it('acepta rutas internas con su consulta', () => {
    expect(volverSeguro('/tablero')).toBe('/tablero');
    expect(volverSeguro('/reservas?estado=en_curso&vista=semana')).toBe('/reservas?estado=en_curso&vista=semana');
    expect(volverSeguro('/inventario/act-exc-001')).toBe('/inventario/act-exc-001');
  });

  it('rechaza todo lo que el navegador podría resolver fuera del sitio, y el propio login', () => {
    for (const valor of [null, '', 'tablero', 'https://otro.sitio', '//otro.sitio', '/\\otro.sitio', '/\t/otro.sitio', '/\n/otro.sitio', '/a\\b', '/login', '/login?volver=%2F'])
      expect(volverSeguro(valor)).toBeNull();
  });
});
