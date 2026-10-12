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
  className,
  onPoke,
}: {
  icon: string;
  color?: string;
  value: (s: Snapshot) => string;
  rate?: (s: Snapshot) => string;
  label: string;
  locked?: boolean;
  /** e.g. the rainbow rim of the Sparks pill. */
  className?: string;
  /** 1.2.0: a click does something small (a secret medal counts pokes). */
  onPoke?: () => void;
}) {
  return (
    <div className={`pill chunk ${locked ? 'locked' : ''} ${className ?? ''}`} style={tint(color)} title={label} aria-label={label} onClick={onPoke}>
      <span className="ico">
        <Icon name={icon} />
      </span>
      <LiveText pick={value} className="val ol" />
      {rate && <LiveText pick={rate} className="rate" punchOnChange={false} />}
    </div>
  );
}
