import { useState, type CSSProperties } from 'react';
import { leviathansReport, spireReport, trialsReport, type TrialCard } from '../../app/challengeReports';
import { commands } from '../../app/commands';
import { NODE_LEGEND } from '../../app/novaReports';
import { kitTreeReport } from '../../app/treeReports';
import { useSnap } from '../../app/uiSnapshot';
import { scaleTree } from '../../engine/systems/leviathans';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';
import { useUi } from '../store';
import { TreeView } from '../tree/TreeView';

/** Phase 13 panels: Trials, the Spire, the Void Leviathans, the Scale Tree, and their stage HUD. */

function Locked({ what, req }: { what: string; req: string }) {
  return (
    <p className="depth-locked">
      <Icon name="lock" /> {what} {req}.
    </p>
  );
}

function Pips({ level, levels }: { level: number; levels: number }) {
  return (
    <span className="trial-pips" aria-label={`Level ${level} of ${levels}`}>
      {Array.from({ length: levels }, (_, i) => (
        <i key={i} className={i < level ? 'on' : ''} />
      ))}
    </span>
  );
}

// ---------- Trials ----------

export function TrialsPanel() {
  const r = useReport('trials', trialsReport, 200);
  const [fusion, setFusion] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const data = r ?? trialsReport();
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < data.fusionMax ? [...p, id] : p));
  const busy = data.active.length > 0;
  return (
    <Panel id="trials" title="Trials" color="#C23F6A" size="wide">
      {!data.open ? (
        <Locked what="Trials" req="open at 2 Singularities" />
      ) : (
        <>
          <div className="tree-head">
            <p>
              Optional restricted runs. Entering one restarts your Supernova run with its debuff on; reach Blue Giant and the goal in Stardust to earn a level and its reward for good. None is ever needed to progress.
            </p>
            <span className="pill-mini">
              <Icon name="trial" />
              <span className="num">{data.total}</span> levels
            </span>
          </div>

          {busy && (
            <div className="well trial-live" style={tint('#C23F6A')}>
              <div className="trial-live-head">
                <b>
                  {data.inFusion ? 'Fusion: ' : ''}
                  {data.activeNames}
                </b>
                <span>
                  Time <b className="num">{data.elapsed}</b>
                  {data.fusionNow && (
                    <>
                      {' '}
                      · score now <b className="num">{data.fusionNow}</b>
                    </>
                  )}
                </span>
              </div>
              <ProgressBar value={data.pct / 100} color="#C23F6A" label="Trial goal" />
              <span className="altar-fine">
                Goal: Blue Giant and {data.goal} Stardust this run ({data.run}). A Supernova now {data.ready ? 'finishes the Trial' : 'ends the Trial with nothing'}.
              </span>
              <div className="center-row">
                <Button color="var(--lime)" disabled={!data.ready} onClick={() => commands.claimTrial()} data-testid="trial-claim">
                  Claim
                </Button>
                <Button color="#5A5F8F" onClick={() => commands.leaveTrial()} data-testid="trial-leave">
                  Leave
                </Button>
              </div>
            </div>
          )}

          <div className="trial-modes">
            <div className="auto-spend trial-seg" role="group" aria-label="Trial mode">
              <button type="button" className="chunk pop" aria-pressed={!fusion} onClick={() => setFusion(false)}>
                One Trial
              </button>
              <button type="button" className="chunk pop" aria-pressed={fusion} onClick={() => setFusion(true)} data-testid="trial-fusion-mode">
                Fusion
              </button>
            </div>
            {fusion ? (
              <>
                <span className="altar-fine">
                  Pick 2 to {data.fusionMax} (not Fast Nova). Best score {data.fusionBest}: {data.fusionRewards}.
                </span>
                <Button size="sm" color="#C23F6A" disabled={busy || picked.length < 2} onClick={() => commands.enterTrial(picked) && setPicked([])} data-testid="trial-fusion-start">
                  Start Fusion ({picked.length})
                </Button>
              </>
            ) : (
              <span className="altar-fine">
                {data.autoOpen ? (
                  <label className="trial-auto">
                    <input type="checkbox" checked={data.auto} onChange={(e) => commands.setTrialsAuto(e.target.checked)} /> Finish Trials the moment the goal is met
                  </label>
                ) : (
                  `Auto-finish opens at ${data.autoAt} Trial levels.`
                )}
              </span>
            )}
          </div>

          <div className="trial-grid">
            {data.cards.map((c) => (
              <TrialCardView
                key={c.id}
                c={c}
                fusion={fusion}
                picked={picked.includes(c.id)}
                busy={busy}
                onPick={() => toggle(c.id)}
                ranks={c.id === 'fast' ? data.ranks : undefined}
                fastBest={data.fastBest}
                fastMult={data.fastMult}
              />
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

function TrialCardView({
  c,
  fusion,
  picked,
  busy,
  onPick,
  ranks,
  fastBest,
  fastMult,
}: {
  c: TrialCard;
  fusion: boolean;
  picked: boolean;
  busy: boolean;
  onPick: () => void;
  ranks?: Array<{ name: string; got: boolean; time: string; mult: string }>;
  fastBest: string;
  fastMult: string;
}) {
  const canFuse = c.id !== 'fast';
  return (
    <div className={cx('trial-card chunk', c.active && 'active', c.maxed && 'maxed', picked && 'picked')} style={tint(c.active ? '#C23F6A' : '#2A2160')} data-trial={c.id}>
      <div className="trial-top">
        <b>{c.name}</b>
        {c.id === 'fast' ? <span className="num rank">{fastBest}</span> : <Pips level={c.level} levels={c.levels} />}
      </div>
      <p className="trial-debuff">{c.debuff}</p>
      <p className="trial-reward">
        {c.reward}
        {c.now && <span className="num"> Now {c.now}.</span>}
        {c.id === 'fast' && fastBest !== 'none' && <span className="num"> Now shards {fastMult}.</span>}
      </p>
      {ranks && (
        <div className="trial-ranks" aria-label="Fast Nova ranks">
          {ranks.map((r) => (
            <span key={r.name} className={cx('rank-chip', r.got && 'got')} title={`Under ${r.time}: shards ${r.mult}`}>
              {r.name}
            </span>
          ))}
        </div>
      )}
      {fusion ? (
        <Button size="sm" color={picked ? '#C23F6A' : '#5A5F8F'} disabled={!canFuse || busy} onClick={onPick} aria-pressed={picked}>
          {canFuse ? (picked ? 'Picked' : 'Pick') : 'Solo only'}
        </Button>
      ) : (
        <Button size="sm" color="#C23F6A" disabled={busy || c.maxed} onClick={() => commands.enterTrial([c.id])} data-testid={`trial-enter-${c.id}`}>
          {c.maxed ? 'Mastered' : c.active ? 'Running' : 'Enter'}
        </Button>
      )}
    </div>
  );
}

// ---------- the Spire ----------

export function SpirePanel() {
  const r = useReport('spire', spireReport, 200);
  const data = r ?? spireReport();
  return (
    <Panel id="spire" title="The Spire" color="#8C97C2" size="wide">
      {!data.open ? (
        <Locked what="The Spire" req="opens at 3 Singularities" />
      ) : (
        <div className="spire-cols">
          <div className="spire-tower" aria-label={`Floor ${data.floor}`}>
            {[3, 2, 1].map((d) => (
              <div key={d} className="spire-floor ahead" style={{ ['--w' as string]: `${70 - d * 8}%` } as CSSProperties}>
                <span className="num">{data.floor + d}</span>
              </div>
            ))}
            <div className={cx('spire-floor current chunk', data.climbing && !data.paused && 'climbing')} style={tint('#8C97C2')}>
              <span className="num ol">Floor {data.floor}</span>
              <ProgressBar value={data.pct / 100} color="#FF4FC1" label="Floor damage" />
            </div>
            {data.floor > 0 && (
              <div className="spire-floor below">
                <span className="num">{data.floor - 1}</span>
              </div>
            )}
          </div>
          <div className="spire-side">
            <div className="well spire-info">
              <span>
                Floor HP <b className="num">{data.hp}</b> · dealt <b className="num">{data.dealt}</b>
              </span>
              <span>
                Damage <b className="num">{data.dps}</b> · next floor in <b className="num">{data.eta}</b>
              </span>
              <span>
                This floor plays <b>{data.gimmick}</b>: {data.gimmickText}
              </span>
              <span className="altar-fine">
                Next floor: {data.next}. Best floor {data.best}. Floors so far give {data.rewards}.
              </span>
              {data.paused && <span className="altar-fine">Climbing pauses while a Trial runs.</span>}
              <Button size="lg" color={data.climbing ? '#5A5F8F' : '#8C97C2'} onClick={() => commands.setClimbing(!data.climbing)} data-testid="spire-climb">
                {data.climbing ? 'Stop climbing' : 'Climb'}
              </Button>
            </div>
            <h4 className="section-h">Banners</h4>
            <div className="spire-banners">
              {data.banners.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={cx('banner-tile chunk pop', !b.unlocked && 'locked', b.flown && 'flown')}
                  style={tint(b.unlocked ? b.color : '#3A3F6F')}
                  disabled={!b.unlocked}
                  onClick={() => commands.flyBanner(b.flown ? null : b.id)}
                  title={b.unlocked ? `${b.name}${b.flown ? ' (flying)' : ''}` : `Floor ${b.at}`}
                >
                  <span className="pennant" aria-hidden="true" />
                  <span>{b.unlocked ? b.name : `Floor ${b.at}`}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---------- the Void Leviathans ----------

export function LeviathansPanel() {
  const r = useReport('leviathans', leviathansReport, 150);
  const open = useUi((s) => s.open);
  const data = r ?? leviathansReport();
  return (
    <Panel id="leviathans" title="Void Leviathans" color="#2B7FD0" size="wide">
      {!data.open ? (
        <Locked what="The Leviathans" req="surface at 4 Singularities" />
      ) : (
        <>
          <div className="well lev-boss" style={tint(data.color)}>
            <div className="lev-boss-head">
              <b>{data.name}</b>
              <span>
                <b className="num">{data.hp}</b> HP
              </span>
            </div>
            <ProgressBar value={1 - data.pct / 100} color={`color-mix(in oklab, ${data.color} 65%, white)`} label={`${data.name} health`} />
            <span className="altar-fine">
              Output and {data.team} Wyrm{data.team === 1 ? '' : 's'} deal <b className="num">{data.dps}</b>; each tap on the star deals <b className="num">{data.tap}</b> (damage {data.damageMult}).{' '}
              {data.fighting ? `Down in about ${data.eta}.` : 'Start the hunt to deal damage.'}
            </span>
            <div className="center-row">
              <Button size="lg" color={data.fighting ? '#5A5F8F' : '#2B7FD0'} onClick={() => commands.setFighting(!data.fighting)} data-testid="lev-fight">
                {data.fighting ? 'Stop the hunt' : 'Hunt'}
              </Button>
              <Button color="#1A9DB8" onClick={() => open('scaletree')}>
                <Icon name="scale" /> {data.scales} scales
              </Button>
            </div>
          </div>
          <div className="lev-grid">
            {data.rows.map((l) => (
              <button
                key={l.id}
                type="button"
                className={cx('lev-tile chunk pop', l.current && 'current', !l.unlocked && 'locked')}
                style={tint(l.unlocked ? l.color : '#3A3F6F')}
                disabled={!l.unlocked || l.current}
                onClick={() => commands.chooseLeviathan(l.k)}
                data-lev={l.id}
              >
                <Icon name="leviathan" />
                <b>{l.unlocked ? l.name : 'Unknown'}</b>
                <span className="num">{l.unlocked ? `${l.hp} HP` : 'Beat the one before'}</span>
                {l.unlocked && (
                  <span className="num">
                    {l.kills} kills · {l.scales} scales
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

export function ScaleTreePanel() {
  const r = useReport('scaletree', () => kitTreeReport(scaleTree), 200);
  return (
    <Panel id="scaletree" title="Scale Tree" color="#1A9DB8" size="wide">
      <div className="tree-head">
        <p>Three branches (the Hunt, the Hoard and the Sea) and a crown that needs all three. Bought with Leviathan scales; never reset.</p>
        {r && (
          <span className="pill-mini">
            <Icon name="scale" />
            <span className="num">{r.money}</span>
          </span>
        )}
      </div>
      {r && <TreeView nodes={r.nodes} edges={r.edges} onBuy={(id) => commands.buyScaleNode(id)} currencyLabel="scales" legend={NODE_LEGEND} />}
    </Panel>
  );
}

// ---------- on the stage: the Trial chip and the Leviathan boss bar ----------

export function ChallengeHud() {
  const trial = useSnap((s) => s.trialLabel);
  const trialPct = useSnap((s) => s.trialPct);
  const trialReady = useSnap((s) => s.trialReady);
  const lev = useSnap((s) => s.levVisible);
  const levName = useSnap((s) => s.levName);
  const levColor = useSnap((s) => s.levColor);
  const levPct = useSnap((s) => s.levPct);
  const levHp = useSnap((s) => s.levHp);
  const fog = useSnap((s) => s.fog);
  const open = useUi((s) => s.open);
  if (!trial && !lev) return null;
  return (
    <>
      {/* outside the HUD box: a transformed parent would trap a fixed veil */}
      {fog && <div className="fog-veil" aria-hidden="true" />}
      <div className="challenge-hud">
        {trial && (
          <button type="button" className={cx('trial-chip chunk pop', trialReady && 'ready')} style={tint('#C23F6A')} onClick={() => open('trials')} data-testid="trial-chip">
            <Icon name="trial" />
            <span className="lbl">{trialReady ? `${trial}: goal met` : trial}</span>
            <ProgressBar value={trialPct / 100} color="#FFC83D" label="Trial goal" />
          </button>
        )}
        {lev && (
          <button type="button" className="boss-bar chunk pop" style={tint(levColor)} onClick={() => open('leviathans')} data-testid="boss-bar">
            <span className="lbl">
              <Icon name="leviathan" /> {levName}
            </span>
            <ProgressBar value={levPct / 100} color={`color-mix(in oklab, ${levColor} 65%, white)`} label={`${levName} health`} />
            <span className="num hp">{levHp}</span>
          </button>
        )}
      </div>
    </>
  );
}
