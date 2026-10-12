import { type CSSProperties, useEffect, useState } from 'react';
import { commands } from '../../app/commands';
import { photoCard, type WardrobeChoice, wardrobeReport } from '../../app/cosmeticsReports';
import { BACKGROUND_BY_ID } from '../../content/cosmetics';
import { takePhoto } from '../../render/photo';
import { Button, cx } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { useReport } from '../kit/useReport';
import { useUi } from '../store';

/** Phase 20.1: the Wardrobe (star skins, cursor trails, backgrounds) and Photo Mode. */

const PINK = '#B23A8E';

type Kind = 'skin' | 'trail' | 'background' | 'burst' | 'theme';

function Preview({ kind, colors }: { kind: Kind; colors: string[] }) {
  if (kind === 'burst') {
    // six sparks flying out from the middle
    return (
      <span className="wd-burst">
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          const c = colors[i % colors.length] ?? '#fff';
          return <i key={i} style={{ background: c, color: c, transform: `translate(${(Math.cos(a) * 1.05).toFixed(2)}rem, ${(Math.sin(a) * 1.05).toFixed(2)}rem)` }} />;
        })}
      </span>
    );
  }
  if (kind === 'theme') {
    return (
      <span className="wd-theme">
        <i style={{ background: colors[0] }} />
        <i style={{ background: colors[1] }} />
      </span>
    );
  }
  if (kind === 'skin') {
    const [hot, body, corona] = colors;
    return <span className="wd-star" style={{ '--hot': hot, '--body': body, '--corona': corona } as CSSProperties} />;
  }
  if (kind === 'trail') {
    return (
      <span className="wd-trail">
        {(colors.length ? colors : ['transparent']).slice(0, 5).map((c, i) => (
          <i key={i} style={{ background: c, opacity: colors.length ? 1 - i * 0.15 : 0 }} />
        ))}
      </span>
    );
  }
  const [swatch, ...clouds] = colors;
  return (
    <span className="wd-bg" style={{ background: swatch }}>
      {clouds.map((c, i) => (
        <i key={i} style={{ background: c }} />
      ))}
    </span>
  );
}

function Choices({ kind, items, title }: { kind: Kind; items: WardrobeChoice[]; title: string }) {
  return (
    <>
      <h4 className="section-h">{title}</h4>
      <div className="wd-grid">
        {items.map((c) => (
          <button
            key={c.id}
            type="button"
            className={cx('wd-card chunk pop', c.worn && 'worn', !c.unlocked && 'locked')}
            disabled={!c.unlocked}
            aria-pressed={c.worn}
            title={c.desc || undefined}
            onClick={() => commands.setCosmetic(kind, c.id)}
            data-cosmetic={`${kind}.${c.id}`}
          >
            <Preview kind={kind} colors={c.colors} />
            <b>{c.name}</b>
            {c.unlocked ? <small>{c.worn ? 'Wearing' : c.desc ? c.desc : 'Unlocked'}</small> : (
              <small className="wd-req">
                <Icon name="lock" /> {c.req}
              </small>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

function PhotoMode({ panel }: { panel: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panelOpen = useUi((s) => s.panel === panel);
  // a photo belongs to the moment it was taken: let it go when the panel closes
  useEffect(() => {
    if (!panelOpen && url) {
      URL.revokeObjectURL(url);
      setUrl(null);
    }
  }, [panelOpen, url]);
  const take = async () => {
    setBusy(true);
    const bg = BACKGROUND_BY_ID.get(wardrobeReport().backgrounds.find((b) => b.worn)?.id ?? 'violet')?.swatch ?? '#140A3A';
    const blob = await takePhoto(photoCard(), bg);
    setBusy(false);
    if (!blob) return;
    if (url) URL.revokeObjectURL(url);
    setUrl(URL.createObjectURL(blob));
    commands.poke('photo');
  };
  return (
    <>
      <h4 className="section-h">Photo Mode</h4>
      <div className="wd-photo well">
        <p>Your star, framed, with your best numbers underneath: a 1200 x 1200 picture to share.</p>
        <div className="set-row center-row">
          <Button size="sm" color={PINK} onClick={() => void take()} disabled={busy} data-testid="take-photo">
            {busy ? 'Developing…' : url ? 'Take another' : 'Take a photo'}
          </Button>
          {url && (
            <a className="btn chunk pop sm" style={{ ['--c' as string]: 'var(--lime)' }} href={url} download="starforge-photo.png" data-testid="save-photo">
              Save the picture
            </a>
          )}
        </div>
        {url && <img className="wd-shot" src={url} alt="Your star, with your best numbers" data-testid="photo" />}
      </div>
    </>
  );
}

/** The Wardrobe's contents, for its own panel and for the Medals menu's Wardrobe tab. */
export function WardrobeBody({ panel }: { panel: string }) {
  const r = useReport(panel, wardrobeReport, 400);
  const data = r ?? wardrobeReport();
  if (!data.open)
    return (
      <p className="depth-locked">
        <Icon name="lock" /> The Wardrobe opens at {data.req}.
      </p>
    );
  return (
    <>
      <p className="mv-note">How your star, sky and menus look, earned with medals and milestones. Nothing here changes a number.</p>
      <p className="wd-count">{data.unlocked}</p>
      <Choices kind="skin" items={data.skins} title="Star skins" />
      <Choices kind="trail" items={data.trails} title="Cursor trails" />
      <Choices kind="burst" items={data.bursts} title="Tap sparks" />
      <Choices kind="background" items={data.backgrounds} title="Backgrounds" />
      <Choices kind="theme" items={data.themes} title="Menu colour" />
      <PhotoMode panel={panel} />
    </>
  );
}

export function WardrobePanel() {
  return (
    <Panel id="wardrobe" title="Wardrobe" color={PINK} size="wide">
      <WardrobeBody panel="wardrobe" />
    </Panel>
  );
}
