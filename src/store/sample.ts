import type { AppState, Channel, Order, Room, RoomType } from './types';
import { STATE_VERSION } from './types';
import { uid } from '../lib/id';
import { addDays, businessDay, fmtDateTime } from '../lib/date';

/** 示例数据：12 间房 + 在住 / 预订 / 历史订单，用于立刻体验 */
export function buildSampleState(auditHour = 6): AppState {
  const now = new Date();
  const T = businessDay(now, auditHour);

  const roomTypes: RoomType[] = [
    { id: 'rt_std', name: '标准间', price: 268 },
    { id: 'rt_big', name: '大床房', price: 298 },
    { id: 'rt_biz', name: '商务房', price: 398 },
  ];

  const channels: Channel[] = [
    { id: 'ch_walk', name: '散客', active: true },
    { id: 'ch_ctrip', name: '携程', active: true },
    { id: 'ch_mt', name: '美团', active: true },
    { id: 'ch_vip', name: '会员', active: true },
    { id: 'ch_corp', name: '协议单位', active: true },
    { id: 'ch_old', name: '旅行社（已停用）', active: false },
  ];

  const plan: { number: string; floor: string; typeId: string; longRent?: boolean }[] = [
    { number: '801', floor: '8', typeId: 'rt_std' },
    { number: '802', floor: '8', typeId: 'rt_std' },
    { number: '803', floor: '8', typeId: 'rt_std' },
    { number: '804', floor: '8', typeId: 'rt_big' },
    { number: '805', floor: '8', typeId: 'rt_big' },
    { number: '806', floor: '8', typeId: 'rt_biz' },
    { number: '901', floor: '9', typeId: 'rt_std' },
    { number: '902', floor: '9', typeId: 'rt_std' },
    { number: '903', floor: '9', typeId: 'rt_std', longRent: true },
    { number: '904', floor: '9', typeId: 'rt_big', longRent: true },
    { number: '905', floor: '9', typeId: 'rt_big' },
    { number: '906', floor: '9', typeId: 'rt_biz' },
  ];

  const rooms: Room[] = plan.map((p) => ({
    id: uid('r_'),
    number: p.number,
    floor: p.floor,
    typeId: p.typeId,
    status: 'vacant',
    clean: 'clean',
    longRent: p.longRent,
  }));

  const byNum = (n: string) => rooms.find((r) => r.number === n)!;
  const price = (r: Room) => roomTypes.find((t) => t.id === r.typeId)?.price ?? 268;

  const orders: Order[] = [];

  const addOrder = (o: Partial<Order> & Pick<Order, 'roomId' | 'guestName' | 'checkIn' | 'nights'>) => {
    const nights = o.nights;
    const room = rooms.find((r) => r.id === o.roomId)!;
    orders.push({
      id: uid('o_'),
      roomId: o.roomId,
      kind: o.kind ?? 'stay',
      guestName: o.guestName,
      phone: o.phone ?? '',
      idCard: o.idCard,
      channelId: o.channelId ?? 'ch_walk',
      checkIn: o.checkIn,
      nights,
      checkOut: o.checkOut ?? addDays(o.checkIn.slice(0, 10), nights),
      roomFee: o.roomFee ?? price(room) * nights,
      deposit: o.deposit ?? 0,
      parking: o.parking ?? 0,
      other: o.other ?? 0,
      remark: o.remark ?? '',
      createdAt: o.createdAt ?? o.checkIn,
      closedAt: o.closedAt,
      state: o.state ?? 'active',
    });
  };

  // 在住
  addOrder({
    roomId: byNum('801').id,
    guestName: '张伟',
    phone: '13801010101',
    channelId: 'ch_ctrip',
    checkIn: `${addDays(T, -1)} 14:20`,
    nights: 2,
    roomFee: 536,
    deposit: 200,
    parking: 30,
    remark: '需要安静房间',
  });
  byNum('801').status = 'occupied';

  addOrder({
    roomId: byNum('802').id,
    guestName: '李娜',
    phone: '13802020202',
    channelId: 'ch_mt',
    checkIn: `${addDays(T, -2)} 20:05`,
    nights: 2,
    roomFee: 536,
    deposit: 100,
  });
  byNum('802').status = 'occupied';

  addOrder({
    roomId: byNum('803').id,
    guestName: '王强',
    phone: '13803030303',
    channelId: 'ch_vip',
    checkIn: `${addDays(T, -1)} 09:00`,
    nights: 1,
    roomFee: 268,
    deposit: 0,
    other: 20,
  });
  byNum('803').status = 'occupied';
  byNum('803').clean = 'dirty';

  addOrder({
    roomId: byNum('806').id,
    guestName: '孙丽',
    phone: '13806060606',
    channelId: 'ch_corp',
    checkIn: `${T} 12:00`,
    nights: 3,
    roomFee: 1194,
    deposit: 300,
    parking: 60,
  });
  byNum('806').status = 'occupied';

  // 预订（今晚到店）
  addOrder({
    roomId: byNum('804').id,
    guestName: '赵敏',
    phone: '13804040404',
    channelId: 'ch_ctrip',
    checkIn: `${T} 18:00`,
    nights: 1,
    roomFee: 298,
    kind: 'reserve',
  });
  byNum('804').status = 'reserved';

  // 空脏 / 维修
  byNum('902').clean = 'dirty';
  byNum('905').status = 'ooo';

  // 历史已退房订单（供统计与趋势使用）
  const history: { room: string; name: string; phone: string; ch: string; back: number; nights: number; parking: number; other: number; deposit: number }[] = [
    { room: '803', name: '钱进', phone: '13811110001', ch: 'ch_walk', back: 2, nights: 2, parking: 0, other: 0, deposit: 100 },
    { room: '901', name: '周涛', phone: '13811110002', ch: 'ch_mt', back: 4, nights: 1, parking: 20, other: 0, deposit: 0 },
    { room: '902', name: '吴芳', phone: '13811110003', ch: 'ch_ctrip', back: 6, nights: 3, parking: 60, other: 30, deposit: 200 },
    { room: '904', name: '郑凯', phone: '13811110004', ch: 'ch_vip', back: 9, nights: 2, parking: 0, other: 0, deposit: 100 },
    { room: '906', name: '冯雪', phone: '13811110005', ch: 'ch_corp', back: 12, nights: 2, parking: 40, other: 0, deposit: 300 },
    { room: '901', name: '陈磊', phone: '13811110006', ch: 'ch_walk', back: 15, nights: 1, parking: 0, other: 15, deposit: 0 },
    { room: '903', name: '褚红', phone: '13811110007', ch: 'ch_mt', back: 18, nights: 2, parking: 20, other: 0, deposit: 0 },
    { room: '905', name: '卫东', phone: '13811110008', ch: 'ch_ctrip', back: 22, nights: 3, parking: 0, other: 0, deposit: 200 },
    { room: '902', name: '蒋平', phone: '13811110009', ch: 'ch_vip', back: 26, nights: 1, parking: 0, other: 0, deposit: 0 },
    { room: '906', name: '沈青', phone: '13811110010', ch: 'ch_corp', back: 29, nights: 2, parking: 40, other: 20, deposit: 300 },
  ];

  for (const h of history) {
    const room = byNum(h.room);
    const checkInDate = addDays(T, -h.back);
    addOrder({
      roomId: room.id,
      guestName: h.name,
      phone: h.phone,
      channelId: h.ch,
      checkIn: `${checkInDate} 15:30`,
      nights: h.nights,
      roomFee: price(room) * h.nights,
      parking: h.parking,
      other: h.other,
      deposit: h.deposit,
      state: 'checkedOut',
      closedAt: `${addDays(checkInDate, h.nights)} 12:10`,
    });
  }

  return {
    version: STATE_VERSION,
    settings: {
      hotelName: '示例酒店',
      nightAuditHour: auditHour,
      floors: ['8', '9'],
      theme: 'auto',
    },
    roomTypes,
    rooms,
    channels,
    orders,
    maintenances: [
      {
        id: uid('m_'),
        roomId: byNum('905').id,
        date: addDays(T, -2),
        content: '空调不制冷，待厂家上门',
        done: false,
      },
      {
        id: uid('m_'),
        roomId: byNum('903').id,
        date: addDays(T, -6),
        content: '更换淋浴花洒',
        done: true,
        doneDate: addDays(T, -5),
      },
    ],
    shiftLogs: [
      {
        id: uid('s_'),
        date: T,
        shift: 'morning',
        from: '王小明',
        to: '刘红',
        todos: '905 空调待维修，跟进厂家上门时间',
        note: '备用钥匙柜已清点',
        createdAt: fmtDateTime(now),
      },
    ],
    meta: {
      onboarded: true,
      lastBackupAt: null,
      lastSnapshotDate: null,
      view: 'floor',
      warnDismissedAt: null,
    },
  };
}
