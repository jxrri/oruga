# Sistema de Gestión y Alquiler de Flotas — Especificación de desarrollo

Oct 29, 2026 · @David Resyes

## 1. Resumen y alcance

Esta fase entrega un frontend en React + TypeScript, completo y navegable, que trabaja contra una API simulada con el mismo contrato que tendrá el backend en Python. El centro del sistema es el planificador tipo timeline: inventario, reservas, inspecciones y mantenimiento alimentan ese calendario o reaccionan a él.

**Demo objetivo de punta a punta.** Un planificador crea una reserva arrastrando sobre el timeline. El inspector hace la inspección de salida y luego la de devolución, con una falla crítica. El activo pasa solo a fuera de servicio, sus reservas futuras se marcan en conflicto y el planificador las reasigna arrastrándolas a otro activo. Si este flujo funciona sin errores, el proyecto cumple su promesa.

**Dentro del alcance**

- Inventario de activos con filtros multicriterio.
- Planificador timeline con arrastre, redimensionado y detección de conflictos en vivo.
- Ciclo de vida de reservas: borrador, confirmada, en curso, finalizada o cancelada.
- Inspección de salida, devolución y rutinaria con formularios dinámicos y fotos simuladas.
- Mantenimiento preventivo y correctivo, visible como bloques del calendario.
- Mapa con la posición simulada de cada activo.
- Tablero de utilización y alertas.
- API simulada con datos deterministas y eventos en tiempo real simulados.

**Fuera del alcance de esta fase**

- Persistencia, autenticación y pagos reales.
- Telemetría real (GPS, CAN bus): se simula con el mismo formato de evento.
- Facturación fiscal.
- App móvil nativa: la inspección se hace en web adaptable al teléfono.

**Supuestos** (se validan en la sección 14)

- Una empresa con varias sedes; cada sede tiene su zona horaria IANA.
- Entre decenas y pocos cientos de activos; los mocks generan 120.
- Cada activo tiene una sede base, pero puede entregarse y devolverse en sedes distintas.
- Las tarifas se expresan en USD.

## 2. Actores y roles

Cinco roles internos cubren todo el flujo; no hay portal de clientes en esta fase. Como no hay autenticación real, la cabecera tiene un selector de rol para la demo, y los permisos se resuelven con una sola función `puede(usuario, accion, recurso)` en `app/permisos.ts`.

| Rol | Qué hace | Permisos clave |
| --- | --- | --- |
| Administrador | Configura sedes, categorías, tarifas, plantillas de inspección y usuarios | Todo |
| Planificador | Crea, mueve y reasigna reservas; resuelve conflictos | Reservas completas; activos en lectura |
| Inspector de patio | Ejecuta inspecciones de salida, devolución y rutina; sube evidencias | Crear inspecciones; su resultado cambia el estado del activo |
| Jefe de mantenimiento | Gestiona planes y órdenes; bloquea activos | Mantenimiento completo; marcar fuera de servicio |
| Gerente | Consulta tablero e historial | Solo lectura |

La interfaz oculta o deshabilita lo que el rol no puede hacer, y los mocks devuelven 403 si se intenta igual. Así se prueba el manejo de errores de permisos antes de tener backend.

## 3. Módulos y requisitos funcionales

Ocho módulos, con requisitos numerados para poder trazarlos en issues, pruebas y en la defensa. Los marcados como opcionales entran solo si sobra tiempo.

### 3.1 Inventario de activos (INV)

- **RF-INV-01** Tabla virtualizada con columnas configurables: código, tipo, categoría, marca y modelo, motor, capacidad, sede, estado y próximo mantenimiento.
- **RF-INV-02** Filtros multicriterio combinables y guardables (sección 10).
- **RF-INV-03** Ficha del activo: datos técnicos, documentos con vencimiento, historial de reservas, inspecciones y mantenimientos, y un mini-timeline propio.
- **RF-INV-04** Alta y edición con validación: placa y serial únicos, año válido, capacidad con la unidad que exige su categoría.
- **RF-INV-05** Cambio manual del estado operativo con motivo obligatorio, registrado en el historial.
- **RF-INV-06** Búsqueda de disponibilidad: qué activos de una categoría están libres entre dos fechas, ordenados por sede y tarifa.

### 3.2 Planificador timeline (PLN)

- **RF-PLN-01** Una fila por activo, agrupable por sede o categoría, con zoom de día, semana y mes.
- **RF-PLN-02** Crear una reserva arrastrando sobre un tramo libre de una fila.
- **RF-PLN-03** Mover una reserva en el tiempo o a otro activo arrastrándola; redimensionarla desde sus bordes.
- **RF-PLN-04** Validación durante el arrastre: fantasma verde si es válido, ámbar si hay advertencias, rojo si está bloqueado, siempre con el motivo.
- **RF-PLN-05** Panel de conflictos navegable; un clic centra el timeline en la reserva.
- **RF-PLN-06** Bloques visibles de mantenimiento, fuera de servicio y tiempo de preparación entre reservas.
- **RF-PLN-07** Los filtros del inventario filtran también las filas del timeline (mismo estado).
- **RF-PLN-08** Deshacer el último movimiento con Ctrl+Z.
- **RF-PLN-09** Todo lo anterior operable solo con teclado (sección 12).
- **RF-PLN-10** Actualización en vivo cuando llega un evento: otra sesión mueve una reserva o un activo cambia de estado.

### 3.3 Reservas (RES)

- **RF-RES-01** Formulario: cliente, categoría, activo, sedes de retiro y devolución, inicio y fin en la hora de la sede, con o sin operador.
- **RF-RES-02** Monto estimado con la combinación de tarifas por hora, día, semana y mes más conveniente para el cliente.
- **RF-RES-03** Transiciones de estado según la máquina de estados (sección 4).
- **RF-RES-04** Reserva por categoría sin activo asignado, mostrada en una fila "Por asignar" del timeline.
- **RF-RES-05** Historial de cambios: quién, cuándo y qué cambió.

