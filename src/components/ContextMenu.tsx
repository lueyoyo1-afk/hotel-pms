import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../store/store';
import { useUI } from '../store/ui';
import { roomActions } from '../lib/actions';
import { roomState, STATE_LABEL, stayOrderOf, reserveOrderOf } from '../lib/derive';
import { useRoomAction } from './useRoomAction';
import { DetailIcon } from './RoomDetail';

export function ContextMenu({ roomId, x, y }: { roomId: string; x: number; y: number }) {
  const { state, bizDay } = useStore();
  const ui = useUI();
  const { request } = useRoomAction();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.max(8, Math.min(x, window.innerWidth - w - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - h - 8));
    setPos({ left, top });
  }, [x, y, roomId]);

  useEffect(() => {
    const close = () => ui.closeMenu();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [ui]);

  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return null;
  const order = stayOrderOf(state.orders, roomId) || reserveOrderOf(state.orders, roomId);
  const st = roomState(room, bizDay, order);
  const actions = roomActions(room, bizDay, order);

  return (
    <>
      <div
        className="overlay"
        style={{ background: 'transparent', backdropFilter: 'none' }}
        onClick={ui.closeMenu}
        aria-hidden="true"
      />
      <div
        className="ctx"
        ref={ref}
        style={{ left: pos.left, top: pos.top }}
        role="menu"
        aria-label={`${room.number} 操作`}
      >
        <div className="ctx-head">
          {room.number} · {STATE_LABEL[st]}
          {order ? ` · ${order.guestName}` : ''}
        </div>
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            role="menuitem"
            className={a.risk === 'high' ? 'danger' : ''}
            onClick={() => {
              ui.closeMenu();
              request(a.key, room, order);
            }}
          >
            <DetailIcon name={a.icon} />
            {a.label}
          </button>
        ))}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            ui.closeMenu();
            ui.selectRoom(room.id);
          }}
        >
          <DetailIcon name="key" />
          查看详情
        </button>
      </div>
    </>
  );
}
