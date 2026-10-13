import { useEffect, useMemo, useRef, useState } from 'react';
import { stamp, useStore } from '../store/store';
import { useUI } from '../store/ui';
import { useToast } from './Toast';
import { Field } from './ui';
import { addDays, businessDay, diffDays, parseDateTime, todayStr } from '../lib/date';
import { computeCheckOut, roomState, STATE_LABEL } from '../lib/derive';
import { orderMap } from '../store/selectors';
import { money, round2 } from '../lib/money';
import { uid } from '../lib/id';
import { sortRoomNumber } from '../lib/rooms';
import { IconLock, IconPlus } from './Icons';

interface Props {
  mode: 'stay' | 'reserve';
  roomId?: string;
  orderId?: string;
  onClose: () => void;
}

interface FormState {
  roomId: string;
  typeId: string;
  guestName: string;
  phone: string;
  idCard: string;
  idPending: boolean;
  channelId: string;
  date: string;
  time: string;
  nights: number;
  checkOut: string;
  unitPrice: number;
  roomFee: number;
  deposit: number;
  parking: number;
  other: number;
  remark: string;
  longRent: boolean;
}

export function GuestForm({ mode, roomId, orderId, onClose }: Props) {
  const { state, act, now, undo, bizDay } = useStore();
  const ui = useUI();
  const toast = useToast();
  const audit = state.settings.nightAuditHour;

  const existing = orderId ? state.orders.find((o) => o.id === orderId) : undefined;
  const isEdit = !!existing;

  const [f, setF] = useState<FormState>(() => {
    const o = existing;
    const bizDay = businessDay(now, audit);
    const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const base: FormState = {
      roomId: o?.roomId ?? roomId ?? '',
      typeId: '',
      guestName: o?.guestName ?? '',
      phone: o?.phone ?? '',
      idCard: o?.idCard ?? '',
      idPending: !o?.idCard,
      channelId: o?.channelId ?? state.channels.find((c) => c.active)?.id ?? '',
      date: o ? o.checkIn.slice(0, 10) : bizDay,
      time: o ? o.checkIn.slice(11, 16) || t : t,
      nights: o?.nights ?? 1,
      checkOut: o?.checkOut ?? addDays(bizDay, 1),
      unitPrice: o ? round2((o.roomFee || 0) / Math.max(1, o.nights || 1)) : 0,
      roomFee: o?.roomFee ?? 0,
      deposit: o?.deposit ?? 0,
      parking: o?.parking ?? 0,
      other: o?.other ?? 0,
      remark: o?.remark ?? '',
      longRent: false,
    };
    const r = state.rooms.find((x) => x.id === base.roomId);
    base.typeId = r?.typeId ?? state.roomTypes[0]?.id ?? '';
    base.longRent = !!r?.longRent;
    if (!base.roomFee) {
      const price = state.roomTypes.find((x) => x.id === base.typeId)?.price ?? 0;
      base.unitPrice = price;
      base.roomFee = round2(price * base.nights);
    }
    return base;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addingChannel, setAddingChannel] = useState(false);
  const [newChannel, setNewChannel] = useState('');
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const bindRef = (key: string) => (el: HTMLElement | null) => {
    refs.current[key] = el;
  };

  const startBiz = useMemo(
    () => businessDay(parseDateTime(`${f.date} ${f.time || '12:00'}`), audit),
    [f.date, f.time, audit],
  );

  // 房型默认价跟随所选房型（未手工改价时）
  useEffect(() => {
    if (isEdit) return;
    const t = state.roomTypes.find((x) => x.id === f.typeId);
    if (t && f.roomId) {
      const r = state.rooms.find((x) => x.id === f.roomId);
      if (r && r.typeId === t.id) {
        const unit = t.price;
        setF((s) => ({ ...s, unitPrice: unit, roomFee: round2(unit * s.nights) }));
      }
    }
  }, [f.typeId, f.roomId, isEdit, state.roomTypes, state.rooms]);

  /** 房号列表：只有空净房可选，其余灰显禁用（编辑时保留当前房） */
  const roomOptions = useMemo(() => {
    const orders = orderMap(state.orders);
    return state.rooms
      .filter((r) => !r.deletedAt)
      .filter((r) => (f.typeId ? r.typeId === f.typeId : true))
      .slice()
      .sort((a, b) => sortRoomNumber(a.number, b.number))
      .map((r) => {
        const cur = r.id === existing?.roomId;
        const sellable = r.status === 'vacant' && r.clean === 'clean';
        return {
          room: r,
          disabled: !cur && !sellable,
          label: `${r.number}（${STATE_LABEL[roomState(r, bizDay, orders.get(r.id))]}）`,
        };
      });
  }, [state.rooms, state.orders, f.typeId, existing?.roomId, bizDay]);

  // 房费三联动：单价 × 晚数 = 总额，任一修改其余自动联动
  const setNights = (n: number) => {
    const nights = Math.max(1, Math.min(365, Math.round(Number(n) || 1)));
    setF((s) => ({ ...s, nights, checkOut: addDays(startBiz, nights), roomFee: round2(s.unitPrice * nights) }));
  };

  const setCheckOut = (d: string) => {
    if (!d) return;
    const nights = Math.max(1, Math.min(365, diffDays(startBiz, d)));
    setF((s) => ({ ...s, checkOut: d, nights, roomFee: round2(s.unitPrice * nights) }));
  };

  const setUnitPrice = (v: number) => {
    const unit = Math.max(0, round2(Number(v) || 0));
    setF((s) => ({ ...s, unitPrice: unit, roomFee: round2(unit * s.nights) }));
  };

  const setRoomFee = (v: number) => {
    const fee = Math.max(0, round2(Number(v) || 0));
    setF((s) => ({ ...s, roomFee: fee, unitPrice: s.nights > 0 ? round2(fee / s.nights) : s.unitPrice }));
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (f.guestName.trim().length < 2) e.guestName = '姓名至少 2 个字';
    if (f.phone.trim() && !/^1\d{10}$/.test(f.phone.trim())) e.phone = '手机号格式不正确';
    const room = state.rooms.find((r) => r.id === f.roomId);
    if (!f.roomId || !room) e.roomId = '请选择房间';
    else if (!(room.status === 'vacant' && room.clean === 'clean') && room.id !== existing?.roomId)
      e.roomId = `${room.number} 当前不是空净房，无法${mode === 'stay' ? '入住' : '预订'}`;
    if (!(Number(f.roomFee) >= 0)) e.roomFee = '房费不能为负';
    return e;
  };

  const submit = () => {
    const e = validate();
    setErrors(e);
    const keys = ['guestName', 'phone', 'roomId', 'roomFee'];
    const first = keys.find((k) => e[k]);
    if (first) {
      const el = refs.current[first];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLElement & { focus: () => void }).focus();
      }
      return;
    }
    const checkIn = `${f.date} ${f.time || '12:00'}`;
    const payload = {
      roomId: f.roomId,
      kind: (existing?.kind ?? mode) as 'stay' | 'reserve',
      guestName: f.guestName,
      phone: f.phone,
      idCard: f.idPending ? '' : f.idCard,
      channelId: f.channelId,
      checkIn,
      nights: f.nights,
      roomFee: round2(Number(f.roomFee) || 0),
      deposit: round2(Number(f.deposit) || 0),
      parking: round2(Number(f.parking) || 0),
      other: round2(Number(f.other) || 0),
      remark: f.remark,
    };
    const roomNum = state.rooms.find((r) => r.id === f.roomId)?.number ?? '';
    if (existing) {
      act(
        { type: 'editOrder', id: existing.id, patch: payload, auditHour: audit, longRent: f.longRent },
        `编辑 ${roomNum}`,
      );
      toast({ text: `${roomNum} 客单已更新`, actionLabel: '撤销', onAction: undo });
    } else if (mode === 'stay') {
      act({ type: 'checkIn', input: { ...payload, longRent: f.longRent }, at: stamp(now) }, `${roomNum} 入住`);
      toast({ text: `${roomNum} ${f.guestName.trim()} 已入住`, actionLabel: '撤销', onAction: undo });
    } else {
      act({ type: 'reserve', input: { ...payload, longRent: f.longRent }, at: stamp(now) }, `${roomNum} 预订`);
      toast({ text: `${roomNum} ${f.guestName.trim()} 已预订`, actionLabel: '撤销', onAction: undo });
    }
    ui.selectRoom(f.roomId);
    onClose();
  };

  const addChannel = () => {
    const name = newChannel.trim();
    if (!name) return;
    const ch = { id: uid('ch_'), name, active: true };
    act({ type: 'upsertChannel', channel: ch }, '新增渠道');
    setF((s) => ({ ...s, channelId: ch.id }));
    setNewChannel('');
    setAddingChannel(false);
  };

  const submitLabel = isEdit
    ? '保存'
    : mode === 'stay'
      ? '确认入住'
      : '确认预订';

  const footer = (
    <>
      <button type="button" className="btn btn-second" onClick={onClose}>
        取消
      </button>
      <button type="button" className="btn btn-primary" onClick={submit}>
        {submitLabel}
      </button>
    </>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field id="guestName" label="姓名" required error={errors.guestName}>
        <input
          id="guestName"
          className="input"
          ref={bindRef('guestName')}
          value={f.guestName}
          onChange={(e) => setF({ ...f, guestName: e.target.value })}
          onBlur={() =>
            setErrors((s) => ({ ...s, guestName: f.guestName.trim().length < 2 ? '姓名至少 2 个字' : '' }))
          }
          aria-describedby={errors.guestName ? 'guestName-err' : undefined}
          autoComplete="off"
          placeholder="如 张伟"
        />
      </Field>

      <Field id="phone" label="手机" hint="可留空" error={errors.phone}>
        <input
          id="phone"
          className="input num"
          inputMode="numeric"
          ref={bindRef('phone')}
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
          onBlur={() =>
            setErrors((s) => ({
              ...s,
              phone: /^1\d{10}$/.test(f.phone.trim()) ? '' : '请填写 11 位手机号',
            }))
          }
          aria-describedby={errors.phone ? 'phone-err' : undefined}
          autoComplete="off"
          placeholder="11 位手机号"
        />
      </Field>

      <Field
        id="idCard"
        label="证件号"
        hint="可留空"
        note={
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={f.idPending}
              onChange={(e) => setF({ ...f, idPending: e.target.checked })}
              style={{ width: 16, height: 16 }}
            />
            标记「待补」
          </label>
        }
      >
        <input
          id="idCard"
          className="input num"
          value={f.idCard}
          disabled={f.idPending}
          onChange={(e) => setF({ ...f, idCard: e.target.value })}
          placeholder={f.idPending ? '待补' : '身份证号'}
          autoComplete="off"
        />
      </Field>

      <Field id="typeId" label="房型">
        <select
          id="typeId"
          className="select"
          value={f.typeId}
          onChange={(e) => {
            const typeId = e.target.value;
            const keep = state.rooms.find((r) => r.id === f.roomId && r.typeId === typeId);
            const t = state.roomTypes.find((x) => x.id === typeId);
            setF({ ...f, typeId, roomId: keep?.id ?? '', roomFee: t?.price ?? f.roomFee });
          }}
        >
          {state.roomTypes
            .filter((t) => !t.deletedAt)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {money(t.price)}
              </option>
            ))}
        </select>
      </Field>

      <Field id="roomId" label="房号" required error={errors.roomId}>
        <select
          id="roomId"
          className="select num"
          ref={bindRef('roomId')}
          value={f.roomId}
          onChange={(e) => {
            const id = e.target.value;
            const r = state.rooms.find((x) => x.id === id);
            const t = state.roomTypes.find((x) => x.id === r?.typeId);
            setF({ ...f, roomId: id, roomFee: t?.price ?? f.roomFee, longRent: !!r?.longRent });
          }}
          aria-describedby={errors.roomId ? 'roomId-err' : undefined}
        >
          <option value="">请选择可售空净房</option>
          {roomOptions.map((o) => (
            <option key={o.room.id} value={o.room.id} disabled={o.disabled}>
              {o.label}
              {o.room.id === existing?.roomId ? '（当前）' : ''}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id="longRent"
        label="长租房"
        hint="计入长租统计口径"
        note={
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 'var(--fs-xs)',
              color: 'var(--ink-2)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={f.longRent}
              onChange={(e) => setF({ ...f, longRent: e.target.checked })}
              style={{ width: 18, height: 18, accentColor: 'var(--brand)' }}
            />
            标记为长租
          </label>
        }
      >
        <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)', padding: '4px 0 2px' }}>
          长租房间从「短租可售」房量中剔除，营收报表按长租口径单独统计
        </div>
      </Field>

      <div className="input-row">
        <Field id="date" label="入住日" hint={mode === 'reserve' ? '预抵' : undefined}>
          <input
            id="date"
            type="date"
            className="input num"
            value={f.date}
            onChange={(e) => {
              const date = e.target.value || todayStr();
              setF((s) => ({
                ...s,
                date,
                checkOut: computeCheckOut(`${date} ${s.time || '12:00'}`, s.nights, audit),
              }));
            }}
          />
        </Field>
        <Field id="time" label="时间">
          <input
            id="time"
            type="time"
            className="input num"
            value={f.time}
            onChange={(e) => {
              const time = e.target.value || '12:00';
              setF((s) => ({
                ...s,
                time,
                checkOut: computeCheckOut(`${s.date} ${time}`, s.nights, audit),
              }));
            }}
          />
        </Field>
      </div>

      <div className="input-row">
        <Field id="nights" label="住几晚">
          <input
            id="nights"
            type="number"
            min={1}
            max={365}
            className="input num"
            value={f.nights}
            onChange={(e) => setNights(Number(e.target.value))}
          />
        </Field>
        <span className="eq">⇄</span>
        <Field id="checkOut" label={mode === 'reserve' ? '预离日' : '预离日'}>
          <input
            id="checkOut"
            type="date"
            className="input num"
            value={f.checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </Field>
      </div>

      <div className="input-row">
        <Field id="unitPrice" label="房价 / 晚">
          <input
            id="unitPrice"
            type="number"
            inputMode="decimal"
            className="input num"
            value={f.unitPrice}
            onChange={(e) => setUnitPrice(Number(e.target.value))}
          />
        </Field>
        <span className="eq" aria-hidden>
          ⇄
        </span>
        <Field id="roomFee" label="总房费" error={errors.roomFee}>
          <input
            id="roomFee"
            type="number"
            inputMode="decimal"
            className="input num"
            ref={bindRef('roomFee')}
            value={f.roomFee}
            onChange={(e) => setRoomFee(Number(e.target.value))}
          />
        </Field>
      </div>
      <div className="fee-note">
        单价 {money(f.unitPrice)} × {f.nights} 晚 = <b>{money(f.roomFee)}</b>
        <span className="fee-hint">改其中任意一项，其余自动联动</span>
      </div>

      <Field id="deposit" label="押金">
        <input
          id="deposit"
          type="number"
          className="input num"
          value={f.deposit}
          onChange={(e) => setF({ ...f, deposit: Number(e.target.value) })}
        />
      </Field>
      <div style={{ padding: '0 0 var(--sp-3)' }}>
        <div className="deposit-note">
          <IconLock size={14} />
          押金为代收，不计入营收
        </div>
      </div>

      <div className="input-row">
        <Field id="parking" label="停车费">
          <input
            id="parking"
            type="number"
            className="input num"
            value={f.parking}
            onChange={(e) => setF({ ...f, parking: Number(e.target.value) })}
          />
        </Field>
        <Field id="other" label="其他费用">
          <input
            id="other"
            type="number"
            className="input num"
            value={f.other}
            onChange={(e) => setF({ ...f, other: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field id="channelId" label="渠道">
        <select
          id="channelId"
          className="select"
          value={f.channelId}
          onChange={(e) => setF({ ...f, channelId: e.target.value })}
        >
          <option value="">未指定</option>
          {state.channels
            .filter((c) => c.active || c.id === f.channelId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </Field>
      {addingChannel ? (
        <div className="input-row" style={{ paddingBottom: 'var(--sp-3)' }}>
          <input
            className="input"
            value={newChannel}
            autoFocus
            placeholder="新渠道名称"
            onChange={(e) => setNewChannel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addChannel();
              }
            }}
          />
          <button type="button" className="btn btn-sm btn-primary" onClick={addChannel}>
            添加
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setAddingChannel(false)}
          >
            取消
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          style={{ marginBottom: 'var(--sp-3)' }}
          onClick={() => setAddingChannel(true)}
        >
          <IconPlus size={14} />
          新增渠道
        </button>
      )}

      <Field id="remark" label="备注">
        <textarea
          id="remark"
          className="textarea"
          value={f.remark}
          onChange={(e) => setF({ ...f, remark: e.target.value })}
          placeholder="如：需要安静房间、加床、发票信息"
        />
      </Field>

      <div style={{ height: 8 }} />
      {footer}
    </form>
  );
}
