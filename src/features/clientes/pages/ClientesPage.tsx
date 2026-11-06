import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  BuildingsIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Cliente, ClienteNuevo, TipoCliente } from '@/api/contrato';
import { useActualizarClienteMutation, useCrearClienteMutation, useGetClientesQuery } from '@/api/baseApi';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, EmptyState, ErrorState, Skeleton } from '@/shared/ui';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { Field, Input } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';

export default function ClientesPage() {
  const navigate = useNavigate();
  const { data: clientes = [], isLoading, error, refetch } = useGetClientesQuery();
  const [crearCliente, { isLoading: guardandoNuevo }] = useCrearClienteMutation();
  const [actualizarCliente] = useActualizarClienteMutation();

  // Estados locales para búsqueda y filtrado
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  // Modal Nuevo Cliente
  const [modalNuevo, setModalNuevo] = useState(false);
  const [tipoNuevo, setTipoNuevo] = useState<TipoCliente>('empresa');
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [documentoNuevo, setDocumentoNuevo] = useState('');
  const [telefonoNuevo, setTelefonoNuevo] = useState('');
  const [emailNuevo, setEmailNuevo] = useState('');
  const [errorModal, setErrorModal] = useState<unknown>(null);
  const [errorAccion, setErrorAccion] = useState<unknown>(null);

  // Filtrado de clientes
  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clientes.filter((c) => {
      const coincideQ =
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.documento.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);

      const coincideTipo = filtroTipo === 'todos' || c.tipo === filtroTipo;
      const coincideEstado = filtroEstado === 'todos' || c.estado === filtroEstado;

      return coincideQ && coincideTipo && coincideEstado;
    });
  }, [clientes, busqueda, filtroTipo, filtroEstado]);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreNuevo.trim() || !documentoNuevo.trim() || !telefonoNuevo.trim() || !emailNuevo.trim()) {
      setErrorModal('Complete todos los campos requeridos.');
      return;
    }

    try {
      const nuevo: ClienteNuevo = {
        tipo: tipoNuevo,
        nombre: nombreNuevo.trim(),
        documento: documentoNuevo.trim().toUpperCase(),
        telefono: telefonoNuevo.trim(),
        email: emailNuevo.trim().toLowerCase(),
      };

      await crearCliente(nuevo).unwrap();
      setModalNuevo(false);
      setNombreNuevo('');
      setDocumentoNuevo('');
      setTelefonoNuevo('');
      setEmailNuevo('');
      setErrorModal(null);
    } catch (err: unknown) {
      setErrorModal(err);
    }
  };

  const alternarEstadoCliente = async (cliente: Cliente) => {
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

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/60 px-6 py-4 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Gestión de Clientes</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-bold text-primary">
              {clientesFiltrados.length} / {clientes.length} clientes
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Directorio corporativo, historial de alquileres y control de riesgo operativo.
          </p>
        </div>

        <Button
          variante="primario"
          icono={PlusIcon}
          onClick={() => setModalNuevo(true)}
          className="text-xs font-bold"
        >
          Nuevo Cliente
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/30 p-4">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar por razón social, nombre o RIF/cédula..."
            value={busqueda}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filtroTipo}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFiltroTipo(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="todos">Todos los tipos</option>
            <option value="empresa">Empresas</option>
            <option value="persona">Personas naturales</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFiltroEstado(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="bloqueado">Bloqueados</option>
          </select>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="flex-1 p-6 space-y-4">
        {Boolean(errorAccion) && (
          <ErrorState error={errorAccion} compacto onCerrar={() => setErrorAccion(null)} />
        )}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onReintentar={() => void refetch()} />
        ) : clientesFiltrados.length === 0 ? (
          <EmptyState
            icono={UsersIcon}
            titulo="No se encontraron clientes"
            descripcion="Intente con otro término de búsqueda o registre un nuevo cliente corporativo."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-md shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/30 font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Cliente / Razón Social</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Documento / RIF</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {clientesFiltrados.map((cliente) => (
                    <tr
                      key={cliente.id}
                      onClick={() => navigate(`/clientes/${cliente.id}`)}
                      className="cursor-pointer hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground flex items-center gap-2">
                          {cliente.tipo === 'empresa' ? (
                            <BuildingsIcon className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <UserIcon className="h-4 w-4 text-sky-400 shrink-0" />
                          )}
                          <span>{cliente.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">
                        {cliente.tipo}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-foreground">
                        {cliente.documento}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        <div>{cliente.telefono}</div>
                        <div className="text-[11px] text-muted-foreground/80">{cliente.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {cliente.estado === 'activo' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                            <CheckCircleIcon className="h-3 w-3" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 border border-destructive/30 px-2.5 py-0.5 text-[10px] font-bold text-destructive">
                            <LockKeyIcon className="h-3 w-3" /> Bloqueado
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <DotsThreeVerticalIcon className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/clientes/${cliente.id}`)}>
                              Ver ficha completa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => alternarEstadoCliente(cliente)}
                            >
                              {cliente.estado === 'activo' ? 'Bloquear cliente' : 'Desbloquear cliente'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nuevo Cliente */}
      <Dialog open={modalNuevo} onOpenChange={(v: boolean) => !v && setModalNuevo(false)}>
        <DialogContent
          titulo={
            <div className="flex items-center gap-2 text-primary font-bold">
              <PlusIcon className="h-5 w-5" />
              <span>Registrar Nuevo Cliente</span>
            </div>
          }
          descripcion="Añada un cliente corporativo o persona natural para asignarle reservas de flota."
          tamano="md"
          pie={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variante="fantasma" onClick={() => setModalNuevo(false)} disabled={guardandoNuevo}>
                Cancelar
              </Button>
              <Button
                variante="primario"
                onClick={handleCrear}
                cargando={guardandoNuevo ? 'Guardando…' : false}
              >
                Crear Cliente
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCrear} className="space-y-3.5 py-2">
            {Boolean(errorModal) && (
              <ErrorState error={errorModal} compacto onCerrar={() => setErrorModal(null)} />
            )}

            <Field etiqueta="Tipo de cliente" requerido>
              <Select
                valor={tipoNuevo}
                onCambio={(v: string) => setTipoNuevo(v as TipoCliente)}
                opciones={[
                  { valor: 'empresa', etiqueta: 'Empresa / Constructora' },
                  { valor: 'persona', etiqueta: 'Persona Natural' },
                ]}
              />
            </Field>

            <Field etiqueta="Nombre o Razón Social" requerido>
              <Input
                placeholder="Ej. Constructora Andina C.A."
                value={nombreNuevo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNombreNuevo(e.target.value)}
                required
              />
            </Field>

            <Field etiqueta="RIF o Cédula de Identidad" requerido ayuda="Formato J-12345678-9 o V-12345678">
              <Input
                placeholder="J-12345678-9"
                value={documentoNuevo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocumentoNuevo(e.target.value)}
                required
              />
            </Field>

            <Field etiqueta="Teléfono de contacto" requerido>
              <Input
                placeholder="+58 412 1234567"
                value={telefonoNuevo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTelefonoNuevo(e.target.value)}
                required
              />
            </Field>

            <Field etiqueta="Correo electrónico" requerido>
              <Input
                type="email"
                placeholder="contacto@empresa.com"
                value={emailNuevo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailNuevo(e.target.value)}
                required
              />
            </Field>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
