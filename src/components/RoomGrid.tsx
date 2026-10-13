import React, { useRef } from 'react';
import type { AppState, Order } from '../store/types';
import type { RoomGroup } from '../store/selectors';
import { roomState, type RoomState7 } from '../lib/derive';
import { RoomCard } from './RoomCard';
import { EmptyState } from './ui';
import { IconGrid } from './Icons';

interface Props {
  groups: RoomGroup[];
  state: AppState;
  bizDay: string;
  orders: Map<string, Order>;
  selectedId: string | null;
  showQuick: boolean;
  onOpenRoom: (roomId: string) => void;
  onMenu: (roomId: string, x: number, y: number) => void;
  quickFor: (roomId: string, st: RoomState7) => { label: string; icon: React.ReactNode; onSelect: () => void }[];
  emptyAction?: { label: string; onClick: () => void };
}

export function RoomGrid({
  groups,
  state,
  bizDay,
  orders,
  selectedId,
  showQuick,
  onOpenRoom,
  onMenu,
  quickFor,
  emptyAction,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  let cursor = -1;

  const onKeyNav = (index: number, key: string) => {
    const host = wrapRef.current;
    if (!host) return;
    const cards = [...host.querySelectorAll<HTMLElement>('.room-card')];
    if (!cards.length) return;
    const grid = cards[0].parentElement as HTMLElement | null;
    const cols = grid
      ? Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').length)
      : 3;
    let next = index;
    if (key === 'ArrowLeft') next = index - 1;
    else if (key === 'ArrowRight') next = index + 1;
    else if (key === 'ArrowUp') next = index - cols;
    else if (key === 'ArrowDown') next = index + cols;
    next = Math.max(0, Math.min(cards.length - 1, next));
    cards[next]?.focus();
  };

  if (!groups.length || groups.every((g) => g.rooms.length === 0)) {
    return (
      <EmptyState
        icon={<IconGrid size={32} />}
        text="没有符合条件的房间。换个筛选条件，或先建房号。"
        action={emptyAction}
      />
    );
  }

  return (
    <div className="groups" ref={wrapRef}>
      {groups.map((g) => (
        <section className="group-block" key={g.key}>
          <div className="group-head">
            <span className="gh-name">{g.label}</span>
            <span className="gh-count">{g.rooms.length} 间</span>
          </div>
          <div className="room-grid-wrap">
            <div className="room-grid">
              {g.rooms.map((room) => {
                cursor += 1;
                const order = orders.get(room.id);
                const st = roomState(room, bizDay, order);
                const type = state.roomTypes.find((t) => t.id === room.typeId);
                const occupied = st === 'oc' || st === 'od' || st === 'due';
                return (
                  <RoomCard
                    key={room.id}
                    room={room}
                    st={st}
                    index={cursor}
                    guestName={order?.guestName}
                    price={occupied || st === 'res' ? undefined : type?.price}
                    dueDate={order?.checkOut}
                    arriveDate={order?.checkIn.slice(0, 10)}
                    typeName={type?.name}
                    selected={selectedId === room.id}
                    quick={showQuick ? quickFor(room.id, st) : undefined}
                    onOpen={() => onOpenRoom(room.id)}
                    onMenu={(x, y) => onMenu(room.id, x, y)}
                    onKeyNav={onKeyNav}
                  />
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
