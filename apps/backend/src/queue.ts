export const TZ = 'Africa/Johannesburg';

export const clock = (d: Date) =>
  d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

export function timeWindow(ahead: number, avgMinutes: number, now: Date = new Date()) {
  const start = new Date(now.getTime() + ahead * avgMinutes * 60_000);
  const end = new Date(start.getTime() + 15 * 60_000);
  return { from: clock(start), to: clock(end) };
}