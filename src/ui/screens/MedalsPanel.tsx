import { medalsReport } from '../../app/reports';
import { cx, tint } from '../kit/Chunk';
import { tipProps } from '../kit/FloatTip';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';

export function MedalsPanel() {
  const r = useReport('medals', medalsReport, 1000);
  return (
    <Panel id="medals" title="Medals" color="#C99A1E" size="wide">
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
            className={cx('medal chunk', m.earned ? 'earned' : 'locked')}
            style={tint(m.earned ? '#C99A1E' : '#2B2558')}
            tabIndex={0}
            role="img"
            aria-label={m.earned ? `${m.name}: ${m.desc}` : `Not earned yet: ${m.desc}`}
            {...tipProps(`medal-${m.id}`, 'above', m.earned ? m.name : 'Not earned yet', <span>{m.desc}</span>)}
          >
            <Icon name={m.earned ? m.icon : 'trophy'} />
          </span>
        ))}
      </div>
    </Panel>
  );
}
