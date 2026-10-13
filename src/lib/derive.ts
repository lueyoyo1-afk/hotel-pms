import type { Order, Room } from '../store/types';
import { businessDay, parseDateTime, addDays } from './date';

export type RoomState7 = 'due' | 'vd' | 'ooo' | 'res' | 'oc' | 'od' | 'vc';

export const STATE_LABEL: Record<RoomState7, string> = {
  due: '当日预离',
  vd: '空脏',
  ooo: '维修停售',
  res: '预订占房',
  oc: '住净',
  od: '住脏',
  vc: '空净',
};

export const STATE_ORDER: RoomState7[] = ['due', 'vd', 'od', 'oc', 'res', 'vc', 'ooo'];

/** 派生 7 态：当日预离为派生状态，其余由 status + clean 组合 */
export function roomState(room: Room, bizDay: string, order?: Order): RoomState7 {
  if (room.status === 'ooo') return 'ooo';
  if (room.status === 'reserved') return 'res';
  if (room.status === 'occupied') {
    if (order && order.state === 'active' && order.checkOut === bizDay) return 'due';
    return room.clean === 'clean' ? 'oc' : 'od';
  }
  return room.clean === 'clean' ? 'vc' : 'vd';
}

/** 由入住时间 + 晚数推导预离日（按营业日口径） */
export function computeCheckOut(checkIn: string, nights: number, auditHour: number): string {
  const start = businessDay(parseDateTime(checkIn), auditHour);
  return addDays(start, Math.max(1, Math.round(nights)));
}

/** 房间的在住订单 */
export function stayOrderOf(orders: Order[], roomId: string): Order | undefined {
  return orders.find((o) => o.roomId === roomId && o.kind === 'stay' && o.state === 'active');
}

/** 房间的有效预订 */
export function reserveOrderOf(orders: Order[], roomId: string): Order | undefined {
  return orders.find((o) => o.roomId === roomId && o.kind === 'reserve' && o.state === 'active');
}

export function orderOfRoom(orders: Order[], roomId: string): Order | undefined {
  return stayOrderOf(orders, roomId) || reserveOrderOf(orders, roomId);
}

export function roomsOf(orders: Order[]): Set<string> {
  return new Set(orders.filter((o) => o.state === 'active').map((o) => o.roomId));
}

export function isSellableClean(room: Room): boolean {
  return room.status === 'vacant' && room.clean === 'clean';
}
