import { type CSSProperties, useEffect, useState } from 'react';
import { snapshotStore } from '../../app/uiSnapshot';
import { events } from '../../engine/events';
import { isEchoLayer, layer } from '../../engine/layers';

/** The Multiverse: twelve rainbow shards from the star outwards (positions are fixed, never random). */
const SHARDS = Array.from({ length: 12 }, (_, i) => {
  const a0 = (i / 12) * Math.PI * 2;
  const a1 = ((i + 1) / 12) * Math.PI * 2;
  const mid = (a0 + a1) / 2;
  const at = (a: number) => `${(50 + Math.cos(a) * 150).toFixed(1)}% ${(45 + Math.sin(a) * 150).toFixed(1)}%`;
  return {
    clipPath: `polygon(50% 45%, ${at(a0)}, ${at(a1)})`,
    '--h': String(i * 30),
    '--dx': (Math.cos(mid) * 60).toFixed(1),
    '--dy': (Math.sin(mid) * 60).toFixed(1),
    '--rot': `${(i % 2 ? 1 : -1) * (10 + (i % 3) * 6)}deg`,
  } as CSSProperties;
});

/**
 * The reset cinematic's screen layer: a full-screen flash in the layer's colour, a shockwave ring
 * and a shake (the renderer adds the particles and the star's collapse). The Big Crunch first
 * pulls everything into a point, then flashes white and rings outwards. Reduced motion drops the
 * shake, the ring and the implosion (the Crunch just fades to dark and back); reduce flashing
 * softens the flash. The Multiverse cracks the sky into rainbow glass that shatters outwards (with
 * reduced motion the glass only glows and fades).
 */
export function ResetFx() {
  const [fx, setFx] = useState({ key: 0, layer: '' });
  useEffect(
    () =>
      events.on((e) => {
        // automated resets (several a second late in the game) stay quiet
        // 1.2.0: or when you switched the animations off (the reset itself still happens)
        if (e.t !== 'reset' || e.auto || isEchoLayer(e.layer) || !snapshotStore.getState().resetFx) return;
        setFx((f) => ({ key: f.key + 1, layer: e.layer }));
        const s = snapshotStore.getState();
        if (s.reducedMotion) return;
        const app = document.querySelector('.app');
        app?.classList.remove('shake');
        void (app as HTMLElement | null)?.offsetWidth;
        app?.classList.add('shake');
      }),
    [],
  );
  if (fx.key === 0) return null;
  const soft = snapshotStore.getState().reduceFlashing;
  const crunch = fx.layer === 'crunch';
  const multiverse = fx.layer === 'multiverse';
  return (
    <div key={fx.key} className={`reset-fx ${soft ? 'soft' : ''} ${crunch ? 'crunch' : ''} ${multiverse ? 'multiverse' : ''}`} style={{ '--fx': layer(fx.layer)?.color ?? '#FF4FC1' } as CSSProperties} aria-hidden="true">
      {crunch && <div className="crunch-implode" />}
      {multiverse && (
        <div className="mv-shatter">
          {SHARDS.map((style, i) => (
            <span key={i} style={style} />
          ))}
        </div>
      )}
      <div className="reset-flash" />
      <div className="reset-ring" />
    </div>
  );
}
