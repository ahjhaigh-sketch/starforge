import { useRef, useState } from 'react';
import { commands } from '../../app/commands';
import { aurasReport, indexReport, mutationsReport, STAR_LADDER, starringReport } from '../../app/runeDepthReports';
import { AURA_BY_ID } from '../../content/runeDepth';
import { formatCount } from '../format';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';

/** Phase 9 panels: Rune Starring and Crafting, Celestial Auras, Mutations and the Index. */

function Locked({ what, req }: { what: string; req: string }) {
  return (
    <p className="depth-locked">
      <Icon name="lock" /> {what} opens at {req}.
    </p>
  );
}

function Stars({ n, max }: { n: number; max: number }) {
  return (
    <span className="star-row" aria-label={`${n} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <Icon key={i} name="starrank" className={i < n ? 'lit' : 'dim'} />
      ))}
    </span>
  );
}

// ---------- Rune Starring and Crafting ----------

export function StarringPanel() {
  const [shrine, setShrine] = useState('dust');
  const current = useRef(shrine);
  current.current = shrine;
  const r = useReport('starring', () => starringReport(current.current), 200);
  const data = r && r.id === shrine ? r : starringReport(shrine);
  const [note, setNote] = useState('');
  return (
    <Panel id="starring" title="Rune Stars" color="#C99A1E" size="wide">
      {!data.open ? (
        <Locked what="Rune Starring" req={data.req} />
      ) : (
        <>
          <div className="shrine-tabs" role="tablist" aria-label="Shrines">
            {data.tabs.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={t.id === shrine} className={cx('shrine-tab chunk pop', t.id === shrine && 'on', !t.open && 'locked')} style={tint(t.id === shrine ? t.color : '#2B1F6E')} onClick={() => setShrine(t.id)} data-star-shrine={t.id}>
                {!t.open && <Icon name="lock" />}
                {t.name}
                {t.stars > 0 && <span className="tab-stars num">{t.stars}</span>}
              </button>
            ))}
          </div>
          {!data.shrineOpen ? (
            <p className="depth-locked">The {data.name} isn't open yet.</p>
          ) : (
            <div className="star-cols">
              <section className="well altar" aria-label="Star altar">
                <h4 className="section-h">Star altar</h4>
                <Stars n={data.stars} max={data.max} />
                <p className="altar-bonus">{data.bonus}</p>
                {data.target ? (
                  <>
                    <p className="altar-ask">
                      Next star: give{' '}
                      <span className="rune-rarity chunk" style={tint(data.target.color)}>
                        {data.target.rarity}
                      </span>{' '}
                      <b>{data.target.name}</b>
                    </p>
                    <ProgressBar value={data.target.share} color={data.target.color} label="Copies toward the next star" />
                    <p className="num altar-count">
                      {data.target.have} / {data.target.need}
                    </p>
                    <Button size="lg" color={data.canStar ? 'var(--gold)' : '#5A5F8F'} disabled={!data.canStar} onClick={() => commands.starUp(shrine)} data-testid="star-up">
                      Give {data.target.need} copies
                    </Button>
                    <small className="altar-fine">Only these copies go. Every other rune stays.</small>
                  </>
                ) : (
                  <p className="altar-bonus">Every star earned.</p>
                )}
                <p className="altar-fine">{data.revealNote}</p>
                <ol className="ladder">
                  {STAR_LADDER.map((x, i) => (
                    <li key={x.rarity} className={cx(i < data.stars && 'done')}>
                      <Icon name="starrank" /> {x.rarity} x{formatCount(x.count, 'suffix')}
                    </li>
                  ))}
                </ol>
              </section>
              <section className="well forge-runes" aria-label="Rune Shards">
                <h4 className="section-h">Rune Shards</h4>
                <div className="shard-head">
                  <span className="pill-mini">
                    <Icon name="rune" />
                    <span className="num">{data.shards}</span>
                  </span>
                  <Button
                    size="sm"
                    color={data.canSalvage ? 'var(--magenta)' : '#5A5F8F'}
                    disabled={!data.canSalvage}
                    onClick={() => setNote(`+${commands.salvageRunes(shrine)} Rune Shards`)}
                    data-testid="salvage"
                  >
                    Salvage extras (+{data.salvage})
                  </Button>
                  {note && <small className="altar-fine">{note}</small>}
                </div>
                <small className="altar-fine">Salvaging keeps every copy a rune's level uses. A 1-in-N rune salvages for N / 10 shards and crafts for N.</small>
                <BuyAmountControl compact />
                <div className="craft-list">
                  {data.craft.map((c) => (
                    <div key={c.id} className="craft-row" data-craft={c.id}>
                      <span className="rune-rarity chunk" style={tint(c.color)}>
                        {c.rarity}
                      </span>
                      <span className="rune-name">
                        <b>{c.name}</b>
                        <small>
                          {c.level} · {c.extra} extra · {c.price} each
                        </small>
                      </span>
                      <Button size="sm" color={c.can ? 'var(--lime)' : '#5A5F8F'} disabled={!c.can} onClick={() => commands.craftRune(c.id)} aria-label={`Craft ${c.count} ${c.name} for ${c.cost} Rune Shards`}>
                        x{c.count} <span className="num">{c.cost}</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

// ---------- Celestial Auras ----------

interface AuraCard {
  name: string;
  color: string;
  count: string;
  key: number;
  rare: boolean;
}

export function AurasPanel() {
  const r = useReport('auras', aurasReport, 200);
  const data = r ?? aurasReport();
  const [card, setCard] = useState<AuraCard | null>(null);
  const roll = () => {
    const res = commands.rollAuras();
    if (!res) return;
    if (!res.best) return setCard({ name: 'Nothing this time', color: '#3A3466', count: res.dice.toString(), key: Math.random(), rare: false });
    const best = res.best;
    const hit = res.hits.find((h) => h.id === best.id);
    setCard({ name: best.name, color: best.color, count: hit ? hit.count.toString() : '1', key: Math.random(), rare: best.log10 >= 4 });
  };
  return (
    <Panel id="auras" title="Celestial Auras" color="#1A9DB8" size="wide">
      {!data.open ? (
        <Locked what="Celestial Auras" req={data.req} />
      ) : (
        <>
          <div className="aura-head">
            <div className="well shrine-stats">
              <span>
                <Icon name="dice" /> Aura Dice <b className="num">{data.dice}</b>
              </span>
              <span>One die for every {data.every} runes rolled at any shrine.</span>
              <span>
                Aura luck <b className="num">{data.luck}</b> · <b className="num">{data.found}</b>/{data.total} found
              </span>
              <span>
                Wearing <b>{data.equipped}</b>
              </span>
            </div>
            <div className="shrine-controls">
              <BuyAmountControl compact />
              <Button size="lg" color={data.can ? 'var(--cyan)' : '#5A5F8F'} disabled={!data.can} onClick={roll} data-testid="roll-aura">
                Roll {data.count} {data.count === '1' ? 'die' : 'dice'}
              </Button>
              <Button color={data.auto ? 'var(--lime)' : '#5A5F8F'} aria-pressed={data.auto} onClick={() => commands.setAuraAuto(!data.auto)} data-testid="aura-auto">
                Auto-roll: {data.auto ? 'On' : 'Off'}
              </Button>
            </div>
            {card && (
              <div key={card.key} className={cx('roll-card aura-card-land chunk', card.rare && 'mythic')} style={tint(card.color)} data-testid="aura-card" aria-live="polite">
                <span className="halo" aria-hidden="true" />
                <b className="ol">{card.name}</b>
                {card.name !== 'Nothing this time' && <span className="num ol-sm">x{card.count}</span>}
              </div>
            )}
          </div>
          <div className="aura-grid">
            {data.auras.map((a) => (
              <div key={a.id} className={cx('aura-tile', a.found && 'found', a.equipped && 'worn')} style={tint(a.color)} data-aura={a.id}>
                <span className="halo" aria-hidden="true" />
                <b>{a.name}</b>
                <small className="num">{a.odds}</small>
                <small>{a.effects}</small>
                {a.found && (
                  <Button size="sm" color={a.equipped ? 'var(--lime)' : '#4C3BC4'} onClick={() => commands.equipAura(a.equipped ? null : a.id)} aria-pressed={a.equipped}>
                    {a.equipped ? 'Worn' : 'Wear'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

/** The name of an aura for the toast and banner. */
export const auraName = (id: string) => AURA_BY_ID.get(id)?.name ?? 'an aura';

// ---------- Mutations ----------

export function MutationsPanel() {
  const r = useReport('mutations', mutationsReport, 300);
  const data = r ?? mutationsReport();
  return (
    <Panel id="mutations" title="Mutations" color="#C23FA0" size="wide">
      {!data.open ? (
        <Locked what="Mutations" req={data.req} />
      ) : (
        <>
          <p className="depth-intro">
            Every rune copy and asteroid rolls for a mutation, rarest first. Mutation luck <b className="num">{data.luck}</b> divides the odds, never past 1 in 2.
          </p>
          <div className="mut-grid">
            {data.rows.map((m) => (
              <div key={m.id} className={cx('mut-card chunk', `mut-${m.id}`)} style={tint(m.color)} data-mutation={m.id}>
                <b className="ol">{m.name}</b>
                <span className="mut-mult ol num">{m.mult}</span>
                <small className="num ol-sm" title={`Base ${m.base}`}>
                  {m.odds}
                </small>
                <small className="ol-sm">
                  <span className="num">{m.runes}</span> rune copies
                </small>
                <small className="ol-sm">
                  <span className="num">{m.asteroids}</span> asteroids
                </small>
              </div>
            ))}
          </div>
          <ul className="mut-targets">
            {data.targets.map((t) => (
              <li key={t.name} className={cx(!t.built && 'later')}>
                {!t.built && <Icon name="lock" />} {t.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

// ---------- The Index ----------

export function IndexPanel() {
  const [page, setPage] = useState('runes');
  const current = useRef(page);
  current.current = page;
  const r = useReport('index', () => indexReport(current.current), 500);
  const data = r && r.id === page ? r : indexReport(page);
  return (
    <Panel id="index" title="The Index" color="#B08A1A" size="wide">
      <div className="index-book">
        <nav className="index-pages" aria-label="Index pages">
          {data.pages.map((p) => (
            <button key={p.id} type="button" className={cx('index-tab chunk pop', p.id === data.id && 'on', !p.open && 'locked')} style={tint(p.id === data.id ? '#B08A1A' : '#2B1F6E')} disabled={!p.open} onClick={() => setPage(p.id)} data-page={p.id} title={p.open ? p.bonus : p.req}>
              <span className="ring" style={{ ['--p' as string]: `${Math.round(p.share * 100)}%` }}>
                <Icon name={p.open ? p.icon : 'lock'} />
              </span>
              <span className="index-tab-text">
                <b>{p.name}</b>
                <small className="num">{p.open ? `${p.found}/${p.total}` : p.req}</small>
              </span>
              <span className="pips" aria-label={`${p.milestones} of 5 milestones`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <i key={i} className={cx(i < p.milestones && 'on')} />
                ))}
              </span>
            </button>
          ))}
        </nav>
        <section className="index-page" aria-label={data.pages.find((p) => p.id === data.id)?.name}>
          <p className="index-bonus" data-testid="index-bonus">
            {data.pages.find((p) => p.id === data.id)?.bonus}
          </p>
          {data.groups.map((g) => (
            <div key={g.name} className="index-group">
              <h4 className="section-h">{g.name}</h4>
              <div className="index-chips">
                {g.entries.map((e, i) => (
                  <span key={`${e.name}${i}`} className={cx('index-chip', e.found && 'found')} style={tint(e.color)}>
                    {e.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </Panel>
  );
}
