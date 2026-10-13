import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface ToastOptions {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  duration: number;
}

type ToastFn = (opts: ToastOptions) => void;

const ToastCtx = createContext<ToastFn | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const remove = useCallback((id: string) => {
    setItems((list) => list.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) window.clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const toast = useCallback<ToastFn>(
    (opts) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const item: ToastItem = { duration: 5000, ...opts, id };
      setItems((list) => [...list.slice(-2), item]);
      const t = window.setTimeout(() => remove(id), item.duration);
      timers.current.set(id, t);
    },
    [remove],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => window.clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {items.map((t) => (
          <ToastRow key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastRow({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const [left, setLeft] = useState(Math.ceil(item.duration / 1000));
  useEffect(() => {
    const end = Date.now() + item.duration;
    const tick = window.setInterval(() => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) window.clearInterval(tick);
    }, 200);
    return () => window.clearInterval(tick);
  }, [item.duration]);

  return (
    <div className="toast">
      <span className="t-text">{item.text}</span>
      {item.actionLabel && (
        <>
          <span className="t-count">{left}s</span>
          <button
            type="button"
            className="t-action"
            onClick={() => {
              item.onAction?.();
              onClose();
            }}
          >
            {item.actionLabel}
          </button>
        </>
      )}
    </div>
  );
}

export function useToast(): ToastFn {
  const fn = useContext(ToastCtx);
  if (!fn) throw new Error('useToast 必须在 ToastProvider 内使用');
  return fn;
}
