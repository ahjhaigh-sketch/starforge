import { create } from 'zustand';

export interface Toast {
  id: number;
  title: string;
  body: string;
  icon: string;
  leaving?: boolean;
}

interface UiState {
  /** Only one panel is ever open. */
  panel: string | null;
  toasts: Toast[];
  open: (id: string) => void;
  close: () => void;
  toggle: (id: string) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dropToast: (id: number) => void;
}

let toastId = 1;

export const useUi = create<UiState>((set, get) => ({
  panel: null,
  toasts: [],
  open: (id) => set({ panel: id }),
  close: () => set({ panel: null }),
  toggle: (id) => set({ panel: get().panel === id ? null : id }),
  pushToast: (t) => {
    const id = toastId++;
    set({ toasts: [...get().toasts, { ...t, id }].slice(-3) });
    setTimeout(() => set({ toasts: get().toasts.map((x) => (x.id === id ? { ...x, leaving: true } : x)) }), 3200);
    setTimeout(() => get().dropToast(id), 3460);
  },
  dropToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));
