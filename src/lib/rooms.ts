/** 房号批量解析：支持 801-812 / 801,803,805 / 同号段应用到多楼层 */

export interface ParsedRoom {
  number: string;
  floor: string;
}

function splitTokens(spec: string): string[] {
  return spec
    .split(/[,，、\s;；]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function inferFloor(number: string, floors: string[]): string {
  const hit = floors.find((f) => f && number.startsWith(f));
  if (hit) return hit;
  if (number.length >= 3) return number.slice(0, number.length - 2);
  return number.slice(0, Math.max(1, number.length - 2)) || '1';
}

/**
 * @param spec   房号表达式
 * @param floors 已知楼层（用于推断房号归属）
 * @param applyFloors 勾选"同号段应用到多楼层"时的楼层列表；为空则按表达式原样生成
 */
export function parseRoomSpec(spec: string, floors: string[], applyFloors: string[] = []): ParsedRoom[] {
  const out: ParsedRoom[] = [];
  const seen = new Set<string>();
  const push = (number: string) => {
    if (!number || seen.has(number)) return;
    seen.add(number);
    out.push({ number, floor: inferFloor(number, floors) });
  };

  for (const token of splitTokens(spec)) {
    const range = token.match(/^(\d+)\s*[-~—]\s*(\d+)$/);
    if (range) {
      const a = range[1];
      const b = range[2];
      const width = a.length;
      const from = Number(a);
      const to = Number(b);
      if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
      const step = from <= to ? 1 : -1;
      let guard = 0;
      for (let i = from; step > 0 ? i <= to : i >= to; i += step) {
        guard += 1;
        if (guard > 400) break;
        const raw = String(i).padStart(width, '0');
        if (applyFloors.length && width <= 2) {
          for (const f of applyFloors) push(`${f}${raw}`);
        } else {
          push(raw);
        }
      }
      continue;
    }
    const single = token.match(/^(\d+)$/);
    if (single) {
      const raw = single[1];
      if (applyFloors.length && raw.length <= 2) {
        for (const f of applyFloors) push(`${f}${raw}`);
      } else {
        push(raw);
      }
    }
  }
  return out;
}

/** 排序：先按楼层自然序，再按房号 */
export function sortRoomNumber(a: string, b: string): number {
  if (a === b) return 0;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, 'zh-CN');
}

export function sortFloor(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, 'zh-CN');
}
