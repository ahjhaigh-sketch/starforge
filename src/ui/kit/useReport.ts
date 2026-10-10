import { useEffect, useState } from 'react';
import { snapshotStore } from '../../app/uiSnapshot';
import { useUi } from '../store';

/**
 * Builds a panel's read-out when it opens, then rebuilds it with the snapshot (which publishes
 * right after every command) at most once per `minMs`, so a purchase shows at once.
 */
export function useReport<T>(panel: string, build: () => T, minMs = 200): T | null {
  const open = useUi((s) => s.panel === panel);
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    if (!open) return;
    let last = performance.now();
    setValue(build());
    return snapshotStore.subscribe(() => {
      const now = performance.now();
      if (now - last < minMs) return;
      last = now;
      setValue(build());
    });
    // build is a stable module function
  }, [open, minMs]); // eslint-disable-line react-hooks/exhaustive-deps
  return value;
}
