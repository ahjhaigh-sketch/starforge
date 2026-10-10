import { memo } from 'react';
import { type BuffChip, useSnap } from '../../app/uiSnapshot';
import { tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { CurrencyPill } from '../kit/Pill';
import { LevelChip } from './BeltPanels';

const dustValue = (s: { dust: string }) => s.dust;
const dustRate = (s: { dustRate: string }) => s.dustRate;
const shardValue = (s: { shards: string }) => s.shards;
const oreValue = (s: { ore: string }) => s.ore;

const BUFF_COLORS: Record<string, string> = { frenzy: '#FF7A2E', tapstorm: '#2EE6FF', wish: '#B06BFF' };

const Buff = memo(function Buff({ chip }: { chip: BuffChip }) {
  return (
    <div className="buff chunk" style={tint(BUFF_COLORS[chip.kind] ?? 'var(--cyan)')} data-buff={chip.kind}>
      <Icon name="comet" />
      <span className="ol-sm">{chip.label}</span>
      <span className="num ol-sm">{chip.secs}</span>
    </div>
  );
});

/** Top bar: currencies, the star tier, active comet buffs, and the save indicator. */
export function Hud() {
  const saveLabel = useSnap((s) => s.saveLabel);
  const tierIndex = useSnap((s) => s.tierIndex);
  const tierName = useSnap((s) => s.tierName);
  const tierColor = useSnap((s) => s.tierColor);
  const buffs = useSnap((s) => s.buffChips);
  const shardsVisible = useSnap((s) => s.shardsVisible);
  const oreVisible = useSnap((s) => s.oreVisible);
  return (
    <header className="hud">
      <CurrencyPill icon="stardust" label="Stardust" value={dustValue} rate={dustRate} />
      {shardsVisible && <CurrencyPill icon="shard" label="Nova Shards" color="#5A2A8C" value={shardValue} />}
      {oreVisible && <CurrencyPill icon="belt" label="Ore" color="#3B4370" value={oreValue} />}
      <div className="tag-pill chunk tier-pill" style={tint('var(--panel)')} title={`Star Tier ${tierIndex + 1} of 12`}>
        <span className="tier-dot" style={{ background: tierColor, color: tierColor }} />
        <span className="ol-sm">
          <span className="tier-num">Tier {tierIndex + 1} · </span>
          {tierName}
        </span>
      </div>
      <LevelChip />
      {buffs.length > 0 && (
        <div className="buffs" aria-label="Active comet buffs">
          {buffs.map((b) => (
            <Buff key={b.kind} chip={b} />
          ))}
        </div>
      )}
      <div className="hud-spacer" />
      <span className="save-ind" data-testid="save-indicator">
        {saveLabel}
      </span>
    </header>
  );
}