### 3.4 Inspecciones (INS)

- **RF-INS-01** Plantillas por categoría, versionadas, cargadas desde los mocks como JSON. Editor visual de plantillas: opcional.
- **RF-INS-02** Inspección de salida, devolución o rutina, con lectura de kilómetros u horómetro y nivel de combustible.
- **RF-INS-03** Campos condicionales, requeridos y críticos.
- **RF-INS-04** Evidencias fotográficas con vista previa, compresión en el navegador, progreso de carga simulado y reintento.
- **RF-INS-05** Comparación salida contra devolución: diferencia de lectura, de combustible y daños nuevos.
- **RF-INS-06** Resultado calculado (apto, apto con observaciones, no apto) que actualiza el estado del activo.
- **RF-INS-07** Borrador guardado automáticamente para no perder datos si se cierra la pestaña.

### 3.5 Mantenimiento (MNT)

- **RF-MNT-01** Planes preventivos por categoría con intervalo por kilómetros, horas de uso o días, lo que ocurra primero.
- **RF-MNT-02** Cálculo del próximo vencimiento y alerta con antelación configurable.
- **RF-MNT-03** Órdenes preventivas y correctivas visibles como bloques en el timeline.
- **RF-MNT-04** Cerrar una orden actualiza la lectura del último servicio y devuelve el activo a operativo.

### 3.6 Clientes (CLI)

- **RF-CLI-01** Registro de persona o empresa con RIF o cédula validados por formato.
- **RF-CLI-02** Estado activo o bloqueado; un cliente bloqueado no puede confirmar reservas.
- **RF-CLI-03** Historial de reservas del cliente.

### 3.7 Ubicación (UBI)

- **RF-UBI-01** Mapa con la última posición de cada activo, coloreada por estado.
- **RF-UBI-02** Posiciones simuladas que se desplazan para los activos en alquiler.
- **RF-UBI-03** Opcional: alerta si un activo sale de un radio permitido alrededor de la obra del cliente.

### 3.8 Tablero (DSH)

- **RF-DSH-01** Indicadores: utilización por categoría (horas reservadas sobre horas disponibles), activos inactivos, mantenimientos vencidos y conflictos abiertos.
- **RF-DSH-02** Lista de alertas accionables que llevan a la pantalla donde se resuelven.

## 4. Reglas de negocio

El estado del activo y su ocupación en el calendario son dos datos distintos: el estado dice si el activo puede trabajar; las reservas y órdenes dicen cuándo está ocupado. "Reservado" y "en alquiler" nunca se guardan: se calculan. Esta separación evita la mayoría de las inconsistencias entre inventario y calendario.

### 4.1 Estado del activo

Se guarda solo el estado operativo: `operativo`, `en_mantenimiento`, `fuera_de_servicio` o `baja`. El estado que ve el usuario se deriva así, en este orden:

1. Si no está operativo, se muestra su estado operativo.
2. Si tiene una reserva en curso ahora, se muestra "En alquiler".
3. Si tiene una reserva que inicia en las próximas 24 horas, se muestra "Próxima salida".
4. Si no, se muestra "Disponible".

### 4.2 Máquina de estados de la reserva

El diagrama muestra las transiciones y la condición que exige cada una.

&#91;embedded content: máquina de estados de la reserva · 5 estados\]

Una devolución no apta no impide cerrar la reserva: la reserva se finaliza igual, y el efecto cae sobre el activo y sus reservas futuras. Lo que se puede editar depende del estado:

| Estado | Mover fechas | Cambiar de activo | Extender el fin |
| --- | --- | --- | --- |
| Borrador | Sí | Sí | Sí |
| Confirmada | Sí, revalidando conflictos | Sí, revalidando conflictos | Sí |
| En curso | No | No | Sí |
| Finalizada | No | No | No |
| Cancelada | No | No | No |

### 4.3 Conflictos

Todo intervalo es semiabierto, `[inicio, fin)`: una reserva que termina a las 10:00 no choca con otra que empieza a las 10:00, aunque sí puede invadir el tiempo de preparación. Los bloqueantes impiden guardar; las advertencias se aceptan con una confirmación explícita que queda registrada en la reserva.

| Código | Se produce cuando | Severidad |
| --- | --- | --- |
| `SOLAPE` | Otra reserva del mismo activo se cruza con el rango | Bloqueante |
| `MANTENIMIENTO` | Una orden de mantenimiento se cruza con el rango | Bloqueante |
| `NO_OPERATIVO` | El activo está fuera de servicio o de baja | Bloqueante |
| `DOCUMENTO_VENCIDO` | El seguro o un permiso vence antes del fin | Bloqueante |
| `CLIENTE_BLOQUEADO` | El cliente está bloqueado al confirmar | Bloqueante |
| `BUFFER` | No se respeta el tiempo de preparación de la categoría | Advertencia |
| `MANT_PROYECTADO` | El preventivo vencería durante la reserva | Advertencia |
| `TRASLADO` | El activo estará en otra sede al momento del retiro | Advertencia |

### 4.4 Reglas adicionales

- **Tiempo de preparación.** Cada categoría define minutos de limpieza y revisión entre reservas. Propuesta inicial: 2 horas para vehículos y 8 horas para maquinaria pesada.
- **Mantenimiento proyectado.** Lectura actual + uso diario estimado de la categoría × días de reserva; si supera el umbral del plan, se emite `MANT_PROYECTADO`.
- **Inspección no apta.** Si falla un campo crítico, el activo pasa a fuera de servicio, se crea una orden correctiva y sus reservas futuras quedan con `NO_OPERATIVO`, listas para reasignar.
- **Concurrencia.** Cada reserva y activo tiene un número de `version`; una edición con versión vieja se rechaza con 409 y la interfaz recarga y avisa.

## 5. Modelo de datos

