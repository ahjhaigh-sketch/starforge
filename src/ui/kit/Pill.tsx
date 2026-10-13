import type { MouseEvent } from 'react';
import type { Snapshot } from '../../app/uiSnapshot';
import { tint } from './Chunk';
import { CurrencyTip } from './CurrencyTip';
import { showTip, tipProps } from './FloatTip';
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
  currency,
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
  /** 1.3.0: the currency's id: hover (or tap) shows its safe tenth and what's spending it. */
  currency?: string;
}) {
  const tip = currency ? <CurrencyTip id={currency} /> : null;
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    onPoke?.();
    if (currency) showTip(`pill-${currency}`, e.currentTarget, 'below', label, tip);
  };
  return (
    <div
      className={`pill chunk ${locked ? 'locked' : ''} ${className ?? ''}`}
      style={tint(color)}
      title={currency ? undefined : label}
      aria-label={label}
      onClick={onClick}
      tabIndex={currency ? 0 : undefined}
      {...(currency ? tipProps(`pill-${currency}`, 'below', label, tip) : {})}
    >
      <span className="ico">
        <Icon name={icon} />
      </span>
      <LiveText pick={value} className="val ol" />
      {rate && <LiveText pick={rate} className="rate" punchOnChange={false} />}
    </div>
  );
}
