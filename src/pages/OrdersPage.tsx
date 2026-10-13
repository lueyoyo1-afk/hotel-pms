import { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { useUI } from '../store/ui';
import { checkedOutOrders, reserveOrders, searchOrders, stayOrders } from '../store/selectors';
import { EmptyState, Segmented } from '../components/ui';
import { IconClose, IconInbox, IconPlus, IconReceipt, IconSearch } from '../components/Icons';
import { money } from '../lib/money';
import { shortMD } from '../lib/date';
import type { Order } from '../store/types';

export function OrdersPage() {
  const { state, bizDay } = useStore();
  const ui = useUI();
  const [tab, setTab] = useState<'current' | 'history'>('current');

  const stays = useMemo(() => searchOrders(stayOrders(state), ui.search, state), [state, ui.search]);
  const reserves = useMemo(
    () => searchOrders(reserveOrders(state), ui.search, state),
    [state, ui.search],
  );
  const histories = useMemo(
    () => searchOrders(checkedOutOrders(state), ui.search, state),
    [state, ui.search],
  );

  const roomNumber = (id: string) => state.rooms.find((r) => r.id === id)?.number ?? '—';
  const channelName = (id: string) => state.channels.find((c) => c.id === id)?.name ?? '—';

  const open = (o: Order) =>
    ui.openDrawer({ kind: 'guest', mode: o.kind, roomId: o.roomId, orderId: o.id });

  const row = (o: Order, due: boolean) => (
    <button type="button" className="order-card" key={o.id} onClick={() => open(o)}>
      <span className="oc-left">
        <span className="oc-room display">{roomNumber(o.roomId)}</span>
        <span className="oc-name">
          {o.guestName} · {channelName(o.channelId)}
        </span>
        <span className="oc-meta">
          {o.kind === 'stay' ? `${o.checkIn} 入住 · ${o.nights} 晚` : `${o.checkIn} 预抵 · ${o.nights} 晚`}
          {o.phone ? ` · ${o.phone}` : ''}
        </span>
      </span>
      <span className="oc-right">
        <span className="oc-fee">{money(o.roomFee)}</span>
        <span className="oc-due" style={due ? undefined : { color: 'var(--ink-3)' }}>
          {due ? '今日预离' : `${shortMD(o.checkOut)}离`}
        </span>
      </span>
    </button>
  );

  /** 退房记录行：入住 → 离店 + 退房日期 */
  const rowDone = (o: Order) => (
    <button type="button" className="order-card" key={o.id} onClick={() => open(o)}>
      <span className="oc-left">
        <span className="oc-room display">{roomNumber(o.roomId)}</span>
        <span className="oc-name">
          {o.guestName} · {channelName(o.channelId)}
        </span>
        <span className="oc-meta">
          {o.checkIn} 入住 → {o.checkOut} 离店 · {o.nights} 晚
          {o.phone ? ` · ${o.phone}` : ''}
        </span>
      </span>
      <span className="oc-right">
        <span className="oc-fee">{money(o.roomFee)}</span>
        <span className="oc-due" style={{ color: 'var(--ink-3)' }}>
          {o.closedAt ? `${shortMD(o.closedAt)}退` : '已退房'}
        </span>
      </span>
    </button>
  );

  const tabs = (
    <>
      <div style={{ padding: 'var(--sp-3) var(--sp-4) 0' }}>
        <Segmented
          label="客单视图"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'current', label: `当前 ${stays.length + reserves.length}` },
            { value: 'history', label: `退房记录 ${histories.length}` },
          ]}
        />
      </div>
      <div style={{ padding: 'var(--sp-3) var(--sp-4) 0' }}>
        <span className="searchbox" style={{ width: '100%' }}>
          <IconSearch size={16} />
          <input
            value={ui.search}
            onChange={(e) => ui.setSearch(e.target.value)}
            placeholder="查房号 / 姓名 / 手机号"
            aria-label="搜索客单"
            inputMode="search"
          />
          {ui.search && (
            <button
              type="button"
              className="clear"
              onClick={() => ui.setSearch('')}
              aria-label="清空搜索"
            >
              <IconClose size={16} />
            </button>
          )}
        </span>
      </div>
    </>
  );

  if (tab === 'history') {
    return (
      <div>
        {tabs}
        <div className="section-h">
          <h3>退房记录 {histories.length}</h3>
          <span className="desc">按退房时间倒序 · 点单查看详情</span>
        </div>
        <div className="rows">
          {histories.length ? (
            histories.map(rowDone)
          ) : (
            <EmptyState
              icon={<IconInbox size={32} />}
              text={ui.search ? '没有匹配的退房记录。' : '还没有退房记录，客人退房后自动归档到这里。'}
              action={
                ui.search ? { label: '清空搜索', onClick: () => ui.setSearch('') } : undefined
              }
            />
          )}
        </div>
        <div className="note-line">
          退房客单仅保存在本机浏览器，可在「更多 · 数据备份」导出留存。
        </div>
      </div>
    );
  }

  if (!stays.length && !reserves.length) {
    return (
      <div>
        {tabs}
        <EmptyState
          icon={<IconReceipt size={32} />}
          text={ui.search ? '没有匹配的客单。' : '当前没有在住客人与预订。'}
          action={
            ui.search
              ? { label: '清空搜索', onClick: () => ui.setSearch('') }
              : {
                  label: '登记入住',
                  onClick: () => ui.openDrawer({ kind: 'guest', mode: 'stay' }),
                }
          }
        />
      </div>
    );
  }

  return (
    <div>
      {tabs}
      <div className="section-h">
        <h3>在住 {stays.length}</h3>
        <span className="desc">按预离日排序</span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-sm btn-second"
          onClick={() => ui.openDrawer({ kind: 'guest', mode: 'stay' })}
        >
          <IconPlus size={14} />
          入住
        </button>
      </div>
      <div className="rows">
        {stays.length ? (
          stays.map((o) => row(o, o.checkOut === bizDay))
        ) : (
          <div className="empty" style={{ padding: 'var(--sp-5)' }}>
            <IconInbox size={28} />
            <p>没有在住客人</p>
          </div>
        )}
      </div>

      <div className="section-h">
        <h3>预订 {reserves.length}</h3>
        <span className="desc">按预抵日排序</span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-sm btn-second"
          onClick={() => ui.openDrawer({ kind: 'guest', mode: 'reserve' })}
        >
          <IconPlus size={14} />
          预订
        </button>
      </div>
      <div className="rows">
        {reserves.length ? (
          reserves.map((o) => row(o, false))
        ) : (
          <div className="empty" style={{ padding: 'var(--sp-5)' }}>
            <IconInbox size={28} />
            <p>没有预订</p>
          </div>
        )}
      </div>
      <div className="note-line">
        押金与代收款项不计入营收，房费按间夜分摊到每个营业日（{state.settings.nightAuditHour}:00 切分）。
      </div>
    </div>
  );
}
