// Days are grouped and shown in UTC everywhere (settings.source.dayTimeZone),
// so a transaction never moves to a different day depending on the viewer's clock.
// Formatting is done by hand so every browser prints the same text.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' (UTC) for an ISO date-time or a Date. */
export function dayKey(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

export function isDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(key: string, days: number): string {
  return dayKey(new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS));
}

/** Every day from start to end inclusive. */
export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
}

export function dayCount(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1;
}

/** '7 Sep 2026' */
export function formatDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** 'Sep' or 'Sep 2026' for a month tick. */
export function formatMonth(key: string, withYear: boolean): string {
  const [y, m] = key.split('-').map(Number);
  return withYear ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
}

/** '7 Sep' */
export function formatDayShort(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** '14:32 UTC' */
export function formatTime(iso: string): string {
  return `${new Date(iso).toISOString().slice(11, 16)} UTC`;
}

/** '7 Sep 2026, 14:32 UTC' */
export function formatDateTime(iso: string): string {
  return `${formatDay(dayKey(iso))}, ${formatTime(iso)}`;
}

export function formatDayRange(start: string, end: string): string {
  return start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
}
