import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { commands } from '../../app/commands';
import { useSnap } from '../../app/uiSnapshot';
import { BALANCE } from '../../content/balance';
import { burstAt } from '../../render/stage';

interface Pop {
  id: number;
  x: number;
  y: number;
  title: string;
  body: string;
}

/** A path across the sky that is the same for a given comet (keyed by when it leaves). */
function path(key: number): CSSProperties {
  const r = (n: number) => {
    const v = Math.sin(key * 12.9898 + n * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const leftToRight = r(1) < 0.5;
  const y0 = 8 + r(2) * 45;
  const y1 = y0 + 10 + r(3) * 30;
  const rot = leftToRight ? 20 : 160;
  return {
    ['--x0' as string]: leftToRight ? '-8vw' : '104vw',
    ['--x1' as string]: leftToRight ? '104vw' : '-8vw',
    ['--y0' as string]: `${y0}vh`,
    ['--y1' as string]: `${y1}vh`,
    ['--rot' as string]: `${rot}deg`,
    animationDuration: `${BALANCE.comets.flight}s`,
  } as CSSProperties;
}

/** The golden-cookie of Starforge: catch the comet for a buff. Keyboard: C. */
export function CometLayer() {
  const key = useSnap((s) => s.cometKey);
  const reduced = useSnap((s) => s.reducedMotion);
  const btn = useRef<HTMLButtonElement>(null);
  const [pops, setPops] = useState<Pop[]>([]);

  const catchIt = () => {
    const el = btn.current;
    const box = el?.getBoundingClientRect();
    const r = commands.catchComet();
    if (!r || !box) return;
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    burstAt(x, y, 24, 0x2ee6ff);
    const id = performance.now();
    setPops((p) => [...p.slice(-2), { id, x, y, ...r }]);
    setTimeout(() => setPops((p) => p.filter((q) => q.id !== id)), 2200);
  };

  useEffect(() => {
    const onCatch = () => catchIt();
    window.addEventListener('starforge:catch', onCatch);
    return () => window.removeEventListener('starforge:catch', onCatch);
  });

  return (
    <>
      {key > 0 && (
        <button
          key={key}
          ref={btn}
          type="button"
          className={`comet ${reduced ? 'still' : ''}`}
          style={reduced ? undefined : path(key)}
          onClick={catchIt}
          aria-label="Catch the comet"
          data-testid="comet"
        >
          <span className="comet-tail" />
          <span className="comet-head" />
        </button>
      )}
      {pops.map((p) => (
        <div key={p.id} className="comet-pop" style={{ left: p.x, top: p.y }} aria-live="polite">
          <b>{p.title}</b>
          <span>{p.body}</span>
        </div>
      ))}
    </>
  );
}
