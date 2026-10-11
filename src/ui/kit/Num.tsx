import { useEffect, useRef } from 'react';
import { snapshotStore, type Snapshot } from '../../app/uiSnapshot';

const PUNCH: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: 0.45 }, { transform: 'scale(1)' }];
const PUNCH_TIMING: KeyframeAnimationOptions = { duration: 180, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' };
const reduceMotion = () => document.documentElement.classList.contains('reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Plays the punch, at most 10 times a second per element. A Web Animation of the transform only:
 * toggling a CSS class needed a forced layout per number, and late in the game every number on
 * screen changes ten times a second (found by the speed budgets on a slow phone).
 */
function punch(el: HTMLElement, last: { current: number }): void {
  const now = performance.now();
  if (now - last.current < 100 || reduceMotion()) return;
  last.current = now;
  el.animate(PUNCH, PUNCH_TIMING);
}

/** A number already formatted by the snapshot; punches when it changes. */
export function Num({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value && ref.current) punch(ref.current, last);
    prev.current = value;
  }, [value]);
  return (
    <span ref={ref} className={className ? `num ${className}` : 'num'} style={{ display: 'inline-block' }}>
      {value}
    </span>
  );
}

/**
 * For the hottest counters: writes textContent straight from the snapshot store,
 * so React never re-renders for them.
 */
export function LiveText({ pick, className, punchOnChange = true }: { pick: (s: Snapshot) => string; className?: string; punchOnChange?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(0);
  useEffect(() => {
    const write = (s: Snapshot) => {
      const el = ref.current;
      if (!el) return;
      const t = pick(s);
      if (el.textContent !== t) {
        const had = el.textContent !== '';
        el.textContent = t;
        if (had && punchOnChange) punch(el, last);
      }
    };
    write(snapshotStore.getState());
    return snapshotStore.subscribe(write);
  }, [pick, punchOnChange]);
  return <span ref={ref} className={className ? `num ${className}` : 'num'} style={{ display: 'inline-block' }} />;
}
