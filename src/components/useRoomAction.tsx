import { useCallback } from 'react';
import { stamp, useStore } from '../store/store';
import { useUI } from '../store/ui';
import { useToast } from './Toast';
import type { ActionKey } from '../lib/actions';
import { HIGH_RISK } from '../lib/actions';
import type { Order, Room } from '../store/types';
import { money } from '../lib/money';

export interface RoomActionApi {
  /** 统一入口：高风险先弹面板确认条，中低风险直接执行 */
  request: (key: ActionKey, room: Room, order?: Order) => void;
  /** 直接执行（确认条确认后调用） */
  run: (key: ActionKey, room: Room, order?: Order) => void;
}

export function useRoomAction(): RoomActionApi {
  const { act, undo, now, bizDay } = useStore();
  const ui = useUI();
  const toast = useToast();

  const run = useCallback(
    (key: ActionKey, room: Room, order?: Order) => {
      const at = stamp(now);
      const n = room.number;
      switch (key) {
        case 'checkIn':
          ui.selectRoom(room.id);
          ui.openDrawer({ kind: 'guest', mode: 'stay', roomId: room.id });
          return;
        case 'reserve':
          ui.selectRoom(room.id);
          ui.openDrawer({ kind: 'guest', mode: 'reserve', roomId: room.id });
          return;
        case 'extend':
          ui.openDrawer({ kind: 'extend', roomId: room.id });
          return;
        case 'confirmReserve':
          act({ type: 'confirmReserve', roomId: room.id, at }, `${n} 确认到店`);
          toast({
            text: `${n} ${order?.guestName ?? ''} 已转为在住`.trim(),
            actionLabel: '撤销',
            onAction: undo,
          });
          return;
        case 'cancelReserve':
          act({ type: 'cancelReserve', roomId: room.id }, `${n} 取消预订`);
          toast({ text: `${n} 预订已取消`, actionLabel: '撤销', onAction: undo });
          return;
        case 'checkOut':
          act({ type: 'checkOut', roomId: room.id, at }, `${n} 退房结算`);
          toast({ text: `${n} 已退房结算，房费 ${money(order?.roomFee ?? 0)}` });
          return;
        case 'setClean':
          act({ type: 'setClean', roomId: room.id, clean: 'clean' }, `${n} 置净`);
          toast({ text: `${n} 已置为干净`, actionLabel: '撤销', onAction: undo });
          return;
        case 'setDirty':
          act({ type: 'setClean', roomId: room.id, clean: 'dirty' }, `${n} 置脏`);
          toast({ text: `${n} 已置为待打扫`, actionLabel: '撤销', onAction: undo });
          return;
        case 'toOoo':
          act(
            { type: 'setOoo', roomId: room.id, on: true, date: bizDay, content: '前台转维修' },
            `${n} 转维修`,
          );
          toast({ text: `${n} 已转为维修停售` });
          return;
        case 'endOoo':
          act({ type: 'setOoo', roomId: room.id, on: false, date: bizDay }, `${n} 结束维修`);
          toast({ text: `${n} 已恢复可售，待打扫`, actionLabel: '撤销', onAction: undo });
          return;
        default:
          return;
      }
    },
    [act, bizDay, now, toast, ui, undo],
  );

  const request = useCallback(
    (key: ActionKey, room: Room, order?: Order) => {
      if (HIGH_RISK.includes(key)) {
        ui.selectRoom(room.id);
        ui.setPending({ roomId: room.id, key });
        return;
      }
      run(key, room, order);
    },
    [run, ui],
  );

  return { request, run };
}

export function useDeleteRoom() {
  const { state, act, undo } = useStore();
  const toast = useToast();
  return useCallback(
    (roomId: string) => {
      const room = state.rooms.find((r) => r.id === roomId);
      if (!room) return;
      act({ type: 'deleteRoom', roomId, at: new Date().toISOString() }, `删除 ${room.number}`);
      toast({ text: `${room.number} 已删除`, actionLabel: '撤销', onAction: undo });
    },
    [act, state.rooms, toast, undo],
  );
}
