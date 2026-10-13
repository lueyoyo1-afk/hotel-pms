import React, { useEffect, useRef, useState } from 'react';

/* ---------- 分段控件 ---------- */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- 空状态 ---------- */
export function EmptyState({
  icon,
  text,
  action,
}: {
  icon: React.ReactNode;
  text: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="empty">
      {icon}
      <p>{text}</p>
      {action && (
        <button type="button" className="btn btn-primary btn-sm" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ---------- 表单字段 ---------- */
export function Field({
  id,
  label,
  required,
  hint,
  error,
  note,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`field${required ? ' req' : ''}`}>
      <label className="field-label" htmlFor={id}>
        {label}
        {hint && <span className="hint">{hint}</span>}
      </label>
      {children}
      {error ? (
        <div className="field-err" id={id ? `${id}-err` : undefined}>
          {error}
        </div>
      ) : note ? (
        <div className="field-note">{note}</div>
      ) : null}
    </div>
  );
}

/* ---------- 数字滚动 ---------- */
function prefersReduced(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function NumberRoll({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    const from = prev.current;
    if (from === value) return;
    prev.current = value;
    if (prefersReduced() || !Number.isFinite(from)) {
      setDisplay(value);
      return;
    }
    const t0 = performance.now();
    const dur = 600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return <span className={`roll${className ? ` ${className}` : ''}`}>{format(display)}</span>;
}

/* ---------- 轻量确认条（高风险操作，非 Modal） ---------- */
export function ConfirmBar({
  text,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  text: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirmbar" role="alertdialog" aria-label="危险操作确认">
      <span className="cb-text">{text}</span>
      <button type="button" className="btn btn-sm btn-second" onClick={onCancel}>
        取消
      </button>
      <button type="button" className="btn btn-sm btn-danger" onClick={onConfirm} autoFocus>
        {confirmLabel}
      </button>
    </div>
  );
}
