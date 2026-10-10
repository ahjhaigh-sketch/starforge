import { create } from 'zustand';

export interface Toast {
  id: number;
  title: string;
  body: string;
  icon: string;
  leaving?: boolean;
  priority?: boolean;
}

interface UiState {
  /** Only one panel is ever open. */
  panel: string | null;
  toasts: Toast[];
  /** Phone only: the engine shop slides up as a drawer. */
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  /** Progress (0 to 1) of the catch-up after time away; null when not catching up. */
  catchUp: number | null;
  setCatchUp: (share: number | null) => void;
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
  drawer: false,
  setDrawer: (drawer) => set({ drawer }),
  catchUp: null,
  setCatchUp: (catchUp) => set({ catchUp }),
  open: (id) => set({ panel: id, drawer: false }),
  close: () => set({ panel: null }),
  toggle: (id) => set({ panel: get().panel === id ? null : id }),
  pushToast: (t) => {
    const id = toastId++;
    // At most 3. Big news stays: the oldest ordinary toast goes first, and priority toasts sit
    // at the end of the stack, where a phone (which shows only the last two) still shows them.
    let list = [...get().toasts, { ...t, id }];
    while (list.length > 3) {
      const drop = list.findIndex((x) => !x.priority);
      list.splice(drop >= 0 ? drop : 0, 1);
    }
    list = [...list.filter((x) => !x.priority), ...list.filter((x) => x.priority)];
    set({ toasts: list });
    setTimeout(() => set({ toasts: get().toasts.map((x) => (x.id === id ? { ...x, leaving: true } : x)) }), 3200);
    setTimeout(() => get().dropToast(id), 3460);
  },
  dropToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));
