import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowClockwiseIcon, CaretUpDownIcon, SignOutIcon } from '@phosphor-icons/react';
import { api, useGetSedesQuery, useGetUsuariosQuery, useLoginMutation } from '@/api/baseApi';
import { describirError } from '@/api/errores';
import { sesionCerrada, sesionIniciada } from '@/features/auth/authSlice';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/DropdownMenu';
import { useAppDispatch, useUsuario } from '../hooks';
import { ETIQUETA_ROL } from '../permisos';

// Al cambiar de rol se refrescan todas las consultas activas: un 403 del rol anterior no debe quedar en caché.
const TODAS = [
  'Sede',
  'Categoria',
  'Usuario',
  'Activo',
  'Reserva',
  'Orden',
  'Plan',
  'Plantilla',
  'Inspeccion',
  'Cliente',
  'Ficha',
  'Historial',
  'Tasa',
] as const;

/** Selector de rol de la demo (SPEC §2): entra como otro usuario sin salir de la página. */
export function SelectorRol() {
  const usuario = useUsuario();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const usuarios = useGetUsuariosQuery();
  const { data: sedes } = useGetSedesQuery();
  const [login, { isLoading: entrando }] = useLoginMutation();
  if (!usuario) return null;

  const ciudad = (sedeId: string) => sedes?.find((s) => s.id === sedeId)?.ciudad;

  async function cambiar(id: string) {
    if (id === usuario?.id) return;
    try {
      const sesion = await login({ usuarioId: id }).unwrap();
      dispatch(sesionIniciada(sesion));
      dispatch(api.util.invalidateTags([...TODAS]));
      toast.success(`Entraste como ${sesion.usuario.nombre}`, { description: ETIQUETA_ROL[sesion.usuario.rol] });
    } catch (e) {
      const err = describirError(e);
      toast.error(`No se pudo cambiar de rol. ${err.titulo}`, { description: err.detalle });
    }
  }

  function salir() {
    dispatch(sesionCerrada());
    dispatch(api.util.resetApiState());
    navigate('/login', { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex h-9 items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 text-left transition-colors duration-150 hover:bg-panel-2 pointer-coarse:h-11',
          entrando && 'opacity-60',
        )}
        aria-label={`Usuario: ${usuario.nombre}, ${ETIQUETA_ROL[usuario.rol]}. Cambiar de rol`}
      >
        <Avatar nombre={usuario.nombre} tamano="sm" />
        <span className="hidden min-w-0 flex-col leading-tight lg:flex">
          <span className="truncate text-[13px] font-medium text-ink">{usuario.nombre}</span>
          <span className="truncate text-[11px] text-ink-3">{ETIQUETA_ROL[usuario.rol]}</span>
        </span>
        <CaretUpDownIcon size={14} aria-hidden className="text-ink-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72">
        <DropdownMenuLabel>Entrar como otro rol (demo)</DropdownMenuLabel>
        {usuarios.isLoading && <p className="px-2.5 py-2 text-ink-3">Cargando usuarios…</p>}
        {usuarios.isError && (
          <DropdownMenuItem icono={ArrowClockwiseIcon} onSelect={() => void usuarios.refetch()}>
            No se cargaron los usuarios. Reintentar
          </DropdownMenuItem>
        )}
        <DropdownMenuRadioGroup value={usuario.id} onValueChange={(id) => void cambiar(id)}>
          {usuarios.data?.map((u) => (
            <DropdownMenuRadioItem key={u.id} value={u.id} disabled={entrando}>
              <Avatar nombre={u.nombre} tamano="sm" activo={u.id === usuario.id} />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate font-medium">{u.nombre}</span>
                <span className="truncate text-xs text-ink-3">
                  {ETIQUETA_ROL[u.rol]}
                  {ciudad(u.sedeId) ? `, ${ciudad(u.sedeId)}` : ''}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem icono={SignOutIcon} onSelect={salir}>
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
