import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './store/store';
import { useUI } from './store/ui';
import type { PageKey } from './store/ui';
import { useToast } from './components/Toast';
import { useMediaQuery } from './lib/useMediaQuery';
import { installStickySync } from './lib/sticky';
import { Drawer } from './components/Drawer';
import { ContextMenu } from './components/ContextMenu';
import { RoomDetail } from './components/RoomDetail';
import { GuestForm } from './components/GuestForm';
import { ExtendForm, MaintenanceForm, ShiftForm } from './components/forms';
import { useRoomAction } from './components/useRoomAction';
import { ChannelsPage } from './pages/more/ChannelsPage';
import { ShortcutsPage } from './pages/more/ShortcutsPage';
import { RoomsPage } from './pages/RoomsPage';
import { OrdersPage } from './pages/OrdersPage';
import { StatsPage } from './pages/StatsPage';
import { HandoverPage } from './pages/HandoverPage';
import { MorePage } from './pages/MorePage';
import { roomCounts } from './store/selectors';
import { stayOrderOf, reserveOrderOf } from './lib/derive';
import { downloadJSON, exportFileName } from './lib/storage';
import {
  IconChart,
  IconClose,
  IconDownload,
  IconGrid,
  IconMore,
  IconReceipt,
  IconSearch,
  IconSwap,
  IconWarn,
} from './components/Icons';

const TABS: { key: PageKey; label: string; icon: React.ReactNode }[] = [
  { key: 'rooms', label: '房态', icon: <IconGrid size={24} /> },
  { key: 'orders', label: '客单', icon: <IconReceipt size={24} /> },
  { key: 'stats', label: '统计', icon: <IconChart size={24} /> },
  { key: 'handover', label: '交接', icon: <IconSwap size={24} /> },
  { key: 'more', label: '更多', icon: <IconMore size={24} /> },
];

const SEARCH_PAGES: PageKey[] = ['rooms', 'orders'];

