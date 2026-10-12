import { useState } from 'react';
import { commands } from '../../app/commands';
import { type ConstantCard, constantsReport, masteryReport, orbitalsReport, questsReport } from '../../app/earlyReports';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';

/** Cosmic Constants: infinite upgrades with any buy amount, including "to the next x2". */
export function ConstantsPanel() {
  const r = useReport('constants', () => constantsReport('stellar'), 150);
  return (
    <Panel id="constants" title="Cosmic Constants" color="#7B3FD6" size="wide">
      <p>No level cap. Each level costs more; every effect doubles every 25 levels (every 100 after Lv 1,000, every 1,000 after Lv 100,000).</p>
      <BuyAmountControl />
      {r && <ConstantGrid cards={r.cards} />}
    </Panel>
  );
}

/** Constant cards with buy buttons (the Stellar set here, the Nebula set on the Nebula panel). */
export function ConstantGrid({ cards }: { cards: ConstantCard[] }) {
  return (
    <div className="const-grid">
      {cards.map((c) => (
        <div key={c.id} className={cx('const-card chunk', !c.open && 'locked')} style={tint(c.open ? '#2B1F6E' : '#24203F')} data-constant={c.id}>
          <span className="const-ico chunk" style={tint(c.open ? c.color : '#3A3466')}>
            <Icon name={c.open ? c.icon : 'lock'} />
          </span>
          <div className="const-body">
            <b>
              {c.name} <span className="num lvl">{c.level}</span>
            </b>
            <small>{c.open ? c.desc : c.req}</small>
            {c.effects.map((e) => (
              <span key={e.what} className="const-eff">
                {e.what} <span className="num">{e.now}</span> → <span className="num next">{e.next}</span>
              </span>
            ))}
            {c.doubling && <span className="const-dbl">{c.doubling}</span>}
          </div>
          <Button className="const-buy" color={c.can ? 'var(--lime)' : '#5A5F8F'} disabled={!c.can} onClick={() => commands.buyConstant(c.id)} aria-label={`Buy ${c.count} levels of ${c.name} for ${c.cost} ${c.currencyName}`}>
            <span className="num">{c.count}</span>
            <span className="cost-chip">
              <Icon name={c.currencyIcon} />
              {c.cost}
            </span>
          </Button>
        </div>
      ))}
    </div>
  );
}

