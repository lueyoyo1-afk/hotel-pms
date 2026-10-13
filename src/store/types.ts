export type RoomStatus = 'vacant' | 'occupied' | 'reserved' | 'ooo';
export type CleanState = 'clean' | 'dirty';
export type OrderKind = 'stay' | 'reserve';
export type OrderState = 'active' | 'checkedOut' | 'cancelled';
export type ShiftName = 'morning' | 'noon' | 'night';
export type GroupBy = 'floor' | 'type' | 'status';
export type ThemeMode = 'auto' | 'light' | 'dark';

export interface RoomType {
  id: string;
  name: string;
  price: number;
  deletedAt?: string;
}

export interface Room {
  id: string;
  number: string;
  floor: string;
  typeId: string;
  status: RoomStatus;
  clean: CleanState;
  /** 长租房（月租 / 公寓式）：不参与短租出租率与 ADR 口径 */
  longRent?: boolean;
  deletedAt?: string;
}

export interface Channel {
  id: string;
  name: string;
  active: boolean;
}

export interface Order {
  id: string;
  roomId: string;
  kind: OrderKind;
  guestName: string;
  phone: string;
  idCard?: string;
  channelId: string;
  checkIn: string; // 'YYYY-MM-DD HH:mm'
  nights: number;
  checkOut: string; // 'YYYY-MM-DD'
  roomFee: number;
  deposit: number; // 不计营收
  parking: number;
  other: number;
  remark: string;
  createdAt: string;
  closedAt?: string;
  state: OrderState;
}

export interface Maintenance {
  id: string;
  roomId: string;
  date: string;
  content: string;
  done: boolean;
  doneDate?: string;
}

export interface ShiftLog {
  id: string;
  date: string;
  shift: ShiftName;
  from: string;
  to: string;
  todos: string;
  note: string;
  createdAt: string;
}

export interface Settings {
  hotelName: string;
  nightAuditHour: number;
  floors: string[];
  theme: ThemeMode;
}

export interface Meta {
  onboarded: boolean;
  lastBackupAt: string | null;
  lastSnapshotDate: string | null;
  view: GroupBy;
  warnDismissedAt: string | null;
}

export interface AppState {
  version: number;
  settings: Settings;
  roomTypes: RoomType[];
  rooms: Room[];
  channels: Channel[];
  orders: Order[];
  maintenances: Maintenance[];
  shiftLogs: ShiftLog[];
  meta: Meta;
}

export const STATE_VERSION = 1;

export function emptyState(): AppState {
  return {
    version: STATE_VERSION,
    settings: {
      hotelName: '我的酒店',
      nightAuditHour: 6,
      floors: [],
      theme: 'auto',
    },
    roomTypes: [],
    rooms: [],
    channels: [],
    orders: [],
    maintenances: [],
    shiftLogs: [],
    meta: {
      onboarded: false,
      lastBackupAt: null,
      lastSnapshotDate: null,
      view: 'floor',
      warnDismissedAt: null,
    },
  };
}

/** 客人表单提交载荷 */
export interface OrderInput {
  roomId: string;
  kind: OrderKind;
  guestName: string;
  phone: string;
  idCard?: string;
  channelId: string;
  checkIn: string;
  nights: number;
  roomFee: number;
  deposit: number;
  parking: number;
  other: number;
  remark: string;
  longRent?: boolean; // 随客单一并设置房间长租属性
}
