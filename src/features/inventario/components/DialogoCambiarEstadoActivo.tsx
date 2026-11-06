import React, { useState } from 'react';
import { WarningIcon } from '@phosphor-icons/react';
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
  { valor: 'operativo', etiqueta: 'Operativo (Disponible para alquiler)' },
  { valor: 'en_mantenimiento', etiqueta: 'En mantenimiento (Taller preventivo/correctivo)' },
  { valor: 'fuera_de_servicio', etiqueta: 'Fuera de servicio (Avería o siniestro)' },
  { valor: 'baja', etiqueta: 'Baja definitiva (Retiro de la flota)' },
];

export function DialogoCambiarEstadoActivo({
  activo,
  abierto,
  onCerrar,
  onEstadoCambiado,
}: DialogoCambiarEstadoActivoProps) {
  const [cambiarEstado, { isLoading }] = useCambiarEstadoActivoMutation();

  const [nuevoEstado, setNuevoEstado] = useState<EstadoOperativo>(
    activo?.estadoOperativo ?? 'operativo',
  );
  const [motivo, setMotivo] = useState('');
  const [errorEnvio, setErrorEnvio] = useState<unknown>(null);

  if (!activo) return null;

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
        titulo={
          <div className="flex items-center gap-2 text-primary font-bold">
            <WarningIcon className="h-5 w-5" />
            <span>Cambio de Estado Operativo: {activo.codigo}</span>
          </div>
        }
        descripcion={`Estado actual: ${activo.estadoOperativo}. Toda modificación queda registrada en la bitácora de auditoría.`}
        tamano="md"
        pie={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variante="fantasma" onClick={onCerrar} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              variante="primario"
              onClick={handleSubmit}
              cargando={isLoading ? 'Aplicando…' : false}
            >
              Confirmar Cambio de Estado
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
            etiqueta="Motivo / Justificación técnica"
            requerido
            ayuda="Indique falla detectada, orden de taller vinculada o decisión de gerencia de flota."
          >
            <Textarea
              placeholder="Ej. Fuga de aceite hidráulico detectada en retorno de inspección. Ingresa a taller preventivo..."
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
