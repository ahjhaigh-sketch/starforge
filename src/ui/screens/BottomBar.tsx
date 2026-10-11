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

function startSingularity(open: (id: string) => void): void {
  if (snapshotStore.getState().confirmResets) open('singularityConfirm');
  else commands.reset('singularity');
}

function startGalactic(open: (id: string) => void): void {
  if (snapshotStore.getState().confirmResets) open('galacticConfirm');
  else commands.reset('galactic');
}

function startCrunch(open: (id: string) => void): void {
  if (snapshotStore.getState().confirmResets) open('crunchConfirm');
  else commands.reset('crunch');
}

/** On a reset bar Eternity runs: the layer resets by itself, so its bar shrinks to a strip. */
function AutoTag() {
  return <span className="auto-tag ol-sm">AUTO</span>;
}

function CrunchBar() {
  const visible = useSnap((s) => s.crunchVisible);
  const ready = useSnap((s) => s.crunchReady);
  const gain = useSnap((s) => s.crunchGain);
  const req = useSnap((s) => s.crunchReq);
  const pct = useSnap((s) => s.crunchPct);
  const slim = useSnap((s) => s.autoBars.includes('crunch'));
  const open = useUi((s) => s.open);
  if (!visible) return null;
  return (
    <button
      type="button"
      className={cx('nova nebula-bar singularity-bar crunch-bar chunk pop', ready ? 'ready' : 'locked', slim && 'slim')}
      style={tint('#B4501A')}
      onClick={() => (ready ? startCrunch(open) : open('bigcrunch'))}
      aria-label={ready ? `Big Crunch for ${gain} Chronons` : `Big Crunch. ${req}.`}
      data-testid="crunch"
    >
      <span className="fill" style={{ width: `${pct}%` }} />
      <span className="inner">
        {!ready && <Icon name="lock" className="nova-lock" />}
        <span className="title ol">BIG CRUNCH</span>
        {slim && <AutoTag />}
        {ready && (
          <span className="gain ol">
            {gain}
            <Icon name="chronon" />
          </span>
        )}
        <span className="req ol-sm">{req}</span>
      </span>
    </button>
  );
}

function startMultiverse(open: (id: string) => void): void {
  if (snapshotStore.getState().confirmResets) open('multiverseConfirm');
  else commands.reset('multiverse');
}

/** The last reset: a rainbow bar. */
function MultiverseBar() {
  const visible = useSnap((s) => s.multiverseVisible);
  const ready = useSnap((s) => s.multiverseReady);
  const gain = useSnap((s) => s.multiverseGain);
  const req = useSnap((s) => s.multiverseReq);
  const pct = useSnap((s) => s.multiversePct);
  const open = useUi((s) => s.open);
  if (!visible) return null;
  return (
    <button
      type="button"
      className={cx('nova nebula-bar singularity-bar multiverse-bar chunk pop', ready ? 'ready' : 'locked')}
      style={tint('#7B3FD6')}
      onClick={() => (ready ? startMultiverse(open) : open('multiverse'))}
      aria-label={ready ? `Enter the Multiverse for ${gain} Sparks` : `Multiverse. ${req}.`}
      data-testid="multiverse"
    >
      <span className="fill" style={{ width: `${pct}%` }} />
      <span className="inner">
        {!ready && <Icon name="lock" className="nova-lock" />}
        <span className="title ol">MULTIVERSE</span>
        {ready && (
          <span className="gain ol">
            {gain}
            <Icon name="spark" />
          </span>
        )}
        <span className="req ol-sm">{req}</span>
      </span>
    </button>
  );
}

function GalacticBar() {
  const visible = useSnap((s) => s.galacticVisible);
  const ready = useSnap((s) => s.galacticReady);
  const gain = useSnap((s) => s.galacticGain);
  const req = useSnap((s) => s.galacticReq);
  const pct = useSnap((s) => s.galacticPct);
  const slim = useSnap((s) => s.autoBars.includes('galactic'));
  const open = useUi((s) => s.open);
  if (!visible) return null;
  return (
    <button
      type="button"
      className={cx('nova nebula-bar singularity-bar galactic-bar chunk pop', ready ? 'ready' : 'locked', slim && 'slim')}
      style={tint('#3F7A12')}
      onClick={() => (ready ? startGalactic(open) : open('galactic'))}
      aria-label={ready ? `Go Galactic for ${gain} Galaxy Cores` : `Galactic Rebirth. ${req}.`}
      data-testid="galactic"
    >
      <span className="fill" style={{ width: `${pct}%` }} />
      <span className="inner">
        {!ready && <Icon name="lock" className="nova-lock" />}
        <span className="title ol">GALACTIC</span>
        {slim && <AutoTag />}
        {ready && (
          <span className="gain ol">
            {gain}
            <Icon name="galaxy" />
          </span>
        )}
        <span className="req ol-sm">{req}</span>
      </span>
    </button>
  );
}

function SingularityBar() {
  const visible = useSnap((s) => s.singularityVisible);
  const ready = useSnap((s) => s.singularityReady);
  const gain = useSnap((s) => s.singularityGain);
  const req = useSnap((s) => s.singularityReq);
  const pct = useSnap((s) => s.singularityPct);
  const slim = useSnap((s) => s.autoBars.includes('singularity'));
  const open = useUi((s) => s.open);
  if (!visible) return null;
  return (
    <button
      type="button"
      className={cx('nova nebula-bar singularity-bar chunk pop', ready ? 'ready' : 'locked', slim && 'slim')}
      style={tint('#3A2470')}
      onClick={() => (ready ? startSingularity(open) : open('singularity'))}
      aria-label={ready ? `Go Singularity for ${gain} Dark Matter` : `Singularity. ${req}.`}
      data-testid="singularity"
    >
      <span className="fill" style={{ width: `${pct}%` }} />
      <span className="inner">
        {!ready && <Icon name="lock" className="nova-lock" />}
        <span className="title ol">SINGULARITY</span>
        {slim && <AutoTag />}
        {ready && (
          <span className="gain ol">
            {gain}
            <Icon name="darkmatter" />
          </span>
        )}
        <span className="req ol-sm">{req}</span>
      </span>
    </button>
  );
}

function NebulaBar() {
  const visible = useSnap((s) => s.nebulaVisible);
  const ready = useSnap((s) => s.nebulaReady);
  const gain = useSnap((s) => s.nebulaGain);
  const req = useSnap((s) => s.nebulaReq);
  const pct = useSnap((s) => s.nebulaPct);
  const slim = useSnap((s) => s.autoBars.includes('nebula'));
  const open = useUi((s) => s.open);
  if (!visible) return null;
  return (
    <button
      type="button"
      className={cx('nova nebula-bar chunk pop', ready ? 'ready' : 'locked', slim && 'slim')}
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
        {slim && <AutoTag />}
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
  const novaSlim = useSnap((s) => s.autoBars.includes('supernova'));
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
        className={cx('nova chunk pop', ready ? 'ready' : 'locked', novaSlim && 'slim')}
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
          {novaSlim && <AutoTag />}
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
      <SingularityBar />
      <GalacticBar />
      <CrunchBar />
      <MultiverseBar />
    </div>
  );
}
