import { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { useUI } from '../store/ui';
import { filterRooms, groupRooms, orderMap, roomCounts } from '../store/selectors';
import type { RoomFilter } from '../store/selectors';
import type { GroupBy } from '../store/types';
import { MetricBar } from '../components/MetricBar';
import { RoomGrid } from '../components/RoomGrid';
import { Segmented } from '../components/ui';
import { useRoomAction } from '../components/useRoomAction';
import { roomActions } from '../lib/actions';
import { stayOrderOf, reserveOrderOf } from '../lib/derive';
import type { RoomState7 } from '../lib/derive';
import { IconGrid, IconPlus } from '../components/Icons';
import { DetailIcon } from '../components/RoomDetail';

const VIEWS: { value: GroupBy; label: string }[] = [
  { value: 'floor', label: '楼层' },
  { value: 'type', label: '房型' },
  { value: 'status', label: '状态' },
];

export function RoomsPage({ showQuick }: { showQuick: boolean }) {
  const { state, bizDay, act } = useStore();
  const ui = useUI();
  const { request } = useRoomAction();
  const [filter, setFilter] = useState<RoomFilter>('all');

  const counts = useMemo(() => roomCounts(state, bizDay), [state, bizDay]);
  const rooms = useMemo(
    () => filterRooms(state, bizDay, filter, ui.search),
    [state, bizDay, filter, ui.search],
  );
  const groups = useMemo(
    () => groupRooms(rooms, state.meta.view, state, bizDay),
    [rooms, state, bizDay],
  );
  const orders = useMemo(() => orderMap(state.orders), [state.orders]);

  const quickFor = (roomId: string, _st: RoomState7) => {
    const room = state.rooms.find((r) => r.id === roomId);
    if (!room) return [];
    const order = stayOrderOf(state.orders, roomId) || reserveOrderOf(state.orders, roomId);
    return roomActions(room, bizDay, order)
      .filter((a) => a.risk !== 'high')
      .slice(0, 3)
      .map((a) => ({
        label: a.label,
        icon: <DetailIcon name={a.icon} />,
        onSelect: () => request(a.key, room, order),
      }));
  };

  return (
    <>
      <MetricBar counts={counts} />

      <div className="filterbar">
        <button
          type="button"
          className={`badge${filter === 'due' ? ' alert' : ''}`}
          aria-pressed={filter === 'due'}
          onClick={() => setFilter((f) => (f === 'due' ? 'all' : 'due'))}
          style={{ height: 28 }}
        >
          当日预离 {counts.due}
        </button>
        <button
          type="button"
          className={`badge${filter === 'dirty' ? ' amber' : ''}`}
          aria-pressed={filter === 'dirty'}
          onClick={() => setFilter((f) => (f === 'dirty' ? 'all' : 'dirty'))}
          style={{ height: 28 }}
        >
          空脏 {counts.vd}
        </button>
        {filter !== 'all' && (
          <button
            type="button"
            className="badge"
            onClick={() => setFilter('all')}
            style={{ height: 28 }}
          >
            清除筛选
          </button>
        )}
        <span className="spacer" />
        <Segmented<GroupBy>
          label="房态分组方式"
          value={state.meta.view}
          options={VIEWS}
          onChange={(v) => act({ type: 'setView', view: v })}
        />
      </div>

      {state.rooms.length > 0 && (
        <RoomGrid
          groups={groups}
          state={state}
          bizDay={bizDay}
          orders={orders}
          selectedId={ui.selectedRoomId}
          showQuick={showQuick}
          onOpenRoom={(id) => ui.selectRoom(id)}
          onMenu={(id, x, y) => ui.openMenu({ roomId: id, x, y })}
          quickFor={quickFor}
          emptyAction={{ label: '清除筛选', onClick: () => setFilter('all') }}
        />
      )}

      {state.rooms.length === 0 && (
        <div className="empty card-empty">
          <IconGrid size={32} />
          <p>还没有房间。在「更多 · 房间与房型」中添加，或载入示例数据。</p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => ui.setPage('more')}
          >
            <IconPlus size={14} />
            去添加房间
          </button>
        </div>
      )}
    </>
  );
}
