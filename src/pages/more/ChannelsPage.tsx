import { useState } from 'react';
import { useStore } from '../../store/store';
import { useToast } from '../../components/Toast';
import { Field } from '../../components/ui';
import { IconPlus, IconTrash } from '../../components/Icons';
import { uid } from '../../lib/id';
import { moneyShort } from '../../lib/money';

export function ChannelsPage({
  onBack,
  inline,
}: {
  onBack?: () => void;
  inline?: boolean;
}) {
  const { state, act, undo } = useStore();
  const toast = useToast();
  const [name, setName] = useState('');

  const usedCount = (id: string) => state.orders.filter((o) => o.channelId === id).length;
  const revenue = (id: string) =>
    state.orders.filter((o) => o.channelId === id).reduce((a, o) => a + o.roomFee + o.parking + o.other, 0);

  const add = () => {
    const n = name.trim();
    if (!n) return;
    act({ type: 'upsertChannel', channel: { id: uid('ch_'), name: n, active: true } }, '新增渠道');
    setName('');
    toast({ text: `已添加渠道 ${n}`, actionLabel: '撤销', onAction: undo });
  };

  return (
    <div>
      {inline && (
        <div className="section-h">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}>
            返回
          </button>
          <h3>渠道管理</h3>
          <span className="desc">停用不影响历史数据</span>
        </div>
      )}

      {!inline && <div style={{ height: 4 }} />}

      <table className="manage-table">
        <thead>
          <tr>
            <th>渠道名称</th>
            <th style={{ width: 78 }}>状态</th>
            <th style={{ width: 44 }} />
          </tr>
        </thead>
        <tbody>
          {state.channels.map((c) => {
            const used = usedCount(c.id);
            return (
              <tr key={c.id} className={c.active ? undefined : 'is-deleted'}>
                <td>
                  <input
                    value={c.name}
                    onChange={(e) =>
                      act({ type: 'upsertChannel', channel: { ...c, name: e.target.value } })
                    }
                    aria-label="渠道名称"
                  />
                  <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)', marginTop: 2 }}>
                    {used} 条订单 · 累计 {moneyShort(revenue(c.id))}
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className={`badge${c.active ? ' on' : ''}`}
                    style={{ height: 30 }}
                    onClick={() =>
                      act({ type: 'upsertChannel', channel: { ...c, active: !c.active } })
                    }
                  >
                    {c.active ? '启用中' : '已停用'}
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className="icon-btn sm"
                    aria-label={`删除渠道 ${c.name}`}
                    onClick={() => {
                      if (used) {
                        toast({ text: `该渠道已有 ${used} 条订单，只能停用不能删除` });
                        return;
                      }
                      act({ type: 'deleteChannel', id: c.id }, '删除渠道');
                      toast({ text: '渠道已删除', actionLabel: '撤销', onAction: undo });
                    }}
                    style={used ? { opacity: 0.35 } : undefined}
                  >
                    <IconTrash size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ padding: '0 var(--sp-4)' }}>
        <Field id="ch-name" label="新增渠道">
          <div className="input-row">
            <input
              id="ch-name"
              className="input"
              value={name}
              placeholder="如 携程 / 协议单位"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <button type="button" className="btn btn-primary" onClick={add}>
              <IconPlus size={16} />
              添加
            </button>
          </div>
        </Field>
      </div>
      <div className="note-line">
        停用后该渠道不再出现在入住 / 预订表单中，历史订单与统计不受影响。
      </div>
    </div>
  );
}
