import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { commands } from '../../app/commands';
import { mirrorReport, previewGain, wormholeReport } from '../../app/mirrorReports';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { useReport } from '../kit/useReport';

/** Phase 14 panels: the Antimatter Mirror and the Wormhole Network. */

function Locked({ what, req }: { what: string; req: string }) {
  return (
    <p className="depth-locked">
      <Icon name="lock" /> {what} {req}.
    </p>
  );
}

function Chip({ icon, value }: { icon: string; value: string }) {
  return (
    <span className="pill-mini">
      <Icon name={icon} />
      <span className="num">{value}</span>
    </span>
  );
}

// ---------- the Antimatter Mirror ----------

export function MirrorPanel() {
  const r = useReport('mirror', mirrorReport, 200);
  const data = r ?? mirrorReport();
  return (
    <Panel id="mirror" title="Antimatter Mirror" color="#2A6F8F" size="wide">
      {!data.open ? (
        <Locked what="The Mirror" req="appears at 8 Singularities" />
      ) : (
        <>
          <div className="tree-head">
            <p>The Stardust layer, mirrored. Its engines are your top ten in reverse; their milestones slow price growth instead of doubling output; each is boosted by its Stardust twin's Mastery; and the anti-star collapses down the tiers instead of evolving up, scrapping your Antimatter engines each time. A Singularity never resets it; a Galactic Rebirth does, but the Mirror Key stays.</p>
            <Chip icon="antimatter" value={data.antimatter} />
          </div>
          <div className="mirror-cols">
            <div className="well anti-star-box">
              <div className="anti-star" style={{ ['--c' as string]: data.starColor } as CSSProperties} aria-hidden="true" />
              <b className="anti-name">Anti-{data.starName}</b>
              <span>
                <b className="num">{data.rate}</b> · Antimatter <b className="num">{data.mult}</b>
              </span>
              <span className="depth-pips" aria-label={`Collapse depth ${data.depth} of 11`}>
                {Array.from({ length: 11 }, (_, i) => (
                  <i key={i} className={i < data.depth ? 'on' : ''} />
                ))}
              </span>
              {data.collapseCost ? (
                <Button color={data.canCollapse ? '#2A6F8F' : '#5A5F8F'} disabled={!data.canCollapse} onClick={() => commands.collapseMirror()} data-testid="mirror-collapse">
                  Collapse to {data.nextName} · {data.collapseCost}
                </Button>
              ) : (
                <span className="altar-fine">Collapsed all the way to a Protostar.</span>
              )}
              <span className="altar-fine">Each collapse: Antimatter x{data.depthMult} for good, but it scraps your Antimatter engines.</span>
            </div>
            <div className="mirror-engines">
              <BuyAmountControl compact />
              {data.rows.filter((e) => !e.hidden).map((e) =>
                e.revealed ? (
                  <div key={e.id} className="am-row chunk" style={tint(e.color)} data-am={e.id}>
                    <Icon name={e.icon} />
                    <div className="am-info">
                      <b>{e.name}</b>
                      <span className="num">
                        {e.owned} owned · {e.each} each · twin {e.twin}
                      </span>
                      <span className="num dim">
                        Price {e.ratio} a purchase, {e.nextStep}
                      </span>
                    </div>
                    <Button size="sm" color={e.can ? 'var(--lime)' : '#5A5F8F'} disabled={!e.can} onClick={() => commands.buyAmEngine(e.id)} aria-label={`Buy ${e.count} ${e.name} for ${e.cost} Antimatter`}>
                      x{e.count} · {e.cost}
                    </Button>
                  </div>
                ) : (
                  <div key={e.id} className="am-row chunk mystery" style={tint('#3A3F6F')}>
                    <Icon name="mystery" />
                    <div className="am-info">
                      <b>???</b>
                      <span className="num dim">Buy the engine before it to reveal this one</span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
          <h4 className="section-h">Mirror upgrades</h4>
          <div className="mirror-upgrades">
            {data.upgrades.map((u) => (
              <button key={u.id} type="button" className={cx('mu-tile chunk pop', u.owned && 'owned', u.locked && 'locked', u.id === 'mu.key' && 'key')} style={tint(u.id === 'mu.key' ? '#FFC83D' : '#2A6F8F')} disabled={u.owned || !u.can} onClick={() => commands.buyMirrorUpgrade(u.id)} data-mu={u.id}>
                <b>{u.name}</b>
                <span>{u.desc}</span>
                <span className="num">{u.owned ? 'Owned' : u.locked ? `Collapse ${u.depth} first` : `${u.cost} Antimatter`}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------- the Wormhole Network ----------

export function WormholesPanel() {
  const r = useReport('wormholes', wormholeReport, 200);
  const data = r ?? wormholeReport();
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const pick = (id: string) => {
    if (!from || from === id) {
      setFrom(from === id ? null : id);
      setTo(null);
    } else setTo(id);
  };
  const key = (id: string) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(id);
    }
  };
  const node = (id: string) => data.nodes.find((x) => x.id === id)!;
  const exists = !!from && !!to && data.links.some((l) => l.from === from && l.to === to);
  const room = from ? 50 - node(from).out : 0;
  return (
    <Panel id="wormholes" title="Wormhole Network" color="#5B45C2" size="wide">
      {!data.open ? (
        <Locked what="Wormholes" req="open at 6 Singularities" />
      ) : (
        <>
          <div className="tree-head">
            <p>Pick a system, then another, to open a wormhole between them. The first gives up a share of its orders of magnitude (its multiplier to the power 1 - share); the second gains x(1 + share x log10 of the first's multiplier), a quarter of that for Dark Matter and half for Essence, Antimatter and rune bulk.</p>
            <Chip icon="darkmatter" value={data.darkMatter} />
          </div>
          <div className="wh-cols">
            <svg className="wh-map" viewBox="-225 -205 450 450" role="group" aria-label="Wormhole map">
              <defs>
                <marker id="wh-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M0 0L10 5L0 10z" fill="#9FE7FF" />
                </marker>
              </defs>
              {data.links.map((l) => {
                const a = node(l.from);
                const b = node(l.to);
                // bend each link toward the middle of the ring, so neighbours' links clear the names
                const mx = ((a.x + b.x) / 2) * 0.45;
                const my = ((a.y + b.y) / 2) * 0.45;
                const lx = (a.x + 2 * mx + b.x) / 4;
                const ly = (a.y + 2 * my + b.y) / 4;
                return (
                  <g key={`${l.from}>${l.to}`} className="wh-link">
                    <path d={`M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`} markerEnd="url(#wh-arrow)" style={{ strokeWidth: 2 + l.share / 6 }} />
                    <text x={lx} y={ly} className="wh-share">
                      {l.share}%
                    </text>
                  </g>
                );
              })}
              {from && to && !exists && (
                <path className="wh-pending" d={`M${node(from).x} ${node(from).y} L${node(to).x} ${node(to).y}`} markerEnd="url(#wh-arrow)" />
              )}
              {data.nodes.map((x) => (
                <g
                  key={x.id}
                  className={cx('wh-node', from === x.id && 'from', to === x.id && 'to')}
                  transform={`translate(${x.x} ${x.y})`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={from === x.id || to === x.id}
                  aria-label={`${x.name}, multiplier ${x.mult}, ${x.out}% sent out`}
                  onClick={() => pick(x.id)}
                  onKeyDown={key(x.id)}
                  data-node={x.id}
                >
                  <circle r="24" fill={x.color} />
                  <foreignObject x={-15} y={-15} width={30} height={30} className="wh-ico">
                    <Icon name={x.icon} />
                  </foreignObject>
                  <text y="40" className="wh-name">
                    {x.name}
                  </text>
                  <text y="53" className="wh-mult">
                    {x.mult}
                  </text>
                </g>
              ))}
            </svg>
            <div className="wh-side">
              <div className="well wh-open">
                {!from ? (
                  <span>Pick the system that gives.</span>
                ) : !to ? (
                  <span>
                    <b>{node(from).name}</b> gives (up to {room}% left). Now pick the one that gains.
                  </span>
                ) : exists ? (
                  <span>That wormhole is already open.</span>
                ) : (
                  <>
                    <span>
                      <b>{node(from).name}</b> to <b>{node(to).name}</b>: about {previewGain(from, to)} at 20%.
                    </span>
                    <Button
                      color={data.canOpen && room > 0 ? '#5B45C2' : '#5A5F8F'}
                      disabled={!data.canOpen || room <= 0}
                      onClick={() => {
                        if (commands.openWormhole(from, to)) {
                          setFrom(null);
                          setTo(null);
                        }
                      }}
                      data-testid="wh-open"
                    >
                      Open for {data.cost} Dark Matter
                    </Button>
                  </>
                )}
                <span className="altar-fine">
                  {data.links.length} of {data.maxLinks} wormholes. {data.full ? 'Close one to open another.' : `The next costs ${data.cost} Dark Matter.`}
                </span>
              </div>
              {data.links.map((l) => (
                <div key={`${l.from}>${l.to}`} className="well wh-row" data-link={`${l.from}>${l.to}`}>
                  <b>{l.label}</b>
                  <label className="slider">
                    <span>
                      Share <b className="num">{l.share}%</b> · gives {l.loss} · gains <b className="num">{l.gain}</b>
                    </span>
                    <input type="range" min={data.step} max={l.max} step={data.step} value={l.share} onChange={(e) => commands.setWormholeShare(l.index, Number(e.target.value) / 100)} aria-label={`${l.label} share`} />
                  </label>
                  <Button size="sm" color="#5A5F8F" onClick={() => commands.closeWormhole(l.index)}>
                    Close
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
