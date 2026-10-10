import { commands } from '../../app/commands';
import { useSnap } from '../../app/uiSnapshot';
import type { BuyAmount } from '../../engine/state';

const OPTIONS: Array<{ v: BuyAmount; label: string }> = [
  { v: 1, label: 'x1' },
  { v: 10, label: 'x10' },
  { v: 100, label: 'x100' },
  { v: 1000, label: 'x1K' },
  { v: 'max', label: 'Max' },
  { v: 'next', label: 'Next' },
  { v: 'custom', label: '#' },
];

/** One control for every repeatable purchase: x1, x10, x100, x1,000, Max, up to the next x2, or a typed amount. */
export function BuyAmountControl({ compact }: { compact?: boolean }) {
  const amount = useSnap((s) => s.buyAmount);
  const custom = useSnap((s) => s.customBuyAmount);
  const opts = compact ? OPTIONS.filter((o) => o.v !== 100 && o.v !== 1000) : OPTIONS;
  return (
    <div className="buy-amount" role="group" aria-label="Buy amount">
      {opts.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          className="chunk pop"
          aria-pressed={amount === o.v}
          title={o.v === 'custom' ? 'Buy a typed amount' : o.v === 'next' ? 'Buy up to the next x2 milestone' : `Buy ${o.label}`}
          onClick={() => commands.setBuyAmount(o.v)}
        >
          {o.label}
        </button>
      ))}
      {amount === 'custom' && (
        <input
          type="number"
          min={1}
          inputMode="numeric"
          aria-label="Amount to buy"
          value={custom}
          onChange={(e) => commands.setCustomBuyAmount(Number(e.target.value))}
        />
      )}
    </div>
  );
}
