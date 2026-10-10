import { memo, type MouseEvent } from 'react';
import { commands } from '../../app/commands';
import { type RailItem, useSnap } from '../../app/uiSnapshot';
import { cx, tint } from '../kit/Chunk';
import { showTip, tipProps } from '../kit/FloatTip';
import { Icon } from '../kit/Icon';
import { useUi } from '../store';

/** How many "???" silhouettes to show after the systems with visible requirements. */
const SILHOUETTES = { left: 2, right: 3 } as const;

function ProgressRing({ pct }: { pct: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r={r} className="ring-bg" />
      <circle cx="18" cy="18" r={r} className="ring-fg" strokeDasharray={`${(c * pct) / 100} ${c}`} transform="rotate(-90 18 18)" />
    </svg>
  );
}

function tipBody(item: RailItem) {
  if (item.state === 'hidden') return <span>Keep growing your star to find out.</span>;
  return (
    <>
      <span>{item.blurb}</span>
      {item.state === 'locked' && (
        <span className="tip-line">
          {item.req} · {item.pct}%
        </span>
      )}
      {item.state === 'soon' && <span className="tip-line">{item.req}</span>}
    </>
  );
}

export const RailButton = memo(function RailButton({ item, side, small }: { item: RailItem; side: 'left' | 'right' | 'above'; small?: boolean }) {
  const open = useUi((s) => s.open);
  const hidden = item.state === 'hidden';
  const title = hidden ? '???' : item.name;
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (item.state === 'open' || item.state === 'new') {
      commands.markSeen(item.id);
      open(item.id);
    } else showTip(`rail-${item.id}`, e.currentTarget, side, title, tipBody(item));
  };
  const label =
    item.state === 'locked'
      ? `${item.name}, locked. ${item.req}, ${item.pct}% there.`
      : item.state === 'soon'
        ? `${item.name}. ${item.req}.`
        : hidden
          ? 'A system you have not found yet'
          : `Open ${item.name}`;
  return (
    <button
      type="button"
      className={cx('rail-btn chunk gloss pop', item.state, small && 'small')}
      style={tint(hidden ? '#2B2558' : item.state === 'locked' ? '#3A3466' : item.color)}
      onClick={onClick}
      aria-label={label}
      data-rail={item.id}
      {...tipProps(`rail-${item.id}`, side, title, tipBody(item))}
    >
      <Icon name={hidden ? 'mystery' : item.icon} className="rail-ico" />
      <span className="lbl">{hidden ? '???' : item.name}</span>
      {item.state === 'locked' && (
        <span className="lock-badge">
          <ProgressRing pct={item.pct} />
          <Icon name="lock" />
        </span>
      )}
      {item.state === 'soon' && <span className="badge soon">Soon</span>}
      {item.state === 'new' && <span className="badge new">New</span>}
    </button>
  );
});

/** Keeps every system with a visible state, then only the first few silhouettes. */
export function visibleItems(items: RailItem[], rail: 'left' | 'right'): RailItem[] {
  let hidden = 0;
  return items.filter((x) => x.state !== 'hidden' || hidden++ < SILHOUETTES[rail]);
}

/** Left edge: this stage's systems, then Settings pinned at the bottom. On phones: a bottom tab bar. */
export function LeftRail() {
  const left = useSnap((s) => s.railLeft);
  const right = useSnap((s) => s.railRight);
  const open = useUi((s) => s.open);
  return (
    <nav className="rail" aria-label="Systems">
      {visibleItems(left, 'left').map((x) => (
        <RailButton key={x.id} item={x} side="right" />
      ))}
      {visibleItems(right, 'right').map((x) => (
        <span key={x.id} className="phone-only">
          <RailButton item={x} side="above" />
        </span>
      ))}
      <button type="button" className="rail-btn chunk gloss pop open settings-btn" style={tint('#4A4F7A')} onClick={() => open('settings')} aria-label="Open settings and saves">
        <Icon name="gear" className="rail-ico" />
        <span className="lbl">Saves</span>
      </button>
    </nav>
  );
}

/** Under the shop: upcoming shops and layers, so there is always something in reach. */
export function TeaserStack() {
  const right = useSnap((s) => s.railRight);
  return (
    <div className="teasers" aria-label="Coming up">
      <div className="teasers-head ol-sm">Coming up</div>
      <div className="teasers-grid">
        {visibleItems(right, 'right').map((x) => (
          <RailButton key={x.id} item={x} side="left" small />
        ))}
      </div>
    </div>
  );
}
