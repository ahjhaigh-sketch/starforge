import { useState } from 'react';
import { commands } from '../../app/commands';
import { nurseryReport, wyrmsReport } from '../../app/wyrmReports';
import { crossOf, STAR_BY_ID } from '../../content/nursery';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';

/** Phase 10 panels: the Void Wyrms (hatchery, team, stacks, bestiary) and the Star Nursery. */

function Locked({ what, req }: { what: string; req: string }) {
  return (
    <p className="depth-locked">
      <Icon name="lock" /> {what} open at {req}.
    </p>
  );
}

interface Hatch {
  key: number;
  name: string;
  color: string;
  count: number;
}

// ---------- Void Wyrms ----------

export function WyrmsPanel() {
  const r = useReport('wyrms', wyrmsReport, 200);
  const data = r ?? wyrmsReport();
  const [hatch, setHatch] = useState<Hatch | null>(null);
  const buy = () => {
    const res = commands.buyEggs();
    if (!res) return;
    setHatch({ key: Math.random(), name: res.best.name, color: res.best.color, count: res.count });
  };
  return (
    <Panel id="wyrms" title="Void Wyrms" color="#2E9C78" size="wide">
      {!data.open ? (
        <Locked what="Void Wyrms" req={data.req} />
      ) : (
        <>
          <div className="well wyrm-head">
            <span className="pill-mini">
              <Icon name="nebula" />
              <span className="num">{data.essence}</span> Essence
            </span>
            <span className="pill-mini">
              <Icon name="ember" />
              <span className="num">{data.embers}</span> Embers (+<span className="num">{data.emberRate}</span>/s)
            </span>
            <span>
              <b className="num">{data.hatched}</b> hatched · <b className="num">{data.found}</b>/{data.total} variants found
            </span>
          </div>
          <div className="wyrm-cols">
            <section className="well hatchery" aria-label="Hatchery">
              <h4 className="section-h">Hatchery</h4>
              <div className="egg-stage" aria-live="polite">
                {hatch ? (
                  <div key={hatch.key} className="hatch" style={tint(hatch.color)} data-testid="hatch-card">
                    <span className="egg shell" aria-hidden="true" />
                    <span className="hatch-card chunk">
                      <small className="ol-sm">{hatch.count === 1 ? 'It hatched' : `${hatch.count} hatched, rarest`}</small>
                      <b className="ol">{hatch.name}</b>
                    </span>
                  </div>
                ) : (
                  <span className="egg idle" aria-hidden="true" />
                )}
              </div>
              <BuyAmountControl compact />
              <Button size="lg" color={data.canEgg ? 'var(--lime)' : '#5A5F8F'} disabled={!data.canEgg} onClick={buy} data-testid="hatch">
                Hatch {data.eggCount} egg{data.eggCount === 1 ? '' : 's'} <span className="num">{data.eggCost}</span>
              </Button>
              <small className="altar-fine">Each egg costs a little more. A species' odds use the square root of your rune luck.</small>
            </section>
            <section className="well team" aria-label="Team">
              <h4 className="section-h">
                Team {data.slots}/{data.maxSlots}
              </h4>
              <div className="team-slots">
                {Array.from({ length: 6 }, (_, i) => {
                  const w = data.team[i];
                  if (i >= data.maxSlots)
                    return (
                      <div key={i} className="team-slot locked">
                        <Icon name="lock" />
                        <small>{data.nextSlot}</small>
                      </div>
                    );
                  if (!w)
                    return (
                      <div key={i} className="team-slot empty">
                        <small>Wear a Wyrm from your stacks</small>
                      </div>
                    );
                  return (
                    <div key={w.key} className={cx('team-slot', `form-${w.formId}`)} style={tint(w.color)} data-team={w.key}>
                      <span className="serpent-dot" aria-hidden="true" />
                      <b>{w.name}</b>
                      <small>
                        {w.form}
                        {w.mut && (
                          <span className="mut-badge" style={tint(w.mutColor)}>
                            {w.mut} mutation
                          </span>
                        )}{' '}
                        · L{w.level}
                      </small>
                      <small className="num">
                        {w.boost} · {w.embers} Embers
                      </small>
                      <div className="slot-btns">
                        <Button size="sm" color={w.canTrain ? 'var(--gold)' : '#5A5F8F'} disabled={!w.canTrain} onClick={() => commands.trainWyrm(w.key)} aria-label={`Train ${w.name} ${w.trainCount} levels for ${w.trainCost} Iron alloy`}>
                          Train +{w.trainCount} <span className="num">{w.trainCost}</span>
                        </Button>
                        <Button size="sm" color="#5A5F8F" onClick={() => commands.unequipWyrm(w.key)}>
                          Rest
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <small className="altar-fine">Team Wyrms breathe Embers, swim across the sky and snap up comets. Embers feed the Wyrm Shrine; the key to the Singularity will cost Embers too.</small>
            </section>
          </div>
          <h4 className="section-h">Your Wyrms</h4>
          <div className="stack-list">
            {data.stacks.length === 0 && <p className="altar-fine">Hatch an egg to meet your first Wyrm.</p>}
            {data.stacks.map((w) => (
              <div key={w.key} className={cx('stack-row', `form-${w.formId}`)} style={tint(w.color)} data-stack={w.key}>
                <span className="serpent-dot" aria-hidden="true" />
                <span className="rune-name">
                  <b>
                    {w.name} {w.formId !== 'normal' && <span className={cx('form-badge', `form-${w.formId}`)}>{w.form}</span>}
                    {w.mut && (
                      <span className="mut-badge" style={tint(w.mutColor)}>
                        {w.mut} mutation
                      </span>
                    )}
                  </b>
                  <small className="num">
                    x{w.count} · L{w.level} · {w.boost}
                  </small>
                </span>
                <Button size="sm" color={w.canWear ? '#4C3BC4' : '#5A5F8F'} disabled={!w.canWear} onClick={() => commands.equipWyrm(w.key)}>
                  {w.onTeam ? 'On team' : 'Wear'}
                </Button>
                <Button size="sm" color={w.canFuse ? 'var(--magenta)' : '#5A5F8F'} disabled={!w.canFuse} onClick={() => commands.fuseWyrms(w.key)} data-fuse={w.key} aria-label={`Fuse 5 ${w.name} into a ${w.fuseTo} one`}>
                  {w.fuseTo ? `Fuse 5 to ${w.fuseTo}` : 'Top form'}
                </Button>
              </div>
            ))}
          </div>
          <h4 className="section-h">Bestiary</h4>
          <div className="bestiary">
            {data.bestiary.map((b) => (
              <div key={b.id} className={cx('beast', b.name !== '???' && 'found')} style={tint(b.color)}>
                <span className="serpent-dot" aria-hidden="true" />
                <b>{b.name}</b>
                <small className="num">{b.odds}</small>
                <small>{b.boosts}</small>
                <span className="pips" aria-label="Forms found">
                  {b.forms.map((f, i) => (
                    <i key={i} className={cx(f && 'on')} />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}


// ---------- the Star Nursery ----------

export function NurseryPanel() {
  const r = useReport('nursery', nurseryReport, 200);
  const data = r ?? nurseryReport();
  const owned = data.seeds.filter((x) => x.count > 0);
  const [pick, setPick] = useState<Record<number, string>>({});
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [note, setNote] = useState('');
  const child = a && b && a !== b ? crossOf(a, b) : null;
  return (
    <Panel id="nursery" title="Star Nursery" color="#C23FA0" size="wide">
      {!data.open ? (
        <Locked what="The Star Nursery" req={data.req} />
      ) : (
        <>
          <div className="well wyrm-head">
            <span className="pill-mini">
              <Icon name="nebula" />
              <span className="num">{data.essence}</span> Essence
            </span>
            <span>
              <b className="num">{data.plots.length}</b>/{data.maxPlots} plots · <b className="num">{data.found}</b>/{data.total} species grown
            </span>
            <span>{data.tending ? 'Tending: ripe stars harvest and replant themselves.' : 'Harvest ripe stars by hand, or buy Tending.'}</span>
          </div>
          <div className="plot-grid">
            {data.plots.map((p) => (
              <div key={p.i} className={cx('plot', p.empty && 'empty', p.ripe && 'ripe')} style={tint(p.color)} data-plot={p.i}>
                <span className="cloud" aria-hidden="true">
                  {!p.empty && <span className="baby-star" style={{ ['--g' as string]: String(0.25 + 0.75 * p.progress) }} />}
                </span>
                {p.empty ? (
                  <>
                    <select value={pick[p.i] ?? owned[0]?.id ?? ''} onChange={(e) => setPick({ ...pick, [p.i]: e.target.value })} aria-label={`Seed for plot ${p.i + 1}`}>
                      {owned.length === 0 && <option value="">No seeds</option>}
                      {owned.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name} ({x.count})
                        </option>
                      ))}
                    </select>
                    <Button size="sm" color={owned.length ? 'var(--lime)' : '#5A5F8F'} disabled={!owned.length} onClick={() => commands.plant(p.i, pick[p.i] ?? owned[0]!.id)} data-plant={p.i}>
                      Plant
                    </Button>
                  </>
                ) : (
                  <>
                    <b>{p.name}</b>
                    <small>
                      {p.stage} · {p.eta}
                    </small>
                    <ProgressBar value={p.progress} color={p.color} label={`${p.name} growth`} />
                    <div className="slot-btns">
                      {p.ripe && !data.tending && (
                        <Button size="sm" color="var(--gold)" onClick={() => commands.harvestPlot(p.i)} data-harvest={p.i}>
                          Harvest
                        </Button>
                      )}
                      <Button size="sm" color="#5A5F8F" onClick={() => commands.uprootPlot(p.i)} data-uproot={p.i} aria-label={`Pull up the ${p.name} and get its seed back`}>
                        Pull up
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="nursery-cols">
            <section className="well" aria-label="Seeds">
              <h4 className="section-h">Seeds</h4>
              <BuyAmountControl compact />
              <div className="seed-list">
                {data.seeds.map((x) => (
                  <div key={x.id} className="seed-row" style={tint(x.color)} data-seed={x.id}>
                    <span className="seed-dot" aria-hidden="true" />
                    <span className="rune-name">
                      <b>{x.name}</b>
                      <small className="num">
                        {x.count} seed{x.count === 1 ? '' : 's'}
                      </small>
                    </span>
                    {x.base && (
                      <Button size="sm" color={data.canSeed ? 'var(--lime)' : '#5A5F8F'} disabled={!data.canSeed} onClick={() => commands.buySeeds(x.id)} aria-label={`Buy ${data.seedCount} ${x.name} seeds for ${data.seedCost} Essence`}>
                        x{data.seedCount} <span className="num">{data.seedCost}</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section className="well" aria-label="Crossbreed">
              <h4 className="section-h">Crossbreed</h4>
              <div className="cross-pick">
                <select value={a} onChange={(e) => setA(e.target.value)} aria-label="First seed" data-testid="cross-a">
                  <option value="">First seed</option>
                  {owned.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <span className="cross-x">+</span>
                <select value={b} onChange={(e) => setB(e.target.value)} aria-label="Second seed" data-testid="cross-b">
                  <option value="">Second seed</option>
                  {owned.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="altar-fine" data-testid="cross-preview">
                {!a || !b ? 'Pick two different seeds.' : child ? `Makes a ${STAR_BY_ID.get(child)?.name} seed.` : "These two don't cross."}
              </p>
              <Button
                color={child ? 'var(--magenta)' : '#5A5F8F'}
                disabled={!child}
                onClick={() => {
                  const got = commands.crossbreed(a, b);
                  setNote(got ? `+1 ${STAR_BY_ID.get(got)?.name} seed` : 'Not enough seeds or Essence.');
                }}
                data-testid="cross"
              >
                Cross
              </Button>
              {note && <small className="altar-fine">{note}</small>}
              <h4 className="section-h">Upgrades</h4>
              {data.upgrades.map((u) => (
                <div key={u.id} className="seed-row" data-nursery-up={u.id}>
                  <span className="rune-name">
                    <b>
                      {u.name} {Number.isFinite(u.max) ? `${u.level}/${u.max}` : `Lv ${u.level}`}
                    </b>
                    <small>{u.desc}</small>
                  </span>
                  <Button size="sm" color={u.can ? 'var(--lime)' : '#5A5F8F'} disabled={!u.can} onClick={() => commands.buyNurseryUpgrade(u.id)}>
                    {u.level >= u.max ? 'Max' : <>+{u.count} <span className="num">{u.cost}</span></>}
                  </Button>
                </div>
              ))}
            </section>
          </div>
          <h4 className="section-h">Crossbreed book</h4>
          <div className="recipe-book">
            {data.recipes.map((x) => (
              <div key={x.child} className={cx('recipe', x.grown && 'found', !x.known && 'unknown')} style={tint(x.color)}>
                <b>{x.name}</b>
                <small>{x.parents}</small>
                {x.known && <small className="num">{x.cost} Essence</small>}
                {x.grown && <small className="grown">Grown</small>}
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
