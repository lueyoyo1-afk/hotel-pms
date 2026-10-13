export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

const nf2 = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const nf0 = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });

/** ¥1,234.00 */
export function money(n: number): string {
  return `¥${nf2.format(round2(n))}`;
}

/** ¥1,234（整数抹零，用于大数字） */
export function moneyShort(n: number): string {
  const v = round2(n);
  return `¥${Math.abs(v % 1) < 0.005 ? nf0.format(v) : nf2.format(v)}`;
}

export function num(n: number): string {
  return nf2.format(round2(n));
}

export function pct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}
