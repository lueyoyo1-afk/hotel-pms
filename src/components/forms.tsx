import { useState } from 'react';
import { stamp, useStore } from '../store/store';
import { useToast } from './Toast';
import { Field } from './ui';
import { addDays, todayStr } from '../lib/date';
import { money, round2 } from '../lib/money';
import { uid } from '../lib/id';
import { sortRoomNumber } from '../lib/rooms';
import type { ShiftName } from '../store/types';

const SHIFTS: { value: ShiftName; label: string }[] = [
  { value: 'morning', label: '早班' },
  { value: 'noon', label: '中班' },
  { value: 'night', label: '夜班' },
];

/* ---------- 续住 ---------- */
export function ExtendForm({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const { state, act, undo } = useStore();
  const toast = useToast();
  const room = state.rooms.find((r) => r.id === roomId);
  const order = state.orders.find(
    (o) => o.roomId === roomId && o.kind === 'stay' && o.state === 'active',
  );
  const perNight = order && order.nights ? order.roomFee / order.nights : 0;
  const [nights, setNights] = useState(1);
  const [fee, setFee] = useState<number>(Math.round(perNight * 100) / 100);

  if (!room || !order) return null;

  const changeNights = (n: number) => {
    const v = Math.max(1, Math.min(365, Math.round(Number(n) || 1)));
    setNights(v);
    setFee(round2(perNight * v));
  };

  const submit = () => {
    act(
      { type: 'extend', roomId, nights, extraFee: round2(Number(fee) || 0) },
      `${room.number} 续住`,
    );
    toast({
      text: `${room.number} 已续住 ${nights} 晚，加收 ${money(round2(Number(fee) || 0))}，预离 ${addDays(
        order.checkOut,
        nights,
      )}`,
      actionLabel: '撤销',
      onAction: undo,
    });
    onClose();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="panel-sec" style={{ borderBottom: 0 }}>
        <div className="kv">
          <span className="k">房间</span>
          <span className="v num">{room.number}</span>
        </div>
        <div className="kv">
          <span className="k">客人</span>
          <span className="v">{order.guestName}</span>
        </div>
        <div className="kv">
          <span className="k">现预离</span>
          <span className="v num">{order.checkOut}</span>
        </div>
        <div className="kv">
          <span className="k">现房费</span>
          <span className="v num">{money(order.roomFee)}</span>
        </div>
      </div>
      <Field id="ex-nights" label="加住晚数">
        <input
          id="ex-nights"
          type="number"
          min={1}
          max={365}
          className="input num"
          value={nights}
          onChange={(e) => changeNights(Number(e.target.value))}
        />
      </Field>
      <Field
        id="ex-fee"
        label="加收房费"
        note={
          <>
            新预离日 <b>{addDays(order.checkOut, nights)}</b> · 房费变为{' '}
            <b>{money(round2(order.roomFee + (Number(fee) || 0)))}</b>
          </>
        }
      >
        <input
          id="ex-fee"
          type="number"
          className="input num"
          value={fee}
          onChange={(e) => setFee(Number(e.target.value))}
        />
      </Field>
      <div style={{ height: 8 }} />
      <div className="drawer-foot" style={{ padding: 0, border: 0 }}>
        <button type="button" className="btn btn-second" onClick={onClose}>
          取消
        </button>
        <button type="submit" className="btn btn-primary">
          确认续住
        </button>
      </div>
    </form>
  );
}

/* ---------- 交接班 ---------- */
export function ShiftForm({ onClose }: { onClose: () => void }) {
  const { state, act, undo, now, bizDay } = useStore();
  const toast = useToast();
  const [shift, setShift] = useState<ShiftName>('morning');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [todos, setTodos] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!from.trim() || !to.trim()) {
      setErr('交班人与接班人都需要填写');
      return;
    }
    const log = {
      id: uid('s_'),
      date: bizDay,
      shift,
      from: from.trim(),
      to: to.trim(),
      todos: todos.trim(),
      note: note.trim(),
      createdAt: stamp(now),
    };
    act({ type: 'addShiftLog', log }, '新建交接班');
    toast({ text: '交接班记录已保存', actionLabel: '撤销', onAction: undo });
    onClose();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field id="sh-shift" label="班次">
        <select
          id="sh-shift"
          className="select"
          value={shift}
          onChange={(e) => setShift(e.target.value as ShiftName)}
        >
          {SHIFTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="sh-from" label="交班人" required error={err && !from.trim() ? err : ''}>
        <input
          id="sh-from"
          className="input"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="当班人姓名"
        />
      </Field>
      <Field id="sh-to" label="接班人" required error={err && !to.trim() ? err : ''}>
        <input
          id="sh-to"
          className="input"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="接班人姓名"
        />
      </Field>
      <Field id="sh-todos" label="待办事项" hint="需要下一班跟进的事">
        <textarea
          id="sh-todos"
          className="textarea"
          value={todos}
          onChange={(e) => setTodos(e.target.value)}
          placeholder="如：905 空调待维修，跟进厂家上门时间"
        />
      </Field>
      <Field id="sh-note" label="备注">
        <textarea
          id="sh-note"
          className="textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div className="note-line">
        记录时间 {stamp(now)} · 营业日 {bizDay}
        {state.settings.nightAuditHour !== 6 ? `（夜审 ${state.settings.nightAuditHour}:00）` : ''}
      </div>
      <div style={{ height: 8 }} />
      <div className="drawer-foot" style={{ padding: 0, border: 0 }}>
        <button type="button" className="btn btn-second" onClick={onClose}>
          取消
        </button>
        <button type="submit" className="btn btn-primary">
          保存记录
        </button>
      </div>
    </form>
  );
}

