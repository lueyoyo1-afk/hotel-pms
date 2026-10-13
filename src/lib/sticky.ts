/**
 * 吸顶高度同步
 *
 * 结构说明：`.appbar` 固定在 `.app-main` 顶部（不参与滚动），
 * 真正滚动的是 `.view`。因此 `.view` 内部的吸顶元素（指标条 / 筛选条 / 分组头）
 * 只能按彼此的真实高度逐级偏移，任何写死的高度都会在字体、屏宽、
 * 数据变化时错位，造成滚动时相互遮挡。
 *
 * 这里用 ResizeObserver 实测高度并写入 CSS 变量，CSS 只负责取用。
 */

const TARGETS: [string, string][] = [
  ['--metric-h', '.metricbar'],
  ['--filter-h', '.filterbar'],
  ['--group-h', '.group-head'],
];

export function installStickySync(): () => void {
  const root = document.documentElement;
  let raf = 0;

  const run = () => {
    raf = 0;
    for (const [variable, selector] of TARGETS) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) continue;
      const cs = getComputedStyle(el);
      // 非吸顶（桌面端指标条为静态布局）不参与偏移计算
      if (cs.display === 'none' || cs.position === 'static') continue;
      const h = el.getBoundingClientRect().height;
      if (h > 0) root.style.setProperty(variable, `${Math.round(h)}px`);
    }
  };

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(run);
  };

  const ro = new ResizeObserver(schedule);
  const observe = () => {
    for (const [, selector] of TARGETS) {
      document.querySelectorAll(selector).forEach((el) => ro.observe(el));
    }
  };

  const mo = new MutationObserver(() => {
    observe();
    schedule();
  });
  mo.observe(document.body, { childList: true, subtree: true });

  observe();
  schedule();
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);

  return () => {
    ro.disconnect();
    mo.disconnect();
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    if (raf) cancelAnimationFrame(raf);
  };
}
