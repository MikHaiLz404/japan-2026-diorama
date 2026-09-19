const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

export function toDateKey(iso: string, timeZone: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function todayKey(now = new Date(), timeZone = "Asia/Tokyo"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

export function formatDayLabel(dateKey: string, timeZone: string): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTime(iso: string | null, timeZone: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatRange(startsAt: string, endsAt: string, timeZone: string): string {
  const start = formatDayLabel(toDateKey(startsAt, timeZone), timeZone);
  const end = formatDayLabel(toDateKey(endsAt, timeZone), timeZone);
  return start === end ? start : `${start} – ${end}`;
}

export function eachDateKey(start: string, end: string): string[] {
  const out: string[] = [];
  const match = start.match(DATE_RE);
  const endMatch = end.match(DATE_RE);
  if (!match || !endMatch) return out;
  const cursor = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const last = new Date(
    Date.UTC(Number(endMatch[1]), Number(endMatch[2]) - 1, Number(endMatch[3])),
  );
  while (cursor.getTime() <= last.getTime()) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function tripDayIndex(
  startsAt: string,
  today: string,
): { day: number; totalHint: string } {
  const days = eachDateKey(startsAt, today);
  return { day: Math.max(1, days.length), totalHint: today };
}
