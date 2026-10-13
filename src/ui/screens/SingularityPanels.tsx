import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { commands, sigilAware } from '../../app/commands';
import { constantsReport } from '../../app/earlyReports';
import { NODE_LEGEND } from '../../app/novaReports';
import { layerConfirm } from '../../app/runeReports';
import { blackHoleReport, reactorReport, singularityReport, wheelReport } from '../../app/singularityReports';
import { kitTreeReport } from '../../app/treeReports';
import { snapshotStore, useSnap } from '../../app/uiSnapshot';
import { singularityTree } from '../../engine/systems/singularity';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { HowTo } from '../kit/HowTo';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';
import { useUi } from '../store';
import { TreeView } from '../tree/TreeView';
import { ConstantGrid } from './EarlyPanels';

/** Phase 12 panels: the Singularity, its confirm screen and tree, the Black Hole, the Prism Wheel, the Reactor. */

function DarkChip({ value }: { value: string }) {
  return (
    <span className="pill-mini">
      <Icon name="darkmatter" />
      <span className="num">{value}</span>
    </span>
  );
}

function Locked({ what, req }: { what: string; req: string }) {
  return (
    <p className="depth-locked">
      <Icon name="lock" /> {what} {req}.
    </p>
  );
}

// ---------- the Singularity ----------

