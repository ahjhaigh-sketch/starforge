import { BALANCE } from '../../content/balance';
import { useSnap } from '../../app/uiSnapshot';
import { commands, sigilAware } from '../../app/commands';
import { ascentOverview, type AscentDeck, ascentReport, automationReport, NODE_LEGEND, supernovaReport, treeReport } from '../../app/novaReports';
import { useState } from 'react';
import { layerAutoReport, type LayerAutoRow } from '../../app/autoReports';
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
  const treeBulk = useSnap((s) => s.treeBulk);
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
      {r && <TreeView nodes={r.nodes} edges={r.edges} onBuy={sigilAware((id) => commands.buyNode(id))} onBuyAll={() => commands.buyAllNodes('novatree')} bulkLocked={treeBulk ? '' : 'Buy all opens at 5 Supernovas'} currencyLabel="shards" legend={NODE_LEGEND} />}
    </Panel>
  );
}

const SPEND_LABELS: Record<number, string> = { 1: 'All', 0.5: 'Half', 0.1: 'A tenth' };

/** Every auto-buyer you have earned, each with a switch and a spending limit. */
/** 1.4.0: one layer's automation: how far it runs itself, its switch and its reset rule. */
function LayerAutoCard({ r }: { r: LayerAutoRow }) {
  const [at, setAt] = useState(r.at);
  // milestones can set parts of a layer running before the layer itself does: those get the switch too
  const live = r.level > 0 || r.running.length > 0;
  return (
    <div className={cx('layer-auto chunk', !live && 'locked')} style={tint(live ? '#2B1F6E' : '#24203F')} data-layer-auto={r.layer}>
      <div className="layer-auto-head">
        <b className="ol" style={{ color: r.color }}>
          {r.name}
        </b>
        <span className={cx('layer-auto-level', r.level === 2 && 'full')}>{r.level === 2 ? 'Runs itself' : r.level === 1 ? 'Mostly runs itself' : live ? 'Partly runs itself' : 'Not yet'}</span>
        {live && (
          <Button size="sm" gloss={false} color={r.on ? 'var(--lime)' : '#5A5F8F'} onClick={() => commands.setEternityAuto(r.layer, { on: !r.on })} aria-pressed={r.on} aria-label={`${r.name} runs itself`}>
            {r.on ? 'On' : 'Off'}
          </Button>
        )}
      </div>
      <small className="layer-auto-needs">{r.needs}</small>
      {live && r.resets && (
        <span className="layer-auto-rule" role="group" aria-label={`When ${r.name} resets by itself`}>
          <button type="button" className="chunk pop" aria-pressed={r.mode === 'double'} onClick={() => commands.setEternityAuto(r.layer, { mode: 'double' })}>
            When it doubles
          </button>
          <button type="button" className="chunk pop" aria-pressed={r.mode === 'amount'} onClick={() => commands.setEternityAuto(r.layer, { mode: 'amount', at: Number(at) || 0 })}>
            At an amount
          </button>
          {r.mode === 'amount' && (
            <input className="chunk" inputMode="decimal" value={at} placeholder="gain" aria-label={`${r.name} gain to reset at`} onChange={(e) => setAt(e.target.value)} onBlur={() => commands.setEternityAuto(r.layer, { mode: 'amount', at: Number(at) || 0 })} />
          )}
        </span>
      )}
      {r.running.length > 0 && <small className="layer-auto-list">Running: {r.running.join(', ')}</small>}
      {live && r.waiting.length > 0 && <small className="layer-auto-list dim">{r.level === 0 ? 'Later' : 'Next layer up'}: {r.waiting.join(', ')}</small>}
    </div>
  );
}

