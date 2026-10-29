/**
 * Capa de datos (SPEC §6.3, §11.2). Un único createApi con caché compartida: timeline e inventario
 * leen las mismas consultas. Cambiar MSW por el backend es definir VITE_API_URL.
 */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  AccionTransicion,
  Activo,
  ActivoDetalle,
  ActivoDisponible,
  ActivoEdicion,
  ActivoNuevo,
  CambioEstadoBody,
  CambioReserva,
  Categoria,
  Cliente,
  ClienteDetalle,
  ClienteNuevo,
  DisponibilidadQuery,
  FiltrosActivosQuery,
  ID,
  Inspeccion,
  InspeccionNueva,
  InspeccionRegistrada,
  LoginBody,
  OrdenCambios,
  OrdenesQuery,
  OrdenMantenimiento,
  OrdenNueva,
  PlanMantenimiento,
  PlantillaInspeccion,
  Reserva,
  ReservaCambios,
  ReservaNueva,
  ReservasQuery,
  Sede,
  Sesion,
  TasaCambio,
  Usuario,
  ValidacionReserva,
  ValidarReservaBody,
} from './contrato';

interface EstadoConSesion {
  auth: { sesion: Sesion | null };
}

export const API_URL: string = import.meta.env.VITE_API_URL ?? `${import.meta.env.BASE_URL}api`;

