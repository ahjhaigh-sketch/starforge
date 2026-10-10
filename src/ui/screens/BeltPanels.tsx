import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { commands } from '../../app/commands';
import { beltReport, drillReport, starsmithReport } from '../../app/beltReports';
import { snapshotStore, useSnap } from '../../app/uiSnapshot';
import type { BeltUpgradeId } from '../../content/belt';
import { BeltField } from '../../render/beltField';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';
import { useUi } from '../store';

/** Arrow keys move the beam this far, so the field also works without a pointer. */
const KEY_STEP = 28;

/**
 * The harvest field: a PixiJS canvas the tractor beam sweeps. The beam follows the mouse, or a
 * dragging finger (lifted = no beam), or the arrow keys while the field has focus.
 */
function BeltCanvas() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const field = useRef<BeltField | null>(null);
  const beam = useRef<{ x: number; y: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const box = host.current;
    const el = canvas.current;
    if (!box || !el) return;
    const f = new BeltField();
    let alive = true;
    let ready = false;
    let unsub = () => {};
    let ro: ResizeObserver | null = null;
    void f.mount(el, Math.max(1, box.clientWidth), Math.max(1, box.clientHeight)).then((ok) => {
      ready = true;
      if (!alive) return f.destroy();
      if (!ok) return setFailed(true);
      field.current = f;
      let last = '';
      const sync = () => {
        const s = snapshotStore.getState();
        f.radius = s.beamRadius;
        f.setReducedMotion(s.reducedMotion);
        if (s.beltField !== last) f.setField((last = s.beltField));
      };
      sync();
      unsub = snapshotStore.subscribe(sync);
      f.onHarvest = (ids) => void commands.harvest(ids);
      ro = new ResizeObserver(() => f.resize(Math.max(1, box.clientWidth), Math.max(1, box.clientHeight)));
      ro.observe(box);
    });
    return () => {
      alive = false;
      unsub();
      ro?.disconnect();
      field.current = null;
      if (ready) f.destroy();
    };
  }, []);

  const aim = (p: { x: number; y: number } | null) => {
    beam.current = p;
    field.current?.setPointer(p);
  };
  const local = (e: PointerEvent) => {
    const r = host.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onKey = (e: KeyboardEvent) => {
    const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const step = d[e.key];
    const box = host.current;
    if (!step || !box) return;
    e.preventDefault();
    const at = beam.current ?? { x: box.clientWidth / 2, y: box.clientHeight / 2 };
    aim({ x: Math.max(0, Math.min(box.clientWidth, at.x + step[0] * KEY_STEP)), y: Math.max(0, Math.min(box.clientHeight, at.y + step[1] * KEY_STEP)) });
  };

  if (failed) return <SweepFallback />;
  return (
    <div
      ref={host}
      className="belt-field well"
      tabIndex={0}
      role="application"
      aria-label="Asteroid field. Move the pointer, drag a finger, or use the arrow keys to sweep the tractor beam over asteroids."
      data-testid="belt-field"
      onPointerDown={(e) => aim(local(e))}
      onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons > 0 ? aim(local(e)) : undefined)}
      onPointerUp={(e) => e.pointerType !== 'mouse' && aim(null)}
      onPointerLeave={() => aim(null)}
      onPointerCancel={() => aim(null)}
      onFocus={() => !beam.current && host.current && aim({ x: host.current.clientWidth / 2, y: host.current.clientHeight / 2 })}
      onBlur={() => aim(null)}
      onKeyDown={onKey}
    >
      <canvas ref={canvas} />
      <span className="belt-hint">Sweep the beam over asteroids</span>
    </div>
  );
}

/** Without WebGL the field can't be drawn; a button harvests a handful instead. */
function SweepFallback() {
  const field = useSnap((s) => s.beltField);
  const ids = field ? field.split('|').map((p) => Number(p.split(':')[0])) : [];
  return (
    <div className="belt-field well fallback">
      <p>
        <b className="num">{ids.length}</b> asteroids in the field.
      </p>
      <Button disabled={ids.length === 0} onClick={() => commands.harvest(ids.slice(0, 5))}>
        Harvest 5
      </Button>
    </div>
  );
}

function OrePill({ value }: { value: string }) {
  return (
    <div className="pill chunk" style={tint('#3B4370')} aria-label="Ore">
      <span className="ico">
        <Icon name="belt" />
      </span>
      <span className="val ol num">{value}</span>
    </div>
  );
}

