interface FilaBarraProps {
  etiqueta: string;
  /** Línea menor bajo la etiqueta */
  nota?: string;
  /** La cifra, ya escrita */
  valor: string;
  detalle?: string;
  /** De 0 a 1 */
  fraccion: number;
  color: string;
  /** Barra en tono pálido: deja destacar otra fila */
  tenue?: boolean;
}

/** Fila de un reporte: etiqueta, barra proporcional y cifra. El significado va en el texto, no en el color. */
export function FilaBarra({ etiqueta, nota, valor, detalle, fraccion, color, tenue }: FilaBarraProps) {
  return (
    <li className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_4.25rem] items-center gap-3 text-[13px] sm:grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_4.75rem]">
      <span className="leading-tight text-ink-2">
        {etiqueta}
        {nota && <span className="block text-xs text-ink-3">{nota}</span>}
      </span>
      <span className="h-2 overflow-hidden rounded-full bg-panel-2" aria-hidden>
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.min(1, fraccion) * 100}%`, backgroundColor: color, opacity: tenue ? 0.4 : 1 }}
        />
      </span>
      <span className="tabular text-right font-medium text-ink">
        {valor}
        {detalle && <span className="ml-1.5 font-normal text-ink-3">{detalle}</span>}
      </span>
    </li>
  );
}
