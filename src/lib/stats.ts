import type { AppState, Order } from '../store/types';
import { addDays, businessDay, diffDays, monthDayList, parseDateTime, daysInMonth } from './date';
import { round2 } from './money';

export interface NightAlloc {
  date: string;
  fee: number;
}

export interface OrderSpan {
  start: string; // 入住所属营业日
  nights: NightAlloc[]; // 已发生（或预计发生）的间夜与分摊房费
  perNight: number;
}

/**
 * 营收按间夜分摊：住 3 晚 ¥600 → 每天营业日各记 ¥200。
 * 停车费 / 其他费用整笔记在入住当天营业日。
 */
export function orderSpan(order: Order, auditHour: number): OrderSpan {
  const start = businessDay(parseDateTime(order.checkIn), auditHour);
  const booked = Math.max(1, Math.round(order.nights || 1));
  const perNight = round2(order.roomFee / booked);
  let count = booked;
  if (order.state === 'checkedOut' && order.closedAt) {
    const stayed = diffDays(start, businessDay(parseDateTime(order.closedAt), auditHour));
    count = Math.min(booked, Math.max(1, stayed));
  }
  const nights: NightAlloc[] = [];
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const fee = isLast && count === booked ? round2(order.roomFee - perNight * (booked - 1)) : perNight;
    nights.push({ date: addDays(start, i), fee });
  }
  return { start, nights, perNight };
}

export interface PeriodStat {
  room: number;
  /** 其中短租房费 */
  roomShort: number;
  /** 其中长租房费 */
  roomLong: number;
  parking: number;
  other: number;
  total: number;
  nights: number;
  /** 其中长租间夜 */
  nightsLong: number;
  adr: number;
  occ: number;
  due: number;
  dirty: number;
  deposit: number;
  byChannel: Record<string, number>;
  days: number;
}

function emptyStat(days: number): PeriodStat {
  return {
    room: 0,
    roomShort: 0,
    roomLong: 0,
    parking: 0,
    other: 0,
    total: 0,
    nights: 0,
    nightsLong: 0,
    adr: 0,
    occ: 0,
    due: 0,
    dirty: 0,
    deposit: 0,
    byChannel: {},
    days,
  };
}

export function sellableRoomCount(state: AppState): number {
  return state.rooms.filter((r) => !r.deletedAt && r.status !== 'ooo').length;
}

/** 短租可售房量：非长租、非维修 */
export function sellableShortCount(state: AppState): number {
  return state.rooms.filter((r) => !r.deletedAt && r.status !== 'ooo' && !r.longRent).length;
}

export function dirtyRoomCount(state: AppState): number {
  return state.rooms.filter((r) => !r.deletedAt && r.status !== 'ooo' && r.clean === 'dirty').length;
}

export function computeDay(state: AppState, date: string, auditHour: number): PeriodStat {
  const s = emptyStat(1);
  const audit = auditHour;
  // 订单 → 房间长租标记映射（未找到房间按短租计）
  const longRooms = new Set(
    state.rooms.filter((r) => r.longRent).map((r) => r.id),
  );
  for (const o of state.orders) {
    if (o.state === 'cancelled') continue;
    const isLong = longRooms.has(o.roomId);
    const span = orderSpan(o, audit);
    for (const n of span.nights) {
      if (n.date === date) {
        s.room = round2(s.room + n.fee);
        if (isLong) s.roomLong = round2(s.roomLong + n.fee);
        else s.roomShort = round2(s.roomShort + n.fee);
        s.nights += 1;
        if (isLong) s.nightsLong += 1;
        s.byChannel[o.channelId] = round2((s.byChannel[o.channelId] || 0) + n.fee);
      }
    }
    if (span.start === date) {
      s.parking = round2(s.parking + o.parking);
      s.other = round2(s.other + o.other);
      const extra = round2(o.parking + o.other);
      if (extra) s.byChannel[o.channelId] = round2((s.byChannel[o.channelId] || 0) + extra);
      s.deposit = round2(s.deposit + o.deposit);
    }
  }
  s.total = round2(s.room + s.parking + s.other);
  s.adr = s.nights > 0 ? round2(s.room / s.nights) : 0;
  const sellable = sellableShortCount(state);
  s.occ = sellable > 0 ? (s.nights - s.nightsLong) / sellable : 0;
  s.due = state.orders.filter(
    (o) => o.kind === 'stay' && o.state === 'active' && o.checkOut === date,
  ).length;
  s.dirty = dirtyRoomCount(state);
  return s;
}

export function computeMonth(state: AppState, mk: string, auditHour: number): PeriodStat {
  const days = monthDayList(mk);
  const s = emptyStat(days.length);
  for (const d of days) {
    const one = computeDay(state, d, auditHour);
    s.room = round2(s.room + one.room);
    s.roomShort = round2(s.roomShort + one.roomShort);
    s.roomLong = round2(s.roomLong + one.roomLong);
    s.parking = round2(s.parking + one.parking);
    s.other = round2(s.other + one.other);
    s.nights += one.nights;
    s.nightsLong += one.nightsLong;
    s.deposit = round2(s.deposit + one.deposit);
    for (const [k, v] of Object.entries(one.byChannel)) {
      s.byChannel[k] = round2((s.byChannel[k] || 0) + v);
    }
  }
  s.total = round2(s.room + s.parking + s.other);
  s.adr = s.nights > 0 ? round2(s.room / s.nights) : 0;
  const sellable = sellableShortCount(state);
  s.occ = sellable > 0 ? (s.nights - s.nightsLong) / (sellable * days.length) : 0;
  s.due = state.orders.filter(
    (o) => o.kind === 'stay' && o.state === 'active' && o.checkOut.slice(0, 7) === mk,
  ).length;
  s.dirty = dirtyRoomCount(state);
  return s;
}

export interface TrendPoint {
  date: string;
  total: number;
  room: number;
}

export function computeTrend(state: AppState, endDate: string, auditHour: number, n = 30): TrendPoint[] {
  const out: TrendPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(endDate, -i);
    const one = computeDay(state, d, auditHour);
    out.push({ date: d, total: one.total, room: one.room });
  }
  return out;
}

export interface ChannelShare {
  id: string;
  name: string;
  value: number;
  ratio: number;
}

/** 渠道占比：≤5 项，其余归「其他」 */
export function channelShares(
  state: AppState,
  byChannel: Record<string, number>,
): ChannelShare[] {
  const named = Object.entries(byChannel)
    .filter(([, v]) => v > 0)
    .map(([id, value]) => ({
      id,
      value,
      name: state.channels.find((c) => c.id === id)?.name || '未指定渠道',
    }))
    .sort((a, b) => b.value - a.value);

  const top = named.slice(0, 5);
  const rest = named.slice(5);
  const total = named.reduce((a, b) => a + b.value, 0) || 1;
  const out = top.map((x) => ({ ...x, ratio: x.value / total }));
  if (rest.length) {
    const v = rest.reduce((a, b) => a + b.value, 0);
    out.push({ id: '__other__', name: '其他', value: v, ratio: v / total });
  }
  return out;
}

export function monthOccDays(mk: string): number {
  return daysInMonth(mk);
}
