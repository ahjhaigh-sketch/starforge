import { commands } from '../../app/commands';
import { useSnap } from '../../app/uiSnapshot';
import { cx, tint } from '../kit/Chunk';
import { tipProps } from '../kit/FloatTip';
import { Icon } from '../kit/Icon';
import { useUi } from '../store';

/** Under the star: Evolve, the phone Engines button, and the reset bar (Supernova arrives in Phase 4). */
export function BottomBar() {
  const next = useSnap((s) => s.nextTierName);
  const cost = useSnap((s) => s.evolveCost);
  const can = useSnap((s) => s.canEvolve);
  const pct = useSnap((s) => s.evolvePct);
  const novaPct = useSnap((s) => s.novaPct);
  const novaReq = useSnap((s) => s.novaReq);
  const setDrawer = useUi((s) => s.setDrawer);
  const novaMet = novaPct >= 100;
  return (
    <div className="bottom">
      <div className="bottom-row">
        <button
          type="button"
          className={cx('evolve chunk gloss pop', can && 'can')}
          style={tint('#4C3BC4')}
          onClick={() => commands.evolve()}
          disabled={!next}
          aria-label={next ? `Evolve to ${next} for ${cost} Stardust` : 'Your star is fully evolved'}
        >
          <span className="evolve-fill" style={{ width: `${pct}%` }} />
          <span className="ol-sm">{next ? `Evolve to ${next}` : 'Fully evolved'}</span>
          {next && (
            <span className="cost ol-sm">
              <Icon name="stardust" />
              {cost}
            </span>
          )}
        </button>
        <button type="button" className="evolve chunk gloss pop phone-only" style={tint('#5546B8')} onClick={() => setDrawer(true)}>
          <span className="ol-sm">Engines</span>
        </button>
      </div>
      <div
        className="nova chunk locked"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={novaPct}
        aria-label={`Supernova. ${novaMet ? 'Arrives in a later update' : novaReq}`}
        tabIndex={0}
        {...tipProps('nova', 'above', 'Supernova', <span>{novaMet ? 'Ready when the next update lands: reset engines for Nova Shards.' : novaReq}.</span>)}
      >
        <span className="fill" style={{ width: `${novaPct}%` }} />
        <span className="inner">
          <Icon name="lock" className="nova-lock" />
          <span className="title ol">SUPERNOVA</span>
          <span className="req ol-sm">{novaMet ? 'Arrives in a later update' : novaReq}</span>
        </span>
      </div>
    </div>
  );
}
