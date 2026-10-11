import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { commands } from '../../app/commands';
import { coloniesReport, megaReport, terraformReport } from '../../app/galaxyBuildReports';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';
import { useUi } from '../store';

/** Phase 16 panels: Megastructures, Colonies and Terraforming. */

function Chip({ icon, value }: { icon: string; value: string }) {
  return (
    <span className="pill-mini">
      <Icon name={icon} />
      <span className="num">{value}</span>
    </span>
  );
}

// ---------- Megastructures ----------

export function MegastructuresPanel() {
  const r = useReport('megastructures', megaReport, 250);
  const cards = r ?? megaReport();
  return (
    <Panel id="megastructures" title="Megastructures" color="#B08A1A" size="wide">
      <div className="tree-head">
        <p>Six builds of five stages, each fed by currencies from every layer. A stage's reward is yours for good: no reset touches what you've built, and each one rises in the sky round your star.</p>
      </div>
      <div className="mega-grid">
        {cards.map((m) => (
          <div key={m.id} className={cx('mega-card chunk', !m.open && 'locked', m.stage >= m.stages && 'done')} style={tint(m.open ? m.color : '#3A3F6F')} data-mega={m.id}>
            <div className="mega-top">
              <span className={cx('mega-glyph', m.id)} aria-hidden="true" />
              <b>{m.name}</b>
              <span className="mega-pips" aria-label={`Stage ${m.stage} of ${m.stages}`}>
                {Array.from({ length: m.stages }, (_, i) => (
                  <i key={i} className={i < m.stage ? 'on' : ''} />
                ))}
              </span>
            </div>
            {!m.open ? (
              <p className="mega-desc">Opens at {m.needs} Galactic Rebirth{m.needs === 1 ? '' : 's'}.</p>
            ) : (
              <>
                <p className="mega-desc">{m.desc}</p>
                <p className="mega-reward">
                  {m.reward}
                  {m.now && <span className="num"> Now {m.now}.</span>}
                </p>
                {m.stage < m.stages ? (
                  <>
                    <ul className="mega-cost">
                      {m.cost.map((c) => (
                        <li key={c.label} className={c.have ? 'have' : 'short'}>
                          <span className="num">{c.amount}</span> {c.label}
                        </li>
                      ))}
                    </ul>
                    <Button size="sm" color={m.can ? 'var(--lime)' : '#5A5F8F'} disabled={!m.can} onClick={() => commands.buildMegaStage(m.id)} data-testid={`build-${m.id}`}>
                      Build stage {m.stage + 1}
                    </Button>
                  </>
                ) : (
                  <span className="mega-done">Complete</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------- Colonies ----------

export function ColoniesPanel() {
  const r = useReport('colonies', coloniesReport, 200);
  const open = useUi((s) => s.open);
  const data = r ?? coloniesReport();
  const [a, setA] = useState(0);
  const [b, setB] = useState(1);
  return (
    <Panel id="colonies" title="Colonies" color="#2B7FD0" size="wide">
      {!data.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> Colonies open at 2 Galactic Rebirths.
        </p>
      ) : (
        <>
          <div className="tree-head">
            <p>Settle planets. People grow towards each colony's capacity (offline exactly as online) and make Supply, which pays for buildings, spaceports, research and terraforming. Each planet type boosts one thing. You may hold one colony per galaxy explored, plus one.</p>
            <Chip icon="colony" value={`${data.supply} (${data.supplyRate})`} />
          </div>
          {data.used < data.slots && (
            <div className="well col-found">
              <span>
                Found colony {data.used + 1} of {data.slots} for <b className="num">{data.foundCost}</b> Galaxy Cores:
              </span>
              <div className="col-types">
                {data.types.map((t) => (
                  <Button key={t.id} size="sm" color={data.canFound ? t.color : '#5A5F8F'} disabled={!data.canFound} onClick={() => commands.foundColony(t.id)} data-testid={`found-${t.id}`}>
                    {t.name} ({t.what})
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="col-grid">
            {data.colonies.map((c) => (
              <div key={c.i} className="col-card chunk" style={tint(c.color)} data-colony={c.i}>
                <div className="col-top">
                  <b>{c.name}</b>
                  <span>{c.type}</span>
                </div>
                <ProgressBar value={c.pct / 100} color="#B4F04A" label={`${c.name} population`} />
                <span className="num col-pop">
                  {c.pop} / {c.cap} people · {c.growth}
                </span>
                <span className="col-line">
                  {c.what} <b className="num">{c.bonus}</b> · Supply <b className="num">{c.supply}</b> · {c.routes} route{c.routes === 1 ? '' : 's'}
                </span>
                {c.finished && <span className="col-line done">{c.finished}</span>}
                <div className="col-builds">
                  {c.buildings.map((bd) => (
                    <Button key={bd.id} size="sm" color={bd.can ? '#2B7FD0' : '#5A5F8F'} disabled={!bd.can} onClick={() => commands.buyColonyBuilding(c.i, bd.id)} title={bd.desc} data-testid={`build-${bd.id}-${c.i}`}>
                      {bd.name} {bd.level} · {bd.cost}
                    </Button>
                  ))}
                  {!c.port && (
                    <Button size="sm" color={c.canPort ? '#5B45C2' : '#5A5F8F'} disabled={!c.canPort} onClick={() => commands.buyColonyPort(c.i)}>
                      Spaceport · {c.portCost}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {data.colonies.length >= 2 && (
            <div className="well col-routes">
              <h4 className="section-h">
                Trade routes ({data.routes.length} of {data.maxRoutes})
              </h4>
              <span className="altar-fine">A route joins two colonies with spaceports; both make x1.5 Supply for each route they're on.</span>
              <div className="col-route-pick">
                <select value={a} onChange={(e) => setA(Number(e.target.value))} aria-label="First colony">
                  {data.colonies.map((c) => (
                    <option key={c.i} value={c.i}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select value={b} onChange={(e) => setB(Number(e.target.value))} aria-label="Second colony">
                  {data.colonies.map((c) => (
                    <option key={c.i} value={c.i}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" color="#5B45C2" onClick={() => commands.openTradeRoute(a, b)} data-testid="open-route">
                  Open route
                </Button>
              </div>
              {data.routes.map((rt) => (
                <span key={rt.index} className="col-route">
                  {rt.label}
                  <Button size="sm" color="#5A5F8F" onClick={() => commands.closeTradeRoute(rt.index)}>
                    Close
                  </Button>
                </span>
              ))}
            </div>
          )}
          <h4 className="section-h">Research</h4>
          <div className="col-research">
            {data.research.map((rs) => (
              <button key={rs.id} type="button" className={cx('res-tile chunk pop', rs.owned && 'owned')} style={tint('#2B7FD0')} disabled={rs.owned || !rs.can} onClick={() => commands.buyColonyResearch(rs.id)} data-research={rs.id}>
                <b>{rs.name}</b>
                <span>{rs.desc}</span>
                <span className="num">{rs.owned ? 'Done' : `${rs.cost} Supply`}</span>
              </button>
            ))}
          </div>
          <div className="center-row">
            <Button size="sm" color="#3E9E2A" onClick={() => open('terraform')}>
              Terraform
            </Button>
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------- Terraforming ----------

const HEX = 34;

export function TerraformPanel() {
  const [pick, setPick] = useState(0);
  const [biome, setBiome] = useState('ocean');
  const r = useReport('terraform', () => terraformReport(pick), 150);
  const data = r ?? terraformReport(pick);
  const pos = (q: number, rr: number) => ({ x: HEX * Math.sqrt(3) * (q + rr / 2), y: HEX * 1.5 * rr });
  const corners = (x: number, y: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 180) * (60 * k - 30);
      return `${(x + (HEX - 2) * Math.cos(a)).toFixed(1)},${(y + (HEX - 2) * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
  const key = (i: number) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commands.placeBiome(pick, i, biome);
    }
  };
  return (
    <Panel id="terraform" title="Terraforming" color="#3E9E2A" size="wide">
      {!data.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> Research Terraformers in the Colonies panel first.
        </p>
      ) : data.colonies.length === 0 ? (
        <p className="depth-locked">Found a colony first.</p>
      ) : (
        <>
          <div className="tree-head">
            <p>Fill a colony planet's 19 hexes with biomes. Neighbours score together (ocean beside crystal forest, lava beside tundra); some pairs clash. Finish the planet to lock its score in: its colony's bonus is multiplied for good.</p>
            <Chip icon="colony" value={data.supply} />
          </div>
          <div className="terra-tabs" role="tablist" aria-label="Colony planets">
            {data.colonies.map((c) => (
              <button key={c.i} type="button" role="tab" aria-selected={pick === c.i} className={cx('chunk pop terra-tab', pick === c.i && 'on')} onClick={() => setPick(c.i)}>
                {c.name}
                {c.finished && ' (done)'}
              </button>
            ))}
          </div>
          <div className="terra-cols">
            <svg className="terra-map" viewBox="-200 -175 400 350" role="group" aria-label={`${data.name} hexes`}>
              {data.grid.map((h) => {
                const { x, y } = pos(h.q, h.r);
                return (
                  <g
                    key={h.i}
                    className={cx('terra-hex', !h.biome && 'empty')}
                    role="button"
                    tabIndex={0}
                    aria-label={`Hex ${h.i + 1}: ${h.biome ?? 'empty'}`}
                    onClick={() => commands.placeBiome(pick, h.i, biome)}
                    onKeyDown={key(h.i)}
                    data-hex={h.i}
                    style={{ ['--c' as string]: h.color || '#2A2160' } as CSSProperties}
                  >
                    <polygon points={corners(x, y)} />
                  </g>
                );
              })}
              {data.edges
                .filter((e) => e.value !== 0)
                .map((e) => {
                  const a = data.grid[e.a]!;
                  const b = data.grid[e.b]!;
                  const pa = pos(a.q, a.r);
                  const pb = pos(b.q, b.r);
                  return (
                    <text key={`${e.a}-${e.b}`} x={(pa.x + pb.x) / 2} y={(pa.y + pb.y) / 2 + 4} className={cx('terra-edge', e.value < 0 && 'neg')}>
                      {e.value > 0 ? `+${e.value}` : e.value}
                    </text>
                  );
                })}
            </svg>
            <div className="terra-side">
              <div className="well terra-score">
                <span className="obs-big num">{data.finished ?? data.score}</span>
                <span>
                  {data.name} ({data.type}): {data.filled} of {data.total} hexes. {data.what} {data.mult} when finished.
                </span>
                {data.finished === null ? (
                  <Button color={data.canFinish ? '#3E9E2A' : '#5A5F8F'} disabled={!data.canFinish} onClick={() => commands.finishPlanet(pick)} data-testid="terra-finish">
                    {data.canFinish ? 'Finish this planet' : 'Fill every hex to finish'}
                  </Button>
                ) : (
                  <span className="col-line done">Finished: the score is locked in.</span>
                )}
              </div>
              <div className="terra-palette" role="radiogroup" aria-label="Biome to place">
                {data.biomes.map((bm) => (
                  <button key={bm.id} type="button" role="radio" aria-checked={biome === bm.id} className={cx('chunk pop terra-biome', biome === bm.id && 'on')} style={tint(bm.color)} onClick={() => setBiome(bm.id)} data-biome={bm.id}>
                    {bm.name}
                  </button>
                ))}
              </div>
              <span className="altar-fine">Each hex costs {data.cost} Supply (you can paint over until you finish).</span>
              <div className="well terra-pairs">
                {data.pairs.map((p) => (
                  <span key={`${p.a}-${p.b}`} className={p.value < 0 ? 'neg' : ''}>
                    {p.a} + {p.b}: <b className="num">{p.value > 0 ? `+${p.value}` : p.value}</b>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
