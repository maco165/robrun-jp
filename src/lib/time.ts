import type { Schedule } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

function tzOffsetMin(d: Date, tz: string) {
  const local = new Date(d.toLocaleString('en-US', { timeZone: tz }));
  const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  return (local.getTime() - utc.getTime()) / 60000;
}

/** 地域の次の定時の開放 (夏時間・冬時間は timezone で追従する) */
export function nextOpen(region: Schedule['regions'][number], now: Date): Date {
  if ('dailyOpenUtc' in region) {
    const [h, m] = region.dailyOpenUtc.split(':').map(Number);
    const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0));
    if (t <= now) t.setUTCDate(t.getUTCDate() + 1);
    return t;
  }
  const [h, m] = region.dailyOpenLocal.split(':').map(Number);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: region.timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  for (let i = -1; i < 3; i++) {
    const p: Record<string, string> = {};
    fmt.formatToParts(new Date(now.getTime() + i * 86400000)).forEach((x) => { p[x.type] = x.value; });
    const naive = new Date(Date.UTC(+p.year, +p.month - 1, +p.day, h, m, 0));
    const t = new Date(naive.getTime() - tzOffsetMin(naive, region.timezone) * 60000);
    if (t > now) return t;
  }
  throw new Error(`nextOpen: ${region.id} の次の開放が見つからない`);
}

/** 残り時間 hh:mm:ss。描画の前 (now が無い) は --:--:-- */
export function remaining(t: Date | null, now: Date | null): string {
  if (!t || !now) return '--:--:--';
  const s = Math.max(0, Math.floor((t.getTime() - now.getTime()) / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function jstParts(t: Date) {
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(t).forEach((x) => { p[x.type] = x.value; });
  return p;
}

/** 11/24（火）02:00 の形 (JST) */
export function jstShort(t: Date | null): string {
  if (!t) return '--/--（-）--:--';
  const p = jstParts(t);
  return `${p.month}/${p.day}（${p.weekday}）${p.hour}:${p.minute}`;
}

/** 11/20 18:00 の形 (JST)。一覧の日付に使う */
export function jstDate(iso: string): string {
  const p = jstParts(new Date(iso));
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

/** 2026-11-20 18:00 の形 (JST) */
export function jstFull(iso: string): string {
  const p = jstParts(new Date(iso));
  return `${p.year}-${pad(+p.month)}-${pad(+p.day)} ${p.hour}:${p.minute}`;
}

/** 2026-11-20 09:00 UTC の形 */
export function utcFull(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}
