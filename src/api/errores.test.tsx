// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describirError } from './errores';
import { ErrorState } from '@/shared/ui/Estados';

describe('describirError y ErrorState', () => {
  const jsonPermiso = '{"codigo":"PERMISO","mensaje":"El rol Gerente no tiene permiso para esta acción."}';

  it('extrae únicamente mensaje cuando recibe un JSON serializado como string', () => {
    const res = describirError(jsonPermiso);
    expect(res.status).toBe(403);
    expect(res.detalle).toBe('El rol Gerente no tiene permiso para esta acción.');
  });

  it('extrae únicamente mensaje de un FetchBaseQueryError 403 con data objeto o string', () => {
    const desdeObjeto = describirError({
      status: 403,
      data: { codigo: 'PERMISO', mensaje: 'El rol Gerente no tiene permiso para esta acción.' },
    });
    expect(desdeObjeto.detalle).toBe('El rol Gerente no tiene permiso para esta acción.');

    const desdeString = describirError({
      status: 403,
      data: jsonPermiso,
    });
    expect(desdeString.detalle).toBe('El rol Gerente no tiene permiso para esta acción.');
  });

  it('extrae únicamente mensaje cuando ocurre PARSING_ERROR con cuerpo JSON', () => {
    const res = describirError({
      status: 'PARSING_ERROR',
      originalStatus: 403,
      data: jsonPermiso,
      error: 'SyntaxError',
    });
    expect(res.status).toBe(403);
    expect(res.detalle).toBe('El rol Gerente no tiene permiso para esta acción.');
  });

  it('en modo compacto sin título explícito renderiza solo el contenido de mensaje', () => {
    render(<ErrorState error={jsonPermiso} compacto />);
    expect(screen.getByText('El rol Gerente no tiene permiso para esta acción.')).toBeInTheDocument();
    expect(screen.queryByText(/PERMISO/)).not.toBeInTheDocument();
    expect(screen.queryByText('Sin permiso')).not.toBeInTheDocument();
    expect(screen.queryByText('Atención')).not.toBeInTheDocument();
  });
});
