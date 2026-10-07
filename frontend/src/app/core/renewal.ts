import { Loan } from './models';

/** "2026-10-07" → "07/10/2026" (también acepta fecha y hora: "2026-10-07T10:42:05"). */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Fecha local de hoy en formato ISO ("2026-10-07"). */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Días entre dos fechas ISO ({@code to - from}). */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/**
 * Primer día en que se podrá renovar si todavía no es el momento (la renovación solo se permite
 * cuando faltan pocos días para el vencimiento), o {@code null} si ya se puede.
 * La fecha la calcula el servidor ({@code renewableFrom}); aquí solo se compara con hoy.
 */
export function renewableOn(loan: Loan): string | null {
  const from = loan.renewableFrom;
  return from && todayIso() < from ? from : null;
}

/**
 * Motivo por el que hoy no se puede renovar el préstamo, redactado para el usuario, o
 * {@code null} si se puede. Evita llamar al servidor para recibir el mismo rechazo.
 */
export function renewalBlockedReason(loan: Loan): string | null {
  const from = renewableOn(loan);
  if (!from) return null;

  const window = daysBetween(from, loan.dueDate);
  const renewedToday =
    loan.lastRenewedOn === todayIso()
      ? `Ya se renovó hoy${loan.lastRenewedAt ? ` a las ${loan.lastRenewedAt.slice(11, 16)}` : ''}. `
      : '';
  return (
    `${renewedToday}No es posible renovar el préstamo de ${loan.bookTitle} hasta el ${formatIsoDate(from)}: ` +
    `solo se puede renovar cuando faltan ${window} ${window === 1 ? 'día' : 'días'} o menos para el vencimiento ` +
    `(vence el ${formatIsoDate(loan.dueDate)}).`
  );
}
