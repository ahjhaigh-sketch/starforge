import { commands } from '../../app/commands';
import { weatherReport } from '../../app/weatherReports';
import { Button, cx } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { useReport } from '../kit/useReport';

/** Phase 20.3: Space Weather: the sky now, the Weather Beacon and the kinds of weather. */

const BLUE = '#2B7FD0';

export function WeatherPanel() {
  const r = useReport('weather', weatherReport, 250);
  const data = r ?? weatherReport();
  return (
    <Panel id="weather" title="Space Weather" color={BLUE} size="wide">
      {!data.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> Weather starts after {data.req}.
        </p>
      ) : (
        <>
          <p className="mv-note">Weather rolls through the sky every few minutes of play and boosts what it touches while it lasts. More kinds join as you open the systems they touch.</p>
          <div className="wx-top">
            <div className="well wx-now" style={{ ['--c' as string]: data.now?.color ?? '#3B4370' }} data-testid="weather-now">
              <h4>The sky now</h4>
              {data.now ? (
                <>
                  <b className="wx-name">{data.now.name}</b>
                  <span>{data.now.desc}</span>
                  <span className="num wx-left">{data.now.left} left</span>
                </>
              ) : (
                <>
                  <b className="wx-name">Clear skies</b>
                  <span>{data.next ? <>The next weather rolls in within <span className="num">{data.next}</span>.</> : 'Weather is on its way.'}</span>
                </>
              )}
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
            </div>
          </div>
          <h4 className="section-h">Kinds of weather</h4>
          <div className="wx-grid">
            {data.kinds.map((k) => (
              <div key={k.id} className={cx('well wx-kind', !k.open && 'locked')} style={{ ['--c' as string]: k.color }} data-weather={k.id}>
                <span className="wx-swatch" aria-hidden="true" />
                <div className="wx-text">
                  <b>{k.name}</b>
                  <span>{k.desc}</span>
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
