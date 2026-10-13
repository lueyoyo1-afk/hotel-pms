import type { Order, Room } from '../store/types';

export type ActionKey =
  | 'checkIn'
  | 'reserve'
  | 'confirmReserve'
  | 'cancelReserve'
  | 'checkOut'
  | 'extend'
  | 'setClean'
  | 'setDirty'
  | 'toOoo'
  | 'endOoo';

export type IconName =
  | 'key'
  | 'calendar'
  | 'check'
  | 'close'
  | 'arrow'
  | 'broom'
  | 'wrench'
  | 'undo';

export interface RoomAction {
  key: ActionKey;
  label: string;
  risk: 'low' | 'mid' | 'high';
  icon: IconName;
}

/**
 * 按当前状态动态排序的合法动作（≤5 项）
 * 分级：high = 退房结算 / 转维修 / 删除；mid = 入住 / 续住 / 置净 / 置脏
 */
export function roomActions(room: Room, _bizDay: string, _order?: Order): RoomAction[] {
  switch (room.status) {
    case 'vacant':
      if (room.clean === 'clean') {
        return [
          { key: 'checkIn', label: '入住', risk: 'mid', icon: 'key' },
          { key: 'reserve', label: '预订', risk: 'mid', icon: 'calendar' },
          { key: 'setDirty', label: '置脏', risk: 'mid', icon: 'broom' },
          { key: 'toOoo', label: '转维修', risk: 'high', icon: 'wrench' },
        ];
      }
      return [
        { key: 'setClean', label: '置净', risk: 'mid', icon: 'broom' },
        { key: 'toOoo', label: '转维修', risk: 'high', icon: 'wrench' },
      ];
    case 'occupied':
      return [
        { key: 'checkOut', label: '退房结算', risk: 'high', icon: 'close' },
        { key: 'extend', label: '续住', risk: 'mid', icon: 'arrow' },
        room.clean === 'clean'
          ? { key: 'setDirty', label: '置脏', risk: 'mid', icon: 'broom' }
          : { key: 'setClean', label: '置净', risk: 'mid', icon: 'broom' },
      ];
    case 'reserved':
      return [
        { key: 'confirmReserve', label: '确认到店', risk: 'mid', icon: 'check' },
        { key: 'cancelReserve', label: '取消预订', risk: 'mid', icon: 'close' },
        room.clean === 'clean'
          ? { key: 'setDirty', label: '置脏', risk: 'mid', icon: 'broom' }
          : { key: 'setClean', label: '置净', risk: 'mid', icon: 'broom' },
        { key: 'toOoo', label: '转维修', risk: 'high', icon: 'wrench' },
      ];
    case 'ooo':
      return [{ key: 'endOoo', label: '结束维修', risk: 'mid', icon: 'undo' }];
    default:
      return [];
  }
}

export const ACTION_LABEL: Record<ActionKey, string> = {
  checkIn: '入住',
  reserve: '预订',
  confirmReserve: '确认到店',
  cancelReserve: '取消预订',
  checkOut: '退房结算',
  extend: '续住',
  setClean: '置净',
  setDirty: '置脏',
  toOoo: '转维修',
  endOoo: '结束维修',
};

export const HIGH_RISK: ActionKey[] = ['checkOut', 'toOoo', 'cancelReserve'];

/** 状态 → 是否需要立刻行动（用于排序与提示） */
export function urgency(st: string): number {
  const order = ['due', 'vd', 'od', 'res', 'oc', 'vc', 'ooo'];
  const i = order.indexOf(st);
  return i < 0 ? 99 : i;
}

export function canDeleteRoom(room: Room, orders: Order[]): { ok: boolean; reason?: string } {
  const active = orders.find((o) => o.roomId === room.id && o.state === 'active');
  if (active)
    return {
      ok: false,
      reason: active.kind === 'stay' ? '该房间有在住客人，不能删除' : '该房间已有预订，不能删除',
    };
  if (room.status === 'ooo') return { ok: false, reason: '维修停售中的房间不能删除' };
  return { ok: true };
}
