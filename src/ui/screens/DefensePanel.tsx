import { useEffect, useRef, useState } from 'react';
import { commands } from '../../app/commands';
import { defenseReport } from '../../app/defenseReports';
import { snapshotStore } from '../../app/uiSnapshot';
import type { BattleResult, BattleSetup } from '../../engine/systems/defenseBattle';
import { DefenseField } from '../../render/defenseField';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { useReport } from '../kit/useReport';
import { UpRow } from './ExtrasPanels';

/**
 * Phase 20.5: Planet Defense. The battlefield replays the battle the engine scored; sockets take a
 * turret each (clearing one pays its price back); each kind is levelled for every socket it holds.
 */
const RED = '#B23A3A';
const SPEEDS = [1, 2, 4] as const;

function Battlefield({ sockets, replay, speed, onDone }: { sockets: string[]; replay: BattleSetup | null; speed: number; onDone: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const field = useRef<DefenseField | null>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const box = host.current;
    const el = canvas.current;
    if (!box || !el) return;
    const f = new DefenseField();
    let alive = true;
    let ready = false;
    let unsub = () => {};
    let ro: ResizeObserver | null = null;
    void f.mount(el, Math.max(1, box.clientWidth), Math.max(1, box.clientHeight)).then((ok) => {
      ready = true;
      if (!alive) return f.destroy();
      if (!ok) return setFailed(true);
      field.current = f;
      f.onDone = () => done.current();
      const sync = () => (f.still = snapshotStore.getState().reducedMotion);
      sync();
      unsub = snapshotStore.subscribe(sync);
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
  useEffect(() => field.current?.setSockets(sockets));
  useEffect(() => {
    if (field.current) field.current.speed = speed;
  }, [speed]);
  useEffect(() => {
    if (!replay) return;
    // without graphics there is nothing to watch: show the result at once
    if (field.current) field.current.play(replay);
    else done.current();
  }, [replay]);
  return (
    <div className="df-field" ref={host} data-testid="defense-field">
      <canvas ref={canvas} aria-label="The battlefield: your star, your planets, three lanes and twelve turret sockets" />
      {failed && <p className="mv-note">The battlefield needs graphics this device can't start; battles still play out.</p>}
    </div>
  );
}

export function DefensePanel() {
  const r = useReport('defense', defenseReport, 250);
  const data = r ?? defenseReport();
  const [pick, setPick] = useState('laser');
  const [replay, setReplay] = useState<{ setup: BattleSetup; result: BattleResult } | null>(null);
  const [shown, setShown] = useState(false);
  const [speed, setSpeed] = useState(1);
  const fight = () => {
    const res = commands.fightWave();
    if (!res) return;
    setShown(false);
    setReplay(res);
  };
  const result = replay && shown ? replay.result : null;
  return (
    <Panel id="defense" title="Planet Defense" color={RED} size="wide">
      {!data.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> Planet Defense opens at {data.req}.
        </p>
      ) : (
        <>
          <p className="mv-note">Void swarms spiral in along three lanes. Put turrets in the sockets around your planets and fight the next wave: three swarmers reaching your planets lose it, and losing costs nothing. Every new best wave boosts your planets and Stardust for good.</p>
          <div className="df-top">
            <Battlefield sockets={data.sockets.map((x) => x.kind)} replay={replay?.setup ?? null} speed={speed} onDone={() => setShown(true)} />
            <div className="df-side">
              <div className="well df-stats">
                <b>
                  Best wave <span className="num">{data.best}</span>
                </b>
                <span>
                  Planet bonuses <span className="num">{data.planets}</span>, Stardust <span className="num">{data.stardust}</span>
                </span>
              </div>
              <div className="well df-next">
                <b>Wave {data.next}</b>
                <span>
                  {data.wave.count} swarmers{data.wave.armoured > 0 ? `, ${data.wave.armoured} armoured` : ''}
                  {data.wave.boss ? ', and a boss' : ''}. Each has <span className="num">{data.wave.health}</span> health.
                </span>
              </div>
              <Button size="lg" color={RED} disabled={!data.canFight || (!!replay && !shown)} onClick={fight} data-testid="fight">
                Fight wave {data.next}
              </Button>
              {!data.canFight && <small className="df-hint">Place a turret first.</small>}
              {replay && (
                <div className="df-replay" role="group" aria-label="Replay speed">
                  {SPEEDS.map((x) => (
                    <button key={x} type="button" className={cx('df-chip chunk pop', speed === x && 'on')} style={tint(speed === x ? RED : '#2B1F6E')} aria-pressed={speed === x} onClick={() => setSpeed(x)}>
                      x{x}
                    </button>
                  ))}
                  <button type="button" className="df-chip chunk pop" style={tint('#2B1F6E')} disabled={shown} onClick={() => setShown(true)} data-testid="skip">
                    Skip
                  </button>
                </div>
              )}
              {result && replay && (
                <p className={cx('df-result', result.win ? 'win' : 'lose')} role="status" data-testid="defense-result">
                  {result.win ? `Wave ${replay.setup.wave} won! A new best.` : `Wave ${replay.setup.wave} lost: ${result.leaks} reached your planets. Level up or add turrets, then try again.`}
                </p>
              )}
              <div className="well df-auto">
                <b>Auto-defend</b>
                {data.auto.open ? (
                  <>
                    <Button size="sm" gloss={false} color={data.auto.on ? '#2E8FD0' : '#3A3466'} aria-pressed={data.auto.on} onClick={() => commands.setDefenseAuto(!data.auto.on)} data-testid="auto-defend">
                      {data.auto.on ? 'On' : 'Off'}
                    </Button>
                    <small>
                      {data.auto.on
                        ? data.auto.mode === 'pushing'
                          ? `Fighting the next wave, each in its own battle time.`
                          : `Holding at wave ${data.best}: a win every ${data.auto.every}${data.auto.perWin ? ` brings ${data.auto.perWin} alloy` : ''}. It pushes on when your turrets change.`
                        : 'Fights waves on its own, here and while you are away.'}
                    </small>
                  </>
                ) : (
                  <small>
                    <Icon name="lock" /> Opens at best wave {data.auto.from}.
                  </small>
                )}
              </div>
            </div>
          </div>
          <h4 className="section-h">Sockets</h4>
          <div className="df-palette" role="group" aria-label="Turret to place">
            {data.turrets.map((t) => (
              <button key={t.id} type="button" className={cx('df-kind chunk pop', pick === t.id && 'on')} style={tint(pick === t.id ? t.color : '#2B1F6E')} aria-pressed={pick === t.id} onClick={() => setPick(t.id)} data-kind={t.id}>
                <b>{t.name}</b>
                <small>
                  {t.placeCost} {t.alloy}
                </small>
              </button>
            ))}
          </div>
          <div className="df-sockets">
            {data.sockets.map((x) => {
              const t = data.turrets.find((k) => k.id === pick)!;
              return x.kind ? (
                <button key={x.i} type="button" className="df-socket chunk pop" style={tint(x.color)} onClick={() => commands.clearSocket(x.i)} title="Clear it: its price comes back" data-socket={x.i}>
                  <b>{x.name}</b>
                  <small>Clear</small>
                </button>
              ) : (
                <button key={x.i} type="button" className="df-socket empty chunk pop" style={tint('#2B1F6E')} disabled={!t.canPlace} onClick={() => commands.placeTurret(x.i, pick)} aria-label={`Place a ${t.name} in socket ${x.i + 1} for ${t.placeCost} ${t.alloy} alloy`} data-socket={x.i}>
                  <b>{x.i + 1}</b>
                  <small>Place</small>
                </button>
              );
            })}
          </div>
          <h4 className="section-h">Turret levels</h4>
          <BuyAmountControl />
          <div className="belt-ups df-levels">
            {data.turrets.map((t) => (
              <UpRow key={t.id} name={`${t.name} (${t.placed} placed)`} desc={`${t.desc} Damage x1.25 a level. Costs ${t.alloy} alloy.`} level={t.level} count={t.count} cost={t.levelCost} can={t.canLevel} icon="defense" costIcon="ingot" testid={`turret-${t.id}`} onBuy={() => commands.buyTurretLevels(t.id)} />
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
