import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ActionKey } from '../lib/actions';

export type PageKey = 'rooms' | 'orders' | 'stats' | 'handover' | 'more';

export interface PendingAction {
  roomId: string;
  key: ActionKey;
}

export type Drawer =
  | { kind: 'guest'; mode: 'stay' | 'reserve'; roomId?: string; orderId?: string }
  | { kind: 'extend'; roomId: string }
  | { kind: 'shift' }
  | { kind: 'maintenance'; roomId?: string }
  | { kind: 'channels' }
  | { kind: 'help' }
  | { kind: 'roomEdit'; roomId?: string }
  | null;

interface MenuState {
  roomId: string;
  x: number;
  y: number;
}

interface UIValue {
  page: PageKey;
  setPage: (p: PageKey) => void;
  search: string;
  setSearch: (s: string) => void;
  selectedRoomId: string | null;
  selectRoom: (id: string | null) => void;
  drawer: Drawer;
  openDrawer: (d: Drawer) => void;
  closeDrawer: () => void;
  menu: MenuState | null;
  openMenu: (m: MenuState) => void;
  closeMenu: () => void;
  pending: PendingAction | null;
  setPending: (p: PendingAction | null) => void;
}

const UICtx = createContext<UIValue | null>(null);

function initialPage(): PageKey {
  const h = window.location.hash.replace('#/', '').replace('#', '');
  if (['rooms', 'orders', 'stats', 'handover', 'more'].includes(h)) return h as PageKey;
  return 'rooms';
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [page, setPageRaw] = useState<PageKey>(initialPage);
  const [search, setSearch] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [pending, setPendingState] = useState<PendingAction | null>(null);

  const setPending = useCallback((p: PendingAction | null) => {
    setPendingState(p);
  }, []);

  const setPage = useCallback((p: PageKey) => {
    setPageRaw(p);
    setSearch('');
    setMenu(null);
    setPendingState(null);
    if (window.location.hash !== `#/${p}`) {
      try {
        window.history.replaceState(null, '', `#/${p}`);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const value = useMemo<UIValue>(
    () => ({
      page,
      setPage,
      search,
      setSearch,
      selectedRoomId,
      selectRoom: setSelectedRoomId,
      drawer,
      openDrawer: setDrawer,
      closeDrawer: () => setDrawer(null),
      menu,
      openMenu: setMenu,
      closeMenu: () => setMenu(null),
      pending,
      setPending,
    }),
    [page, setPage, search, selectedRoomId, drawer, menu, pending, setPending],
  );

  return <UICtx.Provider value={value}>{children}</UICtx.Provider>;
}

export function useUI(): UIValue {
  const v = useContext(UICtx);
  if (!v) throw new Error('useUI 必须在 UIProvider 内使用');
  return v;
}
