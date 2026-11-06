/** Clientes: lista, ficha con reservas, alta y edición o bloqueo (RF-CLI-01). */
import type { Cliente, ClienteDetalle, ClienteNuevo } from '@/api/contrato';
import { normalizarIdentificador, validarDocumento } from '@/domain/validaciones';
import { db, nuevoId } from '../db';
import { invalido, json, leerCuerpo, noEncontrado, prohibido, ruta, versionVieja } from '../servidor';

type CambiosCliente = Partial<ClienteNuevo> & { estado?: Cliente['estado']; version: number };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO = /^\+?[\d\s()-]{7,20}$/;

function erroresCliente(c: ClienteNuevo, excluirId?: string): [string, string][] {
  const e: [string, string][] = [];
  if (c.tipo !== 'persona' && c.tipo !== 'empresa') e.push(['tipo', 'Tipo de cliente inválido.']);
  if (!c.nombre?.trim()) e.push(['nombre', 'El nombre es obligatorio.']);
  const doc = validarDocumento(c.tipo, c.documento ?? '');
  if (doc) e.push(['documento', doc]);
  else if (db.clientes.some((x) => x.id !== excluirId && normalizarIdentificador(x.documento) === normalizarIdentificador(c.documento)))
    e.push(['documento', 'Ya existe un cliente con ese documento.']);
  if (!TELEFONO.test(c.telefono ?? '')) e.push(['telefono', 'Teléfono inválido, por ejemplo +58 412-555-1234.']);
  if (!EMAIL.test(c.email ?? '')) e.push(['email', 'Correo electrónico inválido.']);
  return e;
}

export const clientes = [
  ruta('get', 'clientes', () => json(db.clientes)),
  ruta('get', 'clientes/:id', ({ params }) => {
    const cliente = db.clientes.find((c) => c.id === params.id);
    if (!cliente) return noEncontrado('El cliente');
    return json({ cliente, reservas: db.reservas.filter((r) => r.clienteId === cliente.id) } satisfies ClienteDetalle);
  }),

  ruta('post', 'clientes', async ({ request, usuario }) => {
    const sinPermiso = prohibido(usuario, 'crear', 'cliente');
    if (sinPermiso) return sinPermiso;
    const b = await leerCuerpo<ClienteNuevo>(request);
    if (!b) return invalido([['cuerpo', 'Cuerpo de la petición inválido.']]);
    const errores = erroresCliente(b);
    if (errores.length) return invalido(errores);
    const cliente: Cliente = { ...b, documento: b.documento.trim().toUpperCase(), id: nuevoId('cli'), estado: 'activo', version: 1 };
    db.clientes.push(cliente);
    return json(cliente, 201);
  }),

  ruta('patch', 'clientes/:id', async ({ request, params, usuario }) => {
    const sinPermiso = prohibido(usuario, 'editar', 'cliente');
    if (sinPermiso) return sinPermiso;
    const cliente = db.clientes.find((c) => c.id === params.id);
    if (!cliente) return noEncontrado('El cliente');
    const b = await leerCuerpo<CambiosCliente>(request);
    if (!b) return invalido([['cuerpo', 'Cuerpo de la petición inválido.']]);
    const vieja = versionVieja(b.version, cliente.version);
    if (vieja) return vieja;
    const { version: _v, estado, ...datos } = b;
    if (estado !== undefined && estado !== 'activo' && estado !== 'bloqueado') return invalido([['estado', 'Estado inválido.']]);
    const errores = erroresCliente({ ...cliente, ...datos }, cliente.id);
    if (errores.length) return invalido(errores);
    Object.assign(cliente, datos, estado ? { estado } : {}, { version: cliente.version + 1 });
    return json(cliente);
  }),
];
