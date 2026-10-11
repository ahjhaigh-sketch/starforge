import { useState } from 'react';
import { commands } from '../../app/commands';
import { spectralReport, tarotReport } from '../../app/nebulaExtrasReports';
import { CARD_BY_ID } from '../../content/nebulaExtras';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { useReport } from '../kit/useReport';

/** Phase 11 panels: Spectral Focus and Tarot of the Void. */

function Locked({ what, req }: { what: string; req: string }) {
  return (
    <p className="depth-locked">
      <Icon name="lock" /> {what} opens at {req}.
    </p>
  );
}

// ---------- Spectral Focus ----------

export function SpectralPanel() {
  const r = useReport('spectral', spectralReport, 200);
  const data = r ?? spectralReport();
  return (
    <Panel id="spectral" title="Spectral Focus" color="#B06BFF" size="wide">
      {!data.open ? (
        <Locked what="Spectral Focus" req={data.req} />
      ) : (
        <>
          <div className="well wyrm-head">
            <span>
              Focused colour builds <b className="num">{data.rate}</b> energy a second
            </span>
            <span>
              Others build <b className="num">{data.glow}</b> of that (Afterglow)
            </span>
          </div>
          <div className="spectrum" role="list" aria-label="The seven colours">
            {data.colors.map((c) => (
              <div key={c.id} role="listitem" className={cx('band', c.focused && 'focused', !c.open && 'locked')} style={tint(c.color)} data-color={c.id}>
                <span className="band-oom num" title="Orders of magnitude">
                  <small>10^</small>
                  {c.oom}
                </span>
                <span className="band-body">
                  <b>
                    {c.name} <span className="num">{c.open ? c.energy : ''}</span>
                  </b>
                  <span className="band-bar" aria-hidden="true">
                    <i style={{ width: `${Math.round(c.share * 100)}%` }} />
                  </span>
                  <small>{c.open ? `${c.bonus} · next at ${c.next}` : c.lock}</small>
                </span>
                {c.open && (
                  <Button size="sm" color={c.focused ? 'var(--lime)' : '#4C3BC4'} onClick={() => commands.setFocus(c.focused ? null : c.id)} aria-pressed={c.focused} data-focus={c.id}>
                    {c.focused ? 'Focused' : 'Focus'}
                  </Button>
                )}
              </div>
            ))}
          </div>
          <h4 className="section-h">Upgrades</h4>
          <BuyAmountControl compact />
          <div className="seed-row" data-spectral-up="lens">
            <span className="rune-name">
              <b>Prism Lens Lv {data.lens.level}</b>
              <small>Every colour builds energy twice as fast.</small>
            </span>
            <Button size="sm" color={data.lens.can ? 'var(--lime)' : '#5A5F8F'} disabled={!data.lens.can} onClick={() => commands.buySpectral('lens')}>
              +{data.lens.count} <span className="num">{data.lens.cost}</span>
            </Button>
          </div>
          <div className="seed-row" data-spectral-up="afterglow">
            <span className="rune-name">
              <b>
                Afterglow {data.afterglow.level}/{data.afterglow.max}
              </b>
              <small>Colours out of focus keep building at 5% a level.</small>
            </span>
            <Button size="sm" color={data.afterglow.can ? 'var(--lime)' : '#5A5F8F'} disabled={!data.afterglow.can} onClick={() => commands.buySpectral('afterglow')}>
              {data.afterglow.level >= data.afterglow.max ? 'Max' : <>+{data.afterglow.count} <span className="num">{data.afterglow.cost}</span></>}
            </Button>
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------- Tarot of the Void ----------

export function TarotPanel() {
  const r = useReport('tarot', tarotReport, 250);
  const data = r ?? tarotReport();
  const [pick, setPick] = useState<string | null>(null);
  const [drawn, setDrawn] = useState<string[]>([]);
  const place = (slot: number) => {
    if (!pick) return;
    if (commands.placeCard(pick, slot)) setPick(null);
  };
  return (
    <Panel id="tarot" title="Tarot of the Void" color="#FF4F6E" size="wide">
      {!data.open ? (
        <Locked what="Tarot of the Void" req={data.req} />
      ) : (
        <>
          <div className="well wyrm-head">
            <span className="pill-mini">
              <Icon name="nebula" />
              <span className="num">{data.essence}</span> Essence
            </span>
            <span>
              <b className="num">{data.owned}</b>/{data.total} cards · {data.slots} deck slots {data.nextSlot && `(${data.nextSlot})`}
            </span>
            <span>{data.packFrom}</span>
          </div>
          <div className="pack-row">
            <BuyAmountControl compact />
            <Button
              size="lg"
              color={data.canPack ? 'var(--magenta)' : '#5A5F8F'}
              disabled={!data.canPack}
              onClick={() => setDrawn(commands.openPacks())}
              data-testid="open-pack"
            >
              Open {data.packCount} pack{data.packCount === 1 ? '' : 's'} <span className="num">{data.packCost}</span>
            </Button>
            {drawn.length > 0 && (
              <div className="drawn" aria-live="polite" data-testid="drawn">
                {drawn.slice(0, 8).map((id) => (
                  <span key={id} className="drawn-card">
                    {CARD_BY_ID.get(id)?.name}
                  </span>
                ))}
                {drawn.length > 8 && <span className="drawn-card">+{drawn.length - 8} more</span>}
              </div>
            )}
          </div>
          <h4 className="section-h">Deck {pick ? '· pick a slot for it' : ''}</h4>
          <div className="deck" role="list" aria-label="Your deck, left to right">
            {data.deck.map((d) => (
              <div
                key={d.slot}
                role="listitem"
                className={cx('deck-slot', !d.id && 'empty', d.id && !d.active && 'off', pick && 'can-drop')}
                style={tint(d.color)}
                data-slot={d.slot}
              >
                <small className="slot-no">{d.slot + 1}</small>
                {d.id ? (
                  <>
                    <span className="tarot-art" aria-hidden="true">
                      <Icon name="card" />
                    </span>
                    <b>{d.name}</b>
                    {d.acts && <small className="acts">{d.acts}</small>}
                    <small className="now">{d.now}</small>
                    {d.counts > 1 && <small className="twice">Counts x{d.counts}</small>}
                    {!pick && (
                      <Button size="sm" color="#5A5F8F" onClick={() => commands.removeCard(d.slot)}>
                        Take out
                      </Button>
                    )}
                  </>
                ) : (
                  <small className="now">Empty</small>
                )}
                {pick && (
                  <Button size="sm" color="var(--magenta)" onClick={() => place(d.slot)} data-place={d.slot}>
                    Put it here
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="altar-fine">The Gambler's current roll: {data.gamble}. Pick a card below, then a slot.</p>
          {data.rarities.map((rar) => (
            <div key={rar.name} className="index-group">
              <h4 className="section-h" style={{ color: rar.color }}>
                {rar.name}
              </h4>
              <div className="card-grid">
                {rar.cards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={cx('tarot-card', c.owned && 'owned', c.inDeck && 'in-deck', pick === c.id && 'picked')}
                    style={tint(rar.color)}
                    disabled={!c.owned}
                    onClick={() => setPick(pick === c.id ? null : c.id)}
                    data-card={c.id}
                    title={c.text}
                  >
                    <b>{c.name}</b>
                    <small>{c.text}</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}
