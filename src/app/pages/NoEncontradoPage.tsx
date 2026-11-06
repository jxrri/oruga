import { Link, useLocation } from 'react-router';
import { CompassIcon } from '@phosphor-icons/react';
import { Button } from '@/shared/ui/Button';
import { useUsuario } from '../hooks';
import { rutaInicial } from '../layout/navegacion';

export default function NoEncontradoPage() {
  const { pathname } = useLocation();
  const usuario = useUsuario();
  return (
    <section className="mx-auto flex max-w-lg flex-col items-start gap-4 py-12">
      <span className="grid size-12 place-items-center rounded-xl border border-line bg-panel-2 text-ink-3">
        <CompassIcon size={24} weight="duotone" aria-hidden />
      </span>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Esta ruta no existe</h1>
        <p className="mt-1.5 text-ink-2">
          No hay ninguna pantalla en <code className="font-mono text-[13px] text-ink">{pathname}</code>. Revisa el
          enlace o vuelve a tu inicio.
        </p>
      </div>
      <Button asChild variante="primario">
        <Link to={rutaInicial(usuario)}>Ir a mi inicio</Link>
      </Button>
    </section>
  );
}
