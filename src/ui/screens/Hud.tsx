import { memo } from 'react';
import { commands } from '../../app/commands';
import { type BuffChip, useSnap } from '../../app/uiSnapshot';
import { tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { CurrencyPill } from '../kit/Pill';
import { LevelChip } from './BeltPanels';

const dustValue = (s: { dust: string }) => s.dust;
const dustRate = (s: { dustRate: string }) => s.dustRate;
const shardValue = (s: { shards: string }) => s.shards;
const oreValue = (s: { ore: string }) => s.ore;
const essenceValue = (s: { essence: string }) => s.essence;
const darkMatterValue = (s: { darkMatter: string }) => s.darkMatter;
const antimatterValue = (s: { antimatter: string }) => s.antimatter;
const coresValue = (s: { galaxyCores: string }) => s.galaxyCores;
const chrononValue = (s: { chronons: string }) => s.chronons;
const sparkValue = (s: { sparks: string }) => s.sparks;

const BUFF_COLORS: Record<string, string> = { frenzy: '#FF7A2E', tapstorm: '#2EE6FF', wish: '#B06BFF' };

const Buff = memo(function Buff({ chip }: { chip: BuffChip }) {
  return (
    <div className="buff chunk" style={tint(chip.color ?? BUFF_COLORS[chip.kind] ?? 'var(--cyan)')} data-buff={chip.kind}>
      <Icon name={chip.icon ?? 'comet'} />
      <span className="ol-sm">{chip.label}</span>
      <span className="num ol-sm">{chip.secs}</span>
    </div>
  );
});

const BUFFS_SHOWN = { desk: 7, phone: 4 } as const;

function MoreBuffs({ n, className }: { n: number; className: string }) {
  return (
    <div className={`buff buff-more chunk ${className}`} style={tint('var(--panel)')} title={`${n} more boosts`} data-testid={`more-buffs-${className}`}>
      <span className="num ol-sm">+{n}</span>
    </div>
  );
}

/** Top bar: currencies, the star tier, active boosts (comet buffs and elixirs), and the save indicator. */
export function Hud() {
  const saveLabel = useSnap((s) => s.saveLabel);
  const tierIndex = useSnap((s) => s.tierIndex);
  const tierName = useSnap((s) => s.tierName);
  const tierColor = useSnap((s) => s.tierColor);
  const buffs = useSnap((s) => s.buffChips);
  const shardsVisible = useSnap((s) => s.shardsVisible);
  const oreVisible = useSnap((s) => s.oreVisible);
  const essenceVisible = useSnap((s) => s.essenceVisible);
  const darkMatterVisible = useSnap((s) => s.darkMatterVisible);
  const antimatterVisible = useSnap((s) => s.antimatterVisible);
  const coresVisible = useSnap((s) => s.galaxyCoresVisible);
  const chrononsVisible = useSnap((s) => s.chrononsVisible);
  const sparksVisible = useSnap((s) => s.sparksVisible);
  return (
    <header className="hud">
      <CurrencyPill icon="stardust" label="Stardust" currency="stardust" value={dustValue} rate={dustRate} onPoke={() => commands.poke('pill')} />
      {shardsVisible && <CurrencyPill icon="shard" label="Nova Shards" currency="shards" color="#5A2A8C" value={shardValue} />}
      {essenceVisible && <CurrencyPill icon="nebula" label="Nebula Essence" currency="essence" color="#1E6F88" value={essenceValue} />}
      {darkMatterVisible && <CurrencyPill icon="darkmatter" label="Dark Matter" currency="darkMatter" color="#3A2470" value={darkMatterValue} />}
      {antimatterVisible && <CurrencyPill icon="antimatter" label="Antimatter" currency="antimatter" color="#2A6F8F" value={antimatterValue} />}
      {coresVisible && <CurrencyPill icon="galaxy" label="Galaxy Cores" currency="galaxyCores" color="#3F7A12" value={coresValue} />}
      {chrononsVisible && <CurrencyPill icon="chronon" label="Chronons" currency="chronons" color="#9A4A12" value={chrononValue} />}
      {sparksVisible && <CurrencyPill icon="spark" label="Multiverse Sparks" color="#5A2A8C" value={sparkValue} className="pill-rainbow" />}
      {oreVisible && <CurrencyPill icon="belt" label="Ore" currency="ore" color="#3B4370" value={oreValue} />}
      <div className="tag-pill chunk tier-pill" style={tint('var(--panel)')} title={`Star Tier ${tierIndex + 1} of 12`} onClick={() => commands.poke('tier')}>
        <span className="tier-dot" style={{ background: tierColor, color: tierColor }} />
        <span className="ol-sm">
          <span className="tier-num">Tier {tierIndex + 1} · </span>
          {tierName}
        </span>
      </div>
      <LevelChip />
      {buffs.length > 0 && (
        <div className="buffs" aria-label="Active boosts">
          {buffs.map((b) => (
            <Buff key={b.kind} chip={b} />
          ))}
          {/* with many boosts at once, the rest fold into a count (7 on a wide screen, 4 on a phone) */}
          {buffs.length > BUFFS_SHOWN.desk && <MoreBuffs n={buffs.length - BUFFS_SHOWN.desk} className="desk" />}
          {buffs.length > BUFFS_SHOWN.phone && <MoreBuffs n={buffs.length - BUFFS_SHOWN.phone} className="phone" />}
        </div>
      )}
      <div className="hud-spacer" />
      <span className="save-ind" data-testid="save-indicator">
        {saveLabel}
      </span>
    </header>
  );
}
