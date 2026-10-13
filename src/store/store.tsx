import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type {
  AppState,
  Channel,
  CleanState,
  GroupBy,
  Maintenance,
  Meta,
  Order,
  OrderInput,
  Room,
  RoomType,
  Settings,
  ShiftLog,
} from './types';
import { STATE_VERSION, emptyState } from './types';
import { buildSampleState } from './sample';
import { loadState, pushSnapshot, saveState } from '../lib/storage';
import { todayStr } from '../lib/date';
import { computeCheckOut } from '../lib/derive';
import { addDays, businessDay, fmtDateTime } from '../lib/date';
import { uid } from '../lib/id';

export type Action =
  | { type: 'checkIn'; input: OrderInput; at: string }
  | { type: 'checkOut'; roomId: string; at: string }
  | { type: 'extend'; roomId: string; nights: number; extraFee: number }
  | { type: 'setClean'; roomId: string; clean: CleanState }
  | { type: 'setOoo'; roomId: string; on: boolean; date: string; content?: string }
  | { type: 'reserve'; input: OrderInput; at: string }
  | { type: 'confirmReserve'; roomId: string; at: string }
  | { type: 'cancelReserve'; roomId: string }
  | { type: 'editOrder'; id: string; patch: Partial<Order>; auditHour: number; longRent?: boolean }
  | { type: 'upsertRoom'; room: Room }
  | { type: 'addRooms'; rooms: Room[] }
  | { type: 'deleteRoom'; roomId: string; at: string }
  | { type: 'deleteRooms'; roomIds: string[]; at: string }
  | { type: 'setLongRent'; roomIds: string[]; on: boolean }
  | { type: 'restoreRoom'; roomId: string }
  | { type: 'purgeRooms' }
  | { type: 'upsertRoomType'; roomType: RoomType }
  | { type: 'deleteRoomType'; id: string; at: string }
  | { type: 'restoreRoomType'; id: string }
  | { type: 'upsertChannel'; channel: Channel }
  | { type: 'deleteChannel'; id: string }
  | { type: 'addShiftLog'; log: ShiftLog }
  | { type: 'deleteShiftLog'; id: string }
  | { type: 'addMaintenance'; maintenance: Maintenance }
  | { type: 'toggleMaintenance'; id: string; done: boolean; date: string }
  | { type: 'deleteMaintenance'; id: string }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'setView'; view: GroupBy }
  | { type: 'setMeta'; patch: Partial<Meta> }
  | { type: 'replaceState'; state: AppState }
  | { type: 'loadSample'; auditHour: number }
  | { type: 'clearAll' }
  | { type: 'restore'; state: AppState };

function mapRoom(state: AppState, roomId: string, fn: (r: Room) => Room): Room[] {
  return state.rooms.map((r) => (r.id === roomId ? fn(r) : r));
}

function newOrder(input: OrderInput, at: string, auditHour: number): Order {
  return {
    id: uid('o_'),
    roomId: input.roomId,
    kind: input.kind,
    guestName: input.guestName.trim(),
    phone: input.phone.trim(),
    idCard: input.idCard?.trim() || undefined,
    channelId: input.channelId,
    checkIn: input.checkIn,
    nights: Math.max(1, Math.round(input.nights)),
    checkOut: computeCheckOut(input.checkIn, Math.max(1, Math.round(input.nights)), auditHour),
    roomFee: input.roomFee,
    deposit: input.deposit,
    parking: input.parking,
    other: input.other,
    remark: input.remark.trim(),
    createdAt: at,
    state: 'active',
  };
}

