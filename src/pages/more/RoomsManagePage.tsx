import { useMemo, useState } from 'react';
import { useStore } from '../../store/store';
import { useToast } from '../../components/Toast';
import { EmptyState, Field } from '../../components/ui';
import { IconGrid, IconPlus, IconTrash, IconWarn } from '../../components/Icons';
import { parseRoomSpec, sortFloor, sortRoomNumber } from '../../lib/rooms';
import { canDeleteRoom } from '../../lib/actions';
import { STATE_LABEL, roomState } from '../../lib/derive';
import { orderMap } from '../../store/selectors';
import { money } from '../../lib/money';
import { uid } from '../../lib/id';
import { todayStr } from '../../lib/date';
import { useDeleteRoom } from '../../components/useRoomAction';
import type { Room } from '../../store/types';

export const MAX_ROOMS = 100;

export function RoomsManagePage({ onBack }: { onBack: () => void }) {
  const { state, act, undo, bizDay } = useStore();
  const toast = useToast();
  const delRoom = useDeleteRoom();

  const [spec, setSpec] = useState('');
  const [applyFloors, setApplyFloors] = useState<string[]>([]);
  const [batchType, setBatchType] = useState(state.roomTypes[0]?.id ?? '');
  const [newType, setNewType] = useState({ name: '', price: 268 });
  const [preview, setPreview] = useState<{ number: string; floor: string }[] | null>(null);

  const floors = useMemo(
    () => [...new Set(state.rooms.filter((r) => !r.deletedAt).map((r) => r.floor))].filter(Boolean).sort(sortFloor),
    [state.rooms],
  );
  const allFloors = useMemo(() => {
    const set = new Set<string>([...floors, ...state.settings.floors]);
    return [...set].filter(Boolean).sort(sortFloor);
  }, [floors, state.settings.floors]);

  const rooms = useMemo(
    () =>
      state.rooms
        .filter((r) => !r.deletedAt)
        .slice()
        .sort((a, b) => sortRoomNumber(a.number, b.number)),
    [state.rooms],
  );
  const deleted = state.rooms.filter((r) => r.deletedAt);
  const map = useMemo(() => orderMap(state.orders), [state.orders]);

  /* ---------- 房号筛选 / 多选 / 批量删除 ---------- */
  const [q, setQ] = useState('');
  const [fFloor, setFFloor] = useState('');
  const [multi, setMulti] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirmDel, setConfirmDel] = useState(false);

  const filtered = useMemo(() => {
    const kw = q.trim();
    const terms = kw ? kw.split(/[,，\s]+/).filter(Boolean) : [];
    return rooms.filter((r) => {
      if (fFloor && r.floor !== fFloor) return false;
      if (!terms.length) return true;
      // 逗号/空格分隔 = 精确匹配多个房号；否则按包含匹配
      return terms.length > 1 ? terms.includes(r.number) : r.number.includes(terms[0]);
    });
  }, [rooms, q, fFloor]);

  const deletableIds = useMemo(
    () => new Set(filtered.filter((r) => canDeleteRoom(r, state.orders).ok).map((r) => r.id)),
    [filtered, state.orders],
  );

  const exitMulti = () => {
    setMulti(false);
    setSel(new Set());
    setConfirmDel(false);
  };

  const toggleSel = (id: string) => {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setConfirmDel(false);
  };


  const bulkDelete = () => {
    const ids = [...sel].filter((id) => deletableIds.has(id));
    if (!ids.length) return;
    const skipped = sel.size - ids.length;
    const nums = rooms.filter((r) => ids.includes(r.id)).map((r) => r.number);
    act({ type: 'deleteRooms', roomIds: ids, at: new Date().toISOString() }, `批量删除 ${nums.join('、')} 等 ${ids.length} 间房`);
    toast({
      text: skipped
        ? `已删除 ${ids.length} 间，${skipped} 间在住/已预订/停售已跳过`
        : `已删除 ${ids.length} 间房`,
      actionLabel: '撤销',
      onAction: undo,
    });
    exitMulti();
  };

  const bulkLongRent = (on: boolean) => {
    const ids = [...sel];
    if (!ids.length) return;
    act({ type: 'setLongRent', roomIds: ids, on }, `${on ? '设为' : '取消'}长租 ${ids.length} 间`);
    toast({
      text: `已${on ? '设为' : '取消'}长租 ${ids.length} 间`,
      actionLabel: '撤销',
      onAction: undo,
    });
    setConfirmDel(false);
  };

  const buildPreview = () => {
    const list = parseRoomSpec(spec, allFloors, applyFloors);
    const exist = new Set(state.rooms.filter((r) => !r.deletedAt).map((r) => r.number));
    setPreview(list.filter((p) => !exist.has(p.number)));
    if (!list.length) toast({ text: '没有解析出房号，请检查输入格式' });
  };

  const applyBatch = () => {
    const list = (preview ?? []).slice();
    if (!list.length) return;
    if (rooms.length + list.length > MAX_ROOMS) {
      toast({ text: `房间总数上限 ${MAX_ROOMS} 间，当前 ${rooms.length} 间，最多还能添加 ${MAX_ROOMS - rooms.length} 间` });
      return;
    }
    const newRooms: Room[] = list.map((p) => ({
      id: uid('r_'),
      number: p.number,
      floor: p.floor,
      typeId: batchType,
      status: 'vacant',
      clean: 'clean',
    }));
    act({ type: 'addRooms', rooms: newRooms }, `批量添加 ${newRooms.length} 间房`);
    const newFloors = [...new Set([...state.settings.floors, ...newRooms.map((r) => r.floor)])].filter(Boolean);
    act({ type: 'updateSettings', patch: { floors: newFloors } });
    toast({
      text: `已添加 ${newRooms.length} 间房`,
      actionLabel: '撤销',
      onAction: undo,
    });
    setPreview(null);
    setSpec('');
  };

  const addRoom = () => {
    if (rooms.length >= MAX_ROOMS) {
      toast({ text: `房间总数上限 ${MAX_ROOMS} 间` });
      return;
    }
    const max = rooms.reduce((m, r) => Math.max(m, Number(r.number) || 0), 0);
    const number = String(max + 1);
    const floor = floors[0] ?? '1';
    const room: Room = {
      id: uid('r_'),
      number,
      floor,
      typeId: batchType || state.roomTypes[0]?.id || '',
      status: 'vacant',
      clean: 'clean',
    };
    act({ type: 'upsertRoom', room }, `新增 ${number}`);
    toast({ text: `已添加房间 ${number}`, actionLabel: '撤销', onAction: undo });
  };

  const addType = () => {
    const name = newType.name.trim();
    if (!name) {
      toast({ text: '请填写房型名称' });
      return;
    }
    const t = { id: uid('rt_'), name, price: Math.max(0, Number(newType.price) || 0) };
    act({ type: 'upsertRoomType', roomType: t }, '新增房型');
    setNewType({ name: '', price: 268 });
    setBatchType(t.id);
    toast({ text: `已添加房型 ${name}`, actionLabel: '撤销', onAction: undo });
  };

  const delType = (id: string) => {
    const used = state.rooms.filter((r) => r.typeId === id && !r.deletedAt).length;
    if (used) {
      toast({ text: `有 ${used} 间房使用该房型，不能删除` });
      return;
    }
    act({ type: 'deleteRoomType', id, at: new Date().toISOString() }, '删除房型');
    toast({ text: '房型已删除', actionLabel: '撤销', onAction: undo });
  };

  return (
    <div>
      <div className="section-h">
        <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}>
          返回
        </button>
        <h3>房间与房型管理</h3>
        <span className="desc">共 {rooms.length} 间</span>
      </div>

      <div className="section-h">
        <h3>房型与默认房价</h3>
      </div>
      <table className="manage-table">
        <thead>
          <tr>
            <th>房型</th>
            <th style={{ width: 110 }}>默认房价</th>
            <th style={{ width: 52 }} />
          </tr>
        </thead>
        <tbody>
          {state.roomTypes
            .filter((t) => !t.deletedAt)
            .map((t) => (
              <tr key={t.id}>
                <td>
                  <input
                    value={t.name}
                    onChange={(e) => act({ type: 'upsertRoomType', roomType: { ...t, name: e.target.value } })}
                    aria-label="房型名称"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="num"
                    value={t.price}
                    onChange={(e) =>
                      act({
                        type: 'upsertRoomType',
                        roomType: { ...t, price: Number(e.target.value) || 0 },
                      })
                    }
                    aria-label="默认房价"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="icon-btn sm"
                    aria-label={`删除房型 ${t.name}`}
                    onClick={() => delType(t.id)}
                  >
                    <IconTrash size={16} />
                  </button>
                </td>
              </tr>
            ))}
          <tr>
            <td>
              <input
                placeholder="新房型名称"
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                aria-label="新房型名称"
              />
            </td>
            <td>
              <input
                type="number"
                className="num"
                value={newType.price}
                onChange={(e) => setNewType({ ...newType, price: Number(e.target.value) })}
                aria-label="新房价"
              />
            </td>
            <td>
              <button type="button" className="icon-btn sm" aria-label="添加房型" onClick={addType}>
                <IconPlus size={16} />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="section-h">
        <h3>批量添加房号</h3>
        <span className="desc">支持 801-812 / 801,803,805</span>
      </div>
      <div style={{ padding: '0 var(--sp-4)' }}>
        <Field id="spec" label="房号表达式">
          <input
            id="spec"
            className="input num"
            value={spec}
            placeholder="如 801-812 或 801,803,805 或 01-06"
            onChange={(e) => setSpec(e.target.value)}
          />
        </Field>
        {allFloors.length > 0 && (
          <div className="field">
            <span className="field-label">同号段应用到楼层（短号时生效）</span>
            <div className="floor-picker">
              {allFloors.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={applyFloors.includes(f)}
                  onClick={() =>
                    setApplyFloors((list) =>
                      list.includes(f) ? list.filter((x) => x !== f) : [...list, f],
                    )
                  }
                >
                  {f} 层
                </button>
              ))}
            </div>
          </div>
        )}
        <Field id="batchType" label="房型">
          <select
            id="batchType"
            className="select"
            value={batchType}
            onChange={(e) => setBatchType(e.target.value)}
          >
            <option value="">未设房型</option>
            {state.roomTypes
              .filter((t) => !t.deletedAt)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {money(t.price)}
                </option>
              ))}
          </select>
        </Field>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button" className="btn btn-sm btn-second" onClick={buildPreview}>
            生成预览
          </button>
          <button type="button" className="btn btn-sm btn-primary" disabled={!preview?.length} onClick={applyBatch}>
            添加 {preview?.length ?? 0} 间
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={addRoom}>
            手工加 1 间
          </button>
        </div>
        {preview && preview.length > 0 && (
          <div className="preview-list" style={{ marginBottom: 12 }}>
            {preview.map((p, i) => (
              <div className="pl" key={`${p.number}-${i}`}>
                <span className="n">{p.number}</span>
                <span>{p.floor} 层</span>
                <button
                  type="button"
                  className="del"
                  onClick={() => setPreview((list) => (list ?? []).filter((_, idx) => idx !== i))}
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section-h">
        <h3>房间列表</h3>
        <span className="desc">
          {multi ? `已选 ${sel.size} 间（共 ${deletableIds.size} 间可删）` : '在住 / 已预订 / 停售的房号不能删除'}
        </span>
      </div>

      {/* 筛选 / 多选工具栏 */}
      <div style={{ padding: '0 var(--sp-4) var(--sp-2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!multi ? (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input num"
                value={q}
                placeholder="筛选房号：80 或 801,805,902"
                onChange={(e) => setQ(e.target.value)}
                aria-label="按房号筛选"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-sm btn-second"
                onClick={() => {
                  setMulti(true);
                  setSel(new Set());
                  setConfirmDel(false);
                }}
                disabled={!rooms.length}
              >
                多选
              </button>
            </div>
            {allFloors.length > 1 && (
              <div className="floor-picker">
                <button type="button" aria-pressed={fFloor === ''} onClick={() => setFFloor('')}>
                  全部楼层
                </button>
                {allFloors.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={fFloor === f}
                    onClick={() => setFFloor(fFloor === f ? '' : f)}
                  >
                    {f} 层
                  </button>
                ))}
              </div>
            )}
            {q && (
              <span className="mi-desc">
                筛出 {filtered.length} 间
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ marginLeft: 8, height: 24 }}
                  onClick={() => {
                    setQ('');
                    setFFloor('');
                  }}
                >
                  清除
                </button>
              </span>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-second"
                onClick={() => setSel(new Set(deletableIds))}
                disabled={!deletableIds.size}
              >
                全选可删
              </button>
              <button
                type="button"
                className="btn btn-sm btn-second"
                onClick={() => setSel(new Set(filtered.map((r) => r.id)))}
                disabled={!filtered.length}
              >
                全部选中
              </button>
              <button
                type="button"
                className="btn btn-sm btn-second"
                onClick={() => {
                  setSel(new Set());
                  setConfirmDel(false);
                }}
                disabled={!sel.size}
              >
                清空
              </button>
              <span style={{ flex: 1 }} />
              <button type="button" className="btn btn-sm btn-ghost" onClick={exitMulti}>
                退出多选
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-sm btn-second"
                disabled={!sel.size}
                onClick={() => bulkLongRent(true)}
              >
                设为长租
              </button>
              <button
                type="button"
                className="btn btn-sm btn-second"
                disabled={!sel.size}
                onClick={() => bulkLongRent(false)}
              >
                取消长租
              </button>
              {confirmDel && sel.size > 0 ? (
                <div className="confirmbar" role="alert" style={{ flex: 1, minWidth: 220 }}>
                  <span className="cb-text">
                    确认删除 <b>{sel.size}</b> 间？在住 / 已预订 / 停售将自动跳过，可撤销。
                  </span>
                  <button type="button" className="btn btn-sm btn-danger" onClick={bulkDelete}>
                    确认删除
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setConfirmDel(false)}
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={!sel.size}
                  onClick={() => setConfirmDel(true)}
                >
                  删除所选 {sel.size ? `(${sel.size})` : ''}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {rooms.length === 0 ? (
        <EmptyState icon={<IconGrid size={32} />} text="还没有房间，先批量添加房号。" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<IconGrid size={32} />} text="没有匹配的房号，换个关键词试试。" />
      ) : (
        <table className="manage-table">
          <thead>
            <tr>
              {multi && <th style={{ width: 36 }} aria-label="选择" />}
              <th style={{ width: 84 }}>房号</th>
              <th style={{ width: 72 }}>楼层</th>
              <th>房型</th>
              <th style={{ width: 56 }}>长租</th>
              <th style={{ width: 84 }}>状态</th>
              {!multi && <th style={{ width: 44 }} />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const st = roomState(r, bizDay, map.get(r.id));
              const guard = canDeleteRoom(r, state.orders);
              const checked = sel.has(r.id);
              return (
                <tr key={r.id} className={multi && checked ? 'is-picked' : undefined}>
                  {multi && (
                    <td>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!guard.ok}
                        onChange={() => toggleSel(r.id)}
                        aria-label={`选择 ${r.number}`}
                        title={guard.ok ? undefined : guard.reason}
                        style={{ width: 18, height: 18, accentColor: 'var(--brand)' }}
                      />
                    </td>
                  )}
                  <td>
                    <input
                      className="num"
                      value={r.number}
                      onChange={(e) => act({ type: 'upsertRoom', room: { ...r, number: e.target.value } })}
                      aria-label={`房号 ${r.number}`}
                    />
                  </td>
                  <td>
                    <input
                      className="num"
                      value={r.floor}
                      onChange={(e) => act({ type: 'upsertRoom', room: { ...r, floor: e.target.value } })}
                      aria-label={`楼层 ${r.number}`}
                    />
                  </td>
                  <td>
                    <select
                      value={r.typeId}
                      onChange={(e) => act({ type: 'upsertRoom', room: { ...r, typeId: e.target.value } })}
                      aria-label={`房型 ${r.number}`}
                    >
                      <option value="">未设</option>
                      {state.roomTypes
                        .filter((t) => !t.deletedAt)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!r.longRent}
                      onChange={(e) =>
                        act(
                          { type: 'setLongRent', roomIds: [r.id], on: e.target.checked },
                          `${r.number} ${e.target.checked ? '设为' : '取消'}长租`,
                        )
                      }
                      aria-label={`长租 ${r.number}`}
                      style={{ width: 18, height: 18, accentColor: 'var(--brand)' }}
                    />
                  </td>
                  <td style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)' }}>{STATE_LABEL[st]}</td>
                  {!multi && (
                    <td>
                      <button
                        type="button"
                        className="icon-btn sm"
                        aria-label={`删除 ${r.number}`}
                        title={guard.ok ? '删除' : guard.reason}
                        onClick={() => {
                          if (!guard.ok) {
                            toast({ text: guard.reason ?? '不能删除' });
                            return;
                          }
                          delRoom(r.id);
                        }}
                        style={guard.ok ? undefined : { opacity: 0.35 }}
                      >
                        <IconTrash size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {deleted.length > 0 && (
        <>
          <div className="section-h">
            <h3>回收站</h3>
            <span className="desc">{deleted.length} 间已删除，可恢复</span>
          </div>
          <div className="rooms-chips">
            {deleted.map((r) => (
              <button
                key={r.id}
                type="button"
                className="locked"
                onClick={() => {
                  act({ type: 'restoreRoom', roomId: r.id }, '恢复房间');
                  toast({ text: `${r.number} 已恢复` });
                }}
                title="点击恢复"
              >
                {r.number}
              </button>
            ))}
          </div>
          <div style={{ padding: '0 var(--sp-4) var(--sp-4)' }}>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => {
                act({ type: 'purgeRooms' }, '清空回收站');
                toast({ text: '回收站已清空', actionLabel: '撤销', onAction: undo });
              }}
            >
              彻底清空回收站
            </button>
          </div>
        </>
      )}

      <div className="note-line" style={{ padding: 'var(--sp-4)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <IconWarn size={14} />
          删除房间采用软删除，5 秒内可撤销；在住或已预订的房号禁止删除。
        </span>
      </div>
      <div className="note-line">{todayStr()} · 数据保存在本机浏览器</div>
    </div>
  );
}
