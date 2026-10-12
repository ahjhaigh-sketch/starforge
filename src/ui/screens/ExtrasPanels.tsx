import { type PointerEvent, useState } from 'react';
import { commands } from '../../app/commands';
import { attuneReport, fusionReport, merchantReport, shipsReport } from '../../app/extrasReports';
import { ShipyardPane } from './ShipyardPane';
import type { AttuneId } from '../../content/extras';
import type { FusionUpgradeId } from '../../engine/systems/fusion';
import type { ShipUpgradeId } from '../../engine/systems/ships';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';

function ShardChip({ value }: { value: string }) {
  return (
    <span className="pill-mini">
      <Icon name="shard" />
      <span className="num">{value}</span>
    </span>
  );
}

/** One upgrade row with the buy amount's count and price. */
function UpRow(p: { name: string; desc: string; level: string; count: number; cost: string; can: boolean; maxed?: boolean; icon: string; costIcon: string; onBuy: () => void; testid: string }) {
  return (
    <div className="belt-up chunk" style={tint('#2B1F6E')} data-up={p.testid}>
      <span className="tile chunk" style={tint('#4A4F9A')}>
        <Icon name={p.icon} />
      </span>
      <div className="belt-up-body">
        <b>
          {p.name} <span className="num lvl">{p.level}</span>
        </b>
        <small>{p.desc}</small>
      </div>
      <Button size="sm" color={p.can ? 'var(--lime)' : '#5A5F8F'} disabled={!p.can} onClick={p.onBuy} aria-label={p.maxed ? `${p.name} is maxed` : `Buy ${p.count} ${p.name} for ${p.cost}`}>
        {p.maxed ? (
          'Max'
        ) : (
          <>
            {p.count > 1 && <span className="num buy-n">+{p.count}</span>}
            <span className="cost-chip">
              <Icon name={p.costIcon} />
              {p.cost}
            </span>
          </>
        )}
      </Button>
    </div>
  );
}

// ---------- Comet Fusion ----------

