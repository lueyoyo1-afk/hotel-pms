import React, { useEffect, useRef, useState } from 'react';
import type { Room } from '../store/types';
import { STATE_LABEL } from '../lib/derive';
import type { RoomState7 } from '../lib/derive';
import { moneyShort } from '../lib/money';
import { shortMD } from '../lib/date';

export interface QuickAction {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface Props {
  room: Room;
  st: RoomState7;
  guestName?: string;
  price?: number;
  dueDate?: string;
  arriveDate?: string;
  typeName?: string;
  selected?: boolean;
  quick?: QuickAction[];
  index: number;
  onOpen: () => void;
  onMenu: (x: number, y: number) => void;
  onKeyNav: (index: number, key: string) => void;
}

const DOT: Record<RoomState7, string> = {
  vc: 'var(--st-vc-ink)',
  vd: 'var(--st-vd-ink)',
  oc: 'var(--st-oc-ink)',
  od: 'var(--accent)',
  due: 'var(--st-due-ink)',
  res: 'var(--st-res-ink)',
  ooo: 'var(--st-ooo-ink)',
};

export function RoomCard({
  room,
  st,
  guestName,
  price,
  dueDate,
  arriveDate,
  typeName,
  selected,
  quick,
  index,
  onOpen,
  onMenu,
  onKeyNav,
}: Props) {
  const [pulse, setPulse] = useState(false);
  const prevSt = useRef<RoomState7>(st);
  const timer = useRef(0);
  const longFired = useRef(false);
  const origin = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (prevSt.current !== st) {
      prevSt.current = st;
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 200);
      return () => window.clearTimeout(t);
    }
  }, [st]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const clear = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = 0;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    longFired.current = false;
    origin.current = { x: e.clientX, y: e.clientY };
    const { clientX: x, clientY: y } = e;
    clear();
    timer.current = window.setTimeout(() => {
      longFired.current = true;
      onMenu(x, y);
    }, 300);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!timer.current) return;
    if (
      Math.abs(e.clientX - origin.current.x) > 10 ||
      Math.abs(e.clientY - origin.current.y) > 10
    ) {
      clear();
    }
  };

  const showSecond = guestName || (price !== undefined && price !== null);
  let extra = '';
  if (st === 'due' || st === 'oc' || st === 'od') extra = dueDate ? `${shortMD(dueDate)}离` : '';
  else if (st === 'res') extra = arriveDate ? `${shortMD(arriveDate)}到` : '';
  else if (st === 'ooo') extra = '停售';
  else extra = typeName || '';

  return (
    <button
      type="button"
      className={`room-card rc-${st}${selected ? ' selected' : ''}${pulse ? ' pulse' : ''}`}
      data-index={index}
      aria-label={`${room.number} ${STATE_LABEL[st]}${guestName ? ` ${guestName}` : ''}`}
      onClick={() => {
        if (longFired.current) return;
        onOpen();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(e.clientX, e.clientY);
      }}
      onKeyDown={(e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          onKeyNav(index, e.key);
        }
      }}
    >
      <span className="rc-num display">{room.number}</span>
      {room.longRent && <span className="rc-long">长租</span>}
      <span className="rc-guest">
        {guestName || (showSecond && price !== undefined ? moneyShort(price) : '')}
      </span>
      <span className="rc-state">{STATE_LABEL[st]}</span>
      {extra && <span className="rc-sub">{extra}</span>}
      <span
        className="rc-dot"
        style={{
          background: st === 'due' && room.clean === 'dirty' ? 'var(--accent)' : DOT[st],
        }}
      />
      {quick && quick.length > 0 && (
        <span className="rc-quick">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              title={q.label}
              aria-label={q.label}
              onClick={(e) => {
                e.stopPropagation();
                q.onSelect();
              }}
            >
              {q.icon}
            </button>
          ))}
        </span>
      )}
    </button>
  );
}
