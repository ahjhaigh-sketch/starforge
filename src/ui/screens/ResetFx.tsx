import { useEffect, useState } from 'react';
import { snapshotStore } from '../../app/uiSnapshot';
import { events } from '../../engine/events';

/**
 * The reset cinematic's screen layer: a full-screen flash in the layer's colour, a shockwave ring
 * and a shake (the renderer adds the particles and the star's collapse). Reduced motion drops the
 * shake and the ring; reduce flashing softens the flash.
 */
export function ResetFx() {
  const [key, setKey] = useState(0);
  useEffect(
    () =>
      events.on((e) => {
        if (e.t !== 'reset') return;
        setKey((k) => k + 1);
        const s = snapshotStore.getState();
        if (s.reducedMotion) return;
        const app = document.querySelector('.app');
        app?.classList.remove('shake');
        void (app as HTMLElement | null)?.offsetWidth;
        app?.classList.add('shake');
      }),
    [],
  );
  if (key === 0) return null;
  const soft = snapshotStore.getState().reduceFlashing;
  return (
    <div key={key} className={`reset-fx ${soft ? 'soft' : ''}`} aria-hidden="true">
      <div className="reset-flash" />
      <div className="reset-ring" />
    </div>
  );
}
