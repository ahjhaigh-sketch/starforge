import { useEffect, useRef, useState } from 'react';
import { beyondLayerReport, lawsReport, livesReport, pantheonReport, tesseractReport, type AxisRow } from '../../app/beyondReports';
import { commands } from '../../app/commands';
import { useSnap } from '../../app/uiSnapshot';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { HowTo } from '../kit/HowTo';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';
import { useUi } from '../store';

/**
 * 1.4.0: the four resets beyond the Multiverse, and their systems. Each reset panel shows its
 * requirement, what it pays, what it wipes (only the three layers just below) and its milestones;
 * a second press confirms.
 */
function BeyondResetPanel({ id }: { id: string }) {
  const r = useReport(id, () => beyondLayerReport(id), 300);
  const open = useUi((s) => s.open);
  const close = useUi((s) => s.close);
  const [confirm, setConfirm] = useState(false);
  if (!r) return null;
  return (
    <Panel id={id} title={r.name} color={r.color} size="wide">
      <div className="tree-head">
        <p>{r.blurb} It wipes only the three layers just below it; everything further down stays, running itself.</p>
        <span className="beyond-chip chunk" style={tint('#1E2A5E')}>
          <Icon name={r.icon} /> <b className="num">{r.held}</b> {r.currencyName}
        </span>
      </div>
      <div className="nebula-cols">
        <div className="well nebula-run">
          <h4>This run</h4>
          <p>
            {r.prevName} gained this run: <b className="num">{r.run}</b> / {r.need}
          </p>
          <ProgressBar value={r.pct / 100} color={r.color} label={`${r.name} requirement`} />
          {r.ready && (
            <small>
              Next {r.currencyName} at <span className="num">{r.next}</span> {r.prevName} this run.
            </small>
          )}
          {!confirm ? (
            <Button size="lg" color={r.ready ? r.color : '#5A5F8F'} disabled={!r.ready} onClick={() => setConfirm(true)} data-testid={`go-${id}`}>
              {r.ready ? `${r.action}: +${r.gain} ${r.currencyName}` : 'Not yet'}
            </Button>
          ) : (
            <div className="confirm">
              <div className="confirm-cols">
                <div className="well">
                  <h4>Resets</h4>
                  <ul>
                    {r.resets.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="well">
                  <h4>Kept</h4>
                  <ul>
                    {r.kept.map((x) => (
                      <li key={x.label}>
                        {x.label} <small>({x.why})</small>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="confirm-actions">
                <Button color="#5A5F8F" onClick={() => setConfirm(false)}>
                  Not yet
                </Button>
                <Button
                  color={r.color}
                  onClick={() => {
                    setConfirm(false);
                    if (commands.reset(id)) close();
                  }}
                  data-testid={`confirm-${id}`}
                >
                  {r.action}
                </Button>
              </div>
            </div>
          )}
          {r.feature.open && (
            <div className="nebula-links">
              <Button size="sm" color="#3B4370" onClick={() => open(r.feature.id)}>
                {r.feature.name}
              </Button>
            </div>
          )}
        </div>
        <div className="well">
          <h4>Milestones ({r.done})</h4>
          <ul className="milestones">
            {r.milestones.map((m) => (
              <li key={m.at} className={m.reached ? 'reached' : ''}>
                <b className="num">{m.at}</b> {m.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

export const HyperversePanel = () => <BeyondResetPanel id="hyperverse" />;
export const OmniversePanel = () => <BeyondResetPanel id="omniverse" />;
export const GenesisPanel = () => <BeyondResetPanel id="genesis" />;
export const ApotheosisPanel = () => <BeyondResetPanel id="apotheosis" />;

// ---------- the Tesseract ----------

/** The 16 corners of a 4D cube and its 32 edges (corners one bit apart). */
const CORNERS = Array.from({ length: 16 }, (_, i) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
const EDGES: Array<[number, number]> = [];
for (let a = 0; a < 16; a++) for (let k = 0; k < 4; k++) if (!(a & (1 << k))) EDGES.push([a, a | (1 << k)]);

/** A turning tesseract: rotated in the XW and YZ planes, projected 4D to 3D to 2D. Each axis's edges take its layer's colour. */
function TesseractView({ axes }: { axes: AxisRow[] }) {
  const reduced = useSnap((s) => s.reducedMotion);
  const [t, setT] = useState(0.6);
  const raf = useRef(0);
  useEffect(() => {
    if (reduced) return;
    let last = performance.now();
    const step = (now: number) => {
      setT((x) => x + (now - last) / 4000);
      last = now;
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [reduced]);
  const pts = CORNERS.map(([x, y, z, w]) => {
    const c1 = Math.cos(t);
    const s1 = Math.sin(t);
    const c2 = Math.cos(t * 0.7);
    const s2 = Math.sin(t * 0.7);
    const x1 = x! * c1 - w! * s1;
    const w1 = x! * s1 + w! * c1;
    const y1 = y! * c2 - z! * s2;
    const z1 = y! * s2 + z! * c2;
    const k4 = 2.6 / (3 - w1);
    const X = x1 * k4;
    const Y = y1 * k4;
    const Z = z1 * k4;
    const k3 = 3.2 / (4.2 - Z);
    return { x: 110 + X * k3 * 42, y: 110 + Y * k3 * 42, d: Z };
  });
  return (
    <svg className="tesseract-view" viewBox="0 0 220 220" role="img" aria-label="A turning tesseract: four axes, each folded through a layer">
      <circle cx="110" cy="110" r="104" className="tesseract-halo" />
      {EDGES.map(([a, b]) => {
        const axis = Math.log2(a ^ b);
        const col = axes[axis]?.layer ? axes[axis]!.color : '#5A5F8F';
        const pa = pts[a]!;
        const pb = pts[b]!;
        return <line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={col} strokeWidth={1.4 + Math.max(0, (pa.d + pb.d) / 2 + 1)} strokeLinecap="round" opacity={0.55 + 0.45 * Math.min(1, ((pa.d + pb.d) / 2 + 1.5) / 3)} />;
      })}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.4 + Math.max(0, p.d + 1)} fill="#E8FFF8" stroke="#140B2E" strokeWidth="1" />
      ))}
    </svg>
  );
}

export function TesseractPanel() {
  const r = useReport('tesseract', tesseractReport, 250);
  const [pick, setPick] = useState<number | null>(null);
  if (!r) return null;
  return (
    <Panel id="tesseract" title="Tesseract" color="#2A8F7A" size="wide">
      {!r.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> The Tesseract opens with your first Hyperverse.
        </p>
      ) : (
        <>
          <HowTo
            label="How the Tesseract works"
            steps={[
              'Fold each of the four axes through a layer: it multiplies that layer’s gain by (1 + log of every bit of its currency you’ve ever had), once a level.',
              'Raise an axis with Tesseracts. Prices double every level.',
              'Two neighbouring axes (W beside X, X beside Y, Y beside Z, Z beside W) folded through neighbouring layers resonate: x1.5 the power for each.',
            ]}
          />
          <div className="tesseract-wrap">
            <TesseractView axes={r.axes} />
            <div className="tesseract-axes">
              <span className="beyond-chip chunk" style={tint('#1E2A5E')}>
                <Icon name="tesseract" /> <b className="num">{r.tesseracts}</b> Tesseracts
              </span>
              <BuyAmountControl compact />
              {r.axes.map((a, i) => (
                <div key={a.axis} className="axis-row chunk" style={tint('#1E3A4E')} data-axis={a.axis}>
                  <b className="axis-name" style={{ color: a.color }}>
                    {a.axis}
                  </b>
                  <button type="button" className="axis-fold chunk pop" style={tint(a.color)} onClick={() => setPick(pick === i ? null : i)} aria-expanded={pick === i}>
                    {a.name}
                  </button>
                  <span className="num axis-mult">
                    Lv {a.level} · {a.mult}
                    {a.resonance > 0 ? ` · resonates x${a.resonance}` : ''}
                  </span>
                  <Button size="sm" color={a.can ? '#1E9C82' : '#5A5F8F'} disabled={!a.can || !a.layer} onClick={() => commands.buyAxis(i)}>
                    +{a.count || 1} · <span className="num">{a.cost}</span>
                  </Button>
                  {pick === i && (
                    <div className="axis-picker">
                      {r.folds.map((f) => (
                        <button
                          key={f.layer}
                          type="button"
                          className={cx('chunk pop', f.layer === a.layer && 'on')}
                          style={tint(f.color)}
                          onClick={() => {
                            commands.setAxis(i, f.layer);
                            setPick(null);
                          }}
                        >
                          {f.name}
                          {f.used && f.layer !== a.layer ? ' (moves here)' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------- the Pantheon ----------

export function PantheonPanel() {
  const r = useReport('pantheon', pantheonReport, 300);
  if (!r) return null;
  return (
    <Panel id="pantheon" title="Pantheon" color="#C99A1E" size="wide">
      {!r.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> The Pantheon opens with your first Omniverse.
        </p>
      ) : (
        <>
          <HowTo
            label="How the Pantheon works"
            steps={[
              'Wake an Aspect with Aether: each costs three times the last.',
              `Up to ${r.slots} stand Ascendant at full strength; the rest give a tenth.`,
              'Raise devotion for bigger boosts. Every pair that stands Ascendant together finds its Rite: every Aspect stronger, for good.',
            ]}
          />
          <div className="tree-head">
            <span className="beyond-chip chunk" style={tint('#3A2A10')}>
              <Icon name="aether" /> <b className="num">{r.aether}</b> Aether
            </span>
            <span className="beyond-chip chunk" style={tint('#3A2A10')}>
              Ascendant <b className="num">{`${r.ascendant} / ${r.slots}`}</b> · Rites <b className="num">{`${r.found} / ${r.rites.length}`}</b>
            </span>
            <BuyAmountControl compact />
          </div>
          <div className="aspect-grid">
            {r.aspects.map((a) => (
              <div key={a.id} className={cx('aspect-card chunk', a.awake && 'awake', a.ascendant && 'ascendant')} style={tint(a.awake ? a.color : '#2B2558')} data-aspect={a.id}>
                <span className="aspect-sigil" aria-hidden="true" />
                <b className="ol">{a.name}</b>
                <small>{a.title}</small>
                <span className="aspect-desc">{a.desc}</span>
                {a.awake ? (
                  <>
                    <span className="num">
                      Devotion {a.devotion} · {a.share}%
                    </span>
                    <div className="aspect-actions">
                      <Button size="sm" color={a.can ? '#B08A1A' : '#5A5F8F'} disabled={!a.can} onClick={() => commands.buyDevotion(a.id)}>
                        +{a.count || 1} · <span className="num">{a.cost}</span>
                      </Button>
                      <Button size="sm" gloss={false} color={a.ascendant ? 'var(--lime)' : '#5A5F8F'} disabled={!a.ascendant && r.ascendant >= r.slots} onClick={() => commands.setAscendant(a.id, !a.ascendant)} aria-pressed={a.ascendant}>
                        {a.ascendant ? 'Ascendant' : 'Raise'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button size="sm" color={r.canWake ? '#B08A1A' : '#5A5F8F'} disabled={!r.canWake} onClick={() => commands.wakeAspect(a.id)}>
                    Wake · <span className="num">{r.wakeCost}</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
          <h4 className="section-h">Rites</h4>
          <div className="rite-grid">
            {r.rites.map((x) => (
              <span key={x.id} className={cx('rite chunk', x.found && 'found')} title={x.found ? x.name : 'Stand both Aspects Ascendant together to find it'}>
                {x.found ? x.name.replace('Rite of ', '') : '???'}
              </span>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------- the Laws ----------

export function LawsPanel() {
  const r = useReport('laws', lawsReport, 300);
  if (!r) return null;
  const left = r.points - r.used;
  return (
    <Panel id="laws" title="Laws of Physics" color="#2E9C78" size="wide">
      {!r.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> The Laws open with your first Genesis.
        </p>
      ) : (
        <>
          <HowTo
            label="How the Laws work"
            steps={[
              'Every step a law turns, either way, uses one point. You get one point for every doubling of the Origin Seeds you have ever had.',
              'Turned up, a law boosts one thing and gives up a little of another; turned down, the other way round.',
              'Turn every law at least one step for Harmony: Origin Seeds x2.',
            ]}
          />
          <div className="tree-head">
            <span className="beyond-chip chunk" style={tint('#14402E')}>
              Points <b className="num">{`${r.used} / ${r.points}`}</b>
            </span>
            <span className={cx('beyond-chip chunk', r.harmony && 'lit')} style={tint(r.harmony ? '#3E9E2A' : '#14402E')}>
              Harmony {r.harmony ? 'on: Origin Seeds x2' : 'off'}
            </span>
          </div>
          <div className="law-list">
            {r.laws.map((l) => (
              <div key={l.id} className="law-row chunk" style={tint('#12302A')} data-law={l.id}>
                <b className="ol" style={{ color: l.color }}>
                  {l.name}
                </b>
                <div className="law-dial" role="group" aria-label={`${l.name}: ${l.value}`}>
                  <Button size="sm" color="#3B4370" disabled={l.value <= -r.max || (l.value <= 0 && left <= 0)} onClick={() => commands.setLaw(l.id, l.value - 1)} aria-label={`Turn ${l.name} down`}>
                    -
                  </Button>
                  <span className="law-track" aria-hidden="true">
                    {Array.from({ length: r.max * 2 + 1 }, (_, k) => k - r.max).map((k) => (
                      <i key={k} className={cx(k === 0 && 'zero', k !== 0 && Math.sign(k) === Math.sign(l.value) && Math.abs(k) <= Math.abs(l.value) && 'on')} style={{ background: k !== 0 && Math.sign(k) === Math.sign(l.value) && Math.abs(k) <= Math.abs(l.value) ? l.color : undefined }} />
                    ))}
                  </span>
                  <Button size="sm" color="#3B4370" disabled={l.value >= r.max || (l.value >= 0 && left <= 0)} onClick={() => commands.setLaw(l.id, l.value + 1)} aria-label={`Turn ${l.name} up`}>
                    +
                  </Button>
                  <b className="num law-value">{l.value > 0 ? `+${l.value}` : l.value}</b>
                </div>
                <small>{l.up}</small>
                <small>{l.down}</small>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------- Past Lives and Miracles ----------

export function LivesPanel() {
  const r = useReport('lives', livesReport, 400);
  if (!r) return null;
  return (
    <Panel id="lives" title="Past Lives" color="#6B4BC8" size="wide">
      {!r.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> Past Lives open with your first Apotheosis.
        </p>
      ) : (
        <>
          {!r.storySeen && (
            <div className="epilogue well" data-testid="epilogue">
              {r.story.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <Button color="#6B4BC8" onClick={() => commands.markEpilogueSeen()}>
                Go on
              </Button>
            </div>
          )}
          <HowTo
            label="How Past Lives work"
            steps={[
              `Every Apotheosis becomes a Life, scored on the Origin Seeds of that run. The best ${r.kept} are remembered.`,
              'Every point of score makes Tesseracts, Aether, Origin Seeds and Divinity 1% bigger; your guiding Life counts three times.',
              'Divinity buys Miracles, each yours for good.',
            ]}
          />
          <div className="tree-head">
            <span className="beyond-chip chunk" style={tint('#2B2558')}>
              <Icon name="divinity" /> <b className="num">{r.divinity}</b> Divinity
            </span>
            <span className="beyond-chip chunk" style={tint('#2B2558')}>
              Lives give <b className="num">{r.bonus}</b>
            </span>
          </div>
          <div className="life-list">
            {r.lives.map((l, i) => (
              <div key={l.n} className={cx('life-card chunk', l.guide && 'guide')} style={tint(l.guide ? '#6B4BC8' : '#2B2558')}>
                <Icon name="lives" />
                <b className="ol">
                  Life {l.n}: the {l.title}
                </b>
                <span className="num">Score {l.score}</span>
                <Button size="sm" gloss={false} color={l.guide ? 'var(--lime)' : '#5A5F8F'} onClick={() => commands.setGuide(l.guide ? -1 : i)} aria-pressed={l.guide}>
                  {l.guide ? 'Guiding' : 'Guide me'}
                </Button>
              </div>
            ))}
          </div>
          <h4 className="section-h">Miracles</h4>
          <div className="mu-grid">
            {r.miracles.map((m) => (
              <button key={m.id} type="button" className={cx('mu-tile chunk pop', m.owned && 'owned')} style={tint('#4A3A8C')} disabled={m.owned || !m.can} onClick={() => commands.buyMiracle(m.id)} data-miracle={m.id}>
                <b>{m.name}</b>
                <span>{m.desc}</span>
                <span className="num">{m.owned ? 'Yours' : `${m.cost} Divinity`}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
