import { statsReport } from '../../app/reports';
import { Panel } from '../kit/Panel';
import { useReport } from '../kit/useReport';

/** Every multiplier, broken down by where it comes from, in the order the pipeline applies them. */
export function StatsPanel() {
  const r = useReport('stats', statsReport, 1000);
  return (
    <Panel id="stats" title="Stats" color="#4A6FC4" size="wide">
      <p>Each stat starts from its base, adds the additions, then multiplies. This is exactly how the game works it out.</p>
      <div className="stats-grid">
        <section className="stat-card well">
          <h4>Totals</h4>
          <dl>
            {r?.counters.map((c) => (
              <div key={c.label}>
                <dt>{c.label}</dt>
                <dd className="num">{c.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        {r?.sections.map((sec) => (
          <section key={sec.title} className="stat-card well" data-stat={sec.title}>
            <h4>
              {sec.title} <span className="num">{sec.total}</span>
            </h4>
            <dl>
              {sec.lines.map((l, i) => (
                <div key={`${l.label}-${i}`}>
                  <dt>{l.label}</dt>
                  <dd className="num">{l.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Panel>
  );
}
