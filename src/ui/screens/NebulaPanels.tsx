import { useEffect, useRef, useState } from 'react';
import { commands } from '../../app/commands';
import { constantsReport } from '../../app/earlyReports';
import { NODE_LEGEND } from '../../app/novaReports';
import { layerConfirm, nebulaReport, nebulaTreeReport, shrineReport } from '../../app/runeReports';
import { snapshotStore } from '../../app/uiSnapshot';
import { RUNE_BY_ID, RUNE_RARITIES } from '../../content/runes';
import { AURA_BY_ID } from '../../content/runeDepth';
import { WYRM_BY_ID } from '../../content/wyrms';
import { events } from '../../engine/events';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';
import { useUi } from '../store';
import { TreeView } from '../tree/TreeView';
import { ConstantGrid } from './EarlyPanels';

function EssenceChip({ value }: { value: string }) {
  return (
    <span className="pill-mini">
      <Icon name="nebula" />
      <span className="num">{value}</span>
    </span>
  );
}

// ---------- the Nebula ----------

export function NebulaPanel() {
  const r = useReport('nebula', nebulaReport, 200);
  const consts = useReport('nebula', () => constantsReport('nebula'), 200);
  const open = useUi((s) => s.open);
  const [auto, setAuto] = useState('');
  return (
    <Panel id="nebula" title="The Nebula" color="#1E8FA8" size="wide">
      {r && (
        <>
          <div className="tree-head">
            <p>The second reset. Gather 30 Supernovas and {r.shardsNeed} Nova Shards in one Nebula run, then go Nebula for Essence. It resets the Stardust layer, your shards, the Nova Tree and the Supernova count; relics, the Codex, runes and the Starforge stay.</p>
            <EssenceChip value={r.essence} />
          </div>
          <div className="nebula-cols">
            <div className="well nebula-run">
              <h4>This Nebula run</h4>
              <span>
                Supernovas <b className="num">{r.supernovas}</b> / {r.need}
              </span>
              <ProgressBar value={Math.min(1, r.supernovas / r.need)} color="var(--magenta)" label="Supernovas this Nebula run" />
              <span>
                Nova Shards <b className="num">{r.shards}</b> / {r.shardsNeed}
              </span>
              <Button size="lg" color={r.ready ? 'var(--cyan)' : '#5A5F8F'} disabled={!r.ready} onClick={() => (snapshotStore.getState().confirmResets ? open('nebulaConfirm') : commands.reset('nebula'))}>
                {r.ready ? `Go Nebula: +${r.gain} Essence` : 'Not yet'}
              </Button>
              {r.ready && <small>Next Essence at {r.next} shards this run.</small>}
              {r.autoUnlocked && (
                <div className="auto-nova">
                  <label htmlFor="auto-nova">Auto-Supernova at a gain of</label>
                  <input id="auto-nova" type="number" min={0} inputMode="numeric" placeholder={r.autoAt > 0 ? String(r.autoAt) : 'off'} value={auto} onChange={(e) => setAuto(e.target.value)} />
                  <Button size="sm" onClick={() => commands.setAutoNova(Number(auto) || 0)}>
                    {Number(auto) > 0 ? 'Set' : 'Off'}
                  </Button>
                  <small>{r.autoAt > 0 ? `Now: at ${r.autoAt.toLocaleString('en-GB')} shards` : 'Off'}</small>
                </div>
              )}
              <div className="nebula-links">
                <Button size="sm" color="#1E8FA8" onClick={() => open('nebulatree')}>
                  Nebula Tree
                </Button>
                <Button size="sm" color="#7B3FD6" onClick={() => open('runes')}>
                  Rune shrines
                </Button>
              </div>
            </div>
            <div className="well">
              <h4>Milestones ({r.done} Nebulas)</h4>
              <ul className="milestones">
                {r.milestones.map((m) => (
                  <li key={m.at} className={m.reached ? 'reached' : ''}>
                    <b className="num">{m.at}</b> {m.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <h4 className="section-h">Nebula Constants</h4>
          <BuyAmountControl compact />
          {consts && <ConstantGrid cards={consts.cards} />}
        </>
      )}
    </Panel>
  );
}

/** The Nebula's confirm screen: what you get, what resets, what is kept. */
export function NebulaConfirmPanel() {
  const r = useReport('nebulaConfirm', () => layerConfirm('nebula'), 300);
  const close = useUi((s) => s.close);
  return (
    <Panel id="nebulaConfirm" title="Go Nebula?" color="#1E8FA8" size="small">
      {r && (
        <div className="confirm">
          <div className="big-gain">
            <Icon name="nebula" />
            <span className="num">+{r.gain}</span>
          </div>
          <p className="center">{r.currency}. It buys the Nebula Tree and Nebula Constants, and lifetime Essence boosts every shard.</p>
          <div className="confirm-cols">
            <div className="well">
              <h4>Resets</h4>
              <ul>
                {r.resets.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="well kept">
              <h4>Kept</h4>
              <ul>
                {r.kept.map((x) => (
                  <li key={x.label}>
                    {x.label}
                    {x.why !== 'Always kept' && <small>{x.why}</small>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="set-row center-row">
            <Button size="lg" color="var(--cyan)" disabled={!r.ready} onClick={() => commands.reset('nebula') && close()}>
              Go Nebula
            </Button>
            <Button size="lg" color="#5A5F8F" onClick={close}>
              Not yet
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function NebulaTreePanel() {
  const r = useReport('nebulatree', nebulaTreeReport, 200);
  return (
    <Panel id="nebulatree" title="Nebula Tree" color="#1E8FA8" size="wide">
      <div className="tree-head">
        <p>Spend Nebula Essence on a drifting cloud of four wisps: Veil (runes), Bloom (Essence, shards and what a Nebula keeps), Drift (Stardust, taps, time away) and Lattice (the Belt, Starforge and ships). A Singularity resets it (from 3 Singularities it stays).</p>
        {r && <EssenceChip value={r.essence} />}
      </div>
      {r && <TreeView nodes={r.nodes} edges={r.edges} onBuy={(id) => commands.buyNebulaNode(id)} currencyLabel="Essence" legend={NODE_LEGEND} />}
    </Panel>
  );
}

// ---------- the rune shrines ----------

interface Card {
  name: string;
  rarity: string;
  color: string;
  tier: number;
  count: string;
  key: number;
}

const KEEP_LABELS = ['Keep everything', 'Uncommon and up', 'Rare and up', 'Epic and up', 'Legendary and up', 'Mythic and up', 'Celestial and up', 'Cosmic and up'];

export function RunesPanel() {
  const [shrine, setShrine] = useState('dust');
  // the report rebuilds with the snapshot; the ref lets it follow the chosen shrine
  const current = useRef(shrine);
  current.current = shrine;
  const r = useReport('runes', () => shrineReport(current.current), 200);
  const [card, setCard] = useState<Card | null>(null);
  const roll = () => {
    const res = commands.rollRunes(shrine);
    if (!res) return;
    // each rune rolled is checked against every rune on its own, so a small roll can find nothing
    if (!res.best) return setCard({ name: 'Nothing this time', rarity: 'No rune', color: '#3A3466', tier: -1, count: res.runes.toString(), key: Math.random() });
    const best = res.best;
    const count = res.hits.find((h) => h.id === best.id)?.count;
    setCard({ name: best.name, rarity: best.hidden ? 'Hidden' : best.anomaly ? 'Anomaly' : (RUNE_RARITIES[best.tier]?.name ?? ''), color: best.color, tier: best.tier < 0 ? 99 : best.tier, count: count ? count.toString() : '1', key: Math.random() });
  };
  const data = r && r.id === shrine ? r : shrineReport(shrine);
  return (
    <Panel id="runes" title="Constellation Runes" color="#7B3FD6" size="wide">
      <div className="shrine-tabs" role="tablist" aria-label="Shrines">
        {data.tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === shrine} className={cx('shrine-tab chunk pop', t.id === shrine && 'on', !t.open && 'locked')} style={tint(t.id === shrine ? t.color : '#2B1F6E')} onClick={() => setShrine(t.id)} title={t.open ? t.name : t.req} data-shrine={t.id}>
            {!t.open && <Icon name="lock" />}
            {t.name}
            {t.stars > 0 && <span className="tab-stars num">{t.stars}</span>}
          </button>
        ))}
      </div>
      {!data.open ? (
        <p className="shrine-locked">The {data.name} opens with {data.tabs.find((t) => t.id === shrine)?.req ?? 'more progress'}.</p>
      ) : (
        <>
          <div className="shrine-head">
            <div className="well shrine-stats">
              <span>
                Price <b className="num">{data.price}</b> {data.currency} a rune
              </span>
              <span>
                Runes a second <b className="num">{data.rps}</b> ({data.speed} x {data.bulk})
              </span>
              <span>
                Spend <b className="num">{data.spend}</b> {data.currency} a second
              </span>
              {data.lasts && (
                <span>
                  You can roll for <b className="num">{data.lasts}</b>
                </span>
              )}
              <span>
                Worth chasing: <b>{data.worth}</b>
              </span>
              <span>
                You have <b className="num">{data.have}</b> {data.currency} · <b className="num">{data.found}</b>/{data.total} runes found
              </span>
            </div>
            <div className="shrine-controls">
              <Button size="lg" color={data.canRoll ? 'var(--magenta)' : '#5A5F8F'} disabled={!data.canRoll} onClick={roll} data-testid="roll-once" aria-label={`Roll ${data.bulk.replace(' a roll', '')} runes for ${data.price} ${data.currency} each`}>
                Roll
              </Button>
              <Button color={data.auto ? 'var(--lime)' : '#5A5F8F'} aria-pressed={data.auto} onClick={() => commands.setShrine(shrine, { auto: !data.auto })} data-testid="auto-roll">
                Auto-roll: {data.auto ? 'On' : 'Off'}
              </Button>
              <label className="slider">
                Roll speed used <b className="num">{Math.round(data.rate * 100)}%</b>
                <input type="range" min={0} max={100} step={5} value={Math.round(data.rate * 100)} onChange={(e) => commands.setShrine(shrine, { rate: Number(e.target.value) / 100 })} aria-label="Share of your roll speed to use" />
              </label>
              <label className="slider">
                Luck used <b className="num">{Math.round(data.luck * 100)}%</b>
                <input type="range" min={0} max={100} step={5} value={Math.round(data.luck * 100)} onChange={(e) => commands.setShrine(shrine, { luck: Number(e.target.value) / 100 })} aria-label="Share of your luck to use" />
              </label>
              <label className="slider">
                Auto-roll keeps
                <select value={data.keep} onChange={(e) => commands.setShrine(shrine, { keep: Number(e.target.value) })} aria-label="Which runes auto-roll keeps">
                  {KEEP_LABELS.map((l, i) => (
                    <option key={l} value={i}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {card && (
              <div key={card.key} className={cx('roll-card chunk', card.tier >= 3 && 'epic', card.tier >= 5 && 'mythic')} style={tint(card.color)} data-testid="roll-card" aria-live="polite">
                <small className="ol-sm">{card.rarity}</small>
                <b className="ol">{card.name}</b>
                {card.tier >= -1 && card.rarity !== 'No rune' && <span className="num ol-sm">x{card.count}</span>}
              </div>
            )}
          </div>
          <div className="rune-table" role="table" aria-label={`${data.name} runes`}>
            {data.runes.map((x) => (
              <div key={x.id} role="row" className={cx('rune-row', x.found && 'found', x.hidden && !x.found && 'secret')} data-rune={x.id}>
                <span role="cell" className="rune-rarity chunk" style={tint(x.color)}>
                  {x.rarity}
                </span>
                <span role="cell" className="rune-name">
                  <b>
                    {x.name}
                    {x.muts.length > 0 && (
                      <span className="rune-muts" title={x.muts.map((m) => `${m.count} ${m.name}`).join(', ')}>
                        {x.muts.map((m) => (
                          <i key={m.id} style={tint(m.color)} />
                        ))}
                      </span>
                    )}
                  </b>
                  <small>{x.effects}</small>
                </span>
                <span role="cell" className="num rune-odds" title={`Base ${x.base}`}>
                  {x.odds}
                </span>
                <span role="cell" className="num rune-copies">
                  {x.copies}
                </span>
                <span role="cell" className="num rune-level">
                  {x.level >= x.cap ? 'MAX' : `L${x.level}`}
                  <small>/{x.cap}</small>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

/** A banner across the screen when a Mythic-or-rarer rune is found for the first time. */
export function MythicBanner() {
  const [show, setShow] = useState<{ name: string; rarity: string; color: string; key: number } | null>(null);
  useEffect(
    () =>
      events.on((e) => {
        // rare Celestial Auras (1 in 10,000 or rarer) get the banner too
        // a very rare Wyrm (1 in 80,000 or rarer) too
        if (e.t === 'hatch') {
          const w = WYRM_BY_ID.get(e.best);
          if (w && w.rank >= 12) setShow({ name: w.name, rarity: 'Void Wyrm', color: w.color, key: Date.now() });
          return;
        }
        if (e.t === 'aura' && e.first) {
          const a = AURA_BY_ID.get(e.id);
          if (a && a.log10 >= 4) setShow({ name: a.name, rarity: 'Celestial Aura', color: a.color, key: Date.now() });
          return;
        }
        if (e.t !== 'rune' || !e.first) return;
        const r = RUNE_BY_ID.get(e.id);
        if (!r) return;
        setShow({ name: r.name, rarity: r.hidden ? 'Hidden rune' : r.anomaly ? 'Anomaly' : (RUNE_RARITIES[r.tier]?.name ?? 'Rare'), color: r.color, key: Date.now() });
      }),
    [],
  );
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(null), 2600);
    return () => clearTimeout(t);
  }, [show]);
  if (!show) return null;
  return (
    <div key={show.key} className="mythic-banner" style={tint(show.color)} role="status" aria-live="assertive">
      <small className="ol-sm">{show.rarity}</small>
      <b className="ol">{show.name}</b>
    </div>
  );
}
