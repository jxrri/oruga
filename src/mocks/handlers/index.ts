import { activos } from './activos';
import { catalogos } from './catalogos';
import { clientes } from './clientes';
import { inspecciones } from './inspecciones';
import { mantenimiento } from './mantenimiento';
import { reservas } from './reservas';

export const handlers = [...catalogos, ...activos, ...reservas, ...mantenimiento, ...inspecciones, ...clientes];
