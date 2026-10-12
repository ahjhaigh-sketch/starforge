import { BALANCE } from '../../content/balance';
import { commands, sigilAware } from '../../app/commands';
import { ascentReport, automationReport, NODE_LEGEND, supernovaReport, treeReport } from '../../app/novaReports';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';
import { TreeView } from '../tree/TreeView';
import { useUi } from '../store';

/** The confirm screen: what you get, what resets, what is kept (straight from the reset function). */
export function SupernovaPanel() {
  const r = useReport('supernova', supernovaReport, 300);
  const close = useUi((s) => s.close);
  return (
    <Panel id="supernova" title="Go Supernova?" color="#FF4FC1" size="small">
      {r && (
        <div className="confirm">
          <div className="big-gain">
            <Icon name="shard" />
            <span className="num">+{r.gain}</span>
          </div>
          <p className="center">Nova Shards from this run ({r.run}). Lifetime shards boost every bit of Stardust, so spending them never weakens you.</p>
          {r.codex && (
            <p className="center codex-preview" data-testid="codex-preview">
              <Icon name="atom" /> {r.codex}
            </p>
          )}
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
            <Button size="lg" color="var(--magenta)" disabled={!r.ready} onClick={() => commands.reset('supernova') && close()}>
              Go Supernova
            </Button>
            <Button size="lg" color="#5A5F8F" onClick={close}>
              Not yet
            </Button>
          </div>
          <h4>Milestones ({r.done} done)</h4>
          <ul className="milestones">
            {r.milestones.map((m) => (
              <li key={m.at} className={m.reached ? 'reached' : ''}>
                <b className="num">{m.at}</b> {m.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

export function NovaTreePanel() {
  const r = useReport('novatree', treeReport, 200);
  return (
    <Panel id="novatree" title="Nova Tree" color="#C23FA0" size="wide">
      <div className="tree-head">
        <p>Spend Nova Shards on a spiral of nodes. Three arms: Forge-heart (engines), Starstrike (taps and comets), Dreaming (offline, shards, automation). New nodes appear as you buy.</p>
        <div className="pill chunk" style={tint('#5A2A8C')}>
          <span className="ico">
            <Icon name="shard" />
          </span>
          <span className="val ol num">{r?.shards}</span>
        </div>
      </div>
      {r && <TreeView nodes={r.nodes} edges={r.edges} onBuy={sigilAware((id) => commands.buyNode(id))} currencyLabel="shards" legend={NODE_LEGEND} />}
    </Panel>
  );
}

const SPEND_LABELS: Record<number, string> = { 1: 'All', 0.5: 'Half', 0.1: 'A tenth' };

/** Every auto-buyer you have earned, each with a switch and a spending limit. */
export function AutomationPanel() {
  const rows = useReport('automation', automationReport, 300);
  return (
    <Panel id="automation" title="Automation" color="#4A4F7A" size="wide">
      <p>Auto-buyers come from Supernova milestones. Each buys as much as it can, once a second (faster with the Dreaming arm), and keeps working while you are away. Limit how much of your Stardust each may spend.</p>
      <div className="auto-grid">
        {rows?.map((a) => (
          <div key={a.id} className={cx('auto-row chunk', !a.unlocked && 'locked')} style={tint(a.unlocked ? '#2B1F6E' : '#24203F')} data-auto={a.id}>
            <b>{a.unlocked ? a.name : `${a.name} (${a.req})`}</b>
            {a.unlocked && (
              <>
                <Button size="sm" gloss={false} color={a.on ? 'var(--lime)' : '#5A5F8F'} onClick={() => commands.setAuto(a.id, { on: !a.on })} aria-pressed={a.on}>
                  {a.on ? 'On' : 'Off'}
                </Button>
                <span className="auto-spend" role="group" aria-label={`${a.name}: how much it may spend`}>
                  {BALANCE.automation.spendChoices.map((v) => (
                    <button key={v} type="button" className="chunk pop" aria-pressed={a.spend === v} onClick={() => commands.setAuto(a.id, { spend: v })}>
                      {SPEND_LABELS[v]}
                    </button>
                  ))}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** The Ascent: a vertical star map of every system, Protostar at the bottom. */
export function AscentPanel() {
  const stages = useReport('ascent', ascentReport, 500);
  const open = useUi((s) => s.open);
  return (
    <Panel id="ascent" title="The Ascent" color="#4C3BC4" size="wide">
      <p>Every system on one map. Lit ones are open; the next few show what unlocks them; the rest wait further up.</p>
      <div className="ascent">
        {stages?.map((st) => (
          <section key={st.stage} className="ascent-stage">
            <h4>{st.stage}</h4>
            <div className="ascent-decks">
              {st.decks.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={cx('deck chunk pop', d.state)}
                  style={tint(d.state === 'lit' ? d.color : '#2B2558')}
                  disabled={!d.panel}
                  onClick={() => d.panel && open(d.panel)}
                  data-deck={d.id}
                >
                  <Icon name={d.state === 'dim' ? 'mystery' : d.icon} />
                  <span className="deck-name">{d.state === 'dim' ? '???' : d.name}</span>
                  {d.state === 'next' && (
                    <span className="deck-req">
                      {d.req}
                      <ProgressBar value={d.pct / 100} color="var(--lime)" label={`${d.name} progress`} />
                    </span>
                  )}
                  {d.state === 'soon' && <span className="deck-req">{d.req}</span>}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Panel>
  );
}
