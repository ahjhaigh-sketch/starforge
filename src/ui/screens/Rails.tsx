import { memo, type MouseEvent, useEffect, useRef, useState } from 'react';
import { commands } from '../../app/commands';
import { type RailItem, snapshotStore, useSnap } from '../../app/uiSnapshot';
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
  // the moment a system unlocks, its padlock breaks off (then the button glows and pulses until opened)
  const was = useRef(item.state);
  const [breaking, setBreaking] = useState(false);
  useEffect(() => {
    if (was.current === 'locked' && item.state !== 'locked' && item.state !== 'hidden' && !snapshotStore.getState().reducedMotion) setBreaking(true);
    was.current = item.state;
  }, [item.state]);
  const hidden = item.state === 'hidden';
  const title = hidden ? '???' : item.name;
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (item.state === 'open' || item.state === 'new') {
      commands.markSeen(item.id);
      if (item.id === 'ascent') commands.poke('ascent');
      open(item.id);
    } else {
      if (hidden) commands.poke('mystery');
      showTip(`rail-${item.id}`, e.currentTarget, side, title, tipBody(item));
    }
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
      {item.state === 'new' && <span className="new-glow" aria-hidden="true" />}
      <Icon name={hidden ? 'mystery' : item.icon} className="rail-ico" />
      <span className="lbl">{hidden ? '???' : item.name}</span>
      {item.state === 'locked' && (
        <span className="lock-badge">
          <ProgressRing pct={item.pct} />
          <Icon name="lock" />
        </span>
      )}
      {breaking && (
        <span className="lock-break" aria-hidden="true" onAnimationEnd={() => setBreaking(false)}>
          <Icon name="lock" />
        </span>
      )}
      {item.state === 'soon' && <span className="badge soon">Soon</span>}
      {item.state === 'new' && <span className="badge new">New</span>}
      {item.alert && item.state !== 'new' && (
        <span className="alert-badge" aria-label="Something to buy or claim">
          !
        </span>
      )}
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
      <button type="button" className="rail-btn chunk gloss pop open settings-btn" style={tint('#4A4F7A')} onClick={() => {
          commands.poke('gear');
          open('settings');
        }} aria-label="Open settings and saves">
        <Icon name="gear" className="rail-ico" />
        <span className="lbl">Saves</span>
      </button>
    </nav>
  );
}

/**
 * 1.2.0: the big things, large at the top of the side: a system you just unlocked (until you open
 * it), and the next one or two you are closest to, with how far along you are.
 */
export function FocusCards() {
  const cards = useSnap((s) => s.focus);
  const open = useUi((s) => s.open);
  if (cards.length === 0) return null;
  return (
    <div className="focus-cards" aria-label="In focus">
      {cards.map((c) => (
        <button
          key={c.id}
          type="button"
          className={cx('focus-card chunk gloss pop', c.kind === 'tip' ? 'recommended' : c.kind)}
          style={tint(c.kind === 'next' ? '#2B2558' : c.color)}
          onClick={() => {
            if (c.kind === 'tip' && c.panel) return open(c.panel);
            if (c.kind !== 'new') return;
            commands.markSeen(c.id);
            open(c.id);
          }}
          aria-label={c.kind === 'new' ? `Just unlocked: ${c.name}. Open it.` : c.kind === 'tip' ? `Recommended: ${c.name}. ${c.blurb}` : `Next: ${c.name}. ${c.req}, ${c.pct}% there.`}
          data-focus-card={c.id}
        >
          {c.kind === 'new' && <span className="focus-glow" aria-hidden="true" />}
          <span className="focus-ico">
            <Icon name={c.icon} />
          </span>
          <span className="focus-text">
            <small className="focus-kind ol-sm">{c.kind === 'new' ? 'Just unlocked' : c.kind === 'tip' ? 'Recommended' : 'Next up'}</small>
            <b className="ol">{c.name}</b>
            <span className="focus-blurb">{c.blurb}</span>
            {c.kind === 'new' ? (
              <span className="focus-go ol-sm">Open it</span>
            ) : c.kind === 'tip' ? (
              <span className="focus-go ol-sm">Show me</span>
            ) : (
              <span className="focus-req">
                <span className="focus-bar">
                  <i style={{ width: `${c.pct}%`, background: c.color }} />
                </span>
                <small>
                  {c.req} · <span className="num">{c.pct}%</span>
                </small>
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

const SECTION_NAMES: Readonly<Record<string, string>> = {
  stardust: 'Start',
  supernova: 'Supernova',
  nebula: 'Nebula',
  singularity: 'Singularity',
  galactic: 'Galactic',
  crunch: 'Big Crunch',
  multiverse: 'Multiverse',
  hyperverse: 'Hyperverse',
  omniverse: 'Omniverse',
  genesis: 'Genesis',
  apotheosis: 'Apotheosis',
};
const SECTION_ORDER = Object.keys(SECTION_NAMES);

export interface RailSection {
  id: string;
  name: string;
  /** The first layer you haven't reached: titled "Coming up", with its "???" silhouettes. */
  coming: boolean;
  open: number;
  total: number;
  items: RailItem[];
}

/**
 * 1.4.0: the side's systems, layer by layer (the playtest: "organizing them into different sections, layer by
 * layer ... and it'll display the title name above it"). Every layer you've reached shows its systems under its
 * name; the next one is "Coming up", silhouettes and all; anything further stays out of sight. A layer whose
 * systems all run themselves has tucked them away, so it drops out of the list.
 */
export function railSections(items: readonly RailItem[]): RailSection[] {
  const out: RailSection[] = [];
  let coming = false;
  for (const id of SECTION_ORDER) {
    const list = items.filter((x) => x.section === id);
    if (list.length === 0) continue;
    const open = list.filter((x) => x.state === 'open' || x.state === 'new' || x.state === 'soon').length;
    // every layer you've reached shows; of those you haven't, only the first (a layer can open before an earlier
    // one has anything to show, when everything in that one runs itself or was hidden)
    if (open > 0) out.push({ id, name: SECTION_NAMES[id]!, coming: false, open, total: list.length, items: list.filter((x) => x.state !== 'hidden') });
    else if (!coming) {
      coming = true;
      out.push({ id, name: SECTION_NAMES[id]!, coming: true, open: 0, total: list.length, items: list });
    }
  }
  // "Coming up" goes last, after every layer you have
  return [...out.filter((x) => !x.coming), ...out.filter((x) => x.coming)];
}

/** Under the shop: every layer's systems in sections, then what's coming up. */
export function TeaserStack() {
  const right = useSnap((s) => s.railRight);
  const sections = railSections(right);
  return (
    <div className="teasers" aria-label="Systems by layer">
      <div className="teasers-scroll">
        {sections.map((sec) => (
          <section key={sec.id} className={cx('teaser-section', sec.coming && 'coming')} data-section={sec.id} aria-label={sec.coming ? `Coming up: ${sec.name}` : sec.name}>
            <div className="teasers-head ol-sm">
              <span>{sec.coming ? 'Coming up' : sec.name}</span>
              <small>{sec.coming ? sec.name : <span className="num">{`${sec.open} / ${sec.total}`}</span>}</small>
            </div>
            <div className="teasers-grid">
              {sec.items.map((x) => (
                <RailButton key={x.id} item={x} side="left" small />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
