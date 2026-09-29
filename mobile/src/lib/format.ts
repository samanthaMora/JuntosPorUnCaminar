export const DEFAULT_TZ = 'America/Mexico_City';

export function formatMoney(cents: number, currency = 'mxn') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}

/** Fecha local "YYYY-MM-DD" en la zona horaria dada. */
export function dayKey(date: Date | string, timeZone = DEFAULT_TZ) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(date),
  );
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function formatTime(date: Date | string, timeZone = DEFAULT_TZ) {
  return new Intl.DateTimeFormat('es-MX', { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(date));
}

export function formatDay(date: Date | string, timeZone = DEFAULT_TZ) {
  return new Intl.DateTimeFormat('es-MX', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(date),
  );
}

export function formatDateTime(date: Date | string, timeZone = DEFAULT_TZ) {
  return `${formatDay(date, timeZone)}, ${formatTime(date, timeZone)}`;
}

/** Momento a partir del cual el paciente ya no puede cambiar la cita. */
export function changeDeadline(startsAt: string, cutoffHours: number) {
  return new Date(new Date(startsAt).getTime() - cutoffHours * 60 * 60 * 1000);
}

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
