import type { ReactNode } from 'react';

/**
 * 1.3.0: a short numbered "how it works" strip at the top of a panel (the playtest found the Nursery,
 * Tarot, Wyrms, Spire, Reactor and shrine stars hard to read). Two to four steps, one line each.
 */
export function HowTo({ label, steps }: { label: string; steps: ReactNode[] }) {
  return (
    <ol className="how-to" aria-label={label}>
      {steps.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ol>
  );
}