Diez entidades, más las de inspección de la sección 9, cubren el dominio; viven en `api/contrato.ts` y son el contrato que el backend en Python deberá respetar. Los instantes van siempre en UTC, los montos en USD y cada entidad editable lleva `version` para la concurrencia optimista.

```ts
// Identificadores y tiempo
type ID = string;            // UUID generado en los mocks
type InstanteUTC = string;   // ISO 8601 con Z: "2026-11-03T13:00:00Z"
type FechaCivil = string;    // "YYYY-MM-DD", sin hora ni zona (vencimientos)
type ZonaIANA = string;      // "America/Caracas"

interface Sede {
  id: ID;
  nombre: string;            // "Maracaibo – Zona Industrial"
  ciudad: string;
  zonaHoraria: ZonaIANA;
  coordenadas: { lat: number; lng: number };
  horario: { abre: string; cierra: string }; // "07:00", "18:00" en la zona de la sede
}

type TipoActivo = 'vehiculo' | 'maquinaria';
type TipoMotor = 'gasolina' | 'diesel' | 'electrico' | 'hibrido' | 'gas';
type EstadoOperativo = 'operativo' | 'en_mantenimiento' | 'fuera_de_servicio' | 'baja';
type UnidadCapacidad = 'pasajeros' | 'kg' | 't' | 'm3';

interface Categoria {
  id: ID;
  nombre: string;            // "Retroexcavadora"
  tipo: TipoActivo;
  medidor: 'km' | 'horas';   // vehículos en km, maquinaria en horas de uso
  unidadCapacidad: UnidadCapacidad;
  bufferPreparacionMin: number;
  usoDiarioEstimado: number; // km/día u horas/día
  tarifas: { hora?: number; dia: number; semana: number; mes: number };
  plantillaInspeccionId: ID;
}

interface Activo {
  id: ID;
  codigo: string;            // "EXC-014"
  categoriaId: ID;
  marca: string;
  modelo: string;
  anio: number;
  placa?: string;
  serial: string;
  motor: TipoMotor;
  capacidad: number;         // en la unidad de su categoría
  lecturaActual: number;     // km u horas
  estadoOperativo: EstadoOperativo;
  sedeBaseId: ID;
  ubicacion?: { lat: number; lng: number; registradaEn: InstanteUTC };
  documentos: { tipo: 'seguro' | 'permiso' | 'certificacion'; numero: string; venceEl: FechaCivil }[];
  requiereOperador: boolean;
  version: number;
}

interface Cliente {
  id: ID;
  tipo: 'persona' | 'empresa';
  nombre: string;
  documento: string;         // RIF o cédula
  telefono: string;
  email: string;
  estado: 'activo' | 'bloqueado';
}

type EstadoReserva = 'borrador' | 'confirmada' | 'en_curso' | 'finalizada' | 'cancelada';
type CodigoConflicto = 'SOLAPE' | 'MANTENIMIENTO' | 'NO_OPERATIVO' | 'DOCUMENTO_VENCIDO'
  | 'CLIENTE_BLOQUEADO' | 'BUFFER' | 'MANT_PROYECTADO' | 'TRASLADO';

interface Reserva {
  id: ID;
  codigo: string;            // "R-2026-00123"
  clienteId: ID;
  categoriaId: ID;
  activoId: ID | null;       // null = por asignar
  sedeRetiroId: ID;
  sedeDevolucionId: ID;
  inicio: InstanteUTC;
  fin: InstanteUTC;          // intervalo [inicio, fin)
  estado: EstadoReserva;
  conOperador: boolean;
  montoEstimado: number;
  advertenciasAceptadas: CodigoConflicto[];
  inspeccionSalidaId?: ID;
  inspeccionDevolucionId?: ID;
  version: number;
}

interface CambioReserva {
  reservaId: ID; en: InstanteUTC; usuarioId: ID;
  campo: keyof Reserva; antes: unknown; despues: unknown;
}

interface PlanMantenimiento {
  id: ID; categoriaId: ID; nombre: string;   // "Servicio 250 h"
  cadaLectura?: number; cadaDias?: number;   // lo que ocurra primero
  avisoAntes: number;
}

interface OrdenMantenimiento {
  id: ID; activoId: ID;
  tipo: 'preventivo' | 'correctivo';
  origen: 'plan' | 'inspeccion' | 'manual';
  inicio: InstanteUTC; finEstimado: InstanteUTC;
  estado: 'programada' | 'en_proceso' | 'completada' | 'cancelada';
  descripcion: string;
}

interface Usuario {
  id: ID; nombre: string; sedeId: ID;
  rol: 'admin' | 'planificador' | 'inspector' | 'mantenimiento' | 'gerente';
}

interface EventoTiempoReal {
  tipo: 'reserva.actualizada' | 'activo.estado' | 'activo.posicion' | 'orden.actualizada';
  en: InstanteUTC;
  datos: unknown;
}
```

Los tipos de inspección (plantilla, campo, condición, inspección y evidencia) están en la sección 9. Relaciones: una sede tiene muchos activos; una categoría agrupa activos, tarifas, planes y una plantilla; una reserva une un cliente con un activo y referencia hasta dos inspecciones.

## 6. Arquitectura del frontend

La arquitectura se organiza por módulo de negocio, con las reglas en código TypeScript puro separado de React. Ese núcleo de reglas se usa dos veces: en la interfaz para validar al instante y en los mocks para simular al servidor. Cuando llegue el backend en Python, las mismas reglas se portan allá y él pasa a ser la fuente de verdad.

&#91;embedded content: arquitectura del frontend · 3 capas, reglas compartidas, 2 orígenes de datos\]

Las capas solo se hablan hacia abajo, y `domain/` lo usan tanto la interfaz como los mocks. Cambiar MSW por el backend en Python toca solo la caja punteada.

### 6.1 Stack

