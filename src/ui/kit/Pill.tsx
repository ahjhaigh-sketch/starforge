import type { Snapshot } from '../../app/uiSnapshot';
import { tint } from './Chunk';
import { Icon } from './Icon';
import { LiveText } from './Num';

/** A currency pill: icon overflowing the left edge, live value, optional per-second rate. */
export function CurrencyPill({
  icon,
  color = 'var(--panel)',
  value,
  rate,
  label,
  locked,
}: {
  icon: string;
  color?: string;
  value: (s: Snapshot) => string;
  rate?: (s: Snapshot) => string;
  label: string;
  locked?: boolean;
}) {
  return (
    <div className={`pill chunk ${locked ? 'locked' : ''}`} style={tint(color)} title={label} aria-label={label}>
      <span className="ico">
        <Icon name={icon} />
      </span>
      <LiveText pick={value} className="val ol" />
      {rate && <LiveText pick={rate} className="rate" punchOnChange={false} />}
    </div>
  );
}