export function AutomationPanel() {
  const rows = useReport('automation', automationReport, 300);
  const layers = useReport('automation', layerAutoReport, 500);
  return (
    <Panel id="automation" title="Automation" color="#4A4F7A" size="wide">
      <div className="auto-all-bar">
        <p>
          Every layer you pass runs itself: one layer on, its reset, tree, constants and main systems; two layers on, all of it, and its menus tuck away. Auto-buyers buy all they can at once, once a second, and keep working while you're away; none ever spends the safe tenth.
        </p>
        <Button color="var(--lime)" onClick={() => commands.autoAll()} data-testid="auto-all">
          Auto all
        </Button>
      </div>
      {layers && layers.length > 0 && (
        <>
          <h4 className="auto-head ol-sm">Layers that run themselves</h4>
          <div className="layer-auto-grid">
            {layers.map((r) => (
              <LayerAutoCard key={r.layer} r={r} />
            ))}
          </div>
        </>
      )}
      <h4 className="auto-head ol-sm">Auto-buyers</h4>
      <div className="auto-grid">
        {rows?.map((a) => (
          <div key={a.id} className={cx('auto-row chunk', !a.unlocked && 'locked')} style={tint(a.unlocked ? '#2B1F6E' : '#24203F')} data-auto={a.id}>
            <b>{a.unlocked ? a.name : `${a.name} (${a.req})`}</b>
            {a.unlocked && (
              <>
                <Button size="sm" gloss={false} color={a.on ? 'var(--lime)' : '#5A5F8F'} onClick={() => commands.setAuto(a.id, { on: !a.on })} aria-pressed={a.on}>
                  {a.on ? 'On' : 'Off'}
                </Button>
                {a.spends ? (
                  <span className="auto-spend" role="group" aria-label={`${a.name}: how much of its ${a.spends} it may spend`} title={`Spends ${a.spends}`}>
                    {BALANCE.automation.spendChoices.map((v) => (
                      <button key={v} type="button" className="chunk pop" aria-pressed={a.spend === v} onClick={() => commands.setAuto(a.id, { spend: v })}>
                        {SPEND_LABELS[v]}
                      </button>
                    ))}
                  </span>
                ) : (
                  <small className="auto-note">spends nothing</small>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** The Ascent: a vertical star map of every system, Protostar at the bottom. */
/** 1.2.0: the chosen deck, in full: what it is, what it needs, and a way in. */
function DeckDetail({ d, onOpen }: { d: AscentDeck; onOpen: (panel: string) => void }) {
  const dim = d.state === 'dim';
  return (
    <div className="deck-detail chunk" style={tint(d.state === 'lit' ? d.color : '#2B2558')} data-testid="deck-detail">
      <span className="deck-detail-ico">
        <Icon name={dim ? 'mystery' : d.icon} />
      </span>
      <span className="deck-detail-text">
        <b className="ol">{dim ? '???' : d.name}</b>
        <span>{dim ? 'Further up the map. Keep climbing to see what it is.' : d.blurb}</span>
        {d.state === 'lit' && <small>{d.tucked ? 'Open, and off the rails (hidden or running itself): open it from here.' : 'Open: on the rails.'}</small>}
        {d.state === 'soon' && <small>{d.req}</small>}
        {(d.state === 'next' || d.state === 'dim') && (
          <span className="deck-detail-req">
            <small>
              {dim ? 'Needs more than you have seen yet' : d.req} · <span className="num">{d.pct}%</span>
            </small>
            <ProgressBar value={d.pct / 100} color="var(--lime)" label={`${d.name} progress`} />
          </span>
        )}
      </span>
      {d.panel && (
        <Button size="sm" color="var(--lime)" onClick={() => onOpen(d.panel!)}>
          Open
        </Button>
      )}
    </div>
  );
}

export function AscentPanel() {
  const stages = useReport('ascent', ascentReport, 500);
  const overview = useReport('ascent', ascentOverview, 500);
  const open = useUi((s) => s.open);
  const [chosen, setChosen] = useState<string | null>(null);
  const picked = stages?.flatMap((st) => st.decks).find((d) => d.id === chosen) ?? null;
  return (
    <Panel id="ascent" title="The Ascent" color="#4C3BC4" size="wide">
      <p>Every system on one map, Protostar at the bottom. Lit ones are open; the next few show what unlocks them; the rest wait further up. Tap any one for the details; menus you hid or that run themselves can always be opened from here.</p>
      {overview && (
        <div className="ascent-top">
          <span className="ascent-count">
            <b className="num">{overview.lit}</b> of <span className="num">{overview.total}</span> systems open
          </span>
          <ProgressBar value={overview.lit / Math.max(1, overview.total)} color="var(--gold)" label="Systems open" />
          {overview.next && (
            <small>
              Closest next: <b>{overview.next}</b> ({overview.nextReq}, <span className="num">{overview.nextPct}%</span>)
            </small>
          )}
        </div>
      )}
      {picked && <DeckDetail d={picked} onOpen={open} />}
      <div className="ascent">
        {stages?.map((st) => (
          <section key={st.stage} className={cx('ascent-stage', st.here && 'here', st.lit === st.total && 'done')}>
            <h4>
              {st.stage} <small className="ascent-stage-count num">{st.lit}/{st.total}</small>
              {st.here && <span className="ascent-here ol-sm">You are here</span>}
            </h4>
            <div className="ascent-decks">
              {st.decks.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={cx('deck chunk pop', d.state, chosen === d.id && 'chosen', d.tucked && 'tucked')}
                  style={tint(d.state === 'lit' ? d.color : '#2B2558')}
                  onClick={() => setChosen(chosen === d.id ? null : d.id)}
                  onDoubleClick={() => d.panel && open(d.panel)}
                  aria-pressed={chosen === d.id}
                  title={d.panel ? 'Tap for details, double-tap to open' : 'Tap for details'}
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
            {st.perks.length > 0 && (
              <div className="ascent-perks" aria-label={`${st.stage} perks`}>
                {st.perks.map((p) => (
                  <span key={p.name} className={cx('ascent-perk', p.lit && 'lit')} title={p.req}>
                    <Icon name={p.lit ? 'auto' : 'lock'} />
                    <span>
                      <b>{p.name}</b>
                      {!p.lit && <small>{p.req}</small>}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </Panel>
  );
}