export function SingularityPanel() {
  const r = useReport('singularity', singularityReport, 200);
  const consts = useReport('singularity', () => constantsReport('void'), 250);
  const open = useUi((s) => s.open);
  const [auto, setAuto] = useState('');
  if (!r) return <Panel id="singularity" title="The Singularity" color="#6E5CC4" size="wide">{null}</Panel>;
  return (
    <Panel id="singularity" title="The Singularity" color="#6E5CC4" size="wide">
      <div className="tree-head">
        <p>
          The third reset. With the Event Horizon key, gather {r.essenceNeed} Essence in one Singularity run and fall in for Dark Matter. It resets the Nebula layer and everything below it; your collections stay.
        </p>
        <DarkChip value={r.darkMatter} />
      </div>
      <div className="nebula-cols">
        <div className="well nebula-run">
          <h4>This Singularity run</h4>
          {!r.hasKey ? (
            <>
              <span>
                The Event Horizon key: <b className="num">{r.keyCost}</b> Embers (you have <b className="num">{r.embers}</b>)
              </span>
              <Button size="lg" color={r.canKey ? 'var(--gold)' : '#5A5F8F'} disabled={!r.canKey} onClick={() => commands.buyKey()} data-testid="buy-key">
                {r.onSale ? 'Buy the key' : 'On sale from Nebula milestone 8'}
              </Button>
              <small>Your Void Wyrms breathe Embers; the key is yours for good once bought.</small>
            </>
          ) : (
            <>
              <span>
                Essence <b className="num">{r.essence}</b> / {r.essenceNeed}
              </span>
              <Button
                size="lg"
                color={r.ready ? 'var(--violet)' : '#5A5F8F'}
                disabled={!r.ready}
                onClick={() => (snapshotStore.getState().confirmResets ? open('singularityConfirm') : commands.reset('singularity'))}
                data-testid="go-singularity"
              >
                {r.ready ? `Go Singularity: +${r.gain} Dark Matter` : 'Not yet'}
              </Button>
              {r.ready && <small>Next Dark Matter at {r.next} Essence this run.</small>}
            </>
          )}
          {r.autoUnlocked && (
            <div className="auto-nova">
              <label htmlFor="auto-nebula">Auto-Nebula at a gain of</label>
              <input id="auto-nebula" type="number" min={0} inputMode="numeric" placeholder={r.autoAt > 0 ? String(r.autoAt) : 'off'} value={auto} onChange={(e) => setAuto(e.target.value)} />
              <Button size="sm" onClick={() => commands.setAutoNebula(Number(auto) || 0)}>
                {Number(auto) > 0 ? 'Set' : 'Off'}
              </Button>
              <small>{r.autoAt > 0 ? `Now: at ${r.autoAt.toLocaleString('en-GB')} Essence` : 'Off'}</small>
            </div>
          )}
          <div className="nebula-links">
            <Button size="sm" color="#6E5CC4" onClick={() => open('singularitytree')}>
              Singularity Tree
            </Button>
            <Button size="sm" color="#3A2470" onClick={() => open('blackhole')}>
              Black Hole
            </Button>
          </div>
        </div>
        <div className="well">
          <h4>Milestones ({r.done} Singularities)</h4>
          <ul className="milestones">
            {r.milestones.map((m) => (
              <li key={m.at} className={m.reached ? 'reached' : ''}>
                <b className="num">{m.at}</b> {m.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <h4 className="section-h">Void Constants</h4>
      <BuyAmountControl compact />
      {consts && <ConstantGrid cards={consts.cards} />}
    </Panel>
  );
}

export function SingularityConfirmPanel() {
  const r = useReport('singularityConfirm', () => layerConfirm('singularity'), 300);
  const close = useUi((s) => s.close);
  return (
    <Panel id="singularityConfirm" title="Go Singularity?" color="#6E5CC4" size="small">
      {r && (
        <div className="confirm">
          <div className="big-gain">
            <Icon name="darkmatter" />
            <span className="num">+{r.gain}</span>
          </div>
          <p className="center">{r.currency}. It buys the Singularity Tree and Void Constants, and lifetime Dark Matter boosts all Essence.</p>
          {r.warn && <p className="reset-warn" role="note">{r.warn}</p>}
          {r.note && <p className="reset-note" role="note">{r.note}</p>}
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
            <Button size="lg" color="var(--violet)" disabled={!r.ready} onClick={() => commands.reset('singularity') && close()}>
              Go Singularity
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

export function SingularityTreePanel() {
  const r = useReport('singularitytree', () => kitTreeReport(singularityTree), 200);
  const treeBulk = useSnap((s) => s.treeBulk);
  return (
    <Panel id="singularitytree" title="Singularity Tree" color="#6E5CC4" size="wide">
      <div className="tree-head">
        <p>Four rings round the accretion disk, each in four sectors: Mass (the Black Hole and game speed), Matter (Dark Matter and Essence), Fate (runes and Luck Root) and Memory (what a Singularity keeps). Only a Galactic Rebirth resets it, and from 3 Galactic Rebirths not even that.</p>
        {r && <DarkChip value={r.money} />}
      </div>
      {r && <TreeView nodes={r.nodes} edges={r.edges} onBuy={sigilAware((id) => commands.buySingularityNode(id))} onBuyAll={() => commands.buyAllNodes('singularitytree')} bulkLocked={treeBulk ? '' : 'Buy all opens at 5 Supernovas'} currencyLabel="Dark Matter" legend={NODE_LEGEND} />}
    </Panel>
  );
}

// ---------- the Black Hole ----------

export function BlackHolePanel() {
  const r = useReport('blackhole', blackHoleReport, 200);
  const data = r ?? blackHoleReport();
  return (
    <Panel id="blackhole" title="The Black Hole" color="#3A2470" size="wide">
      {!data.open ? (
        <Locked what="The Black Hole" req="wakes with your first Singularity" />
      ) : (
        <>
          <div className="well wyrm-head">
            <span>
              Mass <b className="num">{data.mass}</b>
            </span>
            <span>
              Game speed <b className="num">{data.speed}</b> (offline too)
            </span>
            <span>{data.next}</span>
          </div>
          <ProgressBar value={data.share} color={data.stages[Math.min(7, data.stage)]?.color ?? '#FFB347'} label="Mass toward the next stage" />
          <div className="bh-stages" role="list" aria-label="The eight stages">
            {data.stages.map((st, i) => (
              <div key={st.id} role="listitem" className={cx('bh-stage chunk', st.reached && 'reached')} style={tint(st.color)} data-stage={i + 1}>
                <b className="ol">{st.name}</b>
                <small className="num ol-sm">{st.at} mass</small>
                <small className="ol-sm">{st.perk}</small>
              </div>
            ))}
          </div>
          <div className="bh-feed">
            <section className="well">
              <h4 className="section-h">Feed it Stardust</h4>
              <label className="slider">
                Share of Stardust production <b className="num">{Math.round(data.dustShare * 100)}%</b>
                <input
                  type="range"
                  min={0}
                  max={Math.round(data.maxShare * 100)}
                  step={5}
                  value={Math.round(data.dustShare * 100)}
                  onChange={(e) => commands.setDustShare(Number(e.target.value) / 100)}
                  aria-label="Share of Stardust fed to the Black Hole"
                  data-testid="dust-share"
                />
              </label>
              <small className="altar-fine">
                That share of your Stardust goes in; mass grows by the share x log10(Stardust a second): <b className="num">{data.rate}</b> mass a second now.
              </small>
            </section>
            <section className="well">
              <h4 className="section-h">Feed it Dark Matter</h4>
              <BuyAmountControl compact />
              <Button color={data.canFeed ? 'var(--violet)' : '#5A5F8F'} disabled={!data.canFeed} onClick={() => commands.feedBlackHole()} data-testid="feed-dm">
                Feed {data.feedCount} Dark Matter
              </Button>
              <small className="altar-fine">Each Dark Matter is 10 mass (more with Mass).</small>
            </section>
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------- the Prism Wheel ----------

const R = 120;
const C = 140;
const point = (turn: number, radius = R) => [C + radius * Math.sin(turn * Math.PI * 2), C - radius * Math.cos(turn * Math.PI * 2)] as const;

function wedgePath(from: number, to: number): string {
  const [x0, y0] = point(from);
  const [x1, y1] = point(to);
  const large = to - from > 0.5 ? 1 : 0;
  return `M${C},${C} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
}

export function PrismWheelPanel() {
  const r = useReport('prismwheel', wheelReport, 150);
  const data = r ?? wheelReport();
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  // where each wedge ends, as a share of the whole turn (the wheel starts at the top)
  const ends: number[] = [];
  data.wedges.reduce((t, w) => {
    ends.push(t + w.share);
    return t + w.share;
  }, 0);
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current === null || !svg.current) return;
    const box = svg.current.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * C * 2 - C;
    const y = ((e.clientY - box.top) / box.height) * C * 2 - C;
    let turn = Math.atan2(x, -y) / (Math.PI * 2);
    if (turn < 0) turn += 1;
    const k = drag.current;
    commands.moveWheelBoundary(k, turn - ends[k]!);
  };
  return (
    <Panel id="prismwheel" title="The Prism Wheel" color="#FF4FC1" size="wide">
      {!data.open ? (
        <Locked what="The Prism Wheel" req="opens when the Black Hole reaches its rainbow stage" />
      ) : (
        <div className="wheel-cols">
          <div className="wheel-box">
            <svg
              ref={svg}
              viewBox={`0 0 ${C * 2} ${C * 2}`}
              className="wheel"
              role="group"
              aria-label="The Prism Wheel: drag the white handles to move share between colours"
              onPointerMove={onMove}
              onPointerUp={() => (drag.current = null)}
              onPointerLeave={() => (drag.current = null)}
            >
              <circle cx={C} cy={C} r={R + 6} fill="#140B2E" />
              {data.wedges.map((w, i) => (
                <path key={w.id} d={wedgePath(i === 0 ? 0 : ends[i - 1]!, ends[i]!)} fill={w.color} stroke="#140B2E" strokeWidth={3} />
              ))}
              <path d={wedgePath(data.limit, 1)} fill="#3A3466" stroke="#140B2E" strokeWidth={3} />
              <text x={C} y={C + 6} textAnchor="middle" className="wheel-centre">
                {Math.round(data.limit * 100)}%
              </text>
              {ends.slice(0, -1).map((t, k) => {
                const [x, y] = point(t, R - 14);
                return (
                  <circle
                    key={k}
                    cx={x}
                    cy={y}
                    r={11}
                    className="wheel-handle"
                    tabIndex={0}
                    role="slider"
                    aria-label={`Between ${data.wedges[k]!.name} and ${data.wedges[k + 1]!.name}`}
                    aria-valuemin={0}
                    aria-valuemax={Math.round(data.limit * 100)}
                    aria-valuenow={Math.round(data.wedges[k]!.share * 100)}
                    data-handle={k}
                    onPointerDown={(e) => {
                      drag.current = k;
                      (e.target as Element).setPointerCapture?.(e.pointerId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') commands.moveWheelBoundary(k, 0.01);
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') commands.moveWheelBoundary(k, -0.01);
                    }}
                  />
                );
              })}
            </svg>
            <Button color={data.on ? 'var(--lime)' : '#5A5F8F'} aria-pressed={data.on} onClick={() => commands.setWheelOn(!data.on)} data-testid="wheel-on">
              The wheel is {data.on ? 'on' : 'off'}
            </Button>
          </div>
          <div className="well wheel-list">
            <p className="altar-fine">
              While on, {Math.round(data.limit * 100)}% of each Singularity's Dark Matter is split by these shares into eight banks; the shares always add up to {Math.round(data.limit * 100)}%. Each bank boosts its currency by (1 + bank)^0.5.
            </p>
            {data.wedges.map((w) => (
              <div key={w.id} className="seed-row wheel-row" style={tint(w.color)} data-wedge={w.id}>
                <span className="seed-dot" aria-hidden="true" />
                <span className="rune-name">
                  <b>
                    {w.name} <span className="num">{(w.share * 100).toFixed(1)}%</span>
                  </b>
                  <small className="num">
                    Bank {w.bank} · {w.mult}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---------- the Reactor ----------

export function ReactorPanel() {
  const r = useReport('reactor', reactorReport, 200);
  const data = r ?? reactorReport();
  return (
    <Panel id="reactor" title="Dark Matter Reactor" color="#FF4F6E" size="small">
      {!data.open ? (
        <Locked what="The Reactor" req="opens at 5 Singularities" />
      ) : (
        <div className="reactor">
          <div className="reactor-core chunk" style={tint('#FF4F6E')} aria-hidden="true">
            <span className="num ol">{data.mult}</span>
          </div>
          <p className="center">
            Charge <b className="num">{data.charge}</b> · Dark Matter gain <b className="num">{data.mult}</b> · strength <b className="num">{data.power}</b>
          </p>
          <HowTo
            label="How the Reactor works"
            steps={[
              <>
                <b>Feed</b> it Dark Matter. What you feed becomes charge.
              </>,
              <>
                <b>Charge</b> multiplies every Dark Matter you gain after (each Singularity, passive gain, Void asteroids).
              </>,
              <>
                <b>Choose</b>: Dark Matter fed here can't buy the Singularity Tree, so feed what you can spare.
              </>,
            ]}
          />
          <p className="altar-fine center">{data.keeps}</p>
          <BuyAmountControl compact />
          <Button size="lg" color={data.can ? 'var(--red)' : '#5A5F8F'} disabled={!data.can} onClick={() => commands.feedReactor()} data-testid="feed-reactor">
            Feed {data.count} Dark Matter
          </Button>
          <p className="center reactor-preview">
            Dark Matter gain <b className="num">{data.mult}</b> → <b className="num">{data.after}</b> after this feed
          </p>
        </div>
      )}
    </Panel>
  );
}
