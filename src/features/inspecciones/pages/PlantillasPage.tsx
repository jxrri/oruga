import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CodeIcon,
  FloppyDiskIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { useGetPlantillasQuery, useGuardarPlantillaMutation } from '@/api/baseApi';
import { validarPlantilla } from '@/domain/inspeccion';
import { Button, ErrorState, Skeleton } from '@/shared/ui';

export default function PlantillasPage() {
  const navigate = useNavigate();

  const { data: plantillas = [], isLoading, error, refetch } = useGetPlantillasQuery();
  const [guardarPlantilla, { isLoading: guardando }] = useGuardarPlantillaMutation();

  const [plantillaSeleccionadaId, setPlantillaSeleccionadaId] = useState('');
  const [jsonManual, setJsonManual] = useState<string | null>(null);
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([]);
  const [mensajeExito, setMensajeExito] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<unknown>(null);

  const plantillaActual = plantillas.find((p) => p.id === plantillaSeleccionadaId) ?? plantillas[0];
  const jsonTexto = jsonManual ?? (plantillaActual ? JSON.stringify(plantillaActual, null, 2) : '');

  const handleJsonChange = (nuevoTexto: string) => {
    setJsonManual(nuevoTexto);
    setMensajeExito(false);
    try {
      const obj = JSON.parse(nuevoTexto);
      const res = validarPlantilla(obj);
      if (res.ok) {
        setErroresValidacion([]);
      } else {
        setErroresValidacion(res.errores);
      }
    } catch {
      setErroresValidacion(['Sintaxis JSON no válida.']);
    }
  };

  const handleGuardar = async () => {
    setErrorGuardar(null);
    try {
      const obj = JSON.parse(jsonTexto);
      const res = validarPlantilla(obj);
      if (!res.ok) {
        setErroresValidacion(res.errores);
        return;
      }

      await guardarPlantilla(res.plantilla).unwrap();
      setMensajeExito(true);
      setErroresValidacion([]);
    } catch (err: unknown) {
      setErrorGuardar(err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorState error={error} onReintentar={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Cabecera */}
      <div className="border-b border-border bg-card/60 px-6 py-3.5 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variante="fantasma"
            tamano="sm"
            icono={ArrowLeftIcon}
            onClick={() => navigate('/inspecciones')}
          >
            Inspecciones
          </Button>
          <span className="text-border">/</span>
          <span className="font-semibold text-xs text-foreground">
            Editor de Plantillas de Inspección
          </span>
        </div>

        <Button
          variante="primario"
          icono={FloppyDiskIcon}
          onClick={handleGuardar}
          disabled={erroresValidacion.length > 0}
          cargando={guardando ? 'Guardando…' : false}
          className="text-xs font-bold"
        >
          Guardar Cambios
        </Button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Barra lateral de selección de plantilla */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card/40 p-4 space-y-2 shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            Plantillas Activas
          </span>

          <div className="space-y-1">
            {plantillas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPlantillaSeleccionadaId(p.id);
                  setJsonManual(null);
                  setErroresValidacion([]);
                  setMensajeExito(false);
                }}
                className={`w-full text-left rounded-lg p-2.5 text-xs transition-all ${
                  p.id === plantillaActual?.id
                    ? 'bg-primary/10 border border-primary text-primary font-bold shadow-xs'
                    : 'border border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
              >
                <div className="truncate">{p.nombre}</div>
                <div className="font-mono text-[10px] text-muted-foreground">v{p.version} · {p.secciones.length} secciones</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Editor Central */}
        <main className="flex-1 p-6 flex flex-col space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <CodeIcon className="h-4 w-4 text-primary" />
                <span>{plantillaActual?.nombre} (Definición JSON)</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Edite secciones, campos dinámicos, condiciones lógicas (visibleSi) y criterios de falla técnica.
              </p>
            </div>

            {mensajeExito && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg">
                <CheckCircleIcon className="h-4 w-4" /> Plantilla guardada con éxito
              </span>
            )}
          </div>

          {Boolean(errorGuardar) && (
            <ErrorState error={errorGuardar} compacto onCerrar={() => setErrorGuardar(null)} />
          )}

          {erroresValidacion.length > 0 && (
            <div className="rounded-xl border border-danger/25 bg-danger-soft p-3.5 space-y-1 text-xs text-danger">
              <span className="font-bold flex items-center gap-1.5">
                <WarningCircleIcon className="h-4 w-4" /> Errores de Validación de Esquema:
              </span>
              <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px] text-ink-2">
                {erroresValidacion.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex-1 min-h-[500px] rounded-xl border border-border overflow-hidden bg-muted/20">
            <textarea
              value={jsonTexto}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleJsonChange(e.target.value)}
              className="w-full h-full p-4 font-mono text-xs bg-background/80 text-foreground resize-none focus:outline-none"
              spellCheck={false}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
