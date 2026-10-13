import { useEffect, useRef, useState } from 'react';
import { snapshotStore } from '../../app/uiSnapshot';
import { useUi } from '../store';

/**
 * Builds a panel's read-out when it opens, then rebuilds it with the snapshot (which publishes
 * right after every command) at most once per `minMs`, so a purchase shows at once.
 * 1.4.0: it always calls the latest `build`, and rebuilds at once when `deps` change (the panel's own
 * choices, like which planet the Terraform panel shows). It kept the first one: switching planets
 * there showed the first planet while clicks painted the one picked.
 */
export function useReport<T>(panel: string, build: () => T, minMs = 200, deps: readonly unknown[] = []): T | null {
  const open = useUi((s) => s.panel === panel);
  const [value, setValue] = useState<T | null>(null);
  const latest = useRef(build);
  latest.current = build;
  useEffect(() => {
    if (!open) return;
    let last = performance.now();
    setValue(latest.current());
    return snapshotStore.subscribe(() => {
      const now = performance.now();
      if (now - last < minMs) return;
      last = now;
      setValue(latest.current());
    });
  }, [open, minMs, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return value;
}
