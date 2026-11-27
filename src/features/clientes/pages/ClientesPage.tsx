import React, { useId, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UsersIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Cliente, ClienteNuevo, TipoCliente } from '@/api/contrato';
import { useActualizarClienteMutation, useCrearClienteMutation, useGetClientesQuery } from '@/api/baseApi';
import { usePuede } from '@/app/hooks';
import { useEntrada } from '@/shared/hooks/useEntrada';
import { formatearNumero, pluralizar } from '@/shared/lib/formato';
import {
  Avatar,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  IconButton,
  SegmentedControl,
  Skeleton,
} from '@/shared/ui';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { EncabezadoPagina } from '@/shared/ui/EncabezadoPagina';
import { Field, Input } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';

export default function ClientesPage() {
  const navigate = useNavigate();
  const ref = useEntrada<HTMLDivElement>();
  const puedeCrear = usePuede('crear', 'cliente');
  const puedeEditar = usePuede('editar', 'cliente');
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
  const idFormulario = useId();

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

  // El conteo de registros va en la línea de descripción, no en una píldora junto al título
  const visibles =
    clientesFiltrados.length === clientes.length
      ? pluralizar(clientes.length, 'cliente')
      : `${formatearNumero(clientesFiltrados.length)} de ${pluralizar(clientes.length, 'cliente')}`;
  const descripcion =
    isLoading || error
      ? 'Directorio, historial de alquileres y control de riesgo operativo.'
      : `${visibles}, ${pluralizar(clientes.filter((c) => c.estado === 'bloqueado').length, 'bloqueado')}.`;

  return (
    <div ref={ref} className="mx-auto w-full max-w-[1400px]">
      <EncabezadoPagina
        titulo="Clientes"
        descripcion={descripcion}
        acciones={
          puedeCrear && (
            <Button variante="primario" icono={PlusIcon} onClick={() => setModalNuevo(true)}>
              Nuevo cliente
            </Button>
          )
        }
      />

      <div className="space-y-6">
        {/* Barra de filtros: una fila sin caja */}
        <section
          aria-label="Filtros"
          className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          data-entrada
        >
          <div className="relative w-full lg:max-w-[22rem]">
            <Input
              icono={MagnifyingGlassIcon}
              aria-label="Buscar clientes"
              placeholder="Buscar por razón social, nombre o RIF/cédula…"
              value={busqueda}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value)}
              className="[&_input]:pr-9"
            />
            {busqueda && (
              <IconButton
                icono={XIcon}
                aria-label="Borrar búsqueda"
                tamano="sm"
                tooltip={false}
                onClick={() => setBusqueda('')}
                className="absolute right-0.5 top-1/2 -translate-y-1/2"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Tipo de cliente"
              valor={filtroTipo}
              onCambio={setFiltroTipo}
              opciones={[
                { valor: 'todos', etiqueta: 'Todos los tipos' },
                { valor: 'empresa', etiqueta: 'Empresas' },
                { valor: 'persona', etiqueta: 'Personas naturales' },
              ]}
              className="w-auto min-w-44 flex-1 sm:flex-none"
            />

            <SegmentedControl
              aria-label="Estado del cliente"
              valor={filtroEstado}
              onCambio={setFiltroEstado}
              opciones={[
                { valor: 'todos', etiqueta: 'Todos' },
                { valor: 'activo', etiqueta: 'Activos' },
                { valor: 'bloqueado', etiqueta: 'Bloqueados' },
              ]}
            />
          </div>
        </section>

        <section aria-label="Listado de clientes" className="space-y-4" data-entrada>
          {Boolean(errorAccion) && (
            <ErrorState error={errorAccion} compacto onCerrar={() => setErrorAccion(null)} />
          )}
          {isLoading ? (
            <div className="tarjeta overflow-hidden">
              <div className="h-10" />
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex h-[53px] items-center gap-6 border-t border-line px-4">
                  <Skeleton className="size-7 shrink-0 rounded-lg" />
                  <Skeleton className="-ml-3 h-4 w-48" />
                  <Skeleton className="hidden h-4 w-24 sm:block" />
                  <Skeleton className="hidden h-4 w-32 md:block" />
                  <Skeleton className="ml-auto h-[22px] w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState error={error} onReintentar={() => void refetch()} />
          ) : clientesFiltrados.length === 0 ? (
            <EmptyState
              icono={UsersIcon}
              titulo="No se encontraron clientes"
              descripcion="Intente con otro término de búsqueda o registre un nuevo cliente."
            />
          ) : (
            <div className="tarjeta overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="th-tabla">Cliente</th>
                      <th className="th-tabla">Tipo</th>
                      <th className="th-tabla">Documento</th>
                      <th className="th-tabla">Contacto</th>
                      <th className="th-tabla">Estado</th>
                      <th className="th-tabla">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.map((cliente) => (
                      <tr
                        key={cliente.id}
                        onClick={() => navigate(`/clientes/${cliente.id}`)}
                        className="fila-tabla h-12 cursor-pointer"
                      >
                        <td className="px-4 py-1.5">
                          <div className="flex items-center gap-3">
                            <Avatar nombre={cliente.nombre} tamano="sm" />
                            <Link
                              to={`/clientes/${cliente.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="whitespace-nowrap font-medium text-ink"
                            >
                              {cliente.nombre}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 capitalize text-ink-2">{cliente.tipo}</td>
                        <td className="whitespace-nowrap px-4 font-mono text-[13px] text-ink">{cliente.documento}</td>
                        <td className="whitespace-nowrap px-4 py-1.5">
                          <div className="tabular text-ink-2">{cliente.telefono}</div>
                          <div className="text-[13px] text-ink-3">{cliente.email}</div>
                        </td>
                        <td className="px-4">
                          {cliente.estado === 'activo' ? (
                            <Badge tono="ok" icono={CheckCircleIcon}>
                              Activo
                            </Badge>
                          ) : (
                            <Badge tono="danger" icono={LockKeyIcon}>
                              Bloqueado
                            </Badge>
                          )}
                        </td>
                        <td className="px-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <IconButton
                                icono={DotsThreeVerticalIcon}
                                aria-label={`Acciones de ${cliente.nombre}`}
                                tamano="sm"
                                tooltip={false}
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/clientes/${cliente.id}`)}>
                                Ver ficha completa
                              </DropdownMenuItem>
                              {puedeEditar && (
                                <DropdownMenuItem onClick={() => alternarEstadoCliente(cliente)}>
                                  {cliente.estado === 'activo' ? 'Bloquear cliente' : 'Desbloquear cliente'}
                                </DropdownMenuItem>
                              )}
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
        </section>
      </div>

      {/* Modal Nuevo Cliente */}
      <Dialog open={modalNuevo} onOpenChange={(v: boolean) => !v && setModalNuevo(false)}>
        <DialogContent
          titulo="Nuevo cliente"
          descripcion="Añada un cliente corporativo o persona natural para asignarle reservas de flota."
          tamano="md"
          pie={
            <>
              <Button onClick={() => setModalNuevo(false)} disabled={guardandoNuevo}>
                Cancelar
              </Button>
              {/* Envía el formulario por su id: así Enter en un campo hace lo mismo que el botón */}
              <Button
                variante="primario"
                type="submit"
                form={idFormulario}
                cargando={guardandoNuevo ? 'Guardando…' : false}
              >
                Crear cliente
              </Button>
            </>
          }
        >
          <form id={idFormulario} noValidate onSubmit={handleCrear} className="space-y-4 pt-1">
            {Boolean(errorModal) && (
              <ErrorState error={errorModal} compacto onCerrar={() => setErrorModal(null)} />
            )}

            <Field etiqueta="Tipo de cliente" requerido>
              <Select
                valor={tipoNuevo}
                onCambio={(v: string) => setTipoNuevo(v as TipoCliente)}
                opciones={[
                  { valor: 'empresa', etiqueta: 'Empresa o constructora' },
                  { valor: 'persona', etiqueta: 'Persona natural' },
                ]}
              />
            </Field>

            <Field etiqueta="Nombre o razón social" requerido>
              <Input
                placeholder="Ej. Constructora Andina C.A."
                value={nombreNuevo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNombreNuevo(e.target.value)}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field etiqueta="RIF o cédula de identidad" requerido ayuda="Formato J-12345678-9 o V-12345678">
                <Input
                  placeholder="J-12345678-9"
                  value={documentoNuevo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocumentoNuevo(e.target.value)}
                  required
                  className="font-mono"
                />
              </Field>

              <Field etiqueta="Teléfono de contacto" requerido>
                <Input
                  type="tel"
                  placeholder="+58 412 1234567"
                  value={telefonoNuevo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTelefonoNuevo(e.target.value)}
                  required
                />
              </Field>
            </div>

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