| Necesidad | Elección | Por qué |
| --- | --- | --- |
| Base | Vite + React + TypeScript en modo estricto | Arranque rápido; los tipos son el contrato de la API |
| Rutas | React Router | Una ruta por módulo; filtros y vista en la URL |
| Estado global y datos | Redux Toolkit + RTK Query | Un solo store; caché compartida entre timeline e inventario; DevTools para la defensa |
| API simulada | MSW (Mock Service Worker) + Faker con semilla fija | Intercepta `fetch` real; pasar al backend es cambiar una URL |
| Fechas y zonas | date-fns v4 + @date-fns/tz | Funciones puras y fechas con zona IANA |
| Arrastrar y soltar | dnd-kit | Sensores de puntero y de teclado |
| Virtualización | TanStack Virtual | Cientos de filas sin perder fluidez |
| Tablas | TanStack Table | Orden, columnas configurables y filtros |
| Formularios | React Hook Form + Zod | Esquemas de validación generados desde la plantilla |
| Componentes accesibles | Radix UI (vía shadcn/ui) + Tailwind | Foco, roles ARIA y teclado ya resueltos |
| Mapa | Leaflet + react-leaflet + OpenStreetMap | Gratuito y sin clave de API |
| Gráficos | Recharts | Tablero |
| Pruebas | Vitest, Testing Library, Playwright, axe-core | Unidad, integración, extremo a extremo y accesibilidad |

### 6.2 Estructura de carpetas

```
src/
  app/            store.ts, router.tsx, providers.tsx, permisos.ts
  domain/         reglas puras, sin React (se portan a Python)
    intervalos.ts       solape, fusión, búsqueda de huecos
    conflictos.ts       detectarConflictos(propuesta, contexto)
    disponibilidad.ts
    reservaFSM.ts       transiciones y condiciones
    mantenimiento.ts    vencimientos y proyección
    tarifas.ts
    inspeccion.ts       visibilidad de campos, esquema Zod, resultado
  api/            contrato.ts (tipos), baseApi.ts (RTK Query), tags
  features/
    inventario/   páginas, componentes, slice de filtros, selectores
    planificador/ Timeline/, hooks de arrastre, slice de vista
    reservas/
    inspecciones/
    mantenimiento/
    clientes/
    ubicacion/
    tablero/
  shared/         ui/, hooks/, lib/fechas.ts, lib/formato.ts
  mocks/
    db.ts           base en memoria
    seed.ts         generador con semilla fija
    handlers/       uno por recurso
    tiempoReal.ts   emisor de eventos simulados
    browser.ts
```

### 6.3 Estrategia de estado

- **Datos del servidor** (activos, reservas, órdenes) viven en la caché de RTK Query. Timeline e inventario leen las mismas consultas, así que se sincronizan sin código extra.
- **Estado de interfaz compartido** vive en slices: filtros (los mismos para inventario y timeline), vista del timeline (zoom, rango, zona de visualización) y selección.
- **Estado efímero del arrastre** vive dentro del componente hasta soltar. Nunca se despacha al store por cada movimiento del puntero.
- **Derivados** como activos filtrados, reservas por activo y conflictos por reserva salen de selectores memoizados con `createSelector`.
- **Actualización optimista** al soltar con `updateQueryData`; si la respuesta es 409 por conflicto o versión, se revierte y se muestra el motivo.
- **Tiempo real**: `mocks/tiempoReal.ts` emite eventos y un middleware los aplica a la caché. Con el backend, el emisor se cambia por un WebSocket sin tocar componentes.

## 7. Diseño del planificador timeline

Se recomienda construir el timeline a mano en lugar de usar una librería de agenda. La evaluación pide dominar justo lo que esas librerías esconden: escala de tiempo, virtualización, arrastre y conflictos. Además, sus vistas por recurso suelen requerir licencia comercial.

### 7.1 Escala y niveles de zoom

La posición horizontal es una función lineal del tiempo: `x = (t − inicioVista) / msPorPixel`. Internamente todo se calcula en milisegundos UTC; solo las marcas del eje se generan en la zona de visualización (sección 8). Valores iniciales propuestos:

| Zoom | Rango visible típico | Escala | Ajuste al soltar |
| --- | --- | --- | --- |
| Día | 2 días | 1 hora = 48 px | 15 minutos |
| Semana | 2 semanas | 1 día = 120 px | 1 hora |
| Mes | 3 meses | 1 día = 32 px | 1 día |

### 7.2 Estructura y rendimiento

- Cabecera de tiempo fija arriba y columna de nombres fija a la izquierda, ambas con `position: sticky`.
- Filas de alto fijo (40 px) virtualizadas con TanStack Virtual: solo existen en el DOM las visibles más un margen.
- En horizontal solo se dibujan las barras que cruzan la ventana visible. Las reservas se indexan en un `Map<activoId, Reserva[]>` ordenado por inicio, y la intersección se busca con búsqueda binaria.
- Cada fila es un componente memoizado con props estables; las barras son `div` absolutos movidos con `transform`.
- Capas por fila, de atrás hacia adelante: fines de semana y horas fuera de horario, bloques no disponibles (mantenimiento rayado, fuera de servicio gris), tiempo de preparación (franja tenue), reservas coloreadas por estado y marcas de conflicto.
- Meta: 120 filas por 90 días con desplazamiento y arrastre fluidos, sin tareas largas en el perfilador de React.

### 7.3 Flujo de arrastre

1. Al presionar sobre una barra se guardan la reserva, el punto de agarre y el modo: mover, o redimensionar por un borde de 8 px.
2. Al mover el puntero se calculan el nuevo inicio y fin con el ajuste del zoom, y la fila destino. El fantasma se mueve con `transform` dentro de `requestAnimationFrame`, sin tocar el store.
3. Cada vez que la posición ajustada cambia, se ejecuta `detectarConflictos` contra el índice y el fantasma se pinta verde, ámbar o rojo con el motivo en un tooltip.
4. Al soltar: si hay bloqueantes, la barra vuelve a su lugar con el mensaje; si hay advertencias, se abre un diálogo de confirmación; si es válido, se aplica la actualización optimista y se envía el `PATCH` con `version`.
5. Si la respuesta es 409, se revierte, se refresca la caché y se explica qué cambió.
6. Cada movimiento confirmado se apila como comando `{reservaId, antes, despues}`; Ctrl+Z envía el comando inverso.

