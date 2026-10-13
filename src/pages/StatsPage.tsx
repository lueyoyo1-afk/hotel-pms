import { useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { useUI } from '../store/ui';
import { computeDay, computeMonth, computeTrend, channelShares } from '../lib/stats';
import { LineChart, DonutChart } from '../components/Charts';
import { NumberRoll, Segmented } from '../components/ui';
import { money, moneyShort, pct } from '../lib/money';
import { todayStr } from '../lib/date';
import { IconLock } from '../components/Icons';

type Range = 'day' | 'month';

export function StatsPage() {
  const { state, bizDay } = useStore();
  const ui = useUI();
  const [range, setRange] = useState<Range>('day');
  const audit = state.settings.nightAuditHour;

  const month = bizDay.slice(0, 7);
  const stat = useMemo(
    () => (range === 'day' ? computeDay(state, bizDay, audit) : computeMonth(state, month, audit)),
    [range, state, bizDay, month, audit],
  );
  const trend = useMemo(() => computeTrend(state, bizDay, audit, 30), [state, bizDay, audit]);
  const shares = useMemo(() => channelShares(state, stat.byChannel), [state, stat.byChannel]);

  const cells = [
    { k: '总营收', v: <NumberRoll value={stat.total} format={moneyShort} />, hero: true },
    { k: '出租率', sub: '按短租房量', v: <NumberRoll value={stat.occ} format={(n) => pct(n, 1)} /> },
    { k: '平均房价 ADR', v: <NumberRoll value={stat.adr} format={money} /> },
    { k: '间夜', v: <NumberRoll value={stat.nights} format={(n) => String(Math.round(n))} /> },
    { k: range === 'day' ? '当日预离' : '本月预离', v: <NumberRoll value={stat.due} format={(n) => String(Math.round(n))} /> },
    { k: '待打扫', v: <NumberRoll value={stat.dirty} format={(n) => String(Math.round(n))} /> },
  ];

  // 长租独立指标
  const longRooms = state.rooms.filter((r) => !r.deletedAt && r.longRent);
  const longStay = state.orders.filter(
    (o) => o.state === 'active' && o.kind === 'stay' && longRooms.some((r) => r.id === o.roomId),
  ).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--sp-3) var(--sp-4)' }}>
        <Segmented<Range>
          label="统计范围"
          value={range}
          options={[
            { value: 'day', label: '今日' },
            { value: 'month', label: '本月' },
          ]}
          onChange={setRange}
        />
        <span style={{ flex: 1 }} />
        <span className="badge">按 {audit}:00 切分</span>
      </div>
      <div className="note-line" style={{ paddingTop: 0 }}>
        {range === 'day'
          ? `营业日 ${bizDay}（${audit}:00 至次日 ${audit}:00）`
          : `${month} · 共 ${stat.days} 个营业日`}
      </div>

      <div className="stat-grid">
        {cells.map((c) => (
          <div className={`stat-cell${c.hero ? ' hero' : ''}`} key={c.k}>
            <div className="k">{c.k}</div>
            <div className="v">{c.v}</div>
          </div>
        ))}
      </div>

      <div className="section-h">
        <h3>收入构成</h3>
        <span className="desc">自上而下</span>
      </div>
      <table className="revenue-table">
        <tbody>
          <tr>
            <td>
              短租房费
              <div className="sub">按短租房量计算出租率与间夜</div>
            </td>
            <td className="n">{money(stat.roomShort)}</td>
          </tr>
          <tr>
            <td>长租房费</td>
            <td className="n">{money(stat.roomLong)}</td>
          </tr>
          <tr>
            <td>
              房费小计
              <div className="sub">短租 {money(stat.roomShort)} + 长租 {money(stat.roomLong)}</div>
            </td>
            <td className="n">{money(stat.room)}</td>
          </tr>
          <tr>
            <td>
              其他费用
              <div className="sub">
                停车 {money(stat.parking)} / 其他 {money(stat.other)}
              </div>
            </td>
            <td className="n">{money(stat.parking + stat.other)}</td>
          </tr>
          <tr className="total">
            <td>总收入 = 房费 + 其他费用</td>
            <td className="n">{money(stat.total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-h">
        <h3>长租统计</h3>
        <span className="desc">在「更多 · 房间与房型」中标记长租房</span>
      </div>
      <div className="stat-grid long-grid">
        <div className="stat-cell">
          <div className="k">长租房量</div>
          <div className="v">
            {longRooms.length}
            <small> 间</small>
          </div>
        </div>
        <div className="stat-cell">
          <div className="k">长租在住</div>
          <div className="v">
            {longStay}
            <small> 间</small>
          </div>
        </div>
        <div className="stat-cell">
          <div className="k">长租房费</div>
          <div className="v">
            <NumberRoll value={stat.roomLong} format={moneyShort} />
          </div>
        </div>
        <div className="stat-cell">
          <div className="k">长租占比</div>
          <div className="v">
            <NumberRoll
              value={stat.room > 0 ? stat.roomLong / stat.room : 0}
              format={(n) => pct(n, 1)}
            />
          </div>
        </div>
      </div>
      {longRooms.length === 0 && (
        <div className="note-line" style={{ paddingTop: 0 }}>
          还没有标记长租房。标记后，长租房不参与短租出租率与 ADR，营收单独分列。
        </div>
      )}

      <div className="deposit-block">
        <IconLock size={16} />
        押金（代收，不计营收）
        <span className="v">{money(stat.deposit)}</span>
      </div>

      <div className="chart-card">
        <div className="chart-card-head">
          <h3>渠道占比</h3>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => ui.openDrawer({ kind: 'channels' })}
          >
            管理
          </button>
        </div>
        <div className="donut-row">
          <DonutChart shares={shares} />
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-head">
          <h3>近 30 天营收趋势</h3>
        </div>
        <LineChart points={trend} />
        <div className="line-legend">
          <span>单位：元</span>
          <span>按营业日（{audit}:00 切分）</span>
          <span>截至 {todayStr() === bizDay ? bizDay : bizDay}</span>
        </div>
      </div>
    </div>
  );
}
