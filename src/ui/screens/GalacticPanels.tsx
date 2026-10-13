import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { commands, sigilAware } from '../../app/commands';
import { constantsReport } from '../../app/earlyReports';
import { galacticReport, galaxyMapReport, observatoryReport } from '../../app/galacticReports';
import { NODE_LEGEND } from '../../app/novaReports';
import { layerConfirm } from '../../app/runeReports';
import { kitTreeReport } from '../../app/treeReports';
import { snapshotStore, useSnap } from '../../app/uiSnapshot';
import { galacticTree } from '../../engine/systems/galactic';
import { starChart } from '../../engine/systems/observatory';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';
import { useUi } from '../store';
import { TreeView } from '../tree/TreeView';
import { ConstantGrid } from './EarlyPanels';

/** Phase 15 panels: Galactic Rebirth and its confirm screen, the Galactic Tree, the Galaxy Map, the Observatory, the Stardust Chart. */

function CoreChip({ value, icon = 'galaxy' }: { value: string; icon?: string }) {
  return (
    <span className="pill-mini">
      <Icon name={icon} />
      <span className="num">{value}</span>
    </span>
  );
}

function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className={ok ? 'reached' : ''}>
      <Icon name={ok ? 'trophy' : 'lock'} /> {children}
    </li>
  );
}

// ---------- Galactic Rebirth ----------

