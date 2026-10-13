import type { TrendPoint } from '../lib/stats';
import type { ChannelShare } from '../lib/stats';
import { moneyShort } from '../lib/money';
import { shortMD } from '../lib/date';

/* ---------- 近 30 天营收折线（自绘 SVG） ---------- */
export function LineChart({ points }: { points: TrendPoint[] }) {
  const W = 320;
  const H = 120;
  const padL = 6;
  const padR = 6;
  const padT = 10;
  const padB = 22;
  const max = Math.max(1, ...points.map((p) => p.total));
  const nice = Math.ceil(max / 100) * 100 || 100;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = Math.max(1, points.length - 1);

  const x = (i: number) => padL + (innerW * i) / n;
  const y = (v: number) => padT + innerH - (innerH * Math.min(v, nice)) / nice;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${padL},${
    padT + innerH
  } Z`;

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="近 30 天营收趋势">
        <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="var(--line)" strokeWidth={1} />
        <line
          x1={padL}
          y1={padT + innerH / 2}
          x2={W - padR}
          y2={padT + innerH / 2}
          stroke="var(--line)"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
        <path d={area} fill="var(--brand)" opacity={0.08} />
        <path
          d={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.length > 0 && (
          <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].total)} r={3} fill="var(--accent)">
            <title>{`${points[points.length - 1].date} ${moneyShort(points[points.length - 1].total)}`}</title>
          </circle>
        )}
        <text x={padL} y={padT - 2} fontSize={9} fill="var(--ink-3)">
          {moneyShort(nice)}
        </text>
        <text x={padL} y={padT + innerH / 2 - 2} fontSize={9} fill="var(--ink-3)">
          {moneyShort(nice / 2)}
        </text>
        <text x={padL} y={H - 6} fontSize={9} fill="var(--ink-3)">
          {points.length ? shortMD(points[0].date) : ''}
        </text>
        <text x={W - padR} y={H - 6} fontSize={9} textAnchor="end" fill="var(--ink-3)">
          {points.length ? shortMD(points[points.length - 1].date) : ''}
        </text>
      </svg>
    </div>
  );
}

const PALETTE = [
  'var(--brand)',
  'var(--accent)',
  'var(--ok)',
  'var(--st-due)',
  'var(--st-res-ink)',
  'var(--n-400)',
];

/* ---------- 渠道占比环形（≤5 项 + 其他） ---------- */
export function DonutChart({ shares }: { shares: ChannelShare[] }) {
  const size = 148;
  const r = 54;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  const total = shares.reduce((a, b) => a + b.value, 0);

  let offset = 0;
  const segs = shares.map((s, i) => {
    const len = total > 0 ? (s.value / total) * c : 0;
    const seg = {
      ...s,
      color: PALETTE[i % PALETTE.length],
      dash: `${len} ${c - len}`,
      offset: -offset,
    };
    offset += len;
    return seg;
  });

  return (
    <>
      <div className="chart-box" style={{ width: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="渠道营收占比">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={18}
          />
          {segs.map((s) => (
            <circle
              key={s.id}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={18}
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            >
              <title>{`${s.name} ${moneyShort(s.value)}`}</title>
            </circle>
          ))}
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize={13} fill="var(--ink)" fontFamily="var(--font-display)" fontWeight={700}>
            {moneyShort(total)}
          </text>
          <text x={cx} y={cy + 13} textAnchor="middle" fontSize={9} fill="var(--ink-3)">
            渠道营收
          </text>
        </svg>
      </div>
      <div className="donut-legend">
        {segs.map((s) => (
          <div className="lg" key={s.id}>
            <span className="sw" style={{ background: s.color }} />
            <span>{s.name}</span>
            <span className="v">{moneyShort(s.value)}</span>
          </div>
        ))}
        {!segs.length && <div className="lg">暂无数据</div>}
      </div>
    </>
  );
}
