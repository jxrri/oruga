import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { toast } from 'sonner';
import { ArrowRightIcon, EnvelopeSimpleIcon, LockKeyIcon } from '@phosphor-icons/react';
import { useGetSedesQuery, useGetUsuariosQuery, useLoginMutation } from '@/api/baseApi';
import { describirError } from '@/api/errores';
import { useAppDispatch } from '@/app/hooks';
import { ETIQUETA_ROL } from '@/app/permisos';
import { Avatar } from '@/shared/ui/Avatar';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { Skeleton } from '@/shared/ui/Skeleton';
import { sesionIniciada } from '../authSlice';
import { CampoClave } from '../components/CampoClave';
import { ContenidoAuth } from '../components/MarcoAuth';
import { CLAVE_DEMO } from '../reglas';

/** Sin backend configurado las cuentas viven en la base local del navegador y hay cuentas de demostración. */
const HAY_MOCKS = !import.meta.env.VITE_API_URL;

type Errores = { correo?: string; clave?: string; general?: string };

/** Login con correo y clave (SPEC §14). MarcoAuth redirige en cuanto se abre la sesión. */
export default function LoginPage() {
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const { search } = useLocation();
  const formulario = useRef<HTMLFormElement>(null);
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [errores, setErrores] = useState<Errores>({});

  const enfocar = (nombre: string) => formulario.current?.querySelector<HTMLElement>(`[name="${nombre}"]`)?.focus();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const faltan: Errores = {
      correo: correo.trim() ? undefined : 'Escribe tu correo.',
      clave: clave ? undefined : 'Escribe tu clave.',
    };
    setErrores(faltan);
    if (faltan.correo) return enfocar('correo');
    if (faltan.clave) return enfocar('clave');

    try {
      const sesion = await login({ correo, clave }).unwrap();
      dispatch(sesionIniciada(sesion));
      toast.success(`Hola, ${sesion.usuario.nombre.split(' ')[0]}`, { description: 'Qué bueno verte de nuevo.' });
    } catch (err) {
      setErrores({ general: describirError(err).detalle });
      enfocar('clave');
    }
  }

  function rellenar(correoDemo: string) {
    setCorreo(correoDemo);
    setClave(CLAVE_DEMO);
    setErrores({});
    enfocar('entrar');
  }

  return (
    <ContenidoAuth
      titulo={
        <>
          Toda la flota en <span className="text-ink-3">una sola línea de tiempo.</span>
        </>
      }
      bajada="Reservas, inspecciones y mantenimiento de vehículos y maquinaria pesada en Maracaibo, Caracas, Valencia y Cúcuta."
      pie={
        HAY_MOCKS && (
          <>
            <LockKeyIcon size={16} aria-hidden className="mt-px shrink-0" />
            <p className="texto-bonito">
              Las cuentas se guardan en este navegador. La clave se almacena como hash, nunca en texto claro.
            </p>
          </>
        )
      }
    >
      <form ref={formulario} onSubmit={(e) => void enviar(e)} noValidate data-intro className="mt-7 flex flex-col gap-4">
        <Field etiqueta="Correo" error={errores.correo}>
          <Input
            name="correo"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nombre@empresa.com"
            icono={EnvelopeSimpleIcon}
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="[&_input]:h-11"
          />
        </Field>
        <Field etiqueta="Clave" error={errores.clave}>
          <CampoClave name="clave" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
        </Field>

        {errores.general && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
            {errores.general}
          </p>
        )}

        <Button name="entrar" type="submit" variante="primario" tamano="lg" cargando={isLoading && 'Entrando…'} iconoFin={ArrowRightIcon}>
          Entrar
        </Button>
      </form>

      <p data-intro className="mt-5 text-ink-2">
        ¿Primera vez aquí?{' '}
        <Link to={`/registro${search}`} className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent">
          Crea tu cuenta
        </Link>
      </p>

      {HAY_MOCKS && <CuentasDemo alElegir={rellenar} />}
    </ContenidoAuth>
  );
}

/** Cuentas sembradas: un toque rellena el formulario con su correo y la clave de demostración. */
function CuentasDemo({ alElegir }: { alElegir: (correo: string) => void }) {
  const usuarios = useGetUsuariosQuery();
  const { data: sedes } = useGetSedesQuery();
  const demo = usuarios.data?.filter((u) => u.demo) ?? [];
  if (!usuarios.isLoading && !demo.length) return null;

  return (
    <section data-intro aria-labelledby="titulo-demo" className="mt-7 border-t border-line pt-5">
      <h2 id="titulo-demo" className="text-[13px] font-medium text-ink">
        Cuentas de demostración
      </h2>
      <p className="mt-1 text-[13px] text-ink-3">
        Elige una para rellenar el formulario. Todas usan la clave{' '}
        <code className="rounded-md border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-xs text-ink-2">{CLAVE_DEMO}</code>
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-busy={usuarios.isLoading || undefined}>
        {usuarios.isLoading
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-12 rounded-xl" />
              </li>
            ))
          : demo.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => alElegir(u.correo)}
                  className="group flex h-12 w-full items-center gap-2.5 rounded-xl border border-line bg-panel/80 pl-2 pr-3 text-left transition-[transform,border-color,background-color] duration-150 ease-salida hover:border-line-strong hover:bg-panel active:scale-[0.99]"
                >
                  <Avatar nombre={u.nombre} tamano="sm" />
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-[13px] font-medium text-ink">{u.nombre}</span>
                    <span className="truncate text-xs text-ink-3">
                      {ETIQUETA_ROL[u.rol]}
                      {sedes?.find((s) => s.id === u.sedeId) ? `, ${sedes.find((s) => s.id === u.sedeId)!.ciudad}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
      </ul>
    </section>
  );
}