Crear es el mismo flujo sobre un tramo vacío: la selección de rango abre el formulario de reserva precargado. En reservas en curso solo se habilita el borde derecho.

### 7.4 Detección de conflictos

```ts
// domain/intervalos.ts — milisegundos UTC, intervalos [inicio, fin)
export const seSolapan = (a: Intervalo, b: Intervalo) =>
  a.inicio < b.fin && b.inicio < a.fin;

// domain/conflictos.ts
export function detectarConflictos(p: Propuesta, ctx: ContextoActivo): Conflicto[] {
  const out: Conflicto[] = [];
  const buffer = ctx.categoria.bufferPreparacionMin * 60_000;

  if (ctx.activo.estadoOperativo !== 'operativo')
    out.push({ codigo: 'NO_OPERATIVO', severidad: 'bloqueante' });

  for (const r of ctx.reservas) {
    if (r.id === p.id || r.estado === 'cancelada') continue;
    if (seSolapan(p, r))
      out.push({ codigo: 'SOLAPE', severidad: 'bloqueante', con: r.id });
    else if (seSolapan(p, { inicio: r.inicio - buffer, fin: r.fin + buffer }))
      out.push({ codigo: 'BUFFER', severidad: 'advertencia', con: r.id });
  }

  for (const m of ctx.ordenes)
    if (m.estado !== 'cancelada' && seSolapan(p, m))
      out.push({ codigo: 'MANTENIMIENTO', severidad: 'bloqueante', con: m.id });

  // DOCUMENTO_VENCIDO, MANT_PROYECTADO, TRASLADO: funciones aparte, misma firma
  return out;
}
```

Para el panel de conflictos se recorre cada activo con sus reservas ordenadas por inicio, llevando el mayor fin visto: si el siguiente inicio es menor, hay solape. Es O(n log n) por el ordenamiento y alcanza de sobra para cientos de reservas.

## 8. Fechas y zonas horarias

La regla es una sola: se guarda en UTC, se calcula en milisegundos y se muestra e ingresa en la zona de la sede. Todo acceso a fechas pasa por `shared/lib/fechas.ts`; fuera de ese archivo, una regla de ESLint (`no-restricted-syntax` sobre `NewExpression[callee.name='Date']`) prohíbe `new Date`.

### 8.1 Tres tipos de valor temporal

| Tipo | Ejemplo | Cómo se guarda |
| --- | --- | --- |
| Instante | Inicio de una reserva | ISO UTC con Z: `2026-11-03T13:00:00Z` |
| Fecha civil | Vencimiento del seguro | `2026-11-03`, sin hora ni zona |
| Hora de pared | Horario de la sede, 07:00 a 18:00 | `"07:00"` más la zona de la sede |

Mezclarlos produce los errores clásicos. Por ejemplo, `new Date('2026-11-03')` se interpreta como medianoche UTC y en Venezuela (UTC−4) se muestra como el 2 de noviembre a las 20:00.

### 8.2 Qué zona se usa en cada lugar

- **Formulario de reserva:** inicio en la zona de la sede de retiro y fin en la zona de la sede de devolución, con la zona visible junto al campo ("hora de Maracaibo, UTC−4").
- **Timeline:** selector "Zona de visualización" con tres opciones: zona de la sede del grupo (por defecto), zona del navegador o UTC. Cambiarla mueve las marcas del eje, no las barras.
- **Duraciones y cobro:** siempre en milisegundos UTC. Días cobrados = bloques de 24 horas redondeados hacia arriba, con una tolerancia configurable.
- **Inicio de día y marcas del eje:** se calculan con `startOfDay` y `addDays` en la zona elegida, nunca sumando 86 400 000 ms, porque un día no siempre dura 24 horas.

### 8.3 Por qué importa aunque Venezuela tenga una sola zona

Si una sede opera en Cúcuta (America/Bogota, UTC−5), una reserva Maracaibo–Cúcuta ya cruza zonas. Además, Venezuela cambió su desfase de UTC−4:30 a UTC−4 en 2016: nunca se escriben desfases fijos, siempre nombres IANA. Venezuela y Colombia no tienen horario de verano, pero las pruebas usan también America/New\_York para demostrar que el código no supone días de 24 horas.

### 8.4 Núcleo de `fechas.ts`

```ts
import { TZDate } from '@date-fns/tz';
import { format, startOfDay, addDays } from 'date-fns';

const aUTC = (d: Date): InstanteUTC => new Date(d.getTime()).toISOString();

export const enZona = (i: InstanteUTC, zona: ZonaIANA) => new TZDate(i, zona);

export const formatear = (i: InstanteUTC, zona: ZonaIANA, patron = 'dd/MM/yyyy HH:mm') =>
  format(enZona(i, zona), patron);

// Lo que el usuario escribe en el formulario, interpretado en la zona de la sede
export const desdeHoraLocal = (
  a: number, mes: number, dia: number, h: number, min: number, zona: ZonaIANA,
) => aUTC(new TZDate(a, mes - 1, dia, h, min, zona));

export const inicioDelDia = (i: InstanteUTC, zona: ZonaIANA) =>
  aUTC(startOfDay(enZona(i, zona)));

export const diasDelRango = (desde: InstanteUTC, n: number, zona: ZonaIANA) => {
  const base = startOfDay(enZona(desde, zona));
  return Array.from({ length: n }, (_, k) => aUTC(addDays(base, k)));
};
```

