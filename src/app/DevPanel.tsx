import { useId, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { TrashIcon } from '@phosphor-icons/react';
import { api } from '@/api/baseApi';
import { cambiarConfigMock, leerConfigMock, suscribirConfigMock, type ConfigMock } from '@/mocks/config';
import { vaciarDb } from '@/mocks/db';
import { Button } from '@/shared/ui/Button';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Sheet, SheetContent } from '@/shared/ui/Sheet';
import { Switch } from '@/shared/ui/Switch';
import { useAppDispatch, useAppSelector } from './hooks';
import { panelDevAlternado } from './uiSlice';

const LATENCIAS = {
  rapida: { min: 0, max: 0 },
  normal: { min: 150, max: 600 },
  lenta: { min: 1500, max: 3000 },
} as const;
type Latencia = keyof typeof LATENCIAS | 'otra';

const latenciaActual = (l: ConfigMock['latencia']): Latencia =>
  (Object.keys(LATENCIAS) as (keyof typeof LATENCIAS)[]).find(
    (k) => LATENCIAS[k].min === l.min && LATENCIAS[k].max === l.max,
  ) ?? 'otra';

type Codigo = 'ninguno' | '500' | '409';

function Seccion({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-b border-line px-5 py-4 last:border-b-0">
      <div>
        <h3 className="font-medium text-ink">{titulo}</h3>
        <p className="text-[13px] text-ink-3">{ayuda}</p>
      </div>
      {children}
    </section>
  );
}

/** Panel de desarrollo (SPEC §11.1): ajusta la API simulada para mostrar cargas, errores y tiempo real. */
export default function DevPanel() {
  const abierto = useAppSelector((s) => s.ui.panelDevAbierto);
  const dispatch = useAppDispatch();
  const config = useSyncExternalStore(suscribirConfigMock, leerConfigMock);
  const idFalla = useId();
  const [vaciando, setVaciando] = useState(false);
  const codigo: Codigo = config.forzar ? (String(config.forzar.codigo) as Codigo) : 'ninguno';
  const latencia = latenciaActual(config.latencia);

  const handleVaciarDb = async () => {
    setVaciando(true);
    try {
      await vaciarDb();
      dispatch(api.util.resetApiState());
      toast.success('Base de datos local vaciada', {
        description: 'Se eliminaron activos, clientes, reservas, órdenes e inspecciones.',
      });
    } finally {
      setVaciando(false);
    }
  };

  return (
    <Sheet open={abierto} onOpenChange={(v) => dispatch(panelDevAlternado(v))}>
      <SheetContent titulo="Panel de desarrollo" descripcion="Ajusta la API simulada para probar estados de carga y error.">
        <Seccion titulo="Latencia" ayuda={`Retardo de cada respuesta: ${config.latencia.min} a ${config.latencia.max} ms.`}>
          <SegmentedControl<Latencia>
            aria-label="Latencia de la API"
            valor={latencia}
            onCambio={(v) => v !== 'otra' && cambiarConfigMock({ latencia: { ...LATENCIAS[v] } })}
            opciones={[
              { valor: 'rapida', etiqueta: 'Sin retardo' },
              { valor: 'normal', etiqueta: 'Normal' },
              { valor: 'lenta', etiqueta: 'Lenta' },
            ]}
          />
        </Seccion>

        <Seccion titulo="Forzar error" ayuda="Las escrituras responden con el código elegido.">
          <SegmentedControl<Codigo>
            aria-label="Código de error forzado"
            valor={codigo}
            onCambio={(v) =>
              cambiarConfigMock({
                forzar: v === 'ninguno' ? null : { codigo: Number(v) as 500 | 409, modo: config.forzar?.modo ?? 'proxima' },
              })
            }
            opciones={[
              { valor: 'ninguno', etiqueta: 'Ninguno' },
              { valor: '500', etiqueta: '500 servidor' },
              { valor: '409', etiqueta: '409 conflicto' },
            ]}
          />
          <SegmentedControl<'proxima' | 'siempre'>
            aria-label="Cuándo se fuerza el error"
            tamano="sm"
            disabled={!config.forzar}
            valor={config.forzar?.modo ?? 'proxima'}
            onCambio={(modo) => config.forzar && cambiarConfigMock({ forzar: { ...config.forzar, modo } })}
            opciones={[
              { valor: 'proxima', etiqueta: 'Solo la próxima escritura' },
              { valor: 'siempre', etiqueta: 'Todas' },
            ]}
          />
        </Seccion>

        <Seccion titulo="Tiempo real" ayuda="Eventos simulados de reservas, estados y posiciones.">
          <Switch
            etiqueta="Recibir eventos"
            checked={config.tiempoReal}
            onCheckedChange={(tiempoReal) => cambiarConfigMock({ tiempoReal })}
          />
        </Seccion>

        <Seccion titulo="Falla de evidencias" ayuda="Probabilidad de que falle la subida de una foto de inspección.">
          <div className="flex items-center gap-3">
            <input
              id={idFalla}
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(config.fallaEvidencias * 100)}
              onChange={(e) => cambiarConfigMock({ fallaEvidencias: Number(e.target.value) / 100 })}
              aria-label="Probabilidad de falla al subir evidencias"
              className="flex-1 accent-[var(--accent)]"
            />
            <output htmlFor={idFalla} className="tabular w-12 text-right font-mono text-[13px] text-ink">
              {Math.round(config.fallaEvidencias * 100)}&nbsp;%
            </output>
          </div>
        </Seccion>

        <Seccion
          titulo="Base de datos local"
          ayuda="Borra toda la flota, clientes, reservas, órdenes e inspecciones para empezar desde cero."
        >
          <Button
            variante="peligro"
            tamano="sm"
            icono={TrashIcon}
            cargando={vaciando ? 'Vaciando…' : false}
            onClick={() => void handleVaciarDb()}
          >
            Vaciar base de datos
          </Button>
        </Seccion>
      </SheetContent>
    </Sheet>
  );
}
