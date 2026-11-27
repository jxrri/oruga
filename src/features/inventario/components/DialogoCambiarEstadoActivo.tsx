import React, { useId, useState } from 'react';
import type { Activo, EstadoOperativo } from '@/api/contrato';
import { useCambiarEstadoActivoMutation } from '@/api/baseApi';
import { Button } from '@/shared/ui/Button';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { Field, Textarea } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';
import { ErrorState } from '@/shared/ui/Estados';

export interface DialogoCambiarEstadoActivoProps {
  activo: Activo | null;
  abierto: boolean;
  onCerrar: () => void;
  onEstadoCambiado?: () => void;
}

const OPCIONES_ESTADO: { valor: EstadoOperativo; etiqueta: string }[] = [
  { valor: 'operativo', etiqueta: 'Operativo (disponible para alquiler)' },
  { valor: 'en_mantenimiento', etiqueta: 'En mantenimiento (taller preventivo o correctivo)' },
  { valor: 'fuera_de_servicio', etiqueta: 'Fuera de servicio (avería o siniestro)' },
  { valor: 'baja', etiqueta: 'Baja definitiva (retiro de la flota)' },
];

/** Nombre legible del estado actual dentro de una frase */
const NOMBRE_ESTADO: Record<EstadoOperativo, string> = {
  operativo: 'operativo',
  en_mantenimiento: 'en mantenimiento',
  fuera_de_servicio: 'fuera de servicio',
  baja: 'de baja',
};

export function DialogoCambiarEstadoActivo(props: DialogoCambiarEstadoActivoProps) {
  if (!props.abierto || !props.activo) return null;
  return <ContenidoCambiarEstadoActivo key={props.activo.id} {...props} activo={props.activo} />;
}

function ContenidoCambiarEstadoActivo({
  activo,
  abierto,
  onCerrar,
  onEstadoCambiado,
}: Omit<DialogoCambiarEstadoActivoProps, 'activo'> & { activo: Activo }) {
  const [cambiarEstado, { isLoading }] = useCambiarEstadoActivoMutation();

  const [nuevoEstado, setNuevoEstado] = useState<EstadoOperativo>(activo.estadoOperativo);
  const [motivo, setMotivo] = useState('');
  const [errorEnvio, setErrorEnvio] = useState<unknown>(null);
  const idFormulario = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setErrorEnvio('Es obligatorio registrar el motivo técnico del cambio de estado.');
      return;
    }

    try {
      await cambiarEstado({
        id: activo.id,
        body: {
          estadoOperativo: nuevoEstado,
          motivo: motivo.trim(),
          version: activo.version,
        },
      }).unwrap();
      onEstadoCambiado?.();
      onCerrar();
    } catch (err: unknown) {
      setErrorEnvio(err);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent
        titulo={`Cambio de estado operativo: ${activo.codigo}`}
        descripcion={`Estado actual: ${NOMBRE_ESTADO[activo.estadoOperativo]}. Toda modificación queda registrada en la bitácora de auditoría.`}
        tamano="md"
        pie={
          <>
            <Button onClick={onCerrar} disabled={isLoading}>
              Cancelar
            </Button>
            {/* Envía el formulario por su id: así Enter en un campo hace lo mismo que el botón */}
            <Button
              variante="primario"
              type="submit"
              form={idFormulario}
              cargando={isLoading ? 'Aplicando…' : false}
            >
              Confirmar cambio
            </Button>
          </>
        }
      >
        <form id={idFormulario} noValidate onSubmit={handleSubmit} className="space-y-4 pt-1">
          {Boolean(errorEnvio) && (
            <ErrorState error={errorEnvio} compacto onCerrar={() => setErrorEnvio(null)} />
          )}

          <Field etiqueta="Nuevo estado operativo" requerido>
            <Select
              valor={nuevoEstado}
              onCambio={(v) => setNuevoEstado(v as EstadoOperativo)}
              opciones={OPCIONES_ESTADO}
            />
          </Field>

          <Field
            etiqueta="Motivo o justificación técnica"
            requerido
            ayuda="Indique falla detectada, orden de taller vinculada o decisión de gerencia de flota."
          >
            <Textarea
              placeholder="Ej. Fuga de aceite hidráulico detectada en retorno de inspección. Ingresa a taller preventivo…"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              required
            />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
