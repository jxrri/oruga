import { useNavigate } from 'react-router';
import { CaretUpDownIcon, SignOutIcon } from '@phosphor-icons/react';
import { api, useGetSedesQuery, useLogoutMutation } from '@/api/baseApi';
import { sesionCerrada } from '@/features/auth/authSlice';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/DropdownMenu';
import { useAppDispatch, useUsuario } from '../hooks';
import { ETIQUETA_ROL } from '../permisos';

/** Cuenta de la sesión actual. Para usar otro rol hay que cerrar sesión y entrar con esa cuenta. */
export function MenuCuenta() {
  const usuario = useUsuario();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data: sedes } = useGetSedesQuery();
  const [logout, { isLoading: saliendo }] = useLogoutMutation();
  if (!usuario) return null;

  const ciudad = sedes?.find((s) => s.id === usuario.sedeId)?.ciudad;

  async function salir() {
    // Se avisa al servidor mientras el token sigue en el estado. Si falla, la sesión local se cierra igual.
    await logout()
      .unwrap()
      .catch(() => undefined);
    dispatch(sesionCerrada());
    dispatch(api.util.resetApiState());
    navigate('/login', { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex h-9 items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 text-left transition-colors duration-150 hover:bg-panel-2 pointer-coarse:h-11',
          saliendo && 'opacity-60',
        )}
        aria-label={`Cuenta de ${usuario.nombre}, ${ETIQUETA_ROL[usuario.rol]}`}
      >
        <Avatar nombre={usuario.nombre} tamano="sm" />
        <span className="hidden min-w-0 flex-col leading-tight lg:flex">
          <span className="truncate text-[13px] font-medium text-ink">{usuario.nombre}</span>
          <span className="truncate text-xs text-ink-3">{ETIQUETA_ROL[usuario.rol]}</span>
        </span>
        <CaretUpDownIcon size={14} aria-hidden className="text-ink-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="flex items-center gap-3 px-2.5 py-2">
          <Avatar nombre={usuario.nombre} activo />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-medium text-ink">{usuario.nombre}</span>
            <span className="truncate text-xs text-ink-3">{usuario.correo}</span>
            <span className="truncate text-xs text-ink-3">
              {ETIQUETA_ROL[usuario.rol]}
              {ciudad ? `, ${ciudad}` : ''}
            </span>
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem icono={SignOutIcon} disabled={saliendo} onSelect={() => void salir()}>
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
