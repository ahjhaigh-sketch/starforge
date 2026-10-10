import { welcomeReport } from '../../app/reports';
import { Button } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { useReport } from '../kit/useReport';
import { useUi } from '../store';

/** "Welcome back": time away, what it counted for, and what you gained. */
export function WelcomePanel() {
  const r = useReport('welcome', welcomeReport, 60_000);
  const close = useUi((s) => s.close);
  const main = r?.gains[0];
  return (
    <Panel id="welcome" title="Welcome back" color="var(--cyan)" size="small">
      {r && (
        <div className="welcome-back">
          <p className="away">You were away for {r.away}.</p>
          <div className="big-gain">
            <Icon name="stardust" />
            <span className="num">{main ? main.value : '+0'}</span>
          </div>
          <dl className="kv well">
            <div>
              <dt>Counted time</dt>
              <dd>{r.counted}</dd>
            </div>
            <div>
              <dt>Offline efficiency</dt>
              <dd>{r.efficiency}</dd>
            </div>
            {r.gains.slice(1).map((g) => (
              <div key={g.label}>
                <dt>{g.label}</dt>
                <dd>{g.value}</dd>
              </div>
            ))}
            {r.notes.map((n) => (
              <div key={n}>
                <dt>While you were away</dt>
                <dd>{n}</dd>
              </div>
            ))}
          </dl>
          {r.capped && <p className="cap-note">Some of your time away went past the cap. Upgrades like Long Night raise it.</p>}
          <Button size="lg" onClick={close}>
            Collect
          </Button>
        </div>
      )}
    </Panel>
  );
}