Las pruebas de este archivo se ejecutan dos veces en integración continua, con `TZ=America/Caracas` y con `TZ=Asia/Tokyo`. Si un resultado cambia según la zona de la máquina, hay una dependencia oculta del navegador.

## 9. Inspección: formularios dinámicos y fotos

El formulario no se programa: se describe en JSON y un solo componente lo dibuja, lo valida y calcula el resultado. Así una retroexcavadora y un sedán usan el mismo código con plantillas distintas, y agregar una categoría no requiere tocar React.

### 9.1 Tipos

```ts
type Operador = 'eq' | 'neq' | 'in' | 'lt' | 'gt';
type Comparacion = { op: Operador; valor: unknown };
type Condicion =
  | ({ campo: string } & Comparacion)
  | { todas: Condicion[] }
  | { alguna: Condicion[] };

type TipoCampo = 'si_no' | 'opcion' | 'multi' | 'numero' | 'texto' | 'nivel' | 'foto' | 'firma';

interface CampoPlantilla {
  id: string;
  tipo: TipoCampo;
  etiqueta: string;
  requerido: boolean;
  critico?: boolean;          // si falla, el resultado es no apto
  falla?: Comparacion;        // qué respuesta cuenta como falla
  opciones?: string[];
  min?: number; max?: number;
  fotosMin?: number;
  visibleSi?: Condicion;
}

interface PlantillaInspeccion {
  id: ID; nombre: string; version: number; categoriaIds: ID[];
  secciones: { id: string; titulo: string; campos: CampoPlantilla[] }[];
}

interface Evidencia {
  id: ID; campoId: string; nombre: string; mime: string; bytes: number;
  url: string; estado: 'pendiente' | 'subiendo' | 'lista' | 'error'; progreso: number;
}

interface Inspeccion {
  id: ID; plantillaId: ID; plantillaVersion: number;
  activoId: ID; reservaId?: ID;
  momento: 'salida' | 'devolucion' | 'rutina';
  inspectorId: ID; realizadaEn: InstanteUTC;
  lectura: number; combustiblePct?: number;
  respuestas: Record<string, unknown>;
  evidencias: Evidencia[];
  observaciones?: string;
  resultado: 'apto' | 'apto_con_observaciones' | 'no_apto';
}
```

### 9.2 Ejemplo de plantilla (fragmento)

Si el inspector marca una fuga hidráulica, aparecen la ubicación y un campo que exige dos fotos; como el campo es crítico, la inspección queda no apta.

```json
{
  "id": "plt-retro",
  "nombre": "Inspección retroexcavadora",
  "version": 3,
  "secciones": [{
    "id": "hidraulico",
    "titulo": "Sistema hidráulico",
    "campos": [
      { "id": "fuga", "tipo": "si_no", "etiqueta": "¿Hay fugas de aceite hidráulico?",
        "requerido": true, "critico": true, "falla": { "op": "eq", "valor": true } },
      { "id": "fuga_ubicacion", "tipo": "opcion", "etiqueta": "Ubicación de la fuga",
        "opciones": ["Brazo", "Cucharón", "Estabilizadores", "Bomba"], "requerido": true,
        "visibleSi": { "campo": "fuga", "op": "eq", "valor": true } },
      { "id": "fuga_fotos", "tipo": "foto", "etiqueta": "Fotos de la fuga",
        "fotosMin": 2, "requerido": true,
        "visibleSi": { "campo": "fuga", "op": "eq", "valor": true } },
      { "id": "nivel_aceite", "tipo": "nivel", "etiqueta": "Nivel de aceite hidráulico (%)",
        "requerido": true, "min": 0, "max": 100, "falla": { "op": "lt", "valor": 25 } }
    ]
  }]
}
```

### 9.3 Cómo funciona el renderizador

1. `FormularioDinamico` recibe la plantilla y muestra cada sección como un paso, con barra de progreso.
2. Un registro `{ si_no: CampoSiNo, opcion: CampoOpcion, … }` asocia cada tipo con su componente. Un tipo nuevo es un componente más y una entrada más.
3. `esVisible(campo, respuestas)` evalúa la condición de forma recursiva con los valores observados por `useWatch`. Los campos ocultos no se validan ni se envían.
4. `construirEsquema(plantilla)` genera el esquema Zod: un validador base por tipo más un `superRefine` que exige los requeridos solo si están visibles, junto con `fotosMin`, `min` y `max`.
5. `calcularResultado(plantilla, respuestas)` devuelve no apto si falla algún campo crítico visible; apto con observaciones si falla uno no crítico o hay observaciones; si no, apto.

Toda esta lógica vive en `domain/inspeccion.ts`, sin React, y se prueba con plantillas de ejemplo.

### 9.4 Fotos y carga simulada

- `<input type="file" accept="image/*" capture="environment" multiple>` abre la cámara trasera en el teléfono.
- La foto se reduce en el navegador antes de subirla. Propuesta: lado mayor de 1600 px, JPEG con calidad 0,8.
- La vista previa usa `URL.createObjectURL`, que se libera al quitar la foto o desmontar el componente.
- La carga pasa por una sola función, `subirEvidencia(archivo, alProgresar)`. En los mocks emite progreso durante unos segundos y falla de vez en cuando con una semilla fija, para probar el botón de reintento. Con el backend será un `POST` multipart.
- Respuestas y fotos se guardan como borrador en IndexedDB en cada cambio, con un pequeño retardo, y se recuperan al volver a abrir.

### 9.5 Comparación salida contra devolución

Una vista lado a lado muestra la diferencia de lectura y de combustible, los campos que pasaron de bien a falla ("daño nuevo") y las fotos de ambos momentos. Cada inspección guarda `plantillaVersion`, y los mocks conservan todas las versiones, para que una inspección vieja se vea con la plantilla que usó.

## 10. Filtrado multicriterio