export function reducer(state: AppState, action: Action): AppState {
  const audit = state.settings.nightAuditHour;
  switch (action.type) {
    case 'checkIn': {
      const order = newOrder({ ...action.input, kind: 'stay' }, action.at, audit);
      const rooms = mapRoom(state, order.roomId, (r) => ({
        ...r,
        status: 'occupied',
        ...(action.input.longRent !== undefined ? { longRent: action.input.longRent } : {}),
      }));
      // 该房若有未到店的预订，自动作废，避免一房两单
      const orders = state.orders
        .filter(
          (o) => !(o.roomId === order.roomId && o.kind === 'reserve' && o.state === 'active'),
        )
        .concat(order);
      return { ...state, rooms, orders };
    }
    case 'reserve': {
      const order = newOrder({ ...action.input, kind: 'reserve' }, action.at, audit);
      const rooms = mapRoom(state, order.roomId, (r) => ({
        ...r,
        status: 'reserved',
        ...(action.input.longRent !== undefined ? { longRent: action.input.longRent } : {}),
      }));
      return { ...state, rooms, orders: [...state.orders, order] };
    }
    case 'confirmReserve': {
      const orders = state.orders.map((o) =>
        o.roomId === action.roomId && o.kind === 'reserve' && o.state === 'active'
          ? { ...o, kind: 'stay' as const, checkIn: action.at, checkOut: computeCheckOut(action.at, o.nights, audit) }
          : o,
      );
      const rooms = mapRoom(state, action.roomId, (r) => ({ ...r, status: 'occupied' }));
      return { ...state, orders, rooms };
    }
    case 'cancelReserve': {
      const orders = state.orders.map((o) =>
        o.roomId === action.roomId && o.kind === 'reserve' && o.state === 'active'
          ? { ...o, state: 'cancelled' as const }
          : o,
      );
      const rooms = mapRoom(state, action.roomId, (r) => ({ ...r, status: 'vacant' }));
      return { ...state, orders, rooms };
    }
    case 'checkOut': {
      const orders = state.orders.map((o) =>
        o.roomId === action.roomId && o.kind === 'stay' && o.state === 'active'
          ? { ...o, state: 'checkedOut' as const, closedAt: action.at }
          : o,
      );
      const rooms = mapRoom(state, action.roomId, (r) => ({
        ...r,
        status: 'vacant',
        clean: 'dirty',
      }));
      return { ...state, orders, rooms };
    }
    case 'extend': {
      const add = Math.max(1, Math.round(action.nights));
      const orders = state.orders.map((o) =>
        o.roomId === action.roomId && o.kind === 'stay' && o.state === 'active'
          ? {
              ...o,
              nights: o.nights + add,
              checkOut: addDays(o.checkOut, add),
              roomFee: Math.round((o.roomFee + action.extraFee) * 100) / 100,
            }
          : o,
      );
      return { ...state, orders };
    }
    case 'setClean':
      return { ...state, rooms: mapRoom(state, action.roomId, (r) => ({ ...r, clean: action.clean })) };
    case 'setOoo': {
      const rooms = mapRoom(state, action.roomId, (r) => ({
        ...r,
        status: action.on ? ('ooo' as const) : ('vacant' as const),
        clean: action.on ? r.clean : ('dirty' as const),
      }));
      if (!action.on) return { ...state, rooms };
      const m: Maintenance = {
        id: uid('m_'),
        roomId: action.roomId,
        date: action.date,
        content: action.content?.trim() || '前台转维修',
        done: false,
      };
      return { ...state, rooms, maintenances: [m, ...state.maintenances] };
    }
    case 'editOrder': {
      const prev = state.orders.find((o) => o.id === action.id);
      if (!prev) return state;
      const next: Order = { ...prev, ...action.patch };
      next.nights = Math.max(1, Math.round(next.nights));
      next.checkOut = computeCheckOut(next.checkIn, next.nights, action.auditHour);
      let rooms = state.rooms;
      if (action.patch.roomId && action.patch.roomId !== prev.roomId) {
        rooms = rooms.map((r) => {
          if (r.id === prev.roomId) return { ...r, status: 'vacant' as const };
          if (r.id === next.roomId)
            return { ...r, status: next.kind === 'stay' ? ('occupied' as const) : ('reserved' as const) };
          return r;
        });
      }
      if (action.longRent !== undefined) {
        rooms = rooms.map((r) =>
          r.id === next.roomId ? { ...r, longRent: action.longRent } : r,
        );
      }
      return { ...state, orders: state.orders.map((o) => (o.id === action.id ? next : o)), rooms };
    }
    case 'upsertRoom': {
      const exists = state.rooms.some((r) => r.id === action.room.id);
      return {
        ...state,
        rooms: exists
          ? state.rooms.map((r) => (r.id === action.room.id ? action.room : r))
          : [...state.rooms, action.room],
      };
    }
    case 'addRooms':
      return { ...state, rooms: [...state.rooms, ...action.rooms] };
    case 'deleteRoom':
      return { ...state, rooms: mapRoom(state, action.roomId, (r) => ({ ...r, deletedAt: action.at })) };
    case 'deleteRooms': {
      const ids = new Set(action.roomIds);
      return {
        ...state,
        rooms: state.rooms.map((r) => (ids.has(r.id) ? { ...r, deletedAt: action.at } : r)),
      };
    }
    case 'setLongRent': {
      const ids = new Set(action.roomIds);
      return {
        ...state,
        rooms: state.rooms.map((r) => (ids.has(r.id) ? { ...r, longRent: action.on } : r)),
      };
    }
    case 'restoreRoom':
      return {
        ...state,
        rooms: state.rooms.map((r) => (r.id === action.roomId ? { ...r, deletedAt: undefined } : r)),
      };
    case 'purgeRooms':
      return { ...state, rooms: state.rooms.filter((r) => !r.deletedAt) };
    case 'upsertRoomType': {
      const exists = state.roomTypes.some((t) => t.id === action.roomType.id);
      return {
        ...state,
        roomTypes: exists
          ? state.roomTypes.map((t) => (t.id === action.roomType.id ? action.roomType : t))
          : [...state.roomTypes, action.roomType],
      };
    }
    case 'deleteRoomType':
      return {
        ...state,
        roomTypes: state.roomTypes.map((t) => (t.id === action.id ? { ...t, deletedAt: action.at } : t)),
      };
    case 'restoreRoomType':
      return {
        ...state,
        roomTypes: state.roomTypes.map((t) =>
          t.id === action.id ? { ...t, deletedAt: undefined } : t,
        ),
      };
    case 'upsertChannel': {
      const exists = state.channels.some((c) => c.id === action.channel.id);
      return {
        ...state,
        channels: exists
          ? state.channels.map((c) => (c.id === action.channel.id ? action.channel : c))
          : [...state.channels, action.channel],
      };
    }
    case 'deleteChannel':
      return { ...state, channels: state.channels.filter((c) => c.id !== action.id) };
    case 'addShiftLog':
      return { ...state, shiftLogs: [action.log, ...state.shiftLogs] };
    case 'deleteShiftLog':
      return { ...state, shiftLogs: state.shiftLogs.filter((s) => s.id !== action.id) };
    case 'addMaintenance':
      return { ...state, maintenances: [action.maintenance, ...state.maintenances] };
    case 'toggleMaintenance':
      return {
        ...state,
        maintenances: state.maintenances.map((m) =>
          m.id === action.id ? { ...m, done: action.done, doneDate: action.done ? action.date : undefined } : m,
        ),
      };
    case 'deleteMaintenance':
      return { ...state, maintenances: state.maintenances.filter((m) => m.id !== action.id) };
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'setView':
      return { ...state, meta: { ...state.meta, view: action.view } };
    case 'setMeta':
      return { ...state, meta: { ...state.meta, ...action.patch } };
    case 'replaceState':
      return { ...action.state, version: STATE_VERSION };
    case 'loadSample':
      return buildSampleState(action.auditHour);
    case 'clearAll':
      return { ...emptyState(), meta: { ...emptyState().meta, onboarded: true } };
    case 'restore':
      return action.state;
    default:
      return state;
  }
}

