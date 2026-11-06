import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { LockKeyIcon } from '@phosphor-icons/react';
import type { Rol } from '@/api/contrato';
import { Button } from '@/shared/ui/Button';
import { useUsuario } from './hooks';
import { destinoLogin, rutaInicial } from './layout/navegacion';
import { ETIQUETA_ROL, puede, type Recurso } from './permisos';

const ROLES = Object.keys(ETIQUETA_ROL) as Rol[];

const enumerar = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`);

/** Sin sesión: al login recordando la ruta. Con sesión sin permiso: un 403 dentro del marco de la app. */
export default function RutaProtegida({ recurso, children }: { recurso: Recurso; children: ReactNode }) {
  const usuario = useUsuario();
  const { pathname, search } = useLocation();

  if (!usuario) return <Navigate to={destinoLogin(pathname, search)} replace />;
  if (puede(usuario, 'ver', recurso)) return <>{children}</>;

  const conAcceso = ROLES.filter((rol) => puede({ rol }, 'ver', recurso)).map((rol) => ETIQUETA_ROL[rol]);
  return (
    <section aria-labelledby="titulo-403" className="mx-auto flex max-w-lg flex-col items-start gap-4 py-12">
      <span className="grid size-12 place-items-center rounded-xl border border-line bg-panel-2 text-ink-3">
        <LockKeyIcon size={24} weight="duotone" aria-hidden />
      </span>
      <div>
        <h1 id="titulo-403" className="texto-balance text-xl font-semibold tracking-tight">
          Tu rol no tiene acceso a este módulo
        </h1>
        <p className="texto-bonito mt-1.5 text-ink-2">
          Entraste como <strong className="font-medium text-ink">{ETIQUETA_ROL[usuario.rol]}</strong>.{' '}
          {conAcceso.length
            ? `Pueden abrirlo: ${enumerar(conAcceso)}.`
            : 'Ningún rol de la demo puede abrirlo.'}{' '}
          Cambia de rol desde tu nombre, arriba a la derecha.
        </p>
      </div>
      <Button asChild variante="primario">
        <Link to={rutaInicial(usuario)}>Ir a mi inicio</Link>
      </Button>
    </section>
  );
}
