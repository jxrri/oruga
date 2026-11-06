import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRightIcon, CircleNotchIcon } from '@phosphor-icons/react';
import type { Usuario } from '@/api/contrato';
import { useGetSedesQuery, useGetUsuariosQuery, useLoginMutation } from '@/api/baseApi';
import { useAppDispatch, useUsuario } from '@/app/hooks';
import { rutaInicial, volverSeguro } from '@/app/layout/navegacion';
import { ETIQUETA_ROL } from '@/app/permisos';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/Avatar';
import { ErrorState } from '@/shared/ui/Estados';
import { Skeleton } from '@/shared/ui/Skeleton';
import { sesionIniciada } from '../authSlice';

gsap.registerPlugin(useGSAP);

/** "Entrar como…" (SPEC §14): una fila por usuario de prueba. Flechas para moverse, 1 a 5 como atajo. */
export function ListaEntrar() {
  const usuarios = useGetUsuariosQuery();
  const { data: sedes } = useGetSedesQuery();
  const [login, { error: errorLogin }] = useLoginMutation();
  const [entrandoId, setEntrandoId] = useState<string | null>(null);
  const actual = useUsuario();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lista = useRef<HTMLUListElement>(null);
  const datos = usuarios.data;

  const ciudad = (sedeId: string) => sedes?.find((s) => s.id === sedeId)?.ciudad;

  async function entrar(u: Usuario) {
    if (entrandoId) return;
    setEntrandoId(u.id);
    try {
      const sesion = await login({ usuarioId: u.id }).unwrap();
      dispatch(sesionIniciada(sesion));
      navigate(volverSeguro(params.get('volver')) ?? rutaInicial(sesion.usuario), { replace: true });
    } catch {
      setEntrandoId(null);
    }
  }
  const alAtajo = useEffectEvent((u: Usuario) => void entrar(u));

  // Atajo numérico: 1 a 5 entra con el usuario de esa posición (fuera de campos de texto).
  useEffect(() => {
    if (!datos?.length) return;
    const alTeclear = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement).closest('input, textarea, select')) return;
      const u = datos[Number(e.key) - 1];
      if (u) alAtajo(u);
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [datos]);

  useGSAP(
    () => {
      if (!datos?.length) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-fila]', { opacity: 0, x: -14, duration: 0.55, ease: 'power3.out', stagger: 0.06, delay: 0.3 });
      });
      return () => mm.revert();
    },
    { scope: lista, dependencies: [datos?.length], revertOnUpdate: true },
  );

  function moverFoco(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const botones = Array.from(lista.current?.querySelectorAll('button') ?? []);
    const i = botones.indexOf(document.activeElement as HTMLButtonElement);
    const siguiente = botones[(i + (e.key === 'ArrowDown' ? 1 : -1) + botones.length) % botones.length];
    if (siguiente) {
      e.preventDefault();
      siguiente.focus();
    }
  }

  if (usuarios.isLoading)
    return (
      <div className="mt-3 flex flex-col gap-2" aria-busy="true" aria-label="Cargando usuarios de prueba">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );

  if (usuarios.isError)
    return (
      <ErrorState
        className="mt-3"
        titulo="No se pudo cargar la lista de usuarios"
        error={usuarios.error}
        onReintentar={() => void usuarios.refetch()}
      />
    );

  return (
    <>
      <ul ref={lista} className="mt-3 flex flex-col gap-2">
        {datos?.map((u, i) => {
          const entrando = entrandoId === u.id;
          return (
            <li key={u.id} data-fila>
              <button
                type="button"
                onClick={() => void entrar(u)}
                onKeyDown={moverFoco}
                disabled={!!entrandoId && !entrando}
                aria-busy={entrando || undefined}
                className={cn(
                  'group flex h-16 w-full items-center gap-3.5 rounded-xl border border-line bg-panel/80 pl-2.5 pr-3.5 text-left',
                  'transition-[transform,border-color,background-color,opacity] duration-150 ease-salida',
                  'hover:border-line-strong hover:bg-panel active:scale-[0.99] disabled:opacity-45',
                  entrando && 'border-accent bg-panel',
                )}
              >
                <Avatar nombre={u.nombre} tamano="lg" activo={actual?.id === u.id || entrando} />
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate font-medium text-ink">{u.nombre}</span>
                  <span className="truncate text-[13px] text-ink-3">
                    {ETIQUETA_ROL[u.rol]}
                    {ciudad(u.sedeId) ? `, ${ciudad(u.sedeId)}` : ''}
                    {actual?.id === u.id ? '. Sesión actual' : ''}
                  </span>
                </span>
                {entrando ? (
                  <span className="flex items-center gap-1.5 text-[13px] text-accent-fg">
                    <CircleNotchIcon size={16} className="animate-spin" aria-hidden />
                    Entrando…
                  </span>
                ) : (
                  <span className="flex items-center gap-2.5 text-ink-3">
                    {i < 9 && (
                      <kbd className="hidden h-5 min-w-5 place-items-center rounded border border-line bg-panel-2 px-1 font-mono text-[11px] text-ink-3 sm:grid">
                        {i + 1}
                      </kbd>
                    )}
                    <ArrowRightIcon
                      size={18}
                      aria-hidden
                      className="transition-transform duration-150 ease-salida group-hover:translate-x-0.5 group-hover:text-ink"
                    />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {errorLogin && !entrandoId && <ErrorState compacto className="mt-3" error={errorLogin} titulo="No se pudo entrar" />}
    </>
  );
}