export function FusionPanel() {
  const r = useReport('fusion', fusionReport, 120);
  const [sel, setSel] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [bad, setBad] = useState<number | null>(null);
  if (!r) return <Panel id="fusion" title="Comet Fusion" color="#1A9DB8" size="wide">{null}</Panel>;

  const tryFuse = (from: number, to: number) => {
    if (commands.fuse(from, to)) setSel(null);
    else {
      setBad(to);
      setTimeout(() => setBad(null), 300);
    }
  };
  const pick = (i: number) => {
    const level = r.cells[i]!.level;
    if (level === 0) return setSel(null);
    if (sel === null || sel === i) return setSel(sel === i ? null : i);
    if (r.cells[sel]!.level !== level) return setSel(i);
    tryFuse(sel, i);
  };
  const cellAt = (e: PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-cell]');
    return el ? Number(el.getAttribute('data-cell')) : null;
  };
  const selLevel = sel !== null ? r.cells[sel]?.level : undefined;
  return (
    <Panel id="fusion" title="Comet Fusion" color="#1A9DB8" size="wide">
      <div className="tree-head">
        <p>
          A comet arrives every <b className="num">{r.every}</b>. Drag one onto another of the same level (or tap one, then another) and those two plus a third of that level fuse into the next level. Your best comet, level <b className="num">{r.best}</b>, gives <b className="num">{r.mult}</b> Stardust and taps.
        </p>
        <ShardChip value={r.shards} />
      </div>
      <div className="fusion">
        <div className="fusion-board well" style={{ gridTemplateColumns: `repeat(${r.side}, 1fr)` }} role="grid" aria-label="Fusion board" data-testid="fusion-board">
          {r.cells.map((c, i) => (
            <button
              key={i}
              type="button"
              data-cell={i}
              data-level={c.level}
              className={cx('fcell', c.level > 0 && 'has', sel === i && 'sel', selLevel !== undefined && c.level === selLevel && sel !== i && 'match', bad === i && 'bad', drag === i && 'drag')}
              aria-label={c.level > 0 ? `Comet level ${c.level}` : 'Empty'}
              onClick={() => pick(i)}
              onPointerDown={(e) => {
                if (c.level > 0 && e.button === 0) setDrag(i);
              }}
              onPointerUp={(e) => {
                const to = cellAt(e);
                if (drag !== null && to !== null && to !== drag) {
                  e.preventDefault();
                  tryFuse(drag, to);
                }
                setDrag(null);
              }}
            >
              {c.level > 0 && (
                <span className="fcomet chunk" style={tint(c.color)}>
                  <span className="num ol-sm">{c.level}</span>
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="fusion-side">
          <div className="well fusion-next">
            <small>
              Next comet (level <span className="num">{r.spawnLevel}</span>)
            </small>
            <ProgressBar value={r.spawnPct / 100} color="var(--cyan)" label="Next comet" />
          </div>
          {r.autoOwned ? (
            <Button color={r.autoOn ? 'var(--lime)' : '#5A5F8F'} aria-pressed={r.autoOn} onClick={() => commands.setAutoFuse(!r.autoOn)}>
              Auto-fuse: {r.autoOn ? 'On' : 'Off'}
            </Button>
          ) : (
            <Button color={r.canAuto ? 'var(--cyan)' : '#5A5F8F'} disabled={!r.canAuto} onClick={() => commands.buyAutoFuse()} aria-label={`Buy Auto-fuse for ${r.autoCost} Nova Shards`}>
              <span>Auto-fuse</span>
              <span className="cost-chip">
                <Icon name="shard" />
                {r.autoCost}
              </span>
            </Button>
          )}
          <BuyAmountControl compact />
          {r.upgrades.map((u) => (
            <UpRow key={u.id} {...u} icon="comet" costIcon="shard" testid={`fusion-${u.id}`} onBuy={() => commands.buyFusionUpgrade(u.id as FusionUpgradeId)} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ---------- Attunements ----------

export function AttunePanel() {
  const r = useReport('attune', attuneReport, 150);
  return (
    <Panel id="attune" title="Star Pulse Attunements" color="#C23F6A" size="wide">
      <div className="tree-head">
        <p>
          Equip up to {r?.slots ?? 3} attunements on the Star Core to change how tapping works. The better you play them, the more they give. <b className="num">{r?.used ?? 0}</b> of {r?.slots ?? 3} equipped.
        </p>
        {r && <ShardChip value={r.shards} />}
      </div>
      <div className="attune-grid">
        {r?.cards.map((a) => (
          <div key={a.id} className={cx('attune chunk', a.equipped && 'equipped', !a.unlocked && 'locked')} style={tint(a.equipped ? '#5A2A6E' : '#2B1F6E')} data-attune={a.id}>
            <span className="tile chunk" style={tint(a.unlocked ? '#C23F6A' : '#3A3466')}>
              <Icon name={a.unlocked ? a.icon : 'lock'} />
            </span>
            <div className="belt-up-body">
              <b>{a.name}</b>
              <small>{a.desc}</small>
              <small className="attune-skill">Skill: {a.skill}</small>
              {a.unlocked && <small className="attune-now num">{a.now}</small>}
            </div>
            <div className="relic-acts">
              {!a.unlocked ? (
                <Button size="sm" color={a.canUnlock ? 'var(--lime)' : '#5A5F8F'} disabled={!a.canUnlock} onClick={() => commands.unlockAttune(a.id as AttuneId)} aria-label={`Unlock ${a.name} for ${a.cost} Nova Shards`}>
                  <span className="cost-chip">
                    <Icon name="shard" />
                    {a.cost}
                  </span>
                </Button>
              ) : (
                <Button size="sm" color={a.equipped ? '#5A2A8C' : a.canEquip ? 'var(--lime)' : '#3A3466'} disabled={!a.equipped && !a.canEquip} aria-pressed={a.equipped} onClick={() => (a.equipped ? commands.unequipAttune(a.id as AttuneId) : commands.equipAttune(a.id as AttuneId))}>
                  {a.equipped ? 'Equipped' : 'Equip'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------- the Wandering Merchant ----------

export function MerchantPanel() {
  const r = useReport('merchant', merchantReport, 150);
  return (
    <Panel id="merchant" title="Wandering Merchant" color="#B08A1A" size="wide">
      <div className="tree-head">
        <p>A trader ship with four deals, sized to your economy. A deal you take is replaced at once, and a new ship docks after every Supernova. Once in a while it's the Mythical Merchant (now {r?.mythical ?? '1%'}).</p>
        {r && <ShardChip value={r.shards} />}
      </div>
      <div className="deals">
        {r?.deals.map((d) => (
          <div key={`${d.i}-${d.get}`} className={cx('deal chunk', d.quality)} style={tint(d.quality === 'mythical' ? '#7A2A8C' : d.quality === 'rare' ? '#2B4F8C' : '#2B1F6E')} data-deal={d.i}>
            {d.quality !== 'common' && <span className="deal-q ol-sm">{d.quality === 'mythical' ? 'Mythical' : 'Rare'}</span>}
            <span className="deal-get">{d.get}</span>
            <span className="deal-pay">for {d.pay}</span>
            <Button size="sm" color={d.can ? 'var(--lime)' : '#5A5F8F'} disabled={!d.can} onClick={() => commands.buyDeal(d.i)} aria-label={`Take the deal: ${d.get} for ${d.pay}`}>
              Take
            </Button>
          </div>
        ))}
      </div>
      {r && (
        <div className="merchant-foot">
          <Button color={r.canReroll ? 'var(--cyan)' : '#5A5F8F'} disabled={!r.canReroll} onClick={() => commands.rerollDeals()} aria-label={`New deals for ${r.reroll} Nova Shards`}>
            <span>New deals</span>
            <span className="cost-chip">
              <Icon name="shard" />
              {r.reroll}
            </span>
          </Button>
          <BuyAmountControl compact />
          <UpRow name="Merchant Luck" desc="Every deal 10% bigger, and the Mythical Merchant a little likelier." level={`Lv ${r.luck}`} count={r.luckCount} cost={r.luckCost} can={r.canLuck} icon="merchant" costIcon="shard" testid="merchant-luck" onBuy={() => commands.buyMerchantLuck()} />
        </div>
      )}
    </Panel>
  );
}

// ---------- Starship Expeditions ----------

export function ShipsPanel() {
  const r = useReport('expeditions', shipsReport, 200);
  const [dest, setDest] = useState<Record<number, string>>({});
  const [tab, setTab] = useState<'fleet' | 'yard'>('fleet');
  return (
    <Panel id="expeditions" title="Starship Expeditions" color="#2B7FD0" size="wide">
      <div className="forge-tabs" role="tablist" aria-label="Starships">
        {(
          [
            { id: 'fleet', label: 'Fleet', icon: 'ship' },
            { id: 'yard', label: 'Shipyard', icon: 'forge' },
          ] as const
        ).map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`ships-tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls={`ships-pane-${x.id}`}
            className={cx('forge-tab chunk pop', tab === x.id && 'on')}
            style={tint(tab === x.id ? '#2B7FD0' : '#2B1F6E')}
            onClick={() => setTab(x.id)}
            data-ships-tab={x.id}
          >
            <Icon name={x.icon} />
            {x.label}
          </button>
        ))}
      </div>
      {tab === 'yard' ? (
        <ShipyardPane />
      ) : (
      <div role="tabpanel" id="ships-pane-fleet" aria-labelledby="ships-tab-fleet">
      <p>Send starships to far sectors. A trip takes its distance divided by your ships' speed ({r?.speed ?? 'x1'}), so Engines shorten every trip; farther sectors pay more. Ships on repeat keep flying while you are away.</p>
      {r && (
        <>
          <div className="fleet">
            {r.fleet.map((sh) => {
              const pickable = r.sectors.filter((x) => x.open);
              const chosen = dest[sh.i] ?? pickable[pickable.length - 1]?.id ?? '';
              return (
                <div key={sh.i} className="ship chunk" style={tint('#2B1F6E')} data-ship={sh.i}>
                  <span className="tile chunk" style={tint(sh.sector ? sh.color : '#3A3466')}>
                    <Icon name="ship" />
                  </span>
                  {sh.sector ? (
                    <div className="belt-up-body">
                      <b>
                        Ship {sh.i + 1}: {sh.name}
                      </b>
                      <ProgressBar value={sh.pct / 100} color={sh.color} label={`Ship ${sh.i + 1} trip`} />
                      <small className="num">{sh.left} left</small>
                      <small className="ship-design">{sh.design}</small>
                    </div>
                  ) : (
                    <div className="belt-up-body">
                      <b>Ship {sh.i + 1}: docked</b>
                      <small className="ship-design">{sh.design}</small>
                      <select className="ship-dest" value={chosen} onChange={(e) => setDest({ ...dest, [sh.i]: e.target.value })} aria-label={`Destination for ship ${sh.i + 1}`}>
                        {pickable.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} ({x.trip})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="relic-acts">
                    {!sh.sector && (
                      <Button size="sm" disabled={!chosen} onClick={() => commands.launchShip(sh.i, chosen)}>
                        Launch
                      </Button>
                    )}
                    <Button size="sm" gloss={false} color={sh.auto ? '#2E8FD0' : '#3A3466'} aria-pressed={sh.auto} onClick={() => commands.setShipAuto(sh.i, !sh.auto)}>
                      {sh.auto ? 'Repeat' : 'One trip'}
                    </Button>
                  </div>
                </div>
              );
            })}
            {r.fleet.length < r.maxShips && (
              <Button color={r.canShip ? 'var(--lime)' : '#5A5F8F'} disabled={!r.canShip} onClick={() => commands.buyShip()} aria-label={`Build a ship for ${r.shipCost} Iron alloy`}>
                <span>Build a ship</span>
                <span className="cost-chip">
                  <Icon name="ingot" />
                  {r.shipCost}
                </span>
              </Button>
            )}
          </div>
          <div className="belt-cols">
            <div className="belt-ups">
              <BuyAmountControl compact />
              {r.upgrades.map((u) => (
                <UpRow key={u.id} name={u.name} desc={`${u.desc} Costs ${u.alloy} alloy.`} level={u.level} count={u.count} cost={u.cost} can={u.can} icon="ship" costIcon="ingot" testid={`ships-${u.id}`} onBuy={() => commands.buyShipUpgrade(u.id as ShipUpgradeId)} />
              ))}
            </div>
            <div className="well belt-odds">
              <h4>Sectors</h4>
              <ul className="sectors">
                {r.sectors.map((x) => (
                  <li key={x.id} className={x.open ? '' : 'locked'}>
                    <i style={{ background: x.color }} />
                    <b>{x.name}</b>
                    <span className="num">{x.open ? x.trip : x.req}</span>
                    {x.open && <small>{x.loot}</small>}
                  </li>
                ))}
              </ul>
              <small>
                Rare finds (a relic level or Codex samples): <span className="num">{r.rare}</span> a trip.
              </small>
            </div>
          </div>
        </>
      )}
      </div>
      )}
    </Panel>
  );
}