interface HistoryItem {
  label: string;
  state: AppState;
}

interface StoreValue {
  state: AppState;
  bizDay: string;
  now: Date;
  act: (action: Action, undoLabel?: string) => void;
  undo: () => boolean;
  canUndo: boolean;
  undoLabel: string | null;
  raw: (action: Action) => void;
}

const StoreCtx = createContext<StoreValue | null>(null);

const NO_UNDO: Action['type'][] = ['setView', 'setMeta', 'restore'];

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [now, setNow] = useState(() => new Date());
  const [histCount, setHistCount] = useState(0);
  const histRef = useRef<HistoryItem[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // 每日首开自动快照（保留 3 份）
  useEffect(() => {
    const d = todayStr();
    if (stateRef.current.meta.lastSnapshotDate !== d) {
      pushSnapshot(stateRef.current, d);
      dispatch({ type: 'setMeta', patch: { lastSnapshotDate: d } });
    }
  }, []);

  const act = useCallback((action: Action, undoLabel = '操作') => {
    if (!NO_UNDO.includes(action.type)) {
      histRef.current.push({ label: undoLabel, state: stateRef.current });
      if (histRef.current.length > 30) histRef.current.shift();
      setHistCount(histRef.current.length);
    }
    dispatch(action);
  }, []);

  const raw = useCallback((action: Action) => dispatch(action), []);

  const undo = useCallback(() => {
    const last = histRef.current.pop();
    if (!last) return false;
    setHistCount(histRef.current.length);
    dispatch({ type: 'restore', state: last.state });
    return true;
  }, []);

  const bizDay = useMemo(() => businessDay(now, state.settings.nightAuditHour), [
    now,
    state.settings.nightAuditHour,
  ]);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      bizDay,
      now,
      act,
      undo,
      canUndo: histCount > 0,
      undoLabel: histRef.current[histRef.current.length - 1]?.label ?? null,
      raw,
    }),
    [state, bizDay, now, act, undo, histCount, raw],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('useStore 必须在 StoreProvider 内使用');
  return v;
}

/** 当前时间戳字符串，用于写入订单 */
export function stamp(d: Date): string {
  return fmtDateTime(d);
}
