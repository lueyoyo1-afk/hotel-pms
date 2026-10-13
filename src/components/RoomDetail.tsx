import React from 'react';
import { useStore } from '../store/store';
import { useUI } from '../store/ui';
import { roomState, STATE_LABEL, stayOrderOf, reserveOrderOf } from '../lib/derive';
import { roomActions } from '../lib/actions';
import type { ActionKey, IconName } from '../lib/actions';
import { useRoomAction } from './useRoomAction';
import { ConfirmBar } from './ui';
import { useToast } from './Toast';
import { money } from '../lib/money';
import { shortMD } from '../lib/date';
import {
  IconArrowRight,
  IconBroom,
  IconCalendar,
  IconCheck,
  IconClose,
  IconEdit,
  IconKey,
  IconLock,
  IconUndo,
  IconWrench,
} from './Icons';

const ICONS: Record<IconName, React.ReactNode> = {
  key: <IconKey size={16} />,
  calendar: <IconCalendar size={16} />,
  check: <IconCheck size={16} />,
  close: <IconClose size={16} />,
  arrow: <IconArrowRight size={16} />,
  broom: <IconBroom size={16} />,
  wrench: <IconWrench size={16} />,
  undo: <IconUndo size={16} />,
};

export function RoomDetail({ roomId, onClose }: { roomId: string; onClose?: () => void }) {
  const { state, bizDay, act, undo } = useStore();
  const ui = useUI();
  const { request, run } = useRoomAction();
  const toast = useToast();

  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return null;

  const order = stayOrderOf(state.orders, roomId) || reserveOrderOf(state.orders, roomId);
  const st = roomState(room, bizDay, order);
  const type = state.roomTypes.find((t) => t.id === room.typeId);
  const channel = state.channels.find((c) => c.id === order?.channelId);
  const actions = roomActions(room, bizDay, order);
  const mains = state.maintenances.filter((m) => m.roomId === roomId && !m.done);
  const pending = ui.pending?.roomId === roomId ? ui.pending : null;

  const confirmText = (key: ActionKey): React.ReactNode => {
    if (key === 'checkOut')
      return (
        <>
          <b>{room.number}</b> 退房结算 · 房费 <b>{money(order?.roomFee ?? 0)}</b> · 押金{' '}
          <b>{money(order?.deposit ?? 0)}</b>（退还）
        </>
      );
    if (key === 'toOoo')
      return (
        <>
          <b>{room.number}</b> 转为维修停售，将不可售卖
        </>
      );
    if (key === 'cancelReserve')
      return (
        <>
          取消 <b>{room.number}</b> {order?.guestName ?? ''} 的预订
        </>
      );
    return <>确认操作 {room.number}</>;
  };

  return (
    <div>
      <div className="panel-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ph-num display">{room.number}</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`badge st-${st}`}>{STATE_LABEL[st]}</span>
            <span className="badge">{type?.name ?? '未设房型'}</span>
            <span className="badge">{room.floor ? `${room.floor} 层` : '未分层'}</span>
            {room.longRent && <span className="badge badge-long">长租</span>}
          </div>
        </div>
        {onClose && (
          <button type="button" className="icon-btn sm" onClick={onClose} aria-label="关闭详情">
            <IconClose size={18} />
          </button>
        )}
      </div>

      {order ? (
        <>
          <div className="panel-sec">
            <h4>客人</h4>
            <div className="kv">
              <span className="k">姓名</span>
              <span className="v">{order.guestName}</span>
            </div>
            <div className="kv">
              <span className="k">手机</span>
              <span className="v num">{order.phone || '—'}</span>
            </div>
            <div className="kv">
              <span className="k">证件</span>
              <span className="v num">{order.idCard || '待补'}</span>
            </div>
            <div className="kv">
              <span className="k">渠道</span>
              <span className="v">{channel?.name ?? '—'}</span>
            </div>
            <div className="kv">
              <span className="k">入住</span>
              <span className="v num">{order.checkIn}</span>
            </div>
            <div className="kv">
              <span className="k">{order.kind === 'stay' ? '预离' : '预抵'}</span>
              <span className="v num">
                {order.checkOut}（周{['日', '一', '二', '三', '四', '五', '六'][new Date(order.checkOut).getDay()]}） · 共{' '}
                {order.nights} 晚
              </span>
            </div>
          </div>

          <div className="panel-sec">
            <h4>费用</h4>
            <div className="kv">
              <span className="k">房价</span>
              <span className="v num">{money(order.nights ? order.roomFee / order.nights : 0)} / 晚</span>
            </div>
            <div className="kv">
              <span className="k">房费</span>
              <span className="v num">{money(order.roomFee)}</span>
            </div>
            <div className="kv">
              <span className="k">停车费</span>
              <span className="v num">{money(order.parking)}</span>
            </div>
            <div className="kv">
              <span className="k">其他费用</span>
              <span className="v num">{money(order.other)}</span>
            </div>
            <div className="kv">
              <span className="k">押金</span>
              <span className="v num" title="不计营收">
                {money(order.deposit)}
              </span>
            </div>
            {order.remark && (
              <div className="kv">
                <span className="k">备注</span>
                <span className="v">{order.remark}</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="panel-sec">
          <h4>房间</h4>
          <div className="kv">
            <span className="k">房价</span>
            <span className="v num">{money(type?.price ?? 0)} / 晚</span>
          </div>
          <div className="kv">
            <span className="k">状态</span>
            <span className="v">
              {STATE_LABEL[st]}
              {st === 'vd' ? ' · 待打扫后可售卖' : ''}
              {st === 'ooo' ? ' · 停售中' : ''}
            </span>
          </div>
          {room.status === 'ooo' && mains[0] && (
            <div className="kv">
              <span className="k">维修</span>
              <span className="v">
                {shortMD(mains[0].date)} {mains[0].content}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="panel-actions">
        <button
          type="button"
          className={room.longRent ? 'btn btn-primary' : 'btn btn-second'}
          onClick={() => {
            const on = !room.longRent;
            act({ type: 'setLongRent', roomIds: [room.id], on }, `${room.number} ${on ? '设为' : '取消'}长租`);
            toast({ text: `${room.number} 已${on ? '设为' : '取消'}长租`, actionLabel: '撤销', onAction: undo });
          }}
        >
          {room.longRent ? '取消长租' : '设为长租'}
        </button>
        {order && (
          <button
            type="button"
            className="btn btn-second"
            onClick={() =>
              ui.openDrawer({ kind: 'guest', mode: order.kind, roomId: room.id, orderId: order.id })
            }
          >
            <IconEdit size={16} />
            编辑客单
          </button>
        )}
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            className={a.risk === 'high' ? 'btn btn-danger' : 'btn btn-second'}
            onClick={() => request(a.key, room, order)}
          >
            {ICONS[a.icon]}
            {a.label}
          </button>
        ))}
      </div>

      {pending && (
        <ConfirmBar
          text={confirmText(pending.key)}
          confirmLabel={pending.key === 'checkOut' ? '确认退房' : pending.key === 'toOoo' ? '确认转维修' : '确认取消'}
          onCancel={() => ui.setPending(null)}
          onConfirm={() => {
            const key = pending.key;
            ui.setPending(null);
            run(key, room, order);
          }}
        />
      )}

      {!order && (
        <div className="panel-sec" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconLock size={14} />
          <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)' }}>
            在住房不显示房价，避免客人窥屏
          </span>
        </div>
      )}
    </div>
  );
}

export function DetailIcon({ name }: { name: IconName }) {
  return <>{ICONS[name]}</>;
}
