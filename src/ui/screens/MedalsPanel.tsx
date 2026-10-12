import { useState } from 'react';
import { commands } from '../../app/commands';
import { medalsReport } from '../../app/reports';
import { WardrobeBody } from './WardrobePanel';
import { cx, tint } from '../kit/Chunk';
import { tipProps } from '../kit/FloatTip';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';

type MedalTab = 'medals' | 'wardrobe';
const TABS: Array<{ id: MedalTab; label: string; icon: string }> = [
  { id: 'medals', label: 'Medals', icon: 'trophy' },
  { id: 'wardrobe', label: 'Wardrobe', icon: 'wardrobe' },
];

/** 1.2.0: the Medals menu holds the Wardrobe too (the medals unlock it). */
export function MedalsPanel() {
  const [tab, setTab] = useState<MedalTab>('medals');
  return (
    <Panel id="medals" title="Medals" color="#C99A1E" size="wide">
      <div className="forge-tabs" role="tablist" aria-label="Medals">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`medals-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`medals-pane-${t.id}`}
            className={cx('forge-tab chunk pop', tab === t.id && 'on')}
            style={tint(tab === t.id ? '#C99A1E' : '#2B1F6E')}
            onClick={() => setTab(t.id)}
            data-testid={`medals-tab-${t.id}`}
          >
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`medals-pane-${tab}`} aria-labelledby={`medals-tab-${tab}`}>
        {tab === 'medals' ? <MedalsTab /> : <WardrobeBody panel="medals" />}
      </div>
    </Panel>
  );
}

function MedalsTab() {
  const r = useReport('medals', medalsReport, 1000);
  return (
    <>
      <p>{r?.summary}</p>
      <h3>Goals</h3>
      <div className="goals">
        {r?.goals.map((g) => (
          <div key={g.id} className="goal chunk" style={tint('#2B1F6E')} data-goal={g.id}>
            <span className="goal-ico">
              <Icon name={g.icon} />
            </span>
            <span className="goal-text">
              <b>
                {g.name} <span className="goal-tier">{g.tier} / {g.tiers}</span>
              </b>
              <small>
                {g.value} · {g.next}
              </small>
              <ProgressBar value={g.pct / 100} color="var(--gold)" label={`${g.name} progress`} />
            </span>
          </div>
        ))}
      </div>
      <p className="goal-note">Every Goal tier adds Rune Luck and Rune Bulk for the rune shrines later on, and +1% Stardust now.</p>
      <h3>Medals</h3>
      <div className="medal-grid">
        {r?.medals.map((m) => (
          <span
            key={m.id}
            className={cx('medal chunk', m.earned ? 'earned' : 'locked', m.secret && 'secret')}
            style={tint(m.earned ? (m.secret ? '#7B3FD6' : '#C99A1E') : '#2B2558')}
            tabIndex={0}
            role="img"
            aria-label={m.earned ? `${m.name}: ${m.desc}` : m.secret ? 'A secret medal' : `Not earned yet: ${m.desc}`}
            onClick={() => !m.earned && commands.poke('locked')}
            {...tipProps(`medal-${m.id}`, 'above', m.earned ? m.name : m.secret ? 'A secret' : 'Not earned yet', <span>{m.desc}</span>)}
          >
            <Icon name={m.earned ? m.icon : m.secret ? 'mystery' : 'trophy'} />
          </span>
        ))}
      </div>
    </>
  );
}