/* ---------- 维修登记 ---------- */
export function MaintenanceForm({
  roomId,
  onClose,
}: {
  roomId?: string;
  onClose: () => void;
}) {
  const { state, act, undo, bizDay } = useStore();
  const toast = useToast();
  const [rid, setRid] = useState(roomId ?? '');
  const [date, setDate] = useState(todayStr());
  const [content, setContent] = useState('');
  const [stop, setStop] = useState(true);
  const [err, setErr] = useState('');

  const rooms = state.rooms
    .filter((r) => !r.deletedAt)
    .slice()
    .sort((a, b) => sortRoomNumber(a.number, b.number));

  const submit = () => {
    if (!rid) {
      setErr('请选择房间');
      return;
    }
    if (!content.trim()) {
      setErr('请填写维修内容');
      return;
    }
    act(
      {
        type: 'addMaintenance',
        maintenance: { id: uid('m_'), roomId: rid, date: date || bizDay, content: content.trim(), done: false },
      },
      '新增维修',
    );
    if (stop) {
      act({ type: 'setOoo', roomId: rid, on: true, date: date || bizDay, content: content.trim() });
    }
    const num = rooms.find((r) => r.id === rid)?.number ?? '';
    toast({
      text: `${num} 维修已登记${stop ? '，并转为停售' : ''}`,
      actionLabel: '撤销',
      onAction: undo,
    });
    onClose();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field id="mt-room" label="房间" required error={err}>
        <select id="mt-room" className="select num" value={rid} onChange={(e) => setRid(e.target.value)}>
          <option value="">请选择房间</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.number}
              {r.status === 'ooo' ? '（停售中）' : ''}
            </option>
          ))}
        </select>
      </Field>
      <Field id="mt-date" label="登记日期">
        <input
          id="mt-date"
          type="date"
          className="input num"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>
      <Field id="mt-content" label="维修内容" required>
        <textarea
          id="mt-content"
          className="textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="如：空调不制冷，已联系厂家"
        />
      </Field>
      <label
        className="field"
        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-xs)' }}
      >
        <input
          type="checkbox"
          checked={stop}
          onChange={(e) => setStop(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        同时转为维修停售
      </label>
      <div className="note-line">取消勾选则只登记维修事项，房间仍可售卖。</div>
      <div style={{ height: 8 }} />
      <div className="drawer-foot" style={{ padding: 0, border: 0 }}>
        <button type="button" className="btn btn-second" onClick={onClose}>
          取消
        </button>
        <button type="submit" className="btn btn-primary">
          登记
        </button>
      </div>
    </form>
  );
}
