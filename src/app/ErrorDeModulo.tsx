import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';
import { ArrowClockwiseIcon, ArrowLeftIcon, WarningOctagonIcon } from '@phosphor-icons/react';
import { Button } from '@/shared/ui/Button';

/**
 * Error Boundary por ruta (SPEC §12.2): si un módulo falla, el marco sigue vivo y los demás módulos
 * funcionan. Reintentar recarga la página porque un fallo de carga de módulo no se recupera en memoria.
 */
export default function ErrorDeModulo() {
  const error = useRouteError();
  const navigate = useNavigate();
  const detalle = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : null;

  return (
    <section role="alert" className="mx-auto flex min-h-[50dvh] max-w-lg flex-col items-start justify-center gap-4 px-4 py-12">
      <span className="grid size-12 place-items-center rounded-xl border border-danger/25 bg-danger-soft text-danger">
        <WarningOctagonIcon size={24} weight="duotone" aria-hidden />
      </span>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Este módulo dejó de responder</h1>
        <p className="texto-bonito mt-1.5 text-ink-2">
          El resto de la aplicación sigue disponible. Reintenta o vuelve a la pantalla anterior.
        </p>
        {detalle && (
          <p className="mt-3 rounded-lg border border-line bg-panel-2 px-3 py-2 font-mono text-xs break-words text-ink-3">
            {detalle}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variante="primario" icono={ArrowClockwiseIcon} onClick={() => window.location.reload()}>
          Reintentar
        </Button>
        <Button icono={ArrowLeftIcon} onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    </section>
  );
}
