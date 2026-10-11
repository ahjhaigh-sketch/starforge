import { commands } from '../../app/commands';
import { snapshotStore, useSnap } from '../../app/uiSnapshot';
import { cx, tint } from '../kit/Chunk';
import { tipProps } from '../kit/FloatTip';
import { Icon } from '../kit/Icon';
import { useUi } from '../store';

/** Starts a Supernova: through the confirm screen when "Ask before resets" is on. */
export function startSupernova(open: (id: string) => void): void {
  if (snapshotStore.getState().confirmResets) open('supernova');
  else commands.reset('supernova');
}

/** The Nebula goes through its confirm screen when "Ask before resets" is on. */
function startNebula(open: (id: string) => void): void {
  if (snapshotStore.getState().confirmResets) open('nebulaConfirm');
  else commands.reset('nebula');
}

function NebulaBar() {
  const visible = useSnap((s) => s.nebulaVisible);
  const ready = useSnap((s) => s.nebulaReady);
  const gain = useSnap((s) => s.nebulaGain);
  const req = useSnap((s) => s.nebulaReq);
  const pct = useSnap((s) => s.nebulaPct);
  const open = useUi((s) => s.open);
  if (!visible) return null;
  return (
    <button
      type="button"
      className={cx('nova nebula-bar chunk pop', ready ? 'ready' : 'locked')}
      style={tint('#1E6F88')}
      disabled={!ready}
      onClick={() => startNebula(open)}
      aria-label={ready ? `Go Nebula for ${gain} Nebula Essence` : `Nebula. ${req}.`}
      data-testid="nebula"
    >
      <span className="fill" style={{ width: `${pct}%` }} />
      <span className="inner">
        {!ready && <Icon name="lock" className="nova-lock" />}
        <span className="title ol">NEBULA</span>
        {ready && (
          <span className="gain ol">
            {gain}
            <Icon name="nebula" />
          </span>
        )}
        <span className="req ol-sm">{req}</span>
      </span>
    </button>
  );
}

/** Under the star: Evolve, the phone Engines button, and the reset bar. */
export function BottomBar() {
  const next = useSnap((s) => s.nextTierName);
  const cost = useSnap((s) => s.evolveCost);
  const can = useSnap((s) => s.canEvolve);
  const pct = useSnap((s) => s.evolvePct);
  const novaPct = useSnap((s) => s.novaPct);
  const novaReq = useSnap((s) => s.novaReq);
  const ready = useSnap((s) => s.novaReady);
  const gain = useSnap((s) => s.novaGain);
  const setDrawer = useUi((s) => s.setDrawer);
  const open = useUi((s) => s.open);
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
      <button
        type="button"
        className={cx('nova chunk pop', ready ? 'ready' : 'locked')}
        disabled={!ready}
        onClick={() => startSupernova(open)}
        aria-label={ready ? `Go Supernova for ${gain} Nova Shards. ${novaReq}.` : `Supernova. ${novaReq}.`}
        data-testid="supernova"
        {...tipProps('nova', 'above', 'Supernova', <span>{ready ? 'Reset engines, Stardust and your star for Nova Shards. Shards buy the Nova Tree and boost all Stardust.' : novaReq}.</span>)}
      >
        <span className="fill" style={{ width: `${novaPct}%` }} />
        <span className="inner">
          {!ready && <Icon name="lock" className="nova-lock" />}
          <span className="title ol">SUPERNOVA</span>
          {ready && (
            <span className="gain ol">
              {gain}
              <Icon name="shard" />
            </span>
          )}
          <span className="req ol-sm">{novaReq}</span>
        </span>
      </button>
      <NebulaBar />
    </div>
  );
}