const lista = <T extends string>(tipo: T, items: { id: ID }[] | undefined) => [
  ...(items ?? []).map((x) => ({ type: tipo, id: x.id })),
  { type: tipo, id: 'LISTA' as const },
];

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as EstadoConSesion).auth.sesion?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: [
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
  ],
  endpoints: (b) => ({
    // Sesión y catálogos
    login: b.mutation<Sesion, LoginBody>({ query: (body) => ({ url: 'auth/login', method: 'POST', body }) }),
    getUsuarios: b.query<Usuario[], void>({ query: () => 'usuarios', providesTags: ['Usuario'] }),
    getSedes: b.query<Sede[], void>({ query: () => 'sedes', providesTags: ['Sede'] }),
    getCategorias: b.query<Categoria[], void>({ query: () => 'categorias', providesTags: ['Categoria'] }),
    getTasaCambio: b.query<TasaCambio, void>({ query: () => 'tasa-cambio', providesTags: ['Tasa'] }),

    // Activos
    getActivos: b.query<Activo[], FiltrosActivosQuery | void>({
      query: (params) => ({ url: 'activos', params: params ?? undefined }),
      providesTags: (r) => lista('Activo', r),
    }),
    getActivo: b.query<ActivoDetalle, ID>({
      query: (id) => `activos/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Activo', id }, { type: 'Ficha', id }],
    }),
    crearActivo: b.mutation<Activo, ActivoNuevo>({
      query: (body) => ({ url: 'activos', method: 'POST', body }),
      invalidatesTags: [{ type: 'Activo', id: 'LISTA' }],
    }),
    editarActivo: b.mutation<Activo, { id: ID; datos: ActivoEdicion }>({
      query: ({ id, datos }) => ({ url: `activos/${id}`, method: 'PUT', body: datos }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Activo', id }, { type: 'Ficha', id }],
    }),
    cambiarEstadoActivo: b.mutation<Activo, { id: ID; body: CambioEstadoBody }>({
      query: ({ id, body }) => ({ url: `activos/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Activo', id },
        { type: 'Ficha', id },
      ],
    }),
    getDisponibilidad: b.query<ActivoDisponible[], DisponibilidadQuery>({
      query: (params) => ({ url: 'disponibilidad', params }),
      providesTags: [{ type: 'Activo', id: 'LISTA' }, { type: 'Reserva', id: 'LISTA' }],
    }),

    // Reservas
    getReservas: b.query<Reserva[], ReservasQuery>({
      query: ({ desde, hasta, activoIds }) => ({
        url: 'reservas',
        params: { desde, hasta, ...(activoIds?.length ? { activoIds: activoIds.join(',') } : {}) },
      }),
      providesTags: (r) => lista('Reserva', r),
    }),
    getReserva: b.query<Reserva, ID>({
      query: (id) => `reservas/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Reserva', id }],
    }),
    getHistorialReserva: b.query<CambioReserva[], ID>({
      query: (id) => `reservas/${id}/historial`,
      providesTags: (_r, _e, id) => [{ type: 'Historial', id }],
    }),
    validarReserva: b.mutation<ValidacionReserva, ValidarReservaBody>({
      query: (body) => ({ url: 'reservas/validar', method: 'POST', body }),
    }),
    crearReserva: b.mutation<Reserva, ReservaNueva>({
      query: (body) => ({ url: 'reservas', method: 'POST', body }),
      invalidatesTags: [{ type: 'Reserva', id: 'LISTA' }, 'Ficha'],
    }),
    /**
     * Mover, redimensionar o reasignar (SPEC §7.3). Actualización optimista en todas las listas en caché;
     * si el servidor responde 409 (conflicto o versión) se revierte y se refresca.
     */
    actualizarReserva: b.mutation<Reserva, { id: ID; cambios: ReservaCambios }>({
      query: ({ id, cambios }) => ({ url: `reservas/${id}`, method: 'PATCH', body: cambios }),
      async onQueryStarted({ id, cambios }, { dispatch, getState, queryFulfilled }) {
        const { version: _v, ...campos } = cambios;
        const args = api.util.selectCachedArgsForQuery(getState(), 'getReservas');
        const parches = args.map((a) =>
          dispatch(
            api.util.updateQueryData('getReservas', a, (borrador) => {
              const r = borrador.find((x) => x.id === id);
              if (r) Object.assign(r, campos);
            }),
          ),
        );
        try {
          const { data } = await queryFulfilled;
          for (const a of args)
            dispatch(
              api.util.updateQueryData('getReservas', a, (borrador) => {
                const i = borrador.findIndex((x) => x.id === id);
                if (i >= 0) borrador[i] = data;
              }),
            );
          dispatch(api.util.updateQueryData('getReserva', id, () => data));
        } catch {
          parches.forEach((p) => p.undo());
          dispatch(api.util.invalidateTags([{ type: 'Reserva', id }]));
        }
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Historial', id }, 'Ficha'],
    }),
    transicionReserva: b.mutation<Reserva, { id: ID; accion: AccionTransicion; version: number; motivo?: string }>({
      query: ({ id, ...body }) => ({ url: `reservas/${id}/transiciones`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Reserva', id },
        { type: 'Historial', id },
        { type: 'Activo', id: 'LISTA' },
        'Ficha',
      ],
    }),

    // Mantenimiento
    getOrdenes: b.query<OrdenMantenimiento[], OrdenesQuery | void>({
      query: (params) => ({ url: 'mantenimiento/ordenes', params: params ?? undefined }),
      providesTags: (r) => lista('Orden', r),
    }),
    crearOrden: b.mutation<OrdenMantenimiento, OrdenNueva>({
      query: (body) => ({ url: 'mantenimiento/ordenes', method: 'POST', body }),
      invalidatesTags: [{ type: 'Orden', id: 'LISTA' }, { type: 'Activo', id: 'LISTA' }, 'Ficha'],
    }),
    actualizarOrden: b.mutation<OrdenMantenimiento, { id: ID; cambios: OrdenCambios }>({
      query: ({ id, cambios }) => ({ url: `mantenimiento/ordenes/${id}`, method: 'PATCH', body: cambios }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Orden', id }, { type: 'Activo', id: 'LISTA' }, 'Ficha'],
    }),
    getPlanes: b.query<PlanMantenimiento[], void>({ query: () => 'mantenimiento/planes', providesTags: ['Plan'] }),

    // Inspecciones
    getPlantillas: b.query<PlantillaInspeccion[], void>({
      query: () => 'plantillas-inspeccion',
      providesTags: (r) => lista('Plantilla', r),
    }),
    getPlantilla: b.query<PlantillaInspeccion, { id: ID; version?: number }>({
      query: ({ id, version }) => ({ url: `plantillas-inspeccion/${id}`, params: version ? { version } : undefined }),
      providesTags: (_r, _e, { id }) => [{ type: 'Plantilla', id }],
    }),
    guardarPlantilla: b.mutation<PlantillaInspeccion, PlantillaInspeccion>({
      query: (p) => ({ url: `plantillas-inspeccion/${p.id}`, method: 'PUT', body: p }),
      invalidatesTags: (_r, _e, p) => [{ type: 'Plantilla', id: p.id }, { type: 'Plantilla', id: 'LISTA' }],
    }),
    getInspecciones: b.query<Inspeccion[], { activoId?: ID; reservaId?: ID } | void>({
      query: (params) => ({ url: 'inspecciones', params: params ?? undefined }),
      providesTags: (r) => lista('Inspeccion', r),
    }),
    getInspeccion: b.query<Inspeccion, ID>({
      query: (id) => `inspecciones/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Inspeccion', id }],
    }),
    crearInspeccion: b.mutation<InspeccionRegistrada, InspeccionNueva>({
      query: (body) => ({ url: 'inspecciones', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Inspeccion', id: 'LISTA' },
        { type: 'Activo', id: 'LISTA' },
        { type: 'Reserva', id: 'LISTA' },
        { type: 'Orden', id: 'LISTA' },
        'Ficha',
      ],
    }),

    // Clientes
    getClientes: b.query<Cliente[], void>({ query: () => 'clientes', providesTags: (r) => lista('Cliente', r) }),
    getCliente: b.query<ClienteDetalle, ID>({
      query: (id) => `clientes/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Cliente', id }],
    }),
    crearCliente: b.mutation<Cliente, ClienteNuevo>({
      query: (body) => ({ url: 'clientes', method: 'POST', body }),
      invalidatesTags: [{ type: 'Cliente', id: 'LISTA' }],
    }),
    actualizarCliente: b.mutation<Cliente, { id: ID; cambios: Partial<ClienteNuevo> & { estado?: Cliente['estado']; version: number } }>({
      query: ({ id, cambios }) => ({ url: `clientes/${id}`, method: 'PATCH', body: cambios }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Cliente', id }, { type: 'Cliente', id: 'LISTA' }],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetUsuariosQuery,
  useGetSedesQuery,
  useGetCategoriasQuery,
  useGetTasaCambioQuery,
  useGetActivosQuery,
  useGetActivoQuery,
  useCrearActivoMutation,
  useEditarActivoMutation,
  useCambiarEstadoActivoMutation,
  useGetDisponibilidadQuery,
  useGetReservasQuery,
  useGetReservaQuery,
  useGetHistorialReservaQuery,
  useValidarReservaMutation,
  useCrearReservaMutation,
  useActualizarReservaMutation,
  useTransicionReservaMutation,
  useGetOrdenesQuery,
  useCrearOrdenMutation,
  useActualizarOrdenMutation,
  useGetPlanesQuery,
  useGetPlantillasQuery,
  useGetPlantillaQuery,
  useGuardarPlantillaMutation,
  useGetInspeccionesQuery,
  useGetInspeccionQuery,
  useCrearInspeccionMutation,
  useGetClientesQuery,
  useGetClienteQuery,
  useCrearClienteMutation,
  useActualizarClienteMutation,
} = api;
