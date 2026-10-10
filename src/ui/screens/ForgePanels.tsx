import { useEffect, useRef, useState } from 'react';
import { commands } from '../../app/commands';
import { codexReport, type CodexReport, forgeReport, type ForgeReport, relicsReport } from '../../app/forgeReports';
import { snapshotStore } from '../../app/uiSnapshot';
import { BALANCE } from '../../content/balance';
import type { ForgeUpgradeId } from '../../content/forge';
import { ForgeView } from '../../render/forgeView';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';

type Tab = 'furnace' | 'relics' | 'codex';
const SHARE_LABELS: Record<number, string> = { 1: 'All', 0.5: 'Half', 0.1: 'A tenth' };
const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'furnace', label: 'Furnace', icon: 'bellows' },
  { id: 'relics', label: 'Relics', icon: 'forge' },
  { id: 'codex', label: 'Codex', icon: 'atom' },
];

/** The Starforge: smelt ore into alloy, forge relics from it, and fill the Element Codex. */
export function StarforgePanel() {
  const [tab, setTab] = useState<Tab>('furnace');
  return (
    <Panel id="starforge" title="Starforge" color="#8A5CD8" size="wide">
      <div className="forge-tabs" role="tablist" aria-label="Starforge">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`forge-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`forge-pane-${t.id}`}
            className={cx('forge-tab chunk pop', tab === t.id && 'on')}
            style={tint(tab === t.id ? '#8A5CD8' : '#2B1F6E')}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`forge-pane-${tab}`} aria-labelledby={`forge-tab-${tab}`}>
        {tab === 'furnace' && <FurnaceTab />}
        {tab === 'relics' && <RelicsTab />}
        {tab === 'codex' && <CodexTab />}
      </div>
    </Panel>
  );
}

// ---------- Furnace ----------

function ForgeCanvas({ report }: { report: ForgeReport }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<ForgeView | null>(null);
  useEffect(() => {
    const box = host.current;
    const el = canvas.current;
    if (!box || !el) return;
    const v = new ForgeView();
    let alive = true;
    let ready = false;
    let ro: ResizeObserver | null = null;
    let unsub = () => {};
    void v.mount(el, Math.max(1, box.clientWidth), Math.max(1, box.clientHeight)).then((ok) => {
      ready = true;
      if (!alive) return v.destroy();
      if (!ok) return;
      view.current = v;
      const motion = () => v.setReducedMotion(snapshotStore.getState().reducedMotion);
      motion();
      unsub = snapshotStore.subscribe(motion);
      ro = new ResizeObserver(() => v.resize(Math.max(1, box.clientWidth), Math.max(1, box.clientHeight)));
      ro.observe(box);
    });
    return () => {
      alive = false;
      unsub();
      ro?.disconnect();
      view.current = null;
      if (ready) v.destroy();
    };
  }, []);
  useEffect(() => {
    view.current?.setState({ on: report.on, busy: report.busy, color: report.gradeColor, fill: report.fill, seconds: report.seconds });
  });
  return (
    <div ref={host} className="forge-scene well" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}

function FurnaceTab() {
  const r = useReport('starforge', forgeReport, 150);
  if (!r) return null;
  return (
    <div className="furnace">
      <p>Ore goes into the hopper, rides the Mag-Belt and comes out of the Stellar Furnace as Star Alloy. Each grade of ore makes its own alloy; rare asteroids drop the rare grades.</p>
      <ForgeCanvas report={r} />
      <div className="furnace-status">
        <span className={cx('furnace-state', r.on && r.busy > 0 && 'hot')} data-testid="furnace-status">
          {r.status}
        </span>
        <Button size="sm" color={r.on ? 'var(--lime)' : '#5A5F8F'} aria-pressed={r.on} onClick={() => commands.setForgeOn(!r.on)}>
          {r.on ? 'On' : 'Off'}
        </Button>
      </div>
      <div className="grades" role="radiogroup" aria-label="Ore to smelt">
        {r.grades.map((g) => (
          <button key={g.id} type="button" role="radio" aria-checked={g.selected} className={cx('grade chunk pop', g.selected && 'on')} style={tint(g.selected ? g.color : '#2B1F6E')} onClick={() => commands.setForgeGrade(g.id)} data-grade={g.id}>
            <b>{g.name}</b>
            <small>
              <span className="num">{g.ore}</span> ore
            </small>
            <small className="grade-alloy">
              <Icon name="ingot" />
              <span className="num">{g.alloy}</span>
            </small>
          </button>
        ))}
      </div>
      <div className="hopper-share">
        <span>Hopper takes, of the common ore you mine:</span>
        <span className="auto-spend" role="group" aria-label="How much common ore the hopper takes">
          {BALANCE.forge.shareChoices.map((v) => (
            <button key={v} type="button" className="chunk pop" aria-pressed={r.share === v} onClick={() => commands.setForgeShare(v)}>
              {SHARE_LABELS[v]}
            </button>
          ))}
        </span>
      </div>
      <div className="crucibles" aria-label="Crucibles">
        {r.crucibles.map((c, i) => (
          <ProgressBar key={i} value={c.pct / 100} color={c.busy ? c.color : '#3A3466'} label={`Crucible ${i + 1}`} />
        ))}
      </div>
      <p className="furnace-batch">
        {r.batch}: up to <b className="num">{r.perMinute}</b> alloy a minute.
      </p>
      <div className="furnace-ups">
        <div className="furnace-ups-head">
          <BuyAmountControl compact />
          <span className="pill-mini">
            <Icon name="belt" />
            <span className="num">{r.ore}</span> ore
          </span>
        </div>
        {r.upgrades.map((u) => (
          <div key={u.id} className="belt-up chunk" style={tint('#2B1F6E')} data-forge-up={u.id}>
            <span className="tile chunk" style={tint('#8A5CD8')}>
              <Icon name={u.icon} />
            </span>
            <div className="belt-up-body">
              <b>
                {u.name} <span className="num lvl">{u.level}</span>
              </b>
              <small>{u.desc}</small>
            </div>
            <Button size="sm" color={u.can ? 'var(--lime)' : '#5A5F8F'} disabled={!u.can} onClick={() => commands.buyForgeUpgrade(u.id as ForgeUpgradeId)} aria-label={u.maxed ? `${u.name} is maxed` : `Buy ${u.count} ${u.name} for ${u.cost} ore`}>
              {u.maxed ? (
                'Max'
              ) : (
                <>
                  {u.count > 1 && <span className="num buy-n">+{u.count}</span>}
                  <span className="cost-chip">
                    <Icon name="belt" />
                    {u.cost}
                  </span>
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Relics ----------

function RelicsTab() {
  const r = useReport('starforge', relicsReport, 150);
  if (!r) return null;
  return (
    <div className="relics">
      <p>Craft relics from alloy and level them with more. Only equipped relics count. Crafting every relic of a grade doubles that alloy.</p>
      <div className="relic-slots" aria-label={`Equipped relics, ${r.slots} slots`}>
        {r.equipped.map((e, i) =>
          e ? (
            <button key={e.id} type="button" className="relic-slot chunk pop" style={tint(e.color)} onClick={() => commands.unequipRelic(e.id)} title={`${e.name}: click to unequip`} aria-label={`Unequip ${e.name}`}>
              <Icon name={e.icon} />
            </button>
          ) : (
            <span key={`empty-${i}`} className="relic-slot empty" aria-label="Empty slot" />
          ),
        )}
      </div>
      <BuyAmountControl compact />
      {r.grades.map((g) => (
        <section key={g.id} className="relic-grade" data-relic-grade={g.id}>
          <h4 style={{ color: g.color }}>
            {g.name} relics{' '}
            <small>
              <Icon name="ingot" />
              <span className="num">{g.alloy}</span> alloy · <span className="num">{g.crafted}</span>/10 crafted
              {g.collector ? ` · x2 ${g.name} alloy` : ''}
            </small>
          </h4>
          <div className="relic-grid">
            {g.relics.map((x) => (
              <div key={x.id} className={cx('relic chunk', x.level === 0 && 'uncrafted', x.equipped && 'equipped')} style={tint(x.equipped ? '#3B2A8C' : '#2B1F6E')} data-relic={x.id}>
                <span className="tile chunk" style={tint(x.level > 0 ? g.color : '#3A3466')}>
                  <Icon name={x.icon} />
                </span>
                <div className="belt-up-body">
                  <b>
                    {x.name}{' '}
                    {x.level > 0 && (
                      <span className="num lvl">
                        Lv {x.level}
                        {x.maxLevel}
                      </span>
                    )}
                  </b>
                  <small>{x.now}</small>
                  {!x.maxed && <small className="relic-next">→ {x.next}</small>}
                </div>
                <div className="relic-acts">
                  <Button size="sm" color={x.can ? 'var(--lime)' : '#5A5F8F'} disabled={!x.can} onClick={() => commands.buyRelic(x.id)} aria-label={x.maxed ? `${x.name} is at max level` : x.level === 0 ? `Craft ${x.name} for ${x.cost} ${g.name} alloy` : `Level ${x.name} up ${x.count} for ${x.cost} ${g.name} alloy`}>
                    {x.maxed ? (
                      'Max'
                    ) : (
                      <>
                        {x.level === 0 ? 'Craft' : x.count > 1 ? <span className="num buy-n">+{x.count}</span> : null}
                        <span className="cost-chip">
                          <Icon name="ingot" />
                          {x.cost}
                        </span>
                      </>
                    )}
                  </Button>
                  {x.level > 0 && (
                    <Button size="sm" gloss={false} color={x.equipped ? '#5A2A8C' : x.canEquip ? '#2E8FD0' : '#3A3466'} disabled={!x.equipped && !x.canEquip} onClick={() => (x.equipped ? commands.unequipRelic(x.id) : commands.equipRelic(x.id))} aria-pressed={x.equipped}>
                      {x.equipped ? 'Equipped' : 'Equip'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------- Codex ----------

function ElementCard({ r, id }: { r: CodexReport; id: string }) {
  const e = r.elements.find((x) => x.id === id);
  if (!e) return null;
  const fam = r.families.find((f) => f.name === e.family);
  return (
    <div className="element-card well" data-testid="element-card">
      <span className="element-big chunk" style={tint(e.color)}>
        <small className="num">{e.z}</small>
        <b>{e.symbol}</b>
      </span>
      <div>
        <h4>
          {e.name} <small>{e.family}</small>
        </h4>
        <p>
          {e.level > 0 ? (
            <>
              <span className="num">{e.samples}</span> sample{e.samples === '1' ? '' : 's'} · level <span className="num">{e.level}</span>
            </>
          ) : e.reachable ? (
            'Not found yet: your next Supernova brings it.'
          ) : (
            'Not found yet: needs a bigger star when you go Supernova.'
          )}
        </p>
        {fam && <p className="element-perk">Family perk: {fam.perk}</p>}
        {r.special[e.id] && <p className="element-perk special">{r.special[e.id]}</p>}
      </div>
    </div>
  );
}

function CodexTab() {
  const r = useReport('starforge', codexReport, 300);
  const [sel, setSel] = useState('h');
  if (!r) return null;
  return (
    <div className="codex">
      <p>
        Every Supernova gives samples of each element your star could fuse at the tier it reached: a bigger star reaches heavier elements. <b>{r.reach}.</b> <span className="num">{r.found}</span>/118 found.
      </p>
      <small className="ptable-hint phone-only">Swipe the table sideways for the heavier elements.</small>
      <div className="ptable-wrap">
        <div className="ptable" role="grid" aria-label="Periodic table of the elements">
          {r.elements.map((e) => (
            <button
              key={e.id}
              type="button"
              className={cx('el chunk', e.level > 0 && 'found', !e.reachable && e.level === 0 && 'far', sel === e.id && 'sel')}
              style={{ ...tint(e.level > 0 ? e.color : '#2B2558'), gridRow: e.row, gridColumn: e.col }}
              onClick={() => setSel(e.id)}
              aria-label={`${e.name}, ${e.level > 0 ? `level ${e.level}` : 'not found'}`}
              data-el={e.id}
            >
              <small className="num">{e.z}</small>
              <b>{e.symbol}</b>
              {e.level > 0 && <i className="num">{e.level}</i>}
            </button>
          ))}
          <span className="ptable-gap" style={{ gridRow: 8, gridColumn: '1 / -1' }} />
        </div>
      </div>
      <ElementCard r={r} id={sel} />
      <div className="codex-cols">
        <div className="well codex-list">
          <h4>Families</h4>
          <ul>
            {r.families.map((f) => (
              <li key={f.id}>
                <i style={{ background: f.color }} />
                <b>{f.name}</b>
                <span>{f.perk}</span>
                <span className="num now">{f.now}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="well codex-list">
          <h4>Rows</h4>
          <ul>
            {r.rows.map((x) => (
              <li key={x.row} className={x.done ? 'done' : ''}>
                <b>Row {x.row}</b>
                <span>{x.bonus}</span>
                <span className="num now">{x.done ? 'Complete' : `${x.found}/${x.total}`}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