/** Engine Mastery: ranks from lifetime purchases, kept through every reset. */
export function MasteryPanel() {
  const r = useReport('mastery', masteryReport, 500);
  return (
    <Panel id="mastery" title="Engine Mastery" color="#B23A8E" size="wide">
      <p>Every engine ranks up from how many you have ever bought: Bronze, Silver, Gold, Platinum, Cosmic. Each rank is x1.5 output for that engine, and ranks are never lost.</p>
      <div className="mastery-grid">
        {r?.cards.map((c) => (
          <div key={c.id} className="mastery-card chunk" style={tint('#2B1F6E')} data-mastery={c.id}>
            <span className="tile chunk" style={tint(c.color)}>
              <Icon name={c.icon} />
            </span>
            <div className="mastery-body">
              <b>{c.name}</b>
              <span className="rank" style={{ color: c.rankColor }}>
                {c.rank} · <span className="num">{c.mult}</span>
              </span>
              <small>
                {c.ever} · {c.next}
              </small>
              <ProgressBar value={c.pct / 100} color={c.rankColor} label={`${c.name} mastery`} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Star Quests: three goals, refilled the moment one is claimed. */
export function QuestsPanel() {
  const r = useReport('quests', questsReport, 150);
  return (
    <Panel id="quests" title="Star Quests" color="#C2561E" size="small">
      <p>
        Finish a quest and claim it for <b className="num">{r?.reward}</b> Stardust (30 seconds of production, at most half of this run's Stardust). Every quest done is +1% production forever:{' '}
        <b className="num">{r?.done}</b> done, <b className="num">{r?.bonus}</b>.
      </p>
      <div className="quests">
        {r?.cards.map((q) => (
          <div key={`${q.index}-${q.text}`} className={cx('quest chunk', q.done && 'done')} style={tint(q.done ? '#2F7A3A' : '#2B1F6E')} data-quest={q.index}>
            <div className="quest-body">
              <b>{q.text}</b>
              <ProgressBar value={q.pct / 100} color={q.done ? 'var(--lime)' : 'var(--gold)'} label={q.text} />
            </div>
            <Button size="sm" color={q.done ? 'var(--lime)' : '#5A5F8F'} disabled={!q.done} onClick={() => commands.claimQuest(q.index)}>
              {q.done ? 'Claim' : q.progress}
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Orbitals: pick a slot, place a planet, level it, and arrange neighbours of different types. */
export function OrbitalsPanel() {
  const r = useReport('orbitals', orbitalsReport, 150);
  const [sel, setSel] = useState<string | null>(null);
  const slot = r?.rings.flatMap((ring) => ring.slots).find((x) => x.slot === sel) ?? null;
  return (
    <Panel id="orbitals" title="Orbitals" color="#1A9DB8" size="wide">
      <p>Planets boost the engines of their type by +25% a level. Each neighbour on the same ring of a different type adds 20% to that. Changing a planet's type is free.</p>
      <BuyAmountControl />
      <div className="orbit-layout">
        <div className="rings">
          {r?.rings.map((ring) => (
            <div key={ring.index} className={cx('ring-row well', !ring.open && 'locked')}>
              <span className="ring-lbl">Ring {ring.index + 1}</span>
              {ring.open ? (
                <div className="ring-slots">
                  {ring.slots.map((p) => (
                    <button
                      key={p.slot}
                      type="button"
                      className={cx('planet-slot pop', p.type ? 'filled' : 'empty', sel === p.slot && 'sel')}
                      style={{ ['--pc' as string]: p.color, ['--pb' as string]: p.band }}
                      onClick={() => setSel(p.slot)}
                      aria-label={p.type ? `${p.name} planet, level ${p.levelText}, ${p.bonus}` : 'Empty slot'}
                      aria-pressed={sel === p.slot}
                      data-slot={p.slot}
                    >
                      {p.type ? <span className="lv num">{p.levelText}</span> : '+'}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="ring-req">
                  <Icon name="lock" /> {ring.req}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="orbit-side well">
          {!slot && <p>Pick a slot on an open ring.</p>}
          {slot && !slot.type && (
            <>
              <h4>New planet</h4>
              <p>
                Costs <b className="num">{r?.price}</b> Stardust. Choose its type:
              </p>
              <div className="planet-types">
                {r?.types.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="planet-type chunk pop"
                    style={tint('#2B1F6E')}
                    disabled={!r.canBuy}
                    onClick={() => commands.buyPlanet(slot.slot, t.id)}
                    data-type={t.id}
                  >
                    <span className="ball" style={{ ['--pc' as string]: t.color, ['--pb' as string]: t.band }} />
                    <b>{t.name}</b>
                    <small>{t.engines}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          {slot?.type && (
            <>
              <h4>
                {slot.name} planet · Lv <span className="num">{slot.levelText}</span>
              </h4>
              <p>
                Bonus <b className="num">{slot.bonus}</b> to its engines, with {slot.neighbours} different neighbour{slot.neighbours === 1 ? '' : 's'}.
              </p>
              <p>
                After: <b className="num">{slot.levelTo}</b>, bonus <b className="num">{slot.bonusNext}</b>.
              </p>
              <Button
                color={slot.canLevel ? 'var(--lime)' : '#5A5F8F'}
                disabled={!slot.canLevel}
                onClick={() => commands.levelPlanet(slot.slot)}
                aria-label={`Level the ${slot.name} planet up ${slot.levelCountText} for ${slot.levelCost} Stardust`}
                data-testid="planet-level"
              >
                Level <span className="num buy-n">+{slot.levelCountText}</span>
                <span className="cost-chip">
                  <Icon name="stardust" />
                  {slot.levelCost}
                </span>
              </Button>
              <p>Change type (free):</p>
              <div className="planet-types compact">
                {r?.types
                  .filter((t) => t.id !== slot.type)
                  .map((t) => (
                    <button key={t.id} type="button" className="planet-type chunk pop" style={tint('#2B1F6E')} onClick={() => commands.setPlanetType(slot.slot, t.id)} title={t.engines}>
                      <span className="ball" style={{ ['--pc' as string]: t.color, ['--pb' as string]: t.band }} />
                      <b>{t.name}</b>
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Panel>
  );
}