export function GalacticPanel() {
  const r = useReport('galactic', galacticReport, 200);
  const consts = useReport('galactic', () => constantsReport('galactic'), 250);
  const open = useUi((s) => s.open);
  const [auto, setAuto] = useState('');
  const data = r ?? galacticReport();
  return (
    <Panel id="galactic" title="Galactic Rebirth" color="#3F7A12" size="wide">
      <div className="tree-head">
        <p>The fourth reset. Trade the whole Singularity layer (Dark Matter, its tree, Void Constants, the Black Hole and the Mirror) for Galaxy Cores, and restart in a galaxy you choose. Lifetime Galaxy Cores multiply Dark Matter by {data.passive}.</p>
        <CoreChip value={data.cores} />
      </div>
      <div className="nebula-cols">
        <div className="well nebula-run">
          <h4>This Galactic run</h4>
          <ul className="milestones gal-checks">
            <Check ok={data.depth >= data.depthNeed}>
              The anti-star collapsed to a Protostar ({data.depth}/{data.depthNeed})
            </Check>
            <Check ok={data.key}>The Mirror Key</Check>
            <Check ok={data.dmMet}>
              Dark Matter this run <b className="num">{data.dm}</b> / {data.dmNeed}
            </Check>
          </ul>
          <Button size="lg" color={data.ready ? '#3F7A12' : '#5A5F8F'} disabled={!data.ready} onClick={() => (snapshotStore.getState().confirmResets ? open('galacticConfirm') : commands.reset('galactic'))} data-testid="go-galactic">
            {data.ready ? `Go Galactic: +${data.gain} Galaxy Cores` : 'Not yet'}
          </Button>
          {data.ready && <small>Next Galaxy Core at {data.next} Dark Matter this run.</small>}
          <span>
            You are in <b>{data.galaxy}</b>; next stop <b>{data.nextGalaxy}</b>.
          </span>
          {data.autoUnlocked && (
            <div className="auto-nova">
              <label htmlFor="auto-singularity">Auto-Singularity at a gain of</label>
              <input id="auto-singularity" type="number" min={0} inputMode="numeric" placeholder={data.autoAt > 0 ? String(data.autoAt) : 'off'} value={auto} onChange={(e) => setAuto(e.target.value)} />
              <Button size="sm" onClick={() => commands.setAutoSingularity(Number(auto) || 0)}>
                {Number(auto) > 0 ? 'Set' : 'Off'}
              </Button>
              <small>{data.autoAt > 0 ? `Now: at ${data.autoAt.toLocaleString('en-GB')} Dark Matter` : 'Off'}</small>
            </div>
          )}
          <div className="nebula-links">
            <Button size="sm" color="#2B7FD0" onClick={() => open('galaxymap')}>
              Galaxy Map
            </Button>
            <Button size="sm" color="#3F7A12" onClick={() => open('galactictree')}>
              Galactic Tree
            </Button>
            <Button size="sm" color="#5B45C2" onClick={() => open('observatory')}>
              Observatory
            </Button>
          </div>
        </div>
        <div className="well">
          <h4>Milestones ({data.done} Galactic Rebirths)</h4>
          <ul className="milestones">
            {data.milestones.map((m) => (
              <li key={m.at} className={m.reached ? 'reached' : ''}>
                <b className="num">{m.at}</b> {m.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {consts && consts.cards.length > 0 && (
        <>
          <h4 className="section-h">Galactic Constants</h4>
          <BuyAmountControl compact />
          <ConstantGrid cards={consts.cards} />
        </>
      )}
    </Panel>
  );
}

export function GalacticConfirmPanel() {
  const r = useReport('galacticConfirm', () => layerConfirm('galactic'), 300);
  const g = useReport('galacticConfirm', galacticReport, 300);
  const close = useUi((s) => s.close);
  return (
    <Panel id="galacticConfirm" title="Go Galactic?" color="#3F7A12" size="small">
      {r && (
        <div className="confirm">
          <div className="big-gain">
            <Icon name="galaxy" />
            <span className="num">+{r.gain}</span>
          </div>
          <p className="center">Galaxy Cores buy the Galactic Tree and Galactic Constants. You will restart in {g?.nextGalaxy ?? 'the Milky Way'}.</p>
          {r.warn && <p className="reset-warn" role="note">{r.warn}</p>}
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
            <Button size="lg" color="#3F7A12" disabled={!r.ready} onClick={() => commands.reset('galactic') && close()}>
              Go Galactic
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

export function GalacticTreePanel() {
  const r = useReport('galactictree', () => kitTreeReport(galacticTree), 200);
  const treeBulk = useSnap((s) => s.treeBulk);
  return (
    <Panel id="galactictree" title="Galactic Tree" color="#3F7A12" size="wide">
      <div className="tree-head">
        <p>Five spiral arms, one for each way to play: Active (taps and comets), Idle (production and time), Runes, Wyrms and Production (the reset currencies). Capstones join neighbouring arms; four echoes level up with no cap.</p>
        {r && <CoreChip value={r.money} />}
      </div>
      {r && <TreeView nodes={r.nodes} edges={r.edges} onBuy={sigilAware((id) => commands.buyGalacticNode(id))} onBuyAll={() => commands.buyAllNodes('galactictree')} bulkLocked={treeBulk ? '' : 'Buy all opens at 5 Supernovas'} currencyLabel="Galaxy Cores" legend={NODE_LEGEND} />}
    </Panel>
  );
}

// ---------- the Galaxy Map ----------

export function GalaxyMapPanel() {
  const r = useReport('galaxymap', galaxyMapReport, 250);
  const data = r ?? galaxyMapReport();
  return (
    <Panel id="galaxymap" title="Galaxy Map" color="#2B7FD0" size="wide">
      {!data.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> The Galaxy Map opens with the Mirror Key.
        </p>
      ) : (
        <>
          <div className="tree-head">
            <p>Pick where your next Galactic Rebirth takes you. A galaxy's rule holds only while you are there; meet its goal there and its reward is yours for good. Explore one to open the next. {data.cleared} of 20 explored.</p>
          </div>
          <div className="galaxy-grid">
            {data.cards.map((g) => (
              <div key={g.id} className={cx('galaxy-card chunk', g.current && 'here', g.cleared && 'cleared', !g.available && 'locked')} style={tint(g.available ? g.color : '#3A3F6F')} data-galaxy={g.id}>
                <div className="galaxy-top">
                  <span className="galaxy-swirl" aria-hidden="true" />
                  <b>{g.available ? g.name : '???'}</b>
                  {g.current && <span className="tag">Here</span>}
                  {g.next && <span className="tag next">Next</span>}
                  {g.cleared && <span className="tag done">Explored</span>}
                </div>
                {g.available ? (
                  <>
                    <p className="galaxy-rule">{g.rule}</p>
                    <p className="galaxy-goal">
                      Goal: {g.goal}. Reward: <b>{g.reward}</b>.
                    </p>
                    {g.current && !g.cleared && (
                      <>
                        <ProgressBar value={g.pct / 100} color="#B4F04A" label={`${g.name} goal`} />
                        <span className="num galaxy-prog">{g.progress}</span>
                      </>
                    )}
                    <Button size="sm" color={g.next ? '#5A5F8F' : '#2B7FD0'} disabled={g.next} onClick={() => commands.setNextGalaxy(g.id)} data-testid={`galaxy-next-${g.id}`}>
                      {g.next ? 'Going here next' : 'Go here next'}
                    </Button>
                  </>
                ) : (
                  <p className="galaxy-rule">Explore more galaxies to chart this one.</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------- the Observatory ----------

export function ObservatoryPanel() {
  const r = useReport('observatory', observatoryReport, 150);
  const open = useUi((s) => s.open);
  const [sel, setSel] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const data = r ?? observatoryReport();
  const pick = (i: number) => {
    if (sel === null) setSel(i);
    else if (sel === i) setSel(null);
    else {
      commands.toggleStarLink(sel, i);
      setSel(i);
    }
  };
  const key = (i: number) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(i);
    }
    if (e.key === 'Escape') setSel(null);
  };
  const W = 1000;
  const H = 620;
  return (
    <Panel id="observatory" title="Observatory" color="#5B45C2" size="wide">
      {!data.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> The Observatory opens with your first Galactic Rebirth.
        </p>
      ) : (
        <>
          <div className="tree-head">
            <p>A new sky every Galactic run. Pick a star, then another, to draw a link (pick a linked pair again to erase it). Long links between heavy, near stars score most, and every closed shape adds 25%. Record a better constellation for Star Charts. Stuck? Hint shows the best next link; Auto-draw draws a strong shape for you.</p>
            <CoreChip value={data.charts} icon="telescope" />
          </div>
          <div className="obs-cols">
            <svg className="obs-sky" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="The sky">
              {data.links.map((l) => {
                const a = data.stars[l.a]!;
                const b = data.stars[l.b]!;
                return <line key={`${l.a}-${l.b}`} className="obs-link" x1={a.x * W} y1={a.y * H} x2={b.x * W} y2={b.y * H} />;
              })}
              {showHint && data.hint && (
                <line className="obs-hint" x1={data.stars[data.hint.a]!.x * W} y1={data.stars[data.hint.a]!.y * H} x2={data.stars[data.hint.b]!.x * W} y2={data.stars[data.hint.b]!.y * H} />
              )}
              {data.stars.map((st) => (
                <g
                  key={st.i}
                  className={cx('obs-star', sel === st.i && 'sel')}
                  transform={`translate(${st.x * W} ${st.y * H})`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={sel === st.i}
                  aria-label={`Star ${st.i + 1}: ${st.mass} solar masses, ${st.temp}, ${st.dist}`}
                  onClick={() => pick(st.i)}
                  onKeyDown={key(st.i)}
                  data-star={st.i}
                  style={{ ['--c' as string]: st.color } as CSSProperties}
                >
                  <circle className="glow" r={st.r * 2.6} />
                  <circle className="core" r={st.r} />
                </g>
              ))}
            </svg>
            <div className="obs-side">
              <div className="well obs-score">
                <span className="obs-big num">{data.score}</span>
                <span>Star Score (best on this sky {data.best})</span>
                <span>
                  {data.used} of {data.max} links · {data.loops} closed {data.loops === 1 ? 'shape' : 'shapes'}
                </span>
                <Button color={data.pays > 0 ? '#5B45C2' : '#5A5F8F'} disabled={data.pays <= 0} onClick={() => commands.recordConstellation()} data-testid="obs-record">
                  {data.pays > 0 ? `Record: +${data.pays} Star Charts` : 'Beat your best to record'}
                </Button>
                <div className="center-row">
                  <Button size="sm" color="#2E9C78" onClick={() => setShowHint((v) => !v)} aria-pressed={showHint} data-testid="obs-hint">
                    {showHint ? 'Hide hint' : 'Hint'}
                  </Button>
                  <Button size="sm" color="#B08A1A" onClick={() => commands.autoChart()} data-testid="obs-auto">
                    Auto-draw ({data.autoScore})
                  </Button>
                </div>
                {showHint && <small>{data.hint ? `Link star ${data.hint.a + 1} to star ${data.hint.b + 1}: +${data.hint.gain}` : 'No link would add more: record it, or erase one to try another.'}</small>}
                <div className="center-row">
                  <Button size="sm" color="#5A5F8F" onClick={() => commands.clearStarLinks()}>
                    Clear
                  </Button>
                  <Button size="sm" color="#7B3FD6" onClick={() => open('starchart')}>
                    Stardust Chart
                  </Button>
                </div>
              </div>
              {data.links.length > 0 && (
                <div className="well obs-links">
                  {data.links.map((l) => (
                    <span key={`${l.a}-${l.b}`}>
                      Star {l.a + 1} to {l.b + 1}: <b className="num">{l.score}</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}

export function StarChartPanel() {
  const r = useReport('starchart', () => kitTreeReport(starChart), 200);
  const treeBulk = useSnap((s) => s.treeBulk);
  return (
    <Panel id="starchart" title="Stardust Chart" color="#7B3FD6" size="wide">
      <div className="tree-head">
        <p>Constellations you've charted. Spend Star Charts from the Observatory; the chart is never reset.</p>
        {r && <CoreChip value={r.money} icon="telescope" />}
      </div>
      {r && <TreeView nodes={r.nodes} edges={r.edges} onBuy={sigilAware((id) => commands.buyChartNode(id))} onBuyAll={() => commands.buyAllNodes('starchart')} bulkLocked={treeBulk ? '' : 'Buy all opens at 5 Supernovas'} currencyLabel="Star Charts" legend={NODE_LEGEND} />}
    </Panel>
  );
}
