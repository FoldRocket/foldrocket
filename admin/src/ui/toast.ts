import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info' | 'loading';

export type ToastItem = {
  id: string;
  message: string;
  kind: ToastKind;
};

type ToastState = {
  items: ToastItem[];
  push: (message: string, kind?: ToastKind, ttlMs?: number) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function uid() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (message, kind = 'info', ttlMs) => {
    const text = String(message || '').trim();
    if (!text) return '';
    const id = uid();
    const item: ToastItem = { id, message: text, kind };
    set({ items: [...get().items.slice(-4), item] });

    // Errors remain until dismissed so users can finish switching tabs or read long messages.
    const ttl = kind === 'error' ? 0 : ttlMs ?? (kind === 'loading' ? 0 : 3800);
    if (ttl > 0) {
      const prev = timers.get(id);
      if (prev) clearTimeout(prev);
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          get().dismiss(id);
        }, ttl)
      );
    }
    return id;
  },
  dismiss: (id) => {
    const t = timers.get(id);
    if (t) {
      clearTimeout(t);
      timers.delete(id);
    }
    set({ items: get().items.filter((x) => x.id !== id) });
  },
  clear: () => {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    set({ items: [] });
  },
}));

/** Imperative API — usable outside React components. */
export const toast = {
  success: (message: string, ttlMs?: number) => useToastStore.getState().push(message, 'success', ttlMs),
  error: (message: string, ttlMs?: number) => useToastStore.getState().push(message, 'error', ttlMs),
  info: (message: string, ttlMs?: number) => useToastStore.getState().push(message, 'info', ttlMs),
  loading: (message: string) => useToastStore.getState().push(message, 'loading', 0),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  clear: () => useToastStore.getState().clear(),
};