export default function App() {
  const { state, act, undo, bizDay } = useStore();
  const ui = useUI();
  const toast = useToast();
  const { request } = useRoomAction();
  const isDesktop = useMediaQuery('(min-width: 900px)');
  const searchRef = useRef<HTMLInputElement>(null);
  const [warnHidden, setWarnHidden] = useState(false);

  /* ---------- 吸顶高度同步（防止滚动时栏位互相遮挡） ---------- */
  useEffect(() => installStickySync(), []);

  /* ---------- 主题 ---------- */
  useEffect(() => {
    const apply = () => {
      const mode = state.settings.theme;
      const dark =
        mode === 'dark' ||
        (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#191511' : '#f7f5f1');
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [state.settings.theme]);

  /* ---------- 导出备份 ---------- */
  const exportNow = useCallback(() => {
    downloadJSON(exportFileName(state), state);
    act({ type: 'setMeta', patch: { lastBackupAt: new Date().toISOString() } });
    toast({ text: '备份文件已导出' });
  }, [act, state, toast]);

  /* ---------- 快捷键 ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        !!t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable);

      if (e.key === 'Escape') {
        ui.closeMenu();
        ui.closeDrawer();
        ui.setPending(null);
        if (!isDesktop) ui.selectRoom(null);
        return;
      }
      if (typing) return;

      if (e.metaKey || e.ctrlKey) {
        const k = e.key.toLowerCase();
        if (k === 'z') {
          e.preventDefault();
          if (undo()) toast({ text: '已撤销上一步' });
          else toast({ text: '没有可撤销的操作' });
        } else if (k === 's') {
          e.preventDefault();
          exportNow();
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        if (ui.page !== 'rooms' && ui.page !== 'orders') ui.setPage('rooms');
        searchRef.current?.focus();
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        ui.openDrawer({ kind: 'help' });
        return;
      }

      const map: Record<string, 'checkIn' | 'checkOut' | 'extend' | 'setClean' | 'setDirty' | 'toOoo' | 'reserve'> =
        {
          c: 'checkIn',
          o: 'checkOut',
          e: 'extend',
          n: 'setClean',
          d: 'setDirty',
          r: 'toOoo',
          b: 'reserve',
        };
      const action = map[e.key.toLowerCase()];
      if (!action) return;
      e.preventDefault();
      if (ui.page !== 'rooms') ui.setPage('rooms');
      const roomId = ui.selectedRoomId ?? state.rooms.find((r) => !r.deletedAt)?.id;
      const room = state.rooms.find((r) => r.id === roomId && !r.deletedAt);
      if (!room) {
        toast({ text: '先点选一个房间' });
        return;
      }
      ui.selectRoom(room.id);
      const order = stayOrderOf(state.orders, room.id) || reserveOrderOf(state.orders, room.id);
      request(action, room, order);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exportNow, isDesktop, request, state.orders, state.rooms, toast, ui, undo]);

  const counts = useMemo(() => roomCounts(state, bizDay), [state, bizDay]);

  const needBackup = useMemo(() => {
    const last = state.meta.lastBackupAt;
    if (!last) return true;
    const days = (Date.now() - new Date(last).getTime()) / 86400000;
    return days >= 7;
  }, [state.meta.lastBackupAt]);

  const selectedRoom = ui.selectedRoomId
    ? state.rooms.find((r) => r.id === ui.selectedRoomId && !r.deletedAt)
    : undefined;

  const page = (() => {
    switch (ui.page) {
      case 'rooms':
        return <RoomsPage showQuick={isDesktop} />;
      case 'orders':
        return <OrdersPage />;
      case 'stats':
        return <StatsPage />;
      case 'handover':
        return <HandoverPage />;
      default:
        return <MorePage />;
    }
  })();

  const showSearch = SEARCH_PAGES.includes(ui.page);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="name">{state.settings.hotelName}</div>
          <div className="sub">
            营业日 {bizDay} · 夜审 {state.settings.nightAuditHour}:00
          </div>
        </div>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-current={ui.page === t.key ? 'page' : undefined}
            onClick={() => ui.setPage(t.key)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
        <div className="sep" />
        <button
          type="button"
          onClick={() => ui.openDrawer({ kind: 'guest', mode: 'stay' })}
          aria-label="办理入住"
        >
          办理入住
        </button>
        <button type="button" onClick={exportNow} aria-label="导出备份">
          导出备份
        </button>
        <div className="sidebar-foot">
          数据保存在本机浏览器，请定期导出备份。
          <br />
          快捷键按 <b>?</b> 查看。
        </div>
      </aside>

      <div className="app-main">
        <header className="appbar">
          <span className="appbar-title">{state.settings.hotelName}</span>
          {showSearch ? (
            <span className="searchbox">
              <IconSearch size={16} />
              <input
                ref={searchRef}
                value={ui.search}
                onChange={(e) => ui.setSearch(e.target.value)}
                placeholder="房号 / 姓名 / 手机号"
                aria-label="搜索房号、姓名或手机号"
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
          ) : (
            <span className="appbar-spacer" />
          )}
          {!isDesktop && (
            <button
              type="button"
              className="icon-btn"
              onClick={exportNow}
              aria-label="导出备份"
              title="导出备份"
            >
              <IconDownload size={18} />
            </button>
          )}
        </header>

        {needBackup && !warnHidden && (
          <div className="warnbar">
            <IconWarn size={14} />
            <span className="wb-text">数据仅存本机浏览器，请定期导出备份</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={exportNow}>
              立即导出
            </button>
            <button
              type="button"
              className="icon-btn sm"
              onClick={() => setWarnHidden(true)}
              aria-label="关闭提醒"
            >
              <IconClose size={16} />
            </button>
          </div>
        )}

        <div className="view-split">
          <div className="view">{page}</div>
          {isDesktop && ui.page === 'rooms' && (
            <aside className="desktop-detail" aria-label="房间详情">
              {selectedRoom ? (
                <RoomDetail roomId={selectedRoom.id} onClose={() => ui.selectRoom(null)} />
              ) : (
                <div className="empty" style={{ paddingTop: 'var(--sp-7)' }}>
                  <IconGrid size={32} />
                  <p>点击房卡查看详情；长按或右键弹出快捷动作。</p>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      <nav className="tabbar" aria-label="主导航">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-current={ui.page === t.key ? 'page' : undefined}
            onClick={() => ui.setPage(t.key)}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.key === 'rooms' && counts.due > 0 && <span className="tab-badge">{counts.due}</span>}
          </button>
        ))}
      </nav>

      {!isDesktop && selectedRoom && ui.page === 'rooms' && (
        <Drawer
          title={`${selectedRoom.number} · 房间详情`}
          onClose={() => {
            ui.selectRoom(null);
            ui.setPending(null);
          }}
        >
          <RoomDetail
            roomId={selectedRoom.id}
            onClose={() => {
              ui.selectRoom(null);
              ui.setPending(null);
            }}
          />
        </Drawer>
      )}

      {ui.drawer?.kind === 'guest' && (
        <Drawer
          title={
            ui.drawer.orderId
              ? '编辑客单'
              : ui.drawer.mode === 'stay'
                ? '办理入住'
                : '登记预订'
          }
          onClose={ui.closeDrawer}
        >
          <GuestForm
            mode={ui.drawer.mode}
            roomId={ui.drawer.roomId}
            orderId={ui.drawer.orderId}
            onClose={ui.closeDrawer}
          />
        </Drawer>
      )}

      {ui.drawer?.kind === 'extend' && (
        <Drawer title="续住" onClose={ui.closeDrawer}>
          <ExtendForm roomId={ui.drawer.roomId} onClose={ui.closeDrawer} />
        </Drawer>
      )}

      {ui.drawer?.kind === 'shift' && (
        <Drawer title="新建交接班" onClose={ui.closeDrawer}>
          <ShiftForm onClose={ui.closeDrawer} />
        </Drawer>
      )}

      {ui.drawer?.kind === 'maintenance' && (
        <Drawer title="维修登记" onClose={ui.closeDrawer}>
          <MaintenanceForm roomId={ui.drawer.roomId} onClose={ui.closeDrawer} />
        </Drawer>
      )}

      {ui.drawer?.kind === 'channels' && (
        <Drawer title="渠道管理" onClose={ui.closeDrawer}>
          <ChannelsPage />
        </Drawer>
      )}

      {ui.drawer?.kind === 'help' && (
        <Drawer title="快捷键说明" onClose={ui.closeDrawer}>
          <ShortcutsPage onBack={ui.closeDrawer} />
        </Drawer>
      )}

      {ui.menu && <ContextMenu roomId={ui.menu.roomId} x={ui.menu.x} y={ui.menu.y} />}
    </div>
  );
}
