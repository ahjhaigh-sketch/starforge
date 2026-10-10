import { useEffect } from 'react';
import { events } from '../../engine/events';
import { snapshotStore } from '../../app/uiSnapshot';
import { useUi } from '../store';
import { Icon } from './Icon';

/** Top-centre toasts, at most 3 stacked. Listens to engine events. */
export function ToastHost() {
  const toasts = useUi((s) => s.toasts);
  const push = useUi((s) => s.pushToast);
  useEffect(
    () =>
      events.on((e) => {
        if (e.t === 'toast' && snapshotStore.getState().showToasts) push({ title: e.title, body: e.body, icon: e.icon ?? 'trophy', priority: e.priority });
        if (e.t === 'saveError') push({ title: 'Save skipped', body: e.message, icon: 'gear' });
      }),
    [push],
  );
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast chunk ${t.leaving ? 'out' : ''}`}>
          <span className="ico">
            <Icon name={t.icon} />
          </span>
          <b>{t.title}</b>
          <span>{t.body}</span>
        </div>
      ))}
    </div>
  );
}
