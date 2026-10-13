import { useRef, useState } from 'react';
import { useStore } from '../../store/store';
import { useToast } from '../../components/Toast';
import { ConfirmBar } from '../../components/ui';
import { IconDownload, IconUpload } from '../../components/Icons';
import {
  downloadJSON,
  exportFileName,
  pushSnapshot,
  readSnapshots,
  normalize,
} from '../../lib/storage';
import type { AppState } from '../../store/types';
import { todayStr } from '../../lib/date';

export function BackupPage({ onBack }: { onBack: () => void }) {
  const { state, act, undo } = useStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [snaps, setSnaps] = useState(() => readSnapshots());

  const doExport = () => {
    downloadJSON(exportFileName(state), state);
    act({ type: 'setMeta', patch: { lastBackupAt: new Date().toISOString() } });
    toast({ text: '备份文件已导出' });
  };

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = normalize(JSON.parse(text));
      setPendingImport(parsed);
    } catch {
      toast({ text: '文件解析失败，请确认是本系统导出的 JSON' });
    }
  };

  const doImport = () => {
    if (!pendingImport) return;
    pushSnapshot(state, `${todayStr()}-导入前`);
    setSnaps(readSnapshots());
    act({ type: 'replaceState', state: pendingImport }, '导入备份');
    setPendingImport(null);
    toast({ text: '导入完成', actionLabel: '撤销', onAction: undo });
  };

  const rollback = (index: number) => {
    const s = snaps[index];
    if (!s) return;
    act({ type: 'replaceState', state: s.state }, '回滚快照');
    toast({ text: `已回滚到 ${s.date} 的快照`, actionLabel: '撤销', onAction: undo });
  };

  const roomCount = state.rooms.filter((r) => !r.deletedAt).length;

  return (
    <div>
      <div className="section-h">
        <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}>
          返回
        </button>
        <h3>数据备份</h3>
        <span className="desc">导出 / 导入 / 快照回滚</span>
      </div>

      <div style={{ padding: '0 var(--sp-4)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={doExport}>
          <IconDownload size={16} />
          导出 JSON
        </button>
        <button type="button" className="btn btn-second" onClick={() => fileRef.current?.click()}>
          <IconUpload size={16} />
          导入 JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = '';
          }}
        />
      </div>

      <div className="note-line">
        当前 {roomCount} 间房 · {state.orders.length} 条订单 ·{' '}
        {state.meta.lastBackupAt
          ? `上次导出 ${state.meta.lastBackupAt.slice(0, 10)}`
          : '尚未导出过备份'}
      </div>

      <div className="section-h">
        <h3>本地自动快照</h3>
        <span className="desc">每日首开自动生成，保留 3 份</span>
      </div>
      {snaps.length === 0 ? (
        <div className="note-line">还没有快照，明天首次打开时会自动生成。</div>
      ) : (
        <div className="rows">
          {snaps.map((s, i) => (
            <div className="row" key={s.at}>
              <span className="r-main">
                <span className="r-title">{s.date}</span>
                <span className="r-sub">
                  {s.rooms} 间房 · {s.orders} 条订单
                </span>
              </span>
              <button type="button" className="btn btn-sm btn-second" onClick={() => rollback(i)}>
                回滚到此
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="section-h">
        <h3>其他</h3>
      </div>
      <div style={{ padding: '0 var(--sp-4)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-second"
          onClick={() => {
            act({ type: 'loadSample', auditHour: state.settings.nightAuditHour }, '载入示例数据');
            toast({ text: '已载入示例数据', actionLabel: '撤销', onAction: undo });
          }}
        >
          载入示例数据
        </button>
        <button type="button" className="btn btn-danger" onClick={() => setConfirmClear(true)}>
          清空全部数据
        </button>
      </div>

      {pendingImport && (
        <div style={{ position: 'sticky', bottom: 0 }}>
          <ConfirmBar
            text={
              <>
                导入将覆盖当前 <b>{roomCount}</b> 间房 <b>{state.orders.length}</b> 条订单，替换为{' '}
                <b>{pendingImport.rooms.filter((r) => !r.deletedAt).length}</b> 间房{' '}
                <b>{pendingImport.orders.length}</b> 条订单（导入前已自动快照）
              </>
            }
            confirmLabel="确认导入"
            onCancel={() => setPendingImport(null)}
            onConfirm={doImport}
          />
        </div>
      )}

      {confirmClear && (
        <div style={{ position: 'sticky', bottom: 0 }}>
          <ConfirmBar
            text={
              <>
                清空后将删除全部房间 <b>{roomCount}</b> 间与订单 <b>{state.orders.length}</b> 条，可在 5 秒内撤销
              </>
            }
            confirmLabel="确认清空"
            onCancel={() => setConfirmClear(false)}
            onConfirm={() => {
              act({ type: 'clearAll' }, '清空数据');
              setConfirmClear(false);
              toast({ text: '数据已清空', actionLabel: '撤销', onAction: undo });
            }}
          />
        </div>
      )}
    </div>
  );
}
