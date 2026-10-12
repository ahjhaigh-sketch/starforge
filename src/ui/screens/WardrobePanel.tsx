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

function Preview({ kind, colors }: { kind: 'skin' | 'trail' | 'background'; colors: string[] }) {
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

function Choices({ kind, items, title }: { kind: 'skin' | 'trail' | 'background'; items: WardrobeChoice[]; title: string }) {
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

function PhotoMode() {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panelOpen = useUi((s) => s.panel === 'wardrobe');
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

export function WardrobePanel() {
  const r = useReport('wardrobe', wardrobeReport, 400);
  const data = r ?? wardrobeReport();
  return (
    <Panel id="wardrobe" title="Wardrobe" color={PINK} size="wide">
      {!data.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> The Wardrobe opens at {data.req}.
        </p>
      ) : (
        <>
          <p className="mv-note">How your star and sky look, earned with medals and milestones. Nothing here changes a number.</p>
          <Choices kind="skin" items={data.skins} title="Star skins" />
          <Choices kind="trail" items={data.trails} title="Cursor trails" />
          <Choices kind="background" items={data.backgrounds} title="Backgrounds" />
          <PhotoMode />
        </>
      )}
    </Panel>
  );
}
