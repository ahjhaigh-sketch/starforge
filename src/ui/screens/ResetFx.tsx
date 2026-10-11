import { type CSSProperties, useEffect, useState } from 'react';
import { snapshotStore } from '../../app/uiSnapshot';
import { events } from '../../engine/events';
import { isEchoLayer, layer } from '../../engine/layers';

/**
 * The reset cinematic's screen layer: a full-screen flash in the layer's colour, a shockwave ring
 * and a shake (the renderer adds the particles and the star's collapse). The Big Crunch first
 * pulls everything into a point, then flashes white and rings outwards. Reduced motion drops the
 * shake, the ring and the implosion (the Crunch just fades to dark and back); reduce flashing
 * softens the flash.
 */
export function ResetFx() {
  const [fx, setFx] = useState({ key: 0, layer: '' });
  useEffect(
    () =>
      events.on((e) => {
        if (e.t !== 'reset' || isEchoLayer(e.layer)) return;
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
  return (
    <div key={fx.key} className={`reset-fx ${soft ? 'soft' : ''} ${crunch ? 'crunch' : ''}`} style={{ '--fx': layer(fx.layer)?.color ?? '#FF4FC1' } as CSSProperties} aria-hidden="true">
      {crunch && <div className="crunch-implode" />}
      <div className="reset-flash" />
      <div className="reset-ring" />
    </div>
  );
}
