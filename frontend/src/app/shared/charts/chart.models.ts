/** Punto de datos genérico de las gráficas: una etiqueta y su valor. */
export interface ChartDatum {
  label: string;
  count: number;
}

/** Unidad para leer los valores en voz alta y en tooltips ("1 préstamo", "3 préstamos"). */
export interface ChartUnit {
  one: string;
  many: string;
}

export function withUnit(count: number, unit: ChartUnit): string {
  return `${count.toLocaleString('es')} ${count === 1 ? unit.one : unit.many}`;
}

export function percentOf(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

/**
 * Marcas "limpias" para un eje de conteo: 0..max en 3-5 pasos de 1, 2 o 5 × 10^n.
 * Siempre enteros (no existen "2,5 préstamos").
 */
export function niceTicks(max: number, target = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = Math.max(1, max / target);
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return ticks;
}
