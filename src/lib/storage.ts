import type { AppState } from '../store/types';
import { STATE_VERSION, emptyState } from '../store/types';

export const STATE_KEY = 'hotel-pms.state.v1';
export const SNAPSHOT_KEY = 'hotel-pms.snapshots.v1';
export const SNAPSHOT_KEEP = 3;

export interface Snapshot {
  date: string;
  at: string;
  rooms: number;
  orders: number;
  state: AppState;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

/** 归一化：补齐缺失字段，容忍旧版本 / 手工编辑过的 JSON */
export function normalize(raw: unknown): AppState {
  const base = emptyState();
  if (!isObj(raw)) return base;
  const s = raw as Partial<AppState>;
  const out: AppState = {
    version: STATE_VERSION,
    settings: { ...base.settings, ...(isObj(s.settings) ? s.settings : {}) },
    roomTypes: Array.isArray(s.roomTypes) ? s.roomTypes : [],
    rooms: Array.isArray(s.rooms) ? s.rooms : [],
    channels: Array.isArray(s.channels) ? s.channels : [],
    orders: Array.isArray(s.orders) ? s.orders : [],
    maintenances: Array.isArray(s.maintenances) ? s.maintenances : [],
    shiftLogs: Array.isArray(s.shiftLogs) ? s.shiftLogs : [],
    meta: { ...base.meta, ...(isObj(s.meta) ? s.meta : {}) },
  };
  if (!Array.isArray(out.settings.floors)) out.settings.floors = [];
  out.settings.nightAuditHour = clampHour(out.settings.nightAuditHour);
  out.rooms = out.rooms.filter((r) => isObj(r) && typeof r.id === 'string');
  out.orders = out.orders.filter((o) => isObj(o) && typeof o.id === 'string');
  out.roomTypes = out.roomTypes.filter((t) => isObj(t) && typeof t.id === 'string');
  out.channels = out.channels.filter((c) => isObj(c) && typeof c.id === 'string');
  return out;
}

export function clampHour(h: unknown): number {
  const n = Number(h);
  if (!Number.isFinite(n)) return 6;
  return Math.min(23, Math.max(0, Math.round(n)));
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return emptyState();
    return normalize(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('保存失败，可能超出浏览器存储配额', e);
  }
}

export function readSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => isObj(x) && isObj(x.state)) as unknown as Snapshot[];
  } catch {
    return [];
  }
}

/** 每日首开自动快照，保留最近 3 份 */
export function pushSnapshot(state: AppState, date: string): Snapshot[] {
  const list = readSnapshots().filter((s) => s.date !== date);
  const snap: Snapshot = {
    date,
    at: new Date().toISOString(),
    rooms: state.rooms.filter((r) => !r.deletedAt).length,
    orders: state.orders.length,
    state,
  };
  const next = [snap, ...list].slice(0, SNAPSHOT_KEEP);
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
  } catch {
    /* 配额不足时静默跳过 */
  }
  return next;
}

export function exportFileName(state: AppState): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const name = (state.settings.hotelName || '酒店').replace(/[\\/:*?"<>|\s]+/g, '');
  return `${name}-备份-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours(),
  )}${p(d.getMinutes())}.json`;
}

export function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
