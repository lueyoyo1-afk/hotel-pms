import type { AppState, Order, Room } from './types';
import { roomState, RoomState7, STATE_LABEL, STATE_ORDER } from '../lib/derive';
import { sortFloor, sortRoomNumber } from '../lib/rooms';

export type RoomFilter = 'all' | 'due' | 'dirty';

export function activeRooms(state: AppState): Room[] {
  return state.rooms.filter((r) => !r.deletedAt);
}

export function orderMap(orders: Order[]): Map<string, Order> {
  const m = new Map<string, Order>();
  for (const o of orders) {
    if (o.state !== 'active') continue;
    if (!m.has(o.roomId)) m.set(o.roomId, o);
  }
  return m;
}

export function matchRoom(room: Room, order: Order | undefined, q: string): boolean {
  if (!q) return true;
  const s = q.trim().toLowerCase();
  if (!s) return true;
  if (room.number.toLowerCase().startsWith(s)) return true;
  if (order?.guestName?.toLowerCase().startsWith(s)) return true;
  if (order?.phone?.startsWith(s)) return true;
  return false;
}

export function filterRooms(
  state: AppState,
  bizDay: string,
  filter: RoomFilter,
  query: string,
): Room[] {
  const map = orderMap(state.orders);
  return activeRooms(state)
    .filter((r) => {
      const st = roomState(r, bizDay, map.get(r.id));
      if (filter === 'due' && st !== 'due') return false;
      if (filter === 'dirty' && !(st === 'vd' || st === 'od')) return false;
      return matchRoom(r, map.get(r.id), query);
    })
    .slice()
    .sort((a, b) => sortRoomNumber(a.number, b.number));
}

export interface RoomGroup {
  key: string;
  label: string;
  rooms: Room[];
  hint?: string;
}

export function groupRooms(
  rooms: Room[],
  by: 'floor' | 'type' | 'status',
  state: AppState,
  bizDay: string,
): RoomGroup[] {
  const map = orderMap(state.orders);
  const buckets = new Map<string, Room[]>();
  for (const r of rooms) {
    let key: string;
    if (by === 'floor') key = r.floor || '未分层';
    else if (by === 'type')
      key = state.roomTypes.find((t) => t.id === r.typeId)?.name || '未设房型';
    else key = roomState(r, bizDay, map.get(r.id));
    const list = buckets.get(key);
    if (list) list.push(r);
    else buckets.set(key, [r]);
  }
  const keys = [...buckets.keys()];
  if (by === 'status') {
    keys.sort((a, b) => STATE_ORDER.indexOf(a as RoomState7) - STATE_ORDER.indexOf(b as RoomState7));
  } else if (by === 'floor') {
    keys.sort(sortFloor);
  } else {
    keys.sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }
  return keys.map((k) => ({
    key: k,
    label: by === 'status' ? STATE_LABEL[k as RoomState7] || k : by === 'floor' ? `${k} 层` : k,
    rooms: buckets.get(k)!.slice().sort((a, b) => sortRoomNumber(a.number, b.number)),
  }));
}

export interface RoomCounts {
  total: number;
  /** 短租房量（非长租，含全部状态） */
  totalShort: number;
  /** 长租房量 */
  totalLong: number;
  vc: number;
  oc: number;
  due: number;
  vd: number;
  od: number;
  res: number;
  ooo: number;
  dirty: number;
  occupied: number;
  /** 短租在住数 */
  occShort: number;
  /** 长租在住数 */
  occLong: number;
  /** 出租率（短租口径：短租在住 / 短租可售） */
  occRate: number;
}

export function roomCounts(state: AppState, bizDay: string): RoomCounts {
  const map = orderMap(state.orders);
  const c: RoomCounts = {
    total: 0,
    totalShort: 0,
    totalLong: 0,
    vc: 0,
    oc: 0,
    due: 0,
    vd: 0,
    od: 0,
    res: 0,
    ooo: 0,
    dirty: 0,
    occupied: 0,
    occShort: 0,
    occLong: 0,
    occRate: 0,
  };
  for (const r of activeRooms(state)) {
    c.total += 1;
    if (r.longRent) c.totalLong += 1;
    else c.totalShort += 1;
    const st = roomState(r, bizDay, map.get(r.id));
    c[st] += 1;
    const isOcc = st === 'oc' || st === 'od' || st === 'due';
    if (isOcc) {
      c.occupied += 1;
      if (r.longRent) c.occLong += 1;
      else c.occShort += 1;
    }
    if (r.clean === 'dirty' && st !== 'ooo') c.dirty += 1;
  }
  // 出租率按短租口径：短租在住 / 短租可售（长租不参与短租出租率）
  const shortOoo = activeRooms(state).filter((r) => !r.longRent && r.status === 'ooo').length;
  const denom = Math.max(0, c.totalShort - shortOoo);
  c.occRate = denom > 0 ? c.occShort / denom : 0;
  return c;
}

export function activeOrders(state: AppState): Order[] {
  return state.orders.filter((o) => o.state === 'active');
}

export function stayOrders(state: AppState): Order[] {
  return state.orders
    .filter((o) => o.kind === 'stay' && o.state === 'active')
    .sort((a, b) => a.checkOut.localeCompare(b.checkOut) || a.roomId.localeCompare(b.roomId));
}

export function reserveOrders(state: AppState): Order[] {
  return state.orders
    .filter((o) => o.kind === 'reserve' && o.state === 'active')
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
}

/** 已退房客单（按退房时间倒序，最近在前） */
export function checkedOutOrders(state: AppState): Order[] {
  return state.orders
    .filter((o) => o.state === 'checkedOut')
    .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));
}

export function searchOrders(orders: Order[], q: string, state: AppState): Order[] {
  const s = q.trim().toLowerCase();
  if (!s) return orders;
  const roomNum = (id: string) => state.rooms.find((r) => r.id === id)?.number ?? '';
  return orders.filter(
    (o) =>
      roomNum(o.roomId).startsWith(s) ||
      o.guestName.toLowerCase().startsWith(s) ||
      o.phone.startsWith(s),
  );
}
