import { useStore } from '../store/store';
import { useUI } from '../store/ui';
import { useToast } from '../components/Toast';
import { EmptyState } from '../components/ui';
import { IconPlus, IconSwap } from '../components/Icons';

const SHIFT_LABEL: Record<string, string> = { morning: '早班', noon: '中班', night: '夜班' };

export function HandoverPage() {
  const { state, act, undo } = useStore();
  const ui = useUI();
  const toast = useToast();

  const logs = [...state.shiftLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <div className="section-h">
        <h3>交接班记录</h3>
        <span className="desc">共 {logs.length} 条</span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => ui.openDrawer({ kind: 'shift' })}
        >
          <IconPlus size={14} />
          新建
        </button>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={<IconSwap size={32} />}
          text="还没有交接班记录。交班时记录待办事项即可，不需要双方确认。"
          action={{ label: '新建交接', onClick: () => ui.openDrawer({ kind: 'shift' }) }}
        />
      ) : (
        <div>
          {logs.map((l) => (
            <div className="shift-item" key={l.id}>
              <div className="si-head">
                <span className="badge">{SHIFT_LABEL[l.shift] ?? l.shift}</span>
                <span>
                  {l.from} → {l.to}
                </span>
                <span className="si-time">{l.createdAt}</span>
              </div>
              {l.todos && (
                <div className="si-body">
                  <b style={{ color: 'var(--ink-2)' }}>待办：</b>
                  {l.todos}
                </div>
              )}
              {l.note && (
                <div className="si-body">
                  <b style={{ color: 'var(--ink-2)' }}>备注：</b>
                  {l.note}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    act({ type: 'deleteShiftLog', id: l.id }, '删除交接记录');
                    toast({ text: '交接记录已删除', actionLabel: '撤销', onAction: undo });
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="note-line">
        交接班只记录班次、交班人、接班人、时间、待办事项与备注，不记录交接金额，也不需要双方确认。
      </div>
    </div>
  );
}
