import { Link } from 'react-router';
import type { Reserva } from '@/api/contrato';
import { useCatalogos } from '@/api/hooks';
import { useGetActivosQuery, useGetClientesQuery } from '@/api/baseApi';
import { usePuede } from '@/app/hooks';
import { Tarjeta, type EstadoBloque } from './Tarjeta';
import { ahora, formatearCivil } from '@/shared/lib/fechas';
import { Badge, Button, EmptyState, Skeleton } from '@/shared/ui';
import { CalendarCheckIcon, TruckIcon } from '@phosphor-icons/react';

interface TablaOperacionesHoyProps {
  operaciones: Reserva[];
  estado: EstadoBloque;
}

export function TablaOperacionesHoy({ operaciones, estado }: TablaOperacionesHoyProps) {
  const puedeInspeccionar = usePuede('crear', 'inspeccion');
  const { sedePorId } = useCatalogos();
  const { data: activos = [] } = useGetActivosQuery();
  const { data: clientes = [] } = useGetClientesQuery();

  const activoPorId = new Map(activos.map((a) => [a.id, a]));
  const clientePorId = new Map(clientes.map((c) => [c.id, c]));

  const hoyCivil = ahora().slice(0, 10);

  return (
    <Tarjeta
      titulo="Operaciones de hoy"
      descripcion="Entregas y recepciones de contratos confirmados o en curso"
      accion={<span className="tabular text-[13px] text-ink-3">{formatearCivil(hoyCivil)}</span>}
      estado={estado}
      esqueleto={
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      }
    >
      {operaciones.length === 0 ? (
        <EmptyState
          icono={CalendarCheckIcon}
          titulo="Sin entregas ni recepciones hoy"
          descripcion="No hay contratos que inicien o terminen en la fecha de hoy."
          className="py-8"
        />
      ) : (
        // Sangrado de 16 px: el texto de las celdas (px-4) queda alineado con el título de la tarjeta (p-5)
        <div className="-mx-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr>
                <th className="th-tabla">Operación</th>
                <th className="th-tabla">Activo</th>
                <th className="th-tabla">Cliente</th>
                <th className="th-tabla">
                  <span className="sr-only">Acción</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {operaciones.map((r) => {
                const esSalida = r.estado === 'confirmada';
                const activo = r.activoId ? activoPorId.get(r.activoId) : null;
                const cliente = clientePorId.get(r.clienteId);
                const sede = sedePorId.get(esSalida ? r.sedeRetiroId : r.sedeDevolucionId);
                const momento = esSalida ? 'salida' : 'devolucion';
                const urlInspeccion = `/inspecciones/nueva?reservaId=${r.id}&momento=${momento}${r.activoId ? `&activoId=${r.activoId}` : ''}`;

                return (
                  <tr key={r.id} className="fila-tabla">
                    <td className="px-4 py-2.5">
                      <Badge tono={esSalida ? 'info' : 'ok'} icono={TruckIcon}>
                        {esSalida ? 'Entrega inicial' : 'Recepción'}
                      </Badge>
                      <Link
                        to={`/reservas/${r.id}`}
                        className="mt-1 block whitespace-nowrap font-mono text-xs text-ink hover:text-accent-fg hover:underline"
                      >
                        {r.codigo}
                      </Link>
                    </td>

                    <td className="px-4 py-2.5">
                      {activo ? (
                        <>
                          <p className="whitespace-nowrap font-mono text-xs font-medium text-ink">{activo.codigo}</p>
                          <p className="text-xs text-ink-3">
                            {activo.marca} {activo.modelo}
                          </p>
                        </>
                      ) : (
                        <span className="text-ink-3">Sin asignar</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5">
                      <p className="text-ink">{cliente?.nombre ?? 'Cliente'}</p>
                      <p className="text-xs text-ink-3">{sede?.ciudad ?? 'Base'}</p>
                    </td>

                    <td className="py-2.5 pr-4 text-right">
                      {puedeInspeccionar && r.activoId ? (
                        <Button asChild tamano="sm">
                          <Link to={urlInspeccion}>Inspeccionar</Link>
                        </Button>
                      ) : (
                        <Button asChild variante="fantasma" tamano="sm">
                          <Link to={`/reservas/${r.id}`}>Ver reserva</Link>
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  );
}
