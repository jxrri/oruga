import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store';
import { puede, type Accion, type Recurso } from './permisos';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export const useUsuario = () => useAppSelector((s) => s.auth.sesion?.usuario ?? null);

/** Atajo de permisos para componentes: `const puedeMover = usePuede('mover', 'reserva')`. */
export const usePuede = (accion: Accion, recurso: Recurso) => puede(useUsuario(), accion, recurso);
