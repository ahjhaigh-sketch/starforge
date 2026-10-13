import { useRef, useState, type ReactNode } from 'react';
import { commands } from '../../app/commands';
import { crunchReport, echoReport, eternityReport, type AutoRow } from '../../app/crunchReports';
import { constantsReport } from '../../app/earlyReports';
import { layerConfirm } from '../../app/runeReports';
import { snapshotStore, useSnap } from '../../app/uiSnapshot';
import { boughtFx } from '../kit/boughtFx';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { useReport } from '../kit/useReport';
import { useUi } from '../store';
import { ConstantGrid } from './EarlyPanels';

/** Phase 17 panels: the Big Crunch and its confirm screen, Eternity, and the Echo boards. */

const ORANGE = '#B4501A';

function Chip({ icon, value }: { icon: string; value: string }) {
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

function Locked({ text }: { text: string }) {
  return (
    <p className="depth-locked">
      <Icon name="lock" /> {text}
    </p>
  );
}

// ---------- the Big Crunch ----------

export function BigCrunchPanel() {
  const r = useReport('bigcrunch', crunchReport, 250);
  const consts = useReport('bigcrunch', () => constantsReport('eternal'), 250);
  const open = useUi((s) => s.open);
  const data = r ?? crunchReport();
  return (
    <Panel id="bigcrunch" title="Big Crunch" color={ORANGE} size="wide">
      <div className="tree-head">
        <p>
          The fifth reset. The universe falls back into a point: everything from the Galactic layer down starts again, and the more Galaxy Cores this Crunch run gathered, the more Chronons you get. Chronons buy Eternity. Lifetime Chronons multiply Galaxy Cores by {data.passive}. Megastructures, colonies, the Stardust Chart, Trials, the Spire, the Leviathans, wormholes and every collection stay.
        </p>
        <Chip icon="chronon" value={data.chronons} />
      </div>
      <div className="nebula-cols">
        <div className="well nebula-run">
          <h4>This Crunch run</h4>
          <ul className="milestones gal-checks">
            <Check ok={data.explored >= data.need}>
              Galaxies explored <b className="num">{data.explored}</b> / {data.need}
            </Check>
            <Check ok={data.coresMet}>
              Galaxy Cores this run <b className="num">{data.cores}</b> / {data.coresNeed}
            </Check>
          </ul>
          <Button size="lg" color={data.ready ? ORANGE : '#5A5F8F'} disabled={!data.ready} onClick={() => (snapshotStore.getState().confirmResets ? open('crunchConfirm') : commands.reset('crunch'))} data-testid="go-crunch">
            {data.ready ? `Big Crunch: +${data.gain} Chronons` : 'Not yet'}
          </Button>
          {data.ready && <small>Next Chronon at {data.next} Galaxy Cores this run.</small>}
          <div className="nebula-links">
            <Button size="sm" color="#B85A1A" onClick={() => open('eternity')}>
              Eternity
            </Button>
            <Button size="sm" color="#B08A1A" onClick={() => open('echoes')}>
              Echo Boards
            </Button>
            <Button size="sm" color="#2B7FD0" onClick={() => open('galaxymap')}>
              Galaxy Map
            </Button>
          </div>
        </div>
        <div className="well">
          <h4>Milestones ({data.done} Big Crunches)</h4>
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
          <h4 className="section-h">Eternal Constants</h4>
          <BuyAmountControl compact />
          <ConstantGrid cards={consts.cards} auto={{ panel: 'bigcrunch', set: 'eternal' }} />
        </>
      )}
    </Panel>
  );
}

