import type React from 'react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useUi } from '../store';
import { Icon } from './Icon';
import { tint } from './Chunk';
import { PANEL_ART, panelMark } from '../panelArtData';

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
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      setMounted(true);
      // focus moves into the panel, unless it's already somewhere inside it
      const t = setTimeout(() => {
        if (!root.current?.contains(document.activeElement)) closeBtn.current?.focus();
      }, 60);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(t);
  }, [open]);

  const art = PANEL_ART[id];
  const mark = panelMark(id);
  return (
    <div
      ref={root}
      className={`modal chunk ${size ?? ''} ${open ? 'open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-labelledby={`panel-title-${id}`}
      data-panel={id}
      style={art ? ({ ['--art-a' as string]: art[1], ['--art-b' as string]: art[2] } as React.CSSProperties) : undefined}
    >
      {/* the menu's own backdrop and a faint watermark of its symbol (1.2.0) */}
      <div className="panel-art" data-art={art?.[0]} aria-hidden="true">
        {mark && <Icon name={mark} className="panel-mark" />}
      </div>
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

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Tab and Shift+Tab cycle inside the open panel instead of wandering into the game behind it. */
function trapTab(e: KeyboardEvent, id: string): void {
  const root = document.querySelector<HTMLElement>(`[data-panel="${id}"]`);
  if (!root) return;
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute('disabled') && el.tabIndex >= 0 && el.offsetParent !== null);
  if (items.length === 0) return;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const active = document.activeElement;
  if (!root.contains(active)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

/** The blurred scrim; clicking it or pressing Esc closes the open panel. */
export function PanelHost() {
  const panel = useUi((s) => s.panel);
  const close = useUi((s) => s.close);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      const open = useUi.getState().panel;
      if (e.key === 'Tab' && open) trapTab(e, open);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  // focus goes back to whatever opened the panel (a rail button, a bar) once it closes
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (panel && !wasOpen.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!panel && wasOpen.current && opener.current?.isConnected && opener.current.offsetParent !== null) opener.current.focus();
    wasOpen.current = !!panel;
  }, [panel]);
  return <div className={`scrim ${panel ? 'open' : ''}`} onClick={close} aria-hidden="true" />;
}
