import React, { useState } from 'react';
import { WarningIcon } from '@phosphor-icons/react';
import type { Conflicto } from '@/api/contrato';
import { Button } from '@/shared/ui/Button';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { Field, Textarea } from '@/shared/ui/Field';

export interface DialogoConfirmarAdvertenciaProps {
  abierto: boolean;
  conflictos: Conflicto[];
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
  cargando?: boolean;
}

export function DialogoConfirmarAdvertencia({
  abierto,
  conflictos,
  onConfirmar,
  onCancelar,
  cargando = false,
}: DialogoConfirmarAdvertenciaProps) {
  const [motivo, setMotivo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);

  const handleConfirmar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setErrorMotivo('Debe ingresar una justificación operativa para registrar el cambio.');
      return;
    }
    setErrorMotivo(null);
    onConfirmar(motivo.trim());
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCancelar()}>
      <DialogContent
        titulo={
          <div className="flex items-center gap-2 text-ink">
            <WarningIcon size={20} weight="bold" className="text-warn shrink-0" aria-hidden />
            <span>Confirmar asignación con advertencias</span>
          </div>
        }
        descripcion="La reubicación o ajuste temporal genera avisos operativos que requieren justificación."
        tamano="md"
        pie={
          <div className="flex items-center gap-2">
            <Button variante="fantasma" onClick={onCancelar} disabled={cargando}>
              Cancelar
            </Button>
            <Button
              variante="primario"
              onClick={handleConfirmar}
              cargando={cargando ? 'Guardando…' : false}
            >
              Confirmar con justificación
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {/* Lista de advertencias */}
          <div className="space-y-2 rounded-xl border border-warn/35 bg-warn-soft p-3.5">
            <span className="block text-xs font-semibold text-warn">
              Advertencias detectadas ({conflictos.length}):
            </span>
            <ul className="list-inside list-disc space-y-1 text-xs text-ink-2">
              {conflictos.map((c, i) => (
                <li key={i}>
                  <strong className="font-mono font-semibold text-ink">{c.codigo}:</strong> {c.mensaje}
                </li>
              ))}
            </ul>
          </div>

          {/* Formulario de motivo */}
          <form onSubmit={handleConfirmar}>
            <Field
              etiqueta="Motivo o justificación operativa"
              requerido
              ayuda="Explique por qué se autoriza la asignación (p. ej.: alistamiento acelerado acordado con jefe de taller)."
              error={errorMotivo}
            >
              <Textarea
                placeholder="Ej. Se coordina alistamiento inmediato entre turnos con el equipo de patio…"
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  if (errorMotivo) setErrorMotivo(null);
                }}
                rows={3}
                required
              />
            </Field>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
