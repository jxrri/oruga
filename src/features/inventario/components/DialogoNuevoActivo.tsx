import React, { useId, useState } from 'react';
import type { ActivoNuevo, Categoria, Sede, TipoMotor } from '@/api/contrato';
import { useCrearActivoMutation } from '@/api/baseApi';
import { ahora } from '@/shared/lib/fechas';
import { Button } from '@/shared/ui/Button';
import { Dialog, DialogContent } from '@/shared/ui/Dialog';
import { Field, Input } from '@/shared/ui/Field';
import { Select } from '@/shared/ui/Select';
import { Switch } from '@/shared/ui/Switch';
import { ErrorState } from '@/shared/ui/Estados';

export interface DialogoNuevoActivoProps {
  abierto: boolean;
  onCerrar: () => void;
  categorias: Categoria[];
  sedes: Sede[];
  onActivoCreado?: () => void;
}

const OPCIONES_MOTOR: { valor: TipoMotor; etiqueta: string }[] = [
  { valor: 'diesel', etiqueta: 'Diésel' },
  { valor: 'gasolina', etiqueta: 'Gasolina' },
  { valor: 'electrico', etiqueta: 'Eléctrico' },
  { valor: 'hibrido', etiqueta: 'Híbrido' },
  { valor: 'gas', etiqueta: 'Gas' },
];

export function DialogoNuevoActivo(props: DialogoNuevoActivoProps) {
  if (!props.abierto) return null;
  return <ContenidoNuevoActivo {...props} />;
}

function ContenidoNuevoActivo({
  abierto,
  onCerrar,
  categorias,
  sedes,
  onActivoCreado,
}: DialogoNuevoActivoProps) {
  const [crearActivo, { isLoading }] = useCrearActivoMutation();

  const [codigo, setCodigo] = useState('');
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? '');
  const [sedeBaseId, setSedeBaseId] = useState(sedes[0]?.id ?? '');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const anioActual = Number(ahora().slice(0, 4));
  const [anio, setAnio] = useState(anioActual);
  const [placa, setPlaca] = useState('');
  const [serial, setSerial] = useState('');
  const [motor, setMotor] = useState<TipoMotor>('diesel');
  const [capacidad, setCapacidad] = useState<number>(10);
  const [lecturaActual, setLecturaActual] = useState<number>(0);
  const [requiereOperador, setRequiereOperador] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<unknown>(null);
  const idFormulario = useId();

  const categoriaIdEfectiva = categoriaId || categorias[0]?.id || '';
  const sedeBaseIdEfectiva = sedeBaseId || sedes[0]?.id || '';
  const categoriaActual = categorias.find((c) => c.id === categoriaIdEfectiva) ?? categorias[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !marca.trim() || !modelo.trim() || !serial.trim()) {
      setErrorEnvio('Por favor complete todos los campos requeridos.');
      return;
    }

    try {
      const nuevo: ActivoNuevo = {
        codigo: codigo.trim().toUpperCase(),
        categoriaId: categoriaIdEfectiva,
        sedeBaseId: sedeBaseIdEfectiva,
        marca: marca.trim(),
        modelo: modelo.trim(),
        anio: Number(anio),
        placa: placa.trim() ? placa.trim().toUpperCase() : undefined,
        serial: serial.trim().toUpperCase(),
        motor,
        capacidad: Number(capacidad),
        lecturaActual: Number(lecturaActual),
        estadoOperativo: 'operativo',
        documentos: [],
        requiereOperador,
      };

      await crearActivo(nuevo).unwrap();
      onActivoCreado?.();
      onCerrar();
    } catch (err: unknown) {
      setErrorEnvio(err);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent
        titulo="Nuevo activo"
        descripcion="Registre la ficha técnica, medidor inicial y sede base del vehículo o maquinaria."
        tamano="lg"
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
              cargando={isLoading ? 'Registrando…' : false}
            >
              Guardar activo
            </Button>
          </>
        }
      >
        <form id={idFormulario} noValidate onSubmit={handleSubmit} className="space-y-5 pt-1">
          {Boolean(errorEnvio) && (
            <ErrorState error={errorEnvio} compacto onCerrar={() => setErrorEnvio(null)} />
          )}

          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
            <Field etiqueta="Código interno" requerido ayuda="Ej. EXC-015, CAM-008">
              <Input
                placeholder="EXC-015"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
                className="font-mono"
              />
            </Field>

            <Field etiqueta="Categoría" requerido>
              <Select
                valor={categoriaIdEfectiva}
                onCambio={setCategoriaId}
                opciones={categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
              />
            </Field>

            <Field etiqueta="Sede base" requerido>
              <Select
                valor={sedeBaseIdEfectiva}
                onCambio={setSedeBaseId}
                opciones={sedes.map((s) => ({ valor: s.id, etiqueta: `${s.nombre} (${s.ciudad})` }))}
              />
            </Field>

            <Field etiqueta="Marca" requerido>
              <Input
                placeholder="Caterpillar, Volvo, Komatsu…"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                required
              />
            </Field>

            <Field etiqueta="Modelo" requerido>
              <Input
                placeholder="320D, FH16, D6T…"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required
              />
            </Field>

            <Field etiqueta="Año de fabricación" requerido>
              <Input
                type="number"
                min={1990}
                max={anioActual + 1}
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                required
              />
            </Field>

            <Field etiqueta="Serial / VIN" requerido>
              <Input
                placeholder="CAT320D00…"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                required
                className="font-mono"
              />
            </Field>

            <Field etiqueta="Placa de circulación" ayuda="Opcional para maquinaria de obra">
              <Input
                placeholder="A12BC3D"
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
                className="font-mono"
              />
            </Field>

            <Field etiqueta="Tipo de motor" requerido>
              <Select
                valor={motor}
                onCambio={(v) => setMotor(v as TipoMotor)}
                opciones={OPCIONES_MOTOR}
              />
            </Field>

            <Field
              etiqueta={`Capacidad (${categoriaActual?.unidadCapacidad ?? 't'})`}
              requerido
            >
              <Input
                type="number"
                step="0.1"
                min={0}
                value={capacidad}
                onChange={(e) => setCapacidad(Number(e.target.value))}
                required
              />
            </Field>

            <Field
              etiqueta={`Lectura inicial (${categoriaActual?.medidor ?? 'km'})`}
              requerido
            >
              <Input
                type="number"
                min={0}
                value={lecturaActual}
                onChange={(e) => setLecturaActual(Number(e.target.value))}
                required
              />
            </Field>
          </div>

          <div className="border-t border-line pt-4">
            <Switch
              checked={requiereOperador}
              onCheckedChange={setRequiereOperador}
              etiqueta="Requiere operador certificado obligatorio"
              descripcion="Activa la validación estricta para que ninguna reserva de este activo pueda despacharse sin un operario homologado."
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
