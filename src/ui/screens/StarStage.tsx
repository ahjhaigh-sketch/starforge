import { type CSSProperties, type KeyboardEvent, type PointerEvent, useEffect, useRef } from 'react';
import { commands } from '../../app/commands';
import { useSnap } from '../../app/uiSnapshot';
import { tapFx } from '../../render/stage';

const MAX_FLOATERS = 30;

/**
 * The Star Core's stage. The star itself is drawn by PixiJS at this element's centre
 * (data-star-anchor); this layer holds the tap target, floating "+N" numbers and the caption.
 */
export function StarStage() {
  const tierName = useSnap((s) => s.tierName);
  const tapLabel = useSnap((s) => s.tapLabel);
  const starSize = useSnap((s) => s.starSize);
  const combo = useSnap((s) => s.combo);
  const comboMult = useSnap((s) => s.comboMult);
  const floaters = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const tapAt = (clientX: number | null, clientY: number | null) => {
    const r = commands.tap();
    const box = wrap.current?.getBoundingClientRect();
    if (!r || !box) return;
    const x = clientX ?? box.left + box.width / 2;
    const y = clientY ?? box.top + box.height / 2;
    tapFx(x, y, r.crit);
    const layer = floaters.current;
    if (!layer) return;
    const f = document.createElement('div');
    f.className = r.crit ? 'float-num crit' : 'float-num';
    f.textContent = r.crit ? `${r.text}!` : r.text;
    f.style.left = `${x - box.left + (Math.random() * 30 - 15)}px`;
    f.style.top = `${y - box.top}px`;
    f.addEventListener('animationend', () => f.remove());
    layer.appendChild(f);
    while (layer.children.length > MAX_FLOATERS) layer.firstElementChild?.remove();
  };

  // the T hotkey taps the star
  useEffect(() => {
    const onTap = () => tapAt(null, null);
    window.addEventListener('starforge:tap', onTap);
    return () => window.removeEventListener('starforge:tap', onTap);
  });

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    tapAt(e.clientX, e.clientY);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      tapAt(null, null);
    }
  };

  const hit = `${starSize * 2 * 100 * 1.12}%`;
  return (
    <div className="star-wrap" ref={wrap} data-star-anchor style={{ ['--hit' as string]: hit } as CSSProperties}>
      <div className="star-fallback" aria-hidden="true" />
      <button type="button" className="star-btn" aria-label={`Tap the ${tierName} to gather Stardust`} onPointerDown={onPointerDown} onKeyDown={onKeyDown} />
      <div className="floaters" ref={floaters} aria-hidden="true" />
      <div className="star-caption">
        <div className="name">{tierName}</div>
        <div className="sub">{tapLabel}</div>
        <div className={`combo ${combo > 0 ? 'on' : ''}`} aria-hidden={combo === 0}>
          <span className="combo-bar">
            <i style={{ width: `${Math.min(100, (combo / 50) * 100)}%` }} />
          </span>
          <span className="combo-lbl">{comboMult ? `Combo ${comboMult}` : `Combo ${combo}`}</span>
        </div>
      </div>
    </div>
  );
}
