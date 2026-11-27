import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { toast } from 'sonner';
import { ArrowRightIcon } from '@phosphor-icons/react';
import type { Rol } from '@/api/contrato';
import { useGetSedesQuery, useRegistroMutation } from '@/api/baseApi';
import { describirError } from '@/api/errores';
import { useAppDispatch } from '@/app/hooks';
import { ETIQUETA_ROL } from '@/app/permisos';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';
import { sesionIniciada } from '../authSlice';
import { CampoClave } from '../components/CampoClave';
import { ContenidoAuth } from '../components/MarcoAuth';
import { CLAVE_MINIMA } from '../reglas';

const ROLES = (Object.keys(ETIQUETA_ROL) as Rol[]).map((valor) => ({ valor, etiqueta: ETIQUETA_ROL[valor] }));
const CAMPOS_TEXTO = ['nombre', 'correo', 'clave'] as const;

type Errores = Partial<Record<(typeof CAMPOS_TEXTO)[number] | 'rol' | 'sedeId' | 'general', string>>;

/** Registro: crea la cuenta en la base local y entra con ella. MarcoAuth redirige al abrirse la sesión. */
export default function RegistroPage() {
  const { data: sedes = [] } = useGetSedesQuery();
  const [registro, { isLoading }] = useRegistroMutation();
  const dispatch = useAppDispatch();
  const { search } = useLocation();
  const formulario = useRef<HTMLFormElement>(null);

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [rol, setRol] = useState<Rol>('planificador');
  const [sedeElegida, setSedeElegida] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const sedeId = sedeElegida || sedes[0]?.id || '';

  function mostrar(nuevos: Errores) {
    setErrores(nuevos);
    const primero = CAMPOS_TEXTO.find((c) => nuevos[c]);
    if (primero) formulario.current?.querySelector<HTMLInputElement>(`[name="${primero}"]`)?.focus();
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const locales: Errores = {};
    if (nombre.trim().length < 3) locales.nombre = 'Escribe tu nombre y apellido.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) locales.correo = 'Escribe un correo válido.';
    if (clave.length < CLAVE_MINIMA) locales.clave = `La clave debe tener al menos ${CLAVE_MINIMA} caracteres.`;
    if (Object.keys(locales).length) return mostrar(locales);

    try {
      const sesion = await registro({ nombre, correo, clave, rol, sedeId }).unwrap();
      dispatch(sesionIniciada(sesion));
      toast.success(`Cuenta creada. Hola, ${sesion.usuario.nombre.split(' ')[0]}`, {
        description: `Entraste como ${ETIQUETA_ROL[sesion.usuario.rol]}.`,
      });
    } catch (err) {
      const legible = describirError(err);
      mostrar(legible.campos ?? { general: legible.detalle });
    }
  }

  return (
    <ContenidoAuth
      titulo={
        <>
          Crea tu cuenta. <span className="text-ink-3">Tu rol define lo que ves.</span>
        </>
      }
      bajada="Un minuto y entras. Después puedes cerrar sesión y volver con tu correo y tu clave."
    >
      <form ref={formulario} onSubmit={(e) => void enviar(e)} noValidate data-intro className="mt-7 flex flex-col gap-4">
        <Field etiqueta="Nombre y apellido" error={errores.nombre}>
          <Input
            name="nombre"
            autoComplete="name"
            placeholder="Yelitza Camacho"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="h-11"
          />
        </Field>
        <Field etiqueta="Correo" error={errores.correo}>
          <Input
            name="correo"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nombre@empresa.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="h-11"
          />
        </Field>
        <Field etiqueta="Clave" ayuda={`Mínimo ${CLAVE_MINIMA} caracteres.`} error={errores.clave}>
          <CampoClave name="clave" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field etiqueta="Rol" error={errores.rol}>
            <Select valor={rol} onCambio={setRol} opciones={ROLES} />
          </Field>
          <Field etiqueta="Sede" error={errores.sedeId}>
            <Select
              valor={sedeId}
              onCambio={setSedeElegida}
              opciones={sedes.map((s) => ({ valor: s.id, etiqueta: s.ciudad }))}
              placeholder="Cargando sedes…"
            />
          </Field>
        </div>

        {errores.general && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
            {errores.general}
          </p>
        )}

        <Button type="submit" variante="primario" tamano="lg" cargando={isLoading && 'Creando la cuenta…'} iconoFin={ArrowRightIcon}>
          Crear cuenta y entrar
        </Button>
      </form>

      <p data-intro className="mt-5 text-ink-2">
        ¿Ya tienes cuenta?{' '}
        <Link to={`/login${search}`} className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent">
          Entrar
        </Link>
      </p>
    </ContenidoAuth>
  );
}
