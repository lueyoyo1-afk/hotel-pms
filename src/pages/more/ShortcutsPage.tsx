
const KEYS: [string, string][] = [
  ['/', '聚焦搜索框'],
  ['N', '选中房间置净'],
  ['D', '选中房间置脏'],
  ['C', '入住（打开入住单）'],
  ['O', '退房结算（需确认）'],
  ['E', '续住'],
  ['R', '转维修（需确认）'],
  ['B', '预订（打开预订单）'],
  ['Ctrl/⌘ + Z', '撤销上一步'],
  ['Ctrl/⌘ + S', '导出备份 JSON'],
  ['?', '打开快捷键说明'],
  ['Esc', '关闭面板 / 抽屉'],
  ['方向键', '在房态网格中移动焦点'],
];

export function ShortcutsPage({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <div className="section-h">
        <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}>
          返回
        </button>
        <h3>快捷键</h3>
        <span className="desc">仅桌面端，输入框内不生效</span>
      </div>
      <table className="kbd-table">
        <tbody>
          {KEYS.map(([k, v]) => (
            <tr key={k}>
              <td>
                <kbd>{k}</kbd>
              </td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="note-line" style={{ padding: 'var(--sp-5) var(--sp-4)' }}>
        房卡：单击查看详情，长按（或右键）弹出快捷动作菜单。滑动不改变房态。
      </div>
    </div>
  );
}
