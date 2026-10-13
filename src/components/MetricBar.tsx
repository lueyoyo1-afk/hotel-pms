import type { RoomCounts } from '../store/selectors';
import { NumberRoll } from './ui';
import { pct } from '../lib/money';

interface Item {
  k: string;
  sub?: string;
  v: number;
  text?: string;
  tone?: 'alert' | 'amber' | 'long';
}

export function MetricBar({ counts }: { counts: RoomCounts }) {
  const items: Item[] = [
    { k: '在住', sub: `短租 ${counts.occShort} · 长租 ${counts.occLong}`, v: counts.occupied },
    { k: '当日预离', v: counts.due, tone: 'alert' },
    { k: '空脏', v: counts.vd, tone: 'amber' },
    { k: '出租率', sub: '按短租房量', v: counts.occRate, text: pct(counts.occRate, 0) },
    {
      k: '总房量',
      sub: `短租 ${counts.totalShort} · 长租 ${counts.totalLong}`,
      v: counts.total,
      tone: 'long',
    },
    { k: '空净', v: counts.vc },
    { k: '待打扫', v: counts.dirty, tone: 'amber' },
  ];

  return (
    <div className="metricbar" role="group" aria-label="房态指标">
      {items.map((it, i) => (
        <div
          className={`m${it.tone === 'alert' ? ' is-alert' : ''}${
            it.tone === 'amber' ? ' is-amber' : ''
          }${it.tone === 'long' ? ' is-long' : ''}${i > 4 ? ' d-hide' : ''}`}
          key={it.k}
        >
          <span className="k">
            {it.k}
            {it.sub && <span className="k-sub">{it.sub}</span>}
          </span>
          <span className="v">
            {it.text ? (
              <NumberRoll value={it.v} format={() => it.text as string} />
            ) : (
              <NumberRoll value={it.v} format={(n) => String(Math.round(n))} />
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
