/** 日期工具：全部使用本地时区，格式 'YYYY-MM-DD' / 'YYYY-MM-DD HH:mm' */

export const pad2 = (n: number): string => (n < 10 ? '0' + n : String(n));

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fmtTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fmtDateTime(d: Date): string {
  return `${fmtDate(d)} ${fmtTime(d)}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map((x) => Number(x));
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function parseDateTime(s: string): Date {
  const [dp, tp] = s.split(' ');
  const d = parseDate(dp || '');
  const [hh, mm] = (tp || '00:00').split(':').map((x) => Number(x));
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

export function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}

/** b - a，单位天 */
export function diffDays(a: string, b: string): number {
  const ms = parseDate(b).getTime() - parseDate(a).getTime();
  return Math.round(ms / 86400000);
}

/** 营业日：以夜审小时为界，早于该小时算作前一日 */
export function businessDay(now: Date, auditHour: number): string {
  const d = new Date(now.getTime());
  if (d.getHours() < auditHour) d.setDate(d.getDate() - 1);
  return fmtDate(d);
}

/** 当前时刻所属营业日之后的下一天（即营业日切换点） */
export function nextBusinessDay(now: Date, auditHour: number): string {
  return addDays(businessDay(now, auditHour), 1);
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function daysInMonth(mk: string): number {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthDayList(mk: string): string[] {
  const n = daysInMonth(mk);
  const out: string[] = [];
  for (let i = 1; i <= n; i++) out.push(`${mk}-${pad2(i)}`);
  return out;
}

export function lastDays(endDate: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endDate, -i));
  return out;
}

const WD = ['日', '一', '二', '三', '四', '五', '六'];
export function weekdayCN(dateStr: string): string {
  return WD[parseDate(dateStr).getDay()];
}

/** 8/12 形式 */
export function shortMD(dateStr: string): string {
  const p = dateStr.split('-');
  return `${Number(p[1])}/${Number(p[2])}`;
}

export function todayStr(): string {
  return fmtDate(new Date());
}
