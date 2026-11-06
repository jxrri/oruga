import { Link } from 'react-router';
import type { Reserva } from '@/api/contrato';
import { useCatalogos } from '@/api/hooks';
import { useGetActivosQuery, useGetClientesQuery } from '@/api/baseApi';
import { ahora } from '@/shared/lib/fechas';
import {
  ArrowSquareOutIcon,
  CalendarCheckIcon,
  ClipboardTextIcon,
  TruckIcon,
} from '@phosphor-icons/react';

interface TablaOperacionesHoyProps {
  operaciones: Reserva[];
}

export function TablaOperacionesHoy({ operaciones }: TablaOperacionesHoyProps) {
  const { sedePorId } = useCatalogos();
  const { data: activos = [] } = useGetActivosQuery();
  const { data: clientes = [] } = useGetClientesQuery();

  const activoPorId = new Map(activos.map((a) => [a.id, a]));
  const clientePorId = new Map(clientes.map((c) => [c.id, c]));

  const hoyCivil = ahora().slice(0, 10);

  return (
    <div className="bg-panel border border-line rounded-xl shadow-panel flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-line bg-panel-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheckIcon size={18} className="text-accent-fg" />
          <h2 className="text-sm font-semibold text-ink">Operaciones del Día</h2>
        </div>
        <span className="text-xs text-ink-3 font-mono">{hoyCivil}</span>
      </div>

      <div className="flex-1 overflow-x-auto">
        {operaciones.length === 0 ? (
          <div className="p-8 text-center text-ink-3 space-y-1">
            <p className="text-sm font-medium">Sin entregas ni recepciones hoy</p>
            <p className="text-xs">No hay contratos programados para inicio o fin en la fecha civil actual.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-line text-ink-3 font-medium bg-panel-2/50">
                <th className="py-2.5 px-3">Operación</th>
                <th className="py-2.5 px-3">Contrato</th>
                <th className="py-2.5 px-3">Activo</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Sede</th>
                <th className="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {operaciones.map((r) => {
                const esSalida = r.inicio.startsWith(hoyCivil);
                const activo = r.activoId ? activoPorId.get(r.activoId) : null;
                const cliente = clientePorId.get(r.clienteId);
                const sede = sedePorId.get(esSalida ? r.sedeRetiroId : r.sedeDevolucionId);

                return (
                  <tr key={r.id} className="hover:bg-panel-2 transition-colors">
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-[11px] ${
                          esSalida
                            ? 'bg-info-soft text-info'
                            : 'bg-ok-soft text-ok'
                        }`}
                      >
                        <TruckIcon size={12} />
                        <span>{esSalida ? 'Entrega inicial' : 'Recepción'}</span>
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono font-medium text-ink">
                      <Link
                        to={`/reservas/${r.id}`}
                        className="hover:underline hover:text-accent-fg"
                      >
                        {r.codigo}
                      </Link>
                    </td>

                    <td className="py-2.5 px-3">
                      {activo ? (
                        <div className="space-y-0.5">
                          <span className="font-mono font-semibold text-ink">
                            {activo.codigo}
                          </span>
                          <p className="text-[11px] text-ink-2 truncate">
                            {activo.marca} {activo.modelo}
                          </p>
                        </div>
                      ) : (
                        <span className="text-ink-3 italic">Sin asignar</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-ink font-medium truncate max-w-44">
                      {cliente?.nombre ?? 'Cliente'}
                    </td>

                    <td className="py-2.5 px-3 text-ink-2">
                      {sede?.ciudad ?? 'Base'}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/inspecciones/nueva?reservaId=${r.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-panel border border-line hover:border-line-strong hover:bg-raised text-ink text-[11px] font-medium"
                          title="Realizar inspección física"
                        >
                          <ClipboardTextIcon size={12} className="text-accent-fg" />
                          <span>Inspeccionar</span>
                        </Link>
                        <Link
                          to={`/reservas/${r.id}`}
                          className="p-1 rounded text-ink-3 hover:text-ink hover:bg-panel-2"
                          title="Ver contrato"
                        >
                          <ArrowSquareOutIcon size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
