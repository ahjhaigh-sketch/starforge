import type { CSSProperties } from 'react';
import { commands } from '../../app/commands';
import { weatherReport } from '../../app/weatherReports';
import { Button, cx } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { ProgressBar } from '../kit/ProgressBar';
import { useReport } from '../kit/useReport';

/**
 * Phase 20.3: Space Weather. 1.3.0 (the playtest asked for it to be "a bit different"): a radar of the
 * sky with a forecast bar, the beacon with auto-summon, and the Almanac (each kind's count and the
 * strength it has earned).
 */

const BLUE = '#2B7FD0';

export function WeatherPanel() {
  const r = useReport('weather', weatherReport, 250);
  const data = r ?? weatherReport();
  const nowColor = data.now?.color ?? '#3B4370';
  return (
    <Panel id="weather" title="Space Weather" color={BLUE} size="wide">
      {!data.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> Weather starts after {data.req}.
        </p>
      ) : (
        <>
          <div className="wx-top">
            <div className={cx('well wx-now', data.now && 'has-weather')} style={{ ['--c' as string]: nowColor } as CSSProperties} data-testid="weather-now">
              <div className={cx('wx-radar', data.now && 'live')} aria-hidden="true">
                <span className="wx-sweep" />
                <span className="wx-blip" />
                <span className="wx-ring r1" />
                <span className="wx-ring r2" />
              </div>
              <div className="wx-now-text">
                <h4>The sky now</h4>
                {data.now ? (
                  <>
                    <b className="wx-name">{data.now.name}</b>
                    <span>{data.now.desc}</span>
                    {data.now.summoned && <small>Summoned by the beacon</small>}
                  </>
                ) : (
                  <>
                    <b className="wx-name">Clear skies</b>
                    <span>Weather rolls in every few minutes of play and boosts what it touches while it lasts.</span>
                  </>
                )}
                <ProgressBar value={data.bar} color={nowColor === '#3B4370' ? 'var(--cyan)' : nowColor} label="Forecast" />
                <small className="num">{data.barText}</small>
              </div>
            </div>
            <div className="well wx-beacon">
              <h4>Weather Beacon</h4>
              <div className="wx-pips" aria-label={`${data.charges} of ${data.maxCharges} charges`} data-testid="beacon-charges" data-charges={data.charges}>
                {Array.from({ length: data.maxCharges }, (_, i) => (
                  <span key={i} className={cx('wx-pip', i < data.charges && 'on')} />
                ))}
              </div>
              <span>
                {data.charges >= data.maxCharges ? (
                  'Full. Spend a charge to fill it again.'
                ) : (
                  <>
                    <span className="num">
                      {data.progress} of {data.perCharge}
                    </span>{' '}
                    comets caught toward the next charge.
                  </>
                )}
              </span>
              <small>A charge summons the weather you choose for {data.summonFor}, while the sky is clear.</small>
              <label className="wx-auto">
                Auto-summon
                <select value={data.auto} onChange={(e) => commands.setAutoWeather(e.target.value)} data-testid="weather-auto">
                  <option value="">Off</option>
                  {data.kinds
                    .filter((k) => k.open)
                    .map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </div>
          <h4 className="section-h">Almanac</h4>
          <p className="mv-note">{data.almanac}</p>
          <div className="wx-grid">
            {data.kinds.map((k) => (
              <div key={k.id} className={cx('well wx-kind', !k.open && 'locked', data.now?.name === k.name && 'now')} style={{ ['--c' as string]: k.color } as CSSProperties} data-weather={k.id}>
                <span className="wx-swatch" aria-hidden="true" />
                <div className="wx-text">
                  <b>{k.name}</b>
                  <span>{k.desc}</span>
                  {k.open && (
                    <small className="num">
                      Seen {k.seen} · Almanac {k.bonus}
                    </small>
                  )}
                </div>
                {k.open ? (
                  <Button size="sm" color={k.color} disabled={!k.canSummon} onClick={() => commands.summonWeather(k.id)} data-summon={k.id}>
                    Summon
                  </Button>
                ) : (
                  <small className="wd-req">
                    <Icon name="lock" /> {k.req}
                  </small>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
