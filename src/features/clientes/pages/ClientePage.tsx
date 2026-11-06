import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeftIcon,
  BuildingsIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  LockKeyIcon,
  PhoneIcon,
  PlusIcon,
  UserIcon,
} from '@phosphor-icons/react';
import { useActualizarClienteMutation, useGetClienteQuery } from '@/api/baseApi';
import { formatear } from '@/shared/lib/fechas';
import { Button, ErrorState, Skeleton } from '@/shared/ui';
import { Monto } from '@/shared/ui/Monto';
import { EstadoReservaBadge } from '@/shared/ui/dominio';

export default function ClientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: detalle, isLoading, error, refetch } = useGetClienteQuery(id ?? '');
  const [actualizarCliente, { isLoading: actualizando }] = useActualizarClienteMutation();
  const [errorAccion, setErrorAccion] = useState<unknown>(null);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !detalle) {
    return (
      <div className="p-8">
        <ErrorState error={error} onReintentar={() => void refetch()} />
      </div>
    );
  }

  const { cliente, reservas } = detalle;

  const alternarBloqueo = async () => {
    setErrorAccion(null);
    const nuevoEstado = cliente.estado === 'activo' ? 'bloqueado' : 'activo';
    try {
      await actualizarCliente({
        id: cliente.id,
        cambios: {
          estado: nuevoEstado,
          version: cliente.version,
        },
      }).unwrap();
    } catch (err: unknown) {
      setErrorAccion(err);
    }
  };

  const totalFacturadoCentavos = reservas.reduce((acc, r) => acc + (r.montoEstimado || 0), 0);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Barra Superior */}
      <div className="border-b border-border bg-card/60 px-6 py-3.5 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variante="fantasma"
            tamano="sm"
            icono={ArrowLeftIcon}
            onClick={() => navigate('/clientes')}
          >
            Clientes
          </Button>
          <span className="text-border">/</span>
          <span className="font-semibold text-xs text-foreground">{cliente.nombre}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variante={cliente.estado === 'activo' ? 'peligro' : 'secundario'}
            tamano="sm"
            icono={cliente.estado === 'activo' ? LockKeyIcon : CheckCircleIcon}
            onClick={alternarBloqueo}
            cargando={actualizando}
          >
            {cliente.estado === 'activo' ? 'Bloquear Cliente' : 'Desbloquear'}
          </Button>

          <Button
            variante="primario"
            tamano="sm"
            icono={PlusIcon}
            onClick={() => navigate('/reservas/nueva')}
          >
            Nueva Reserva
          </Button>
        </div>
      </div>

      {/* Hero Cliente */}
      <div className="border-b border-border/80 bg-card/30 p-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                {cliente.tipo === 'empresa' ? (
                  <BuildingsIcon className="h-6 w-6" />
                ) : (
                  <UserIcon className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">{cliente.nombre}</h1>
                  {cliente.estado === 'activo' ? (
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      Activo
                    </span>
                  ) : (
                    <span className="rounded-full bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[10px] font-bold text-destructive">
                      Bloqueado
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-muted-foreground uppercase">
                  {cliente.tipo} · {cliente.documento}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <PhoneIcon className="h-3.5 w-3.5 text-primary" />
                {cliente.telefono}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <EnvelopeSimpleIcon className="h-3.5 w-3.5 text-primary" />
                {cliente.email}
              </span>
            </div>
          </div>

          {/* Estadísticas de Facturación / Contratos */}
          <div className="flex items-center gap-4 border-l border-border/60 pl-6 text-xs font-mono">
            <div className="rounded-xl border border-border bg-card p-3 min-w-[130px]">
              <span className="text-[10px] text-muted-foreground block">RESERVAS TOTALES</span>
              <span className="text-lg font-black text-foreground">{reservas.length}</span>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 min-w-[140px]">
              <span className="text-[10px] text-muted-foreground block">FACTURACIÓN ACUMULADA</span>
              <Monto centavos={totalFacturadoCentavos} className="text-lg font-black text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Reservas del Cliente */}
      <div className="max-w-6xl mx-auto w-full p-6 space-y-4 flex-1">
        {Boolean(errorAccion) && (
          <ErrorState error={errorAccion} compacto onCerrar={() => setErrorAccion(null)} />
        )}
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Historial de Alquileres y Contratos ({reservas.length})
        </h2>

        <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-md shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/30 font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Período de Alquiler</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3">Importe</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {reservas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No hay registros de alquiler para este cliente.
                    </td>
                  </tr>
                ) : (
                  reservas.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/reservas/${r.id}`)}
                      className="cursor-pointer hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono font-bold text-foreground">{r.codigo}</td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {formatear(r.inicio, 'America/Caracas', 'dd/MM/yyyy')} →{' '}
                        {formatear(r.fin, 'America/Caracas', 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {r.conOperador ? (
                          <span className="text-primary font-semibold">Homologado</span>
                        ) : (
                          'Sin operador'
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-foreground">
                        <Monto centavos={r.montoEstimado} />
                      </td>
                      <td className="px-4 py-2.5">
                        <EstadoReservaBadge estado={r.estado} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variante="fantasma"
                          tamano="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/reservas/${r.id}`);
                          }}
                        >
                          Ver Contrato
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
