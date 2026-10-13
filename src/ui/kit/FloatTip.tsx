import { type FocusEvent, type PointerEvent, type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { create } from 'zustand';

/**
 * One tooltip for things inside scrolling lists (rails, shop rows), drawn fixed above everything
 * so it is never clipped. Hover or focus shows it; a tap toggles it on touch screens.
 */
interface TipState {
  key: string | null;
  rect: DOMRect | null;
  side: 'right' | 'left' | 'above' | 'below';
  title: string;
  body: ReactNode;
  show: (key: string, el: Element, side: TipState['side'], title: string, body: ReactNode) => void;
  hide: (key?: string) => void;
}

const useTip = create<TipState>((set, get) => ({
  key: null,
  rect: null,
  side: 'right',
  title: '',
  body: null,
  show: (key, el, side, title, body) => set({ key, rect: el.getBoundingClientRect(), side, title, body }),
  hide: (key) => {
    if (!key || get().key === key) set({ key: null, rect: null });
  },
}));

export function tipProps(key: string, side: TipState['side'], title: string, body: ReactNode) {
  const show = (e: PointerEvent | FocusEvent) => useTip.getState().show(key, e.currentTarget, side, title, body);
  const hide = () => useTip.getState().hide(key);
  return {
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') show(e);
    },
    onPointerLeave: hide,
    onFocus: show,
    onBlur: hide,
  };
}

/** For buttons whose click shows the tip (locked rail buttons on touch screens). */
export function showTip(key: string, el: Element, side: TipState['side'], title: string, body: ReactNode): void {
  useTip.getState().show(key, el, side, title, body);
}

export function FloatTipHost() {
  const { key, rect, side, title, body } = useTip();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!rect || !ref.current) return setPos(null);
    const w = ref.current.offsetWidth;
    const h = ref.current.offsetHeight;
    const gap = 12;
    let left = side === 'right' ? rect.right + gap : side === 'left' ? rect.left - w - gap : rect.left + rect.width / 2 - w / 2;
    let top = side === 'above' ? rect.top - h - gap : side === 'below' ? rect.bottom + gap : rect.top + rect.height / 2 - h / 2;
    left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
    top = Math.max(8, Math.min(window.innerHeight - h - 8, top));
    setPos({ left, top });
  }, [rect, side, key]);
  useLayoutEffect(() => {
    if (!key) return;
    const hide = () => useTip.getState().hide();
    // a touch anywhere else closes it (the next tap on a locked button re-opens it)
    const touch = (e: globalThis.PointerEvent) => {
      if (e.pointerType !== 'mouse') hide();
    };
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('pointerdown', touch, true);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('pointerdown', touch, true);
    };
  }, [key]);
  if (!key) return null;
  return (
    <div ref={ref} className="float-tip chunk" role="tooltip" style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}>
      {title && <b>{title}</b>}
      {body}
    </div>
  );
}
