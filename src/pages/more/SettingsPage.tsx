import { useState } from 'react';
import { useStore } from '../../store/store';
import { useToast } from '../../components/Toast';
import { Field, Segmented } from '../../components/ui';
import { IconPlus, IconTrash } from '../../components/Icons';
import { sortFloor } from '../../lib/rooms';
import type { ThemeMode } from '../../store/types';

export function SettingsPage({ onBack }: { onBack: () => void }) {
  const { state, act, undo } = useStore();
  const toast = useToast();
  const [floor, setFloor] = useState('');
  const s = state.settings;

  const roomsOnFloor = (f: string) => state.rooms.filter((r) => !r.deletedAt && r.floor === f).length;

  return (
    <div>
      <div className="section-h">
        <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}>
          返回
        </button>
        <h3>设置</h3>
      </div>

      <div style={{ padding: '0 var(--sp-4)' }}>
        <Field id="hotelName" label="酒店名称">
          <input
            id="hotelName"
            className="input"
            value={s.hotelName}
            onChange={(e) => act({ type: 'updateSettings', patch: { hotelName: e.target.value } })}
          />
        </Field>

        <Field
          id="audit"
          label="夜审时间"
          hint="0-23"
          note={
            <>
              营业日从每天 <b>{s.nightAuditHour}:00</b> 到次日 <b>{s.nightAuditHour}:00</b>
              ；今日统计与「当日预离」判定均按此口径
            </>
          }
        >
          <input
            id="audit"
            type="number"
            min={0}
            max={23}
            className="input num"
            value={s.nightAuditHour}
            onChange={(e) => {
              const h = Math.max(0, Math.min(23, Math.round(Number(e.target.value) || 0)));
              act({ type: 'updateSettings', patch: { nightAuditHour: h } });
            }}
          />
        </Field>

        <div className="field">
          <span className="field-label">主题</span>
          <Segmented<ThemeMode>
            label="主题"
            value={s.theme}
            options={[
              { value: 'auto', label: '跟随系统' },
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
            ]}
            onChange={(v) => act({ type: 'updateSettings', patch: { theme: v } })}
          />
        </div>

        <div className="field">
          <span className="field-label">楼层</span>
          <div className="floor-picker" style={{ marginBottom: 8 }}>
            {s.floors.length === 0 && <span className="mi-right">未设置楼层</span>}
            {[...s.floors].sort(sortFloor).map((f) => (
              <span
                key={f}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-pill)',
                  padding: '0 8px 0 12px',
                  height: 36,
                  fontSize: 'var(--fs-xs)',
                }}
              >
                {f} 层 · {roomsOnFloor(f)} 间
                <button
                  type="button"
                  className="icon-btn sm"
                  aria-label={`删除 ${f} 层`}
                  onClick={() => {
                    if (roomsOnFloor(f)) {
                      toast({ text: `${f} 层还有 ${roomsOnFloor(f)} 间房，不能删除楼层` });
                      return;
                    }
                    act(
                      { type: 'updateSettings', patch: { floors: s.floors.filter((x) => x !== f) } },
                      '删除楼层',
                    );
                    toast({ text: `已删除 ${f} 层`, actionLabel: '撤销', onAction: undo });
                  }}
                >
                  <IconTrash size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="input-row">
            <input
              className="input num"
              value={floor}
              placeholder="如 10"
              onChange={(e) => setFloor(e.target.value)}
              aria-label="新增楼层"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const f = floor.trim();
                if (!f || s.floors.includes(f)) return;
                act({ type: 'updateSettings', patch: { floors: [...s.floors, f] } }, '新增楼层');
                setFloor('');
                toast({ text: `已添加 ${f} 层`, actionLabel: '撤销', onAction: undo });
              }}
            >
              <IconPlus size={16} />
              添加楼层
            </button>
          </div>
        </div>
      </div>

      <div className="note-line" style={{ padding: 'var(--sp-5) var(--sp-4)' }}>
        数据仅保存在本机浏览器 localStorage 中，不上传任何服务器。更换设备或清理浏览器数据前请先导出备份。
      </div>
    </div>
  );
}
