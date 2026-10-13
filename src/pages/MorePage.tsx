import React, { useState } from 'react';
import { useStore } from '../store/store';
import { useUI } from '../store/ui';
import {
  IconCalendar,
  IconChevron,
  IconDownload,
  IconKeyboard,
  IconReceipt,
  IconSettings,
  IconWrench,
} from '../components/Icons';
import { MaintenancePage } from './more/MaintenancePage';
import { RoomsManagePage } from './more/RoomsManagePage';
import { ChannelsPage } from './more/ChannelsPage';
import { BackupPage } from './more/BackupPage';
import { SettingsPage } from './more/SettingsPage';
import { ShortcutsPage } from './more/ShortcutsPage';

type Sub = 'maintenance' | 'rooms' | 'channels' | 'backup' | 'settings' | 'shortcuts';

export function MorePage() {
  const { state } = useStore();
  const ui = useUI();
  const [sub, setSub] = useState<Sub | null>(null);

  const items: {
    key: Sub;
    title: string;
    desc: string;
    icon: React.ReactNode;
    right?: string;
  }[] = [
    {
      key: 'maintenance',
      title: '维修登记',
      desc: '登记维修事项，可同时转为停售',
      icon: <IconWrench size={20} />,
      right: `${state.maintenances.filter((m) => !m.done).length} 项未完`,
    },
    {
      key: 'rooms',
      title: '房间与房型管理',
      desc: '增删改房号与房型房价',
      icon: <IconReceipt size={20} />,
      right: `${state.rooms.filter((r) => !r.deletedAt).length} 间`,
    },
    {
      key: 'channels',
      title: '渠道管理',
      desc: '自定义客源渠道，停用不影响历史',
      icon: <IconCalendar size={20} />,
      right: `${state.channels.filter((c) => c.active).length} 个启用`,
    },
    {
      key: 'backup',
      title: '数据备份',
      desc: '导出 / 导入 JSON，本地快照回滚',
      icon: <IconDownload size={20} />,
      right: state.meta.lastBackupAt ? `上次 ${state.meta.lastBackupAt.slice(0, 10)}` : '从未备份',
    },
    { key: 'settings', title: '设置', desc: '酒店名、夜审时间、主题、楼层', icon: <IconSettings size={20} /> },
    { key: 'shortcuts', title: '快捷键说明', desc: '仅桌面端，输入框内不生效', icon: <IconKeyboard size={20} /> },
  ];

  if (sub) {
    const back = () => setSub(null);
    if (sub === 'maintenance') return <MaintenancePage onBack={back} />;
    if (sub === 'rooms') return <RoomsManagePage onBack={back} />;
    if (sub === 'channels') return <ChannelsPage onBack={back} inline />;
    if (sub === 'backup') return <BackupPage onBack={back} />;
    if (sub === 'settings') return <SettingsPage onBack={back} />;
    return <ShortcutsPage onBack={back} />;
  }

  return (
    <div>
      <div className="more-list">
        {items.map((it) => (
          <button type="button" className="more-item" key={it.key} onClick={() => setSub(it.key)}>
            <span className="mi-icon">{it.icon}</span>
            <span className="mi-main">
              {it.title}
              <span className="mi-desc" style={{ display: 'block' }}>
                {it.desc}
              </span>
            </span>
            {it.right && <span className="mi-right">{it.right}</span>}
            <IconChevron size={16} />
          </button>
        ))}
      </div>

      <div className="section-h">
        <h3>常用操作</h3>
      </div>
      <div className="more-list">
        <button
          type="button"
          className="more-item"
          onClick={() => ui.openDrawer({ kind: 'guest', mode: 'stay' })}
        >
          <span className="mi-main">办理入住</span>
          <IconChevron size={16} />
        </button>
        <button
          type="button"
          className="more-item"
          onClick={() => ui.openDrawer({ kind: 'guest', mode: 'reserve' })}
        >
          <span className="mi-main">登记预订</span>
          <IconChevron size={16} />
        </button>
      </div>

      <div className="note-line" style={{ padding: 'var(--sp-5) var(--sp-4)' }}>
        数据仅保存在本机浏览器中。清除浏览器数据或更换设备会导致数据丢失，请定期导出备份。
      </div>
    </div>
  );
}