Los filtros son un objeto serializable en un slice compartido por inventario y timeline, sincronizado en ambos sentidos con la URL. Un enlace como `?tipo=maquinaria&motor=diesel&cap=5-20&sede=mcbo` reproduce exactamente la misma vista, y el botón Atrás deshace filtros.

| Criterio | Control | Ejemplo |
| --- | --- | --- |
| Texto libre (código, placa, marca, modelo) | Búsqueda con espera de 250 ms | "CAT 420" |
| Tipo | Botones segmentados | Maquinaria |
| Categoría | Selección múltiple | Excavadora, Grúa |
| Motor | Selección múltiple | Diésel |
| Capacidad | Rango numérico con la unidad de la categoría | 5 a 20 t |
| Estado | Selección múltiple | Disponible, Próxima salida |
| Sede | Selección múltiple | Maracaibo |
| Disponible entre | Rango de fechas | 3 al 10 de noviembre |
| Mantenimiento próximo | Interruptor | Vence en 7 días o menos |
| Requiere operador | Interruptor | Sí |

- **Semántica:** Y entre criterios distintos, O entre opciones del mismo criterio.
- **Capacidad:** solo se habilita cuando las categorías elegidas comparten unidad; pasajeros y toneladas no se comparan.
- **Conteos por opción:** cada opción muestra cuántos resultados daría con los demás filtros aplicados, por ejemplo "Diésel (34)". Las opciones con cero se atenúan.
- **Disponible entre:** usa `domain/disponibilidad.ts`, que descarta los activos con reservas, órdenes o estado no operativo en el rango.
- **Vistas guardadas:** el usuario guarda combinaciones con nombre, como "Maquinaria diésel Maracaibo".
- **Dónde se filtra:** en el navegador, con un selector memoizado, porque son cientos de activos. La API acepta los mismos parámetros (`GET /api/activos?motor=diesel&capacidadMin=5…`) para que el backend pueda asumir el filtrado cuando crezcan los datos.

## 11. Mocks y contrato de API

El frontend nunca sabe que habla con mocks: hace `fetch('/api/...')` reales y MSW los intercepta en el navegador. Para conectar el backend en Python basta definir `VITE_API_URL` y desactivar MSW; ningún componente cambia.

### 11.1 Datos simulados

- **Deterministas:** Faker con semilla fija, para que la demo y las pruebas vean siempre los mismos datos.
- **Volumen:** 4 sedes, unas 12 categorías, 120 activos, 60 clientes, unas 400 reservas entre 30 días atrás y 60 días adelante, y 25 órdenes de mantenimiento.
- **Escenarios sembrados a propósito:** 3 conflictos, un seguro por vencer, un activo con mantenimiento vencido y una reserva por asignar.
- **Reloj de demo:** una fecha "hoy" configurable, para que la defensa se vea igual sin importar el día.
- **Latencia y fallas:** retardo aleatorio de 150 a 600 ms y un panel de desarrollo para forzar errores 500 o 409 y probar los estados de error.
- **Validación de servidor simulada:** los handlers usan `domain/` para rechazar lo inválido, igual que hará el backend.

### 11.2 Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/sedes`, `/api/categorias` | Catálogos |
| GET | `/api/activos` | Lista con los parámetros de filtro de la sección 10 |
| GET | `/api/activos/:id` | Ficha con documentos e historial |
| PATCH | `/api/activos/:id` | Cambiar estado operativo con motivo; exige `version` |
| GET | `/api/disponibilidad` | Activos libres por `desde`, `hasta`, `categoriaId`, `sedeId` |
| GET | `/api/reservas` | Reservas por `desde`, `hasta` y `activoIds` |
| POST | `/api/reservas` | Crear |
| POST | `/api/reservas/validar` | Simulación: devuelve conflictos sin guardar |
| PATCH | `/api/reservas/:id` | Fechas o activo; exige `version` |
| POST | `/api/reservas/:id/transiciones` | `confirmar`, `entregar`, `devolver` o `cancelar` |
| GET / POST | `/api/mantenimiento/ordenes` | Órdenes por rango; crear |
| GET | `/api/plantillas-inspeccion/:id?version=` | Plantilla en una versión |
| POST | `/api/inspecciones` | Registrar inspección |
| POST | `/api/evidencias` | Subir foto (multipart) |
| GET / POST | `/api/clientes` | Listar y crear |
| WS | `/api/eventos` | Eventos en tiempo real (simulado en esta fase) |

### 11.3 Errores

- **409 conflicto:** `{ "codigo": "CONFLICTO", "mensaje": "…", "conflictos": [{ "codigo": "SOLAPE", "con": "R-2026-00123" }] }`.
- **409 versión:** `{ "codigo": "VERSION", "actual": 7 }`.
- **422 validación:** el formato que FastAPI devuelve por defecto, para no reescribir el manejo después.
- **403 permiso:** cuando el rol no puede hacer la acción.

### 11.4 Puente hacia Python

El backend se puede hacer con FastAPI y modelos Pydantic que reflejen `api/contrato.ts`. FastAPI publica un esquema OpenAPI, y `openapi-typescript` genera desde él los tipos del frontend; así el contrato no se desincroniza. Las reglas de `domain/` se portan a Python con las mismas pruebas como casos de aceptación.

## 12. Accesibilidad, calidad y pruebas

La meta es WCAG 2.2 nivel AA, y el timeline es la pieza difícil: todo lo que se hace con el ratón debe poder hacerse con el teclado y anunciarse a un lector de pantalla.

### 12.1 Accesibilidad del timeline

- Estructura `role="grid"` con una fila por activo; cada reserva es enfocable con tabindex itinerante y las flechas saltan entre reservas.
- Mover con teclado: Espacio levanta la reserva, las flechas la mueven una unidad de ajuste o una fila, Mayús + flechas redimensiona, Enter suelta y Escape cancela. dnd-kit trae un sensor de teclado para esto.
- Una región `aria-live` anuncia cada resultado, por ejemplo "Reserva R-2026-00123 movida al 5 de noviembre, 08:00, sin conflictos".
- El color nunca va solo: estados y conflictos llevan además patrón o ícono, con contraste mínimo de 4,5:1 en texto.
- Una vista alternativa en lista muestra las mismas reservas para quien no puede usar la cuadrícula.

