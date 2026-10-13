import { useState } from 'react';
import { useStore } from '../../store/store';
import { useUI } from '../../store/ui';
import { useToast } from '../../components/Toast';
import { EmptyState } from '../../components/ui';
import { IconInbox, IconPlus, IconWrench } from '../../components/Icons';
import { shortMD, todayStr } from '../../lib/date';

export function MaintenancePage({ onBack }: { onBack: () => void }) {
  const { state, act, undo } = useStore();
  const ui = useUI();
  const toast = useToast();
  const [showDone, setShowDone] = useState(false);

  const list = state.maintenances
    .filter((m) => (showDone ? true : !m.done))
    .sort((a, b) => b.date.localeCompare(a.date));

  const roomNumber = (id: string) => state.rooms.find((r) => r.id === id)?.number ?? '已删除';

  return (
    <div>
      <div className="section-h">
        <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}>
          返回
        </button>
        <h3>维修登记</h3>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => ui.openDrawer({ kind: 'maintenance' })}
        >
          <IconPlus size={14} />
          登记
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<IconWrench size={32} />}
          text={showDone ? '没有维修记录。' : '没有未完成的维修事项。'}
          action={{ label: '登记维修', onClick: () => ui.openDrawer({ kind: 'maintenance' }) }}
        />
      ) : (
        <div>
          {list.map((m) => (
            <div className="shift-item" key={m.id}>
              <div className="si-head">
                <span className="badge" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {roomNumber(m.roomId)}
                </span>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.content}
                </span>
                <span className="si-time">{shortMD(m.date)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'flex-end',
                  marginTop: 8,
                  alignItems: 'center',
                }}
              >
                {m.done ? (
                  <span className="mi-right">已完成 {m.doneDate ? shortMD(m.doneDate) : ''}</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-second"
                    onClick={() => {
                      act(
                        { type: 'toggleMaintenance', id: m.id, done: true, date: todayStr() },
                        '完成维修',
                      );
                      toast({ text: '已标记完成', actionLabel: '撤销', onAction: undo });
                    }}
                  >
                    标记完成
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    act({ type: 'deleteMaintenance', id: m.id }, '删除维修记录');
                    toast({ text: '维修记录已删除', actionLabel: '撤销', onAction: undo });
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-h">
        <h3>已停售房间</h3>
        <span className="desc">维修停售中</span>
      </div>
      {state.rooms.filter((r) => r.status === 'ooo' && !r.deletedAt).length === 0 ? (
        <div className="empty" style={{ padding: 'var(--sp-4)' }}>
          <IconInbox size={28} />
          <p>没有停售房间</p>
        </div>
      ) : (
        <div className="rows">
          {state.rooms
            .filter((r) => r.status === 'ooo' && !r.deletedAt)
            .map((r) => (
              <div className="row" key={r.id}>
                <span className="r-main">
                  <span className="r-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {r.number}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-second"
                  onClick={() => {
                    act({ type: 'setOoo', roomId: r.id, on: false, date: todayStr() }, '结束维修');
                    toast({
                      text: `${r.number} 已恢复可售，待打扫`,
                      actionLabel: '撤销',
                      onAction: undo,
                    });
                  }}
                >
                  结束维修
                </button>
              </div>
            ))}
        </div>
      )}

      <div style={{ padding: 'var(--sp-4)' }}>
        <button type="button" className="btn btn-second btn-block" onClick={() => setShowDone((v) => !v)}>
          {showDone ? '只看未完成' : '显示已完成'}
        </button>
      </div>
    </div>
  );
}