export function CrunchConfirmPanel() {
  const r = useReport('crunchConfirm', () => layerConfirm('crunch'), 300);
  const close = useUi((s) => s.close);
  return (
    <Panel id="crunchConfirm" title="Big Crunch?" color={ORANGE} size="small">
      {r && (
        <div className="confirm">
          <div className="big-gain">
            <Icon name="chronon" />
            <span className="num">+{r.gain}</span>
          </div>
          <p className="center">Chronons buy Eternity upgrades and Eternal Constants. The universe starts again in the Milky Way.</p>
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
            <Button size="lg" color={ORANGE} disabled={!r.ready} onClick={() => commands.reset('crunch') && close()}>
              Big Crunch
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

// ---------- Eternity ----------

function AutoControls({ row }: { row: AutoRow }) {
  const [at, setAt] = useState('');
  if (!row.owned) return <span className="auto-off">Runs itself once you're a layer past it</span>;
  return (
    <div className="et-auto-ctl">
      <Button size="sm" color={row.on ? 'var(--lime)' : '#5A5F8F'} onClick={() => commands.setEternityAuto(row.layer, { on: !row.on })} aria-pressed={row.on} data-et-auto={row.layer}>
        {row.on ? 'On' : 'Off'}
      </Button>
      {row.resets && (
        <>
          <select aria-label={`When the ${row.name} resets`} value={row.mode} onChange={(e) => commands.setEternityAuto(row.layer, { mode: e.target.value as 'double' | 'amount' })}>
            <option value="double">When it doubles this run, or its gains slow</option>
            <option value="amount">At a gain I choose</option>
          </select>
          {row.mode === 'amount' && (
            <span className="et-at">
              <input type="number" min={0} inputMode="numeric" aria-label={`${row.name} gain to reset at`} placeholder={row.at || '0'} value={at} onChange={(e) => setAt(e.target.value)} />
              <Button size="sm" onClick={() => commands.setEternityAuto(row.layer, { at: Number(at) || 0 })}>
                Set
              </Button>
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function EternityPanel() {
  const r = useReport('eternity', eternityReport, 250);
  const data = r ?? eternityReport();
  return (
    <Panel id="eternity" title="Eternity" color="#B85A1A" size="wide">
      {!data.open ? (
        <Locked text="Eternity opens with your first Big Crunch." />
      ) : (
        <>
          <div className="tree-head">
            <p>Chronons buy upgrades that last for ever. Five of them each run a whole earlier layer for you: its reset, its tree, its constants and its side systems. Automation acts once a second, never cuts an unfinished Trial short, and never spends more than a tenth of a currency on anything that repeats for ever. Once a layer's reset is free (it resets nothing), it goes as soon as it can.</p>
            <Chip icon="chronon" value={data.chronons} />
          </div>
          <div className="mirror-upgrades et-grid">
            {data.cards.map((u) => (
              <button key={u.id} type="button" className={cx('mu-tile chunk pop', u.owned && 'owned', u.automation && 'et-auto-tile')} style={tint(u.automation ? '#B85A1A' : '#7B3FD6')} disabled={u.owned || !u.can} onClick={() => commands.buyEternity(u.id)} data-et={u.id}>
                <b>{u.name}</b>
                <span>{u.desc}</span>
                <span className="num et-cost">
                  {u.owned ? (
                    'Owned'
                  ) : (
                    <>
                      <Icon name="chronon" /> {u.cost} Chronon{u.cost === 1 ? '' : 's'}
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>
          <h4 className="section-h">Automation</h4>
          <div className="et-auto">
            {data.auto.map((row) => (
              <div key={row.layer} className={cx('et-auto-row well', !row.owned && 'locked')}>
                <b>{row.name}</b>
                <AutoControls row={row} />
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------- the Echo boards ----------

interface Float {
  id: number;
  text: string;
  x: number;
}

function EchoStar({ perTap }: { perTap: string }) {
  const [floats, setFloats] = useState<Float[]>([]);
  const next = useRef(0);
  const reduced = useSnap((s) => s.reducedMotion);
  const tap = () => {
    const text = commands.echoTap();
    if (!text || reduced) return;
    const id = next.current++;
    setFloats((f) => [...f.slice(-11), { id, text, x: Math.round(Math.random() * 50 - 25) }]);
    window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 900);
  };
  return (
    <div className="echo-star-box">
      <button type="button" className="echo-star pop" onClick={tap} aria-label={`Tap the echo star for ${perTap} Echo Dust`} data-testid="echo-star">
        <Icon name="echo" />
      </button>
      {floats.map((f) => (
        <span key={f.id} className="echo-float num ol-sm" style={{ left: `calc(50% + ${f.x}px)` }} aria-hidden="true">
          {f.text}
        </span>
      ))}
    </div>
  );
}

export function EchoesPanel() {
  const r = useReport('echoes', echoReport, 200);
  const data = r ?? echoReport();
  return (
    <Panel id="echoes" title="Echo Boards" color="#B08A1A" size="wide">
      {!data.open ? (
        <Locked text="The Echo boards open with your first Big Crunch." />
      ) : (
        <>
          <div className="tree-head">
            <p>The first three layers, replayed small with new numbers. Echo engines make Echo Dust; an Echo Supernova trades the board for Echo Shards, an Echo Nebula trades the shards for Echo Essence. Nothing outside the boards resets them, and what they gather echoes into the real game.</p>
            <Chip icon="echo" value={data.dust} />
          </div>
          <div className="mirror-cols">
            <div className="well anti-star-box echo-side">
              <EchoStar perTap={data.perTap} />
              <span>
                <b className="num">{data.rate}</b> · output <b className="num">{data.mult}</b>
              </span>
              <span className="echo-held num">
                Echo Shards <b>{data.shards}</b> · Echo Essence <b>{data.essence}</b>
              </span>
              <Button color={data.novaReady ? '#FF4FC1' : '#5A5F8F'} disabled={!data.novaReady} onClick={() => commands.reset('echoNova')} data-testid="echo-nova" aria-label={data.novaReady ? `Echo Supernova for ${data.novaGain} Echo Shards` : 'Echo Supernova'}>
                Echo Supernova
              </Button>
              <span className="altar-fine num">{data.novaReady ? `+${data.novaGain} Echo Shards` : data.novaReq}</span>
              <Button color={data.nebulaReady ? '#1E8FA8' : '#5A5F8F'} disabled={!data.nebulaReady} onClick={() => commands.reset('echoNebula')} data-testid="echo-nebula" aria-label={data.nebulaReady ? `Echo Nebula for ${data.nebulaGain} Echo Essence` : 'Echo Nebula'}>
                Echo Nebula
              </Button>
              <span className="altar-fine num">{data.nebulaReady ? `+${data.nebulaGain} Echo Essence` : data.nebulaReq}</span>
              {data.auto && <span className="altar-fine">Both go off by themselves once they at least double what you hold (Big Crunch milestone 2).</span>}
              <h4>Echoes in the real game</h4>
              <ul className="echo-boosts">
                {data.boosts.map((b) => (
                  <li key={b.label}>
                    {b.label} <b className="num">{b.value}</b>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mirror-engines">
              <BuyAmountControl compact />
              {data.rows.filter((e) => !e.hidden).map((e) =>
                e.revealed ? (
                  <div key={e.id} className="am-row chunk" style={tint(e.color)} data-echo={e.id}>
                    <Icon name={e.icon} />
                    <div className="am-info">
                      <b>{e.name}</b>
                      <span className="num">
                        {e.owned} owned · {e.total} in all · next adds {e.adds}
                      </span>
                      {e.nextAt > 0 && (
                        <span className="echo-ms" title={`Output doubles at ${e.nextAt} owned`}>
                          <i style={{ width: `${e.pct}%` }} />
                        </span>
                      )}
                    </div>
                    <Button size="sm" color={e.can ? 'var(--lime)' : '#5A5F8F'} disabled={!e.can} onClick={(ev) => commands.buyEchoEngine(e.id) && boughtFx(ev.currentTarget.closest('.am-row'))} aria-label={`Buy ${e.count} ${e.name} for ${e.cost} Echo Dust`}>
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
        </>
      )}
    </Panel>
  );
}