### 12.2 Calidad y errores de renderizado

- TypeScript estricto sin `any`; ESLint con `jsx-a11y` y `react-hooks`; Prettier.
- Un Error Boundary por módulo: si falla el mapa, el timeline sigue funcionando.
- Cada vista tiene estados de carga con esqueletos, vacío y error con reintento.
- `key` estables y sin efectos que escriban estado en cada render: se revisa con el modo estricto de React y el perfilador.

### 12.3 Pruebas

| Nivel | Herramienta | Qué cubre | Meta propuesta |
| --- | --- | --- | --- |
| Unidad | Vitest | `domain/`: intervalos, conflictos, máquina de estados, zonas horarias, esquema y resultado de inspección | 90 % de cobertura de `domain/` |
| Componentes | Testing Library + MSW | Formulario dinámico, filtros, ficha, panel de conflictos | Flujos principales de cada módulo |
| Extremo a extremo | Playwright | Crear por arrastre, mover con conflicto, inspección no apta que dispara la reasignación | 5 flujos críticos |
| Accesibilidad | axe-core en Playwright | Todas las páginas | Cero violaciones serias o críticas |
| Rendimiento | Perfilador de React | Timeline con 120 filas durante el arrastre | Sin tareas largas |

## 13. Plan de desarrollo

El desarrollo va de adentro hacia afuera: primero el contrato, los mocks y las reglas puras; después el timeline, que es el mayor riesgo técnico; al final los módulos que lo alimentan.

&#91;embedded content: plan de desarrollo · 6 sprints, 2 puertas, 1 entrega\]

La puerta 1 congela el contrato de API para que el timeline se construya sobre datos estables. La puerta 2 no deja avanzar sin un timeline fluido y usable con teclado, porque todo lo demás depende de él.

### Sprint 1 en tareas

- [ ] Crear el repositorio con Vite, React y TypeScript estricto; configurar ESLint, Prettier e integración continua.
- [ ] Escribir `api/contrato.ts` con los tipos de la sección 5 y revisarlo en equipo.
- [ ] Montar MSW con `db.ts`, `seed.ts` y los handlers de sedes, categorías y activos.
- [ ] Implementar `shared/lib/fechas.ts` con sus pruebas en dos zonas horarias.
- [ ] Implementar `domain/intervalos.ts` y `domain/conflictos.ts` con pruebas unitarias, antes de cualquier pantalla.
- [ ] Armar el esqueleto: layout, rutas de los ocho módulos, store y selector de rol.
- [ ] Bocetar el timeline y la pantalla de inspección (papel o Figma) y validarlos con el profesor.

## 14. Decisiones abiertas

Cada pregunta lleva una sugerencia pensada para un primer desarrollo solo de frontend. Marca cada una cuando la valides con el profesor, idealmente antes del sprint 2.

- [x] **Duración y equipo.** El plan supone 12 semanas. Sugerencia: planificar como si trabajaras solo y mantener los seis sprints. Si el tiempo se acorta, sale primero el mapa (UBI), luego el tablero y el tiempo real simulado; timeline, reservas e inspección no se recortan, porque son el corazón del enunciado.
- [x] **Redux o Zustand + TanStack Query.** Sugerencia: quedarse con Redux Toolkit + RTK Query. El enunciado pide explícitamente control de estado global, y con Redux DevTools puedes mostrar en la defensa cómo un arrastre en el timeline actualiza el inventario. RTK Query ya trae caché compartida, invalidación por etiquetas y actualización optimista, que es justo la sincronización que se exige.
- [x] **Zonas horarias.** Sugerencia: incluir en los mocks una sede en Cúcuta (America/Bogota, UTC−5). En un frontend con mocks cuesta una fila de datos y hace visible el requisito: una reserva Maracaibo–Cúcuta muestra horas distintas en retiro y devolución. Las pruebas con America/New\_York se mantienen para cubrir el horario de verano.
- [x] **Moneda.** Sugerencia: USD como moneda base de tarifas y cálculos, guardando los montos en centavos enteros para evitar errores de redondeo. La interfaz ofrece un equivalente opcional en bolívares con una tasa que entrega el mock (`GET /api/tasa-cambio`, con valor y fecha); cuando exista backend, él obtendrá la tasa oficial.
- [x] **Reservas por asignar.** Sugerencia: incluirlas en versión ligera en el sprint 4: la fila "Por asignar" y arrastrar la reserva hasta un activo compatible. Es el flujo real del alquiler, donde el cliente pide una categoría y no una unidad, y luce mucho en la demo. La asignación automática queda como opcional.
- [x] **Editor de plantillas.** Sugerencia: no hacer un constructor visual de arrastrar y soltar. En su lugar, una pantalla de administrador con el JSON de la plantilla a la izquierda y la vista previa del formulario a la derecha, validada en vivo con Zod. Muestra el poder del formulario dinámico con poco código.
- [x] **Inicio de sesión.** Sugerencia: una pantalla de login simulada con un usuario de prueba por rol y botones "Entrar como…" para la demo. El mock `POST /api/auth/login` devuelve el usuario y un token falso; un `AuthProvider` y rutas protegidas por rol dejan listo el cambio a JWT del backend sin tocar las pantallas.
- [x] **Nombre del sistema.** Sugerencias: **Oruga**, por la maquinaria de orugas y el avance constante; **Patio**, el lugar donde la flota espera su próxima salida; o **Rodaje**, por poner en marcha y por el asentamiento de un motor nuevo. Oruga es la más corta y memorable; antes de fijarla, conviene verificar que no choque con una marca registrada del sector.
