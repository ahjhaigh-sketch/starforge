import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useUi } from '../store';
import { Icon } from './Icon';
import { tint } from './Chunk';

/**
 * A modal panel. Only one is ever open (opening one closes the other), it pops in from 0.6
 * scale with a back-out ease, and the scrim behind it blurs the game.
 */
export function Panel({
  id,
  title,
  color = 'var(--magenta)',
  size,
  children,
}: {
  id: string;
  title: string;
  color?: string;
  size?: 'small' | 'wide';
  children: ReactNode;
}) {
  const open = useUi((s) => s.panel === id);
  const close = useUi((s) => s.close);
  // keep content mounted briefly after closing so the pop-out animation isn't empty
  const [mounted, setMounted] = useState(open);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const t = setTimeout(() => closeBtn.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div
      className={`modal chunk ${size ?? ''} ${open ? 'open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-labelledby={`panel-title-${id}`}
      data-panel={id}
    >
      <div className="ribbon chunk gloss" id={`panel-title-${id}`} style={tint(color)}>
        {title}
      </div>
      <button ref={closeBtn} type="button" className="x-btn chunk gloss pop" onClick={close} aria-label="Close" tabIndex={open ? 0 : -1}>
        <Icon name="x" />
      </button>
      <div className="modal-body">{mounted ? children : null}</div>
    </div>
  );
}

/** The blurred scrim; clicking it or pressing Esc closes the open panel. */
export function PanelHost() {
  const panel = useUi((s) => s.panel);
  const close = useUi((s) => s.close);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return <div className={`scrim ${panel ? 'open' : ''}`} onClick={close} aria-hidden="true" />;
}
