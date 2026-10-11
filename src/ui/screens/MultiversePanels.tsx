import { type CSSProperties, useEffect, type ReactNode } from 'react';
import { commands } from '../../app/commands';
import { constantsReport } from '../../app/earlyReports';
import { creditsText, forgeReport, multiverseReport, storyText } from '../../app/multiverseReports';
import { NODE_COLORS } from '../../app/novaReports';
import { layerConfirm } from '../../app/runeReports';
import { kitTreeReport } from '../../app/treeReports';
import { snapshotStore, useSnap } from '../../app/uiSnapshot';
import { sparkTree } from '../../engine/systems/multiverse';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { useReport } from '../kit/useReport';
import { formatFifths } from '../format';
import { useUi } from '../store';
import { TreeView } from '../tree/TreeView';
import { ConstantGrid } from './EarlyPanels';

/** Phase 18 panels: the Multiverse and its confirm screen, Spark choices, the Universe Forge, the ending and the credits. */

const VIOLET = '#7B3FD6';
const FORGE = '#B23A8E';

function SparkChip({ value }: { value: string }) {
  return (
    <span className="pill-mini pill-rainbow">
      <Icon name="spark" />
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

function startMultiverse(open: (id: string) => void) {
  if (snapshotStore.getState().confirmResets) open('multiverseConfirm');
  else commands.reset('multiverse');
}

// ---------- the Multiverse ----------

export function MultiversePanel() {
  const r = useReport('multiverse', multiverseReport, 250);
  const consts = useReport('multiverse', () => constantsReport('omni'), 250);
  const open = useUi((s) => s.open);
  const data = r ?? multiverseReport();
  return (
    <Panel id="multiverse" title="Multiverse" color={VIOLET} size="wide">
      <div className="tree-head">
        <p>
          The last reset. The point the universe fell into splits into many. Every layer from Stardust to the Big Crunch starts again, and you leave with Multiverse Sparks: {data.need} Big Crunches in a universe pay 6, and every choice costs 0.2. Spark choices can stop a layer resetting at all. Trials, the Spire, the Leviathans, every collection, relics, Mastery, your Level and medals stay.
        </p>
        <SparkChip value={data.sparks} />
      </div>
      <div className="nebula-cols">
        <div className="well nebula-run">
          <h4>This universe</h4>
          <ul className="milestones gal-checks">
            <Check ok={data.crunches >= data.need}>
              Big Crunches this universe <b className="num">{Math.min(data.crunches, data.need)}</b> / {data.need}
            </Check>
            <li className={data.rules.length ? 'reached' : ''}>
              <Icon name="universe" /> {data.rules.length ? `Rules: ${data.rules.join(', ')} (${data.reward} Sparks)` : 'No rules: an ordinary universe'}
            </li>
          </ul>
          <Button size="lg" color={data.ready ? VIOLET : '#5A5F8F'} disabled={!data.ready} onClick={() => startMultiverse(open)} data-testid="go-multiverse">
            {data.ready ? `Enter the Multiverse: +${data.gain} Sparks` : 'Not yet'}
          </Button>
          {data.autoCrunch && <small>Auto-Crunch is on: the Big Crunch happens by itself.</small>}
          <div className="nebula-links">
            <Button size="sm" color="#5A2A8C" onClick={() => open('sparktree')}>
              Spark Choices
            </Button>
            <Button size="sm" color={FORGE} onClick={() => open('universeforge')}>
              Universe Forge
            </Button>
            {data.storySeen && (
              <Button size="sm" color="#3B4370" onClick={() => open('story')}>
                The ending
              </Button>
            )}
          </div>
          <div className="mv-unbound" aria-label="Layers the Multiverse no longer resets">
            {data.unbound.map((u) => (
              <span key={u.name} className={cx('mv-layer', u.kept && 'kept')} style={{ '--c': u.color } as CSSProperties} title={u.kept ? `${u.name}: kept` : `${u.name}: resets`}>
                {u.name}
              </span>
            ))}
          </div>
        </div>
        <div className="well">
          <h4>Milestones ({data.done} Multiverses)</h4>
          <ul className="milestones">
            {data.milestones.map((m) => (
              <li key={m.at} className={m.reached ? 'reached' : ''}>
                <b className="num">{m.at}</b> {m.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {data.omniOpen && consts && consts.cards.length > 0 && (
        <>
          <h4 className="section-h">Omni Constants</h4>
          <p className="mv-note">Each level adds a little to many things at once. They never double, so they climb for ever: a million levels is one purchase.</p>
          <BuyAmountControl compact />
          <ConstantGrid cards={consts.cards} />
        </>
      )}
    </Panel>
  );
}

export function MultiverseConfirmPanel() {
  const r = useReport('multiverseConfirm', () => layerConfirm('multiverse'), 300);
  const forge = useReport('multiverseConfirm', forgeReport, 300);
  const close = useUi((s) => s.close);
  const open = useUi((s) => s.open);
  const next = forge?.cards.filter((c) => c.next).map((c) => c.name) ?? [];
  return (
    <Panel id="multiverseConfirm" title="Enter the Multiverse?" color={VIOLET} size="wide">
      {r && (
        <div className="confirm">
          <div className="big-gain">
            <Icon name="spark" />
            <span className="num">+{r.gain}</span>
          </div>
          <p className="center">
            {next.length ? `The next universe's rules: ${next.join(', ')} (${forge?.nextReward} Sparks).` : 'The next universe has no rules.'}{' '}
            <button type="button" className="link-btn" onClick={() => open('universeforge')}>
              Change them
            </button>
          </p>
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
            <Button size="lg" color={VIOLET} disabled={!r.ready} onClick={() => commands.reset('multiverse') && close()}>
              Enter the Multiverse
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

// ---------- Spark choices ----------

const SPARK_LEGEND = [
  { color: NODE_COLORS.pow, label: 'Keeps a whole layer' },
  { color: NODE_COLORS.unlock, label: 'Keeps milestones or automation, or adds Sparks' },
  { color: NODE_COLORS.add, label: 'Adds' },
  { color: NODE_COLORS.mul, label: 'Multiplies (the echoes level with no cap)' },
];

export function SparkTreePanel() {
  const r = useReport('sparktree', () => kitTreeReport(sparkTree, formatFifths), 200);
  return (
    <Panel id="sparktree" title="Spark Choices" color="#5A2A8C" size="wide">
      <div className="tree-head">
        <p>Six arms, one for each earlier layer. Every choice costs 0.2 Sparks and needs nothing first: buy them in any order. An arm's head stops the Multiverse resetting that layer; the next two keep its milestones and its Eternity automation. The lines only show the shape.</p>
        {r && <SparkChip value={r.money} />}
      </div>
      {r && !r.open && (
        <p className="depth-locked">
          <Icon name="lock" /> Spark choices open with your first Multiverse.
        </p>
      )}
      {r && r.open && <TreeView nodes={r.nodes} edges={r.edges} onBuy={(id) => commands.buySparkNode(id)} currencyLabel="Sparks" legend={SPARK_LEGEND} />}
    </Panel>
  );
}

// ---------- the Universe Forge ----------

export function UniverseForgePanel() {
  const r = useReport('universeforge', forgeReport, 250);
  const data = r ?? forgeReport();
  return (
    <Panel id="universeforge" title="Universe Forge" color={FORGE} size="wide">
      {!data.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> The Universe Forge opens at 8 Big Crunches.
        </p>
      ) : (
        <>
          <div className="tree-head">
            <p>
              Pick the rules of the next universe. They start when you enter the Multiverse and last the whole universe: harder, and it pays more Sparks at the end. This universe: {data.now.length ? `${data.now.join(', ')} (${data.nowReward} Sparks)` : 'no rules'}.
            </p>
            <span className="pill-mini">
              <Icon name="universe" />
              <span className="num">
                {data.picked}/{data.max}
              </span>
            </span>
          </div>
          <p className="mv-note">
            Next universe: <b>{data.nextReward} Sparks</b>. More rules at a time come with Multiverse milestones.
          </p>
          <div className="mv-rules">
            {data.cards.map((c) => (
              <button
                key={c.id}
                type="button"
                className={cx('mv-rule chunk pop', c.next && 'picked')}
                style={tint(c.next ? FORGE : '#3B4370')}
                disabled={!c.can}
                aria-pressed={c.next}
                onClick={() => commands.setNextRule(c.id, !c.next)}
                data-rule={c.id}
              >
                <b>{c.name}</b>
                <span>{c.desc}</span>
                <span className="num mv-reward">
                  <Icon name="spark" /> {c.reward} Sparks
                </span>
                {c.now && <span className="mv-now ol-sm">This universe</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}

// ---------- the ending ----------

/** Told once, a moment after the first Multiverse (once no other panel is open); re-read from Settings. */
export function StoryPanel() {
  const due = useSnap((s) => s.storyDue);
  const reduced = useSnap((s) => s.reducedMotion);
  const panel = useUi((s) => s.panel);
  const open = useUi((s) => s.open);
  const close = useUi((s) => s.close);
  useEffect(() => {
    if (!due || panel !== null) return;
    const t = window.setTimeout(() => {
      commands.markStorySeen();
      open('story');
    }, reduced ? 600 : 2800);
    return () => window.clearTimeout(t);
  }, [due, panel, reduced, open]);
  return (
    <Panel id="story" title="The Last Starsmith" color="#3B2470">
      <div className="mv-story">
        {storyText().map((p, i) => (
          <p key={i} style={{ animationDelay: `${i * 0.9}s` }}>
            {p}
          </p>
        ))}
      </div>
      <div className="set-row center-row">
        <Button size="lg" color={VIOLET} onClick={() => open('credits')}>
          Credits
        </Button>
        <Button size="lg" color="#5A5F8F" onClick={close}>
          Tap the star
        </Button>
      </div>
    </Panel>
  );
}

export function CreditsPanel() {
  return (
    <Panel id="credits" title="Credits" color="#5A2A8C" size="small">
      <div className="mv-credits">
        {creditsText().map((c) => (
          <section key={c.heading}>
            <h4>{c.heading}</h4>
            {c.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </section>
        ))}
      </div>
    </Panel>
  );
}