export function BeltPanel() {
  const r = useReport('belt', beltReport, 150);
  return (
    <Panel id="belt" title="Asteroid Belt" color="#6E7BAE" size="wide">
      <div className="tree-head">
        <p>Asteroids drift into the field. Sweep the tractor beam over them for ore, Starsmith XP and a little Stardust. Rare ones glow and are worth far more.</p>
        {r && <OrePill value={r.ore} />}
      </div>
      <BeltCanvas />
      {r && (
        <div className="belt-cols">
          <div className="belt-ups">
            <BuyAmountControl compact />
            {r.upgrades.map((u) => (
              <div key={u.id} className="belt-up chunk" style={tint('#2B1F6E')} data-belt-up={u.id}>
                <span className="tile chunk" style={tint('#6E7BAE')}>
                  <Icon name={u.icon} />
                </span>
                <div className="belt-up-body">
                  <b>
                    {u.name} <span className="num lvl">{u.level}</span>
                  </b>
                  <small>{u.desc}</small>
                </div>
                <Button
                  size="sm"
                  color={u.can ? 'var(--lime)' : '#5A5F8F'}
                  disabled={!u.can}
                  onClick={() => commands.buyBeltUpgrade(u.id as BeltUpgradeId)}
                  aria-label={u.maxed ? `${u.name} is maxed` : `Buy ${u.count} ${u.name} for ${u.cost} ore`}
                >
                  {u.maxed ? (
                    'Max'
                  ) : (
                    <>
                      {u.count > 1 && <span className="num buy-n">+{u.count}</span>}
                      <span className="cost-chip">
                        <Icon name="belt" />
                        {r.free ? 'Free' : u.cost}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            ))}
            {r.free && <small className="belt-note">Belt Tier 4: upgrades are free, but you still need the ore.</small>}
          </div>
          <div className="belt-side">
            <div className="well belt-tier">
              <h4>
                Belt Tier <span className="num">{r.tier}</span> <small className="num">{r.tierMult} ore and XP</small>
              </h4>
              <ProgressBar value={r.tierPct / 100} color="var(--cyan)" label="Ore toward the next Belt Tier" />
              <small>
                <span className="num">{r.tierPct}%</span> of <span className="num">{r.nextTier}</span> ore gathered this tier
              </small>
              <p className="belt-next">Next: x2 ore and XP. {r.nextReward}.</p>
              <Button color={r.canTier ? 'var(--cyan)' : '#5A5F8F'} disabled={!r.canTier} onClick={() => commands.beltTierUp()}>
                Belt Tier up
              </Button>
              <small>Resets your ore and Belt upgrades. Drones, odds and the field stay.</small>
              <small className="belt-drones">{r.drones}</small>
            </div>
            <div className="well belt-odds">
              <h4>Asteroids</h4>
              <ul>
                {r.odds.map((o) => (
                  <li key={o.name}>
                    <i style={{ background: o.color }} />
                    <b>{o.name}</b>
                    <span className="num">{o.odds}</span>
                    <span className="num mult">{o.mult}</span>
                  </li>
                ))}
              </ul>
              <ul className="belt-stats">
                {r.stats.map((x) => (
                  <li key={x.label}>
                    {x.label} <b className="num">{x.value}</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

/** Deep Core Drilling: break cores layer by layer; drones and bits drill on their own. */
export function DrillPanel() {
  const r = useReport('drill', drillReport, 150);
  const [hit, setHit] = useState(0);
  return (
    <Panel id="drill" title="Deep Core" color="#C2561E" size="wide">
      <p>Each core breaks into ore and takes you one layer deeper: tougher cores, richer ore. Breaking cores of a layer raises that ore's mastery, which speeds up drilling there.</p>
      {r && (
        <div className="drill">
          <button
            type="button"
            className={cx('core chunk pop', hit > 0 && (hit % 2 ? 'hit-a' : 'hit-b'))}
            style={tint(r.layerColor)}
            onClick={() => {
              commands.tapCore();
              setHit((h) => h + 1);
            }}
            aria-label={`Drill the core at depth ${r.depth}: two seconds of drilling`}
            data-testid="drill-core"
          >
            <Icon name="drill" />
            <span className="core-depth ol">Depth {r.depth}</span>
            <span className="core-layer">{r.layer}</span>
          </button>
          <div className="drill-side">
            <div className="well">
              <h4>
                Core <small className="num">{r.hp} left</small>
              </h4>
              <ProgressBar value={r.hpPct / 100} color={r.layerColor} label="Core left" />
              <small>
                Drilling <b className="num">{r.dps}</b> a second. Breaking it pays <b className="num">{r.reward}</b> ore.
              </small>
            </div>
            <BuyAmountControl compact />
            <div className="drill-buys">
              <Button color={r.canDrone ? 'var(--lime)' : '#5A5F8F'} disabled={!r.canDrone} onClick={() => commands.buyDrillDrone()} aria-label={`Buy ${r.droneCount} drill drone${r.droneCount === 1 ? '' : 's'} for ${r.droneCost} ore`}>
                <span>
                  Drill drone <span className="num">({r.drones})</span>
                  {r.droneCount > 1 && <span className="num buy-n"> +{r.droneCount}</span>}
                </span>
                <span className="cost-chip">
                  <Icon name="belt" />
                  {r.droneCost}
                </span>
              </Button>
              <Button color={r.canBit ? 'var(--lime)' : '#5A5F8F'} disabled={!r.canBit} onClick={() => commands.buyDrillBit()} aria-label={`Craft ${r.bitCount} drill bit${r.bitCount === 1 ? '' : 's'} for ${r.bitCost} Iron alloy`}>
                <span>
                  Drill bit <span className="num">({r.bits})</span>
                  {r.bitCount > 1 && <span className="num buy-n"> +{r.bitCount}</span>}
                </span>
                <span className="cost-chip">
                  <Icon name="ingot" />
                  {r.bitCost}
                </span>
              </Button>
              <small>
                A drone adds 2 drilling a second; a bit, crafted from Iron alloy (you have <span className="num">{r.alloy}</span>), multiplies drilling by 1.5.
              </small>
            </div>
            <div className="drill-mastery">
              {r.mastery.map((m) => (
                <span key={m.name} className="tag-pill chunk" style={tint(m.level > 0 ? m.color : '#3A3466')}>
                  <span className="ol-sm">
                    {m.name} <span className="num">Lv {m.level}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

/** Starsmith Level: one perk point a level, spend and respec freely. */
export function StarsmithPanel() {
  const r = useReport('level', starsmithReport, 150);
  return (
    <Panel id="level" title="Starsmith Level" color="#2E8FD0">
      {r && (
        <div className="smith">
          <div className="smith-head">
            <span className="smith-lvl chunk gloss" style={tint('#2E8FD0')}>
              <small>Level</small>
              <b className="num ol">{r.level}</b>
            </span>
            <div className="smith-xp">
              <ProgressBar value={r.pct / 100} color="var(--cyan)" label="XP toward the next level" />
              <small>
                <span className="num">{r.into}</span> / <span className="num">{r.need}</span> XP
              </small>
              <small>XP comes from taps, engines, evolving, quests, asteroids and Supernovas.</small>
            </div>
          </div>
          <div className="smith-points">
            <b>
              <span className="num">{r.free}</span> perk point{r.free === 1 ? '' : 's'} to spend
            </b>
            <Button size="sm" color="#5A5F8F" onClick={() => commands.resetPerks()}>
              Reset perks (free)
            </Button>
          </div>
          <div className="smith-perks">
            {r.perks.map((p) => (
              <div key={p.id} className="smith-perk chunk" style={tint('#2B1F6E')} data-perk={p.id}>
                <span className="tile chunk" style={tint('#2E8FD0')}>
                  <Icon name={p.icon} />
                </span>
                <div className="belt-up-body">
                  <b>
                    {p.name} <span className="num lvl">{p.points}</span>
                  </b>
                  <small>{p.desc}</small>
                </div>
                <Button size="sm" color={r.free > 0 ? 'var(--lime)' : '#5A5F8F'} disabled={r.free <= 0} onClick={() => commands.addPerk(p.id)} aria-label={`Put a point into ${p.name}`}>
                  +1
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

/** The HUD's level chip: Starsmith Level with its XP bar; opens the Level panel. */
export function LevelChip() {
  const visible = useSnap((s) => s.levelVisible);
  const level = useSnap((s) => s.level);
  const pct = useSnap((s) => s.levelPct);
  const free = useSnap((s) => s.perksFree);
  const open = useUi((s) => s.open);
  if (!visible) return null;
  return (
    <button type="button" className="level-chip chunk pop" style={tint('#2E8FD0')} onClick={() => open('level')} aria-label={`Starsmith Level ${level}, ${pct}% to the next. ${free} perk points to spend.`} data-testid="level-chip">
      <span className="ol-sm">
        Lv <span className="num">{level}</span>
      </span>
      <span className="level-bar">
        <i style={{ width: `${pct}%` }} />
      </span>
      {free > 0 && <span className="level-free num">{free}</span>}
    </button>
  );
}
