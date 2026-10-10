import { useSnap } from '../../app/uiSnapshot';
import { tint } from '../kit/Chunk';
import { CurrencyPill } from '../kit/Pill';

const dustValue = (s: { dust: string }) => s.dust;
const dustRate = (s: { dustRate: string }) => s.dustRate;

/** Top bar: currencies, the star tier, and the save indicator. */
export function Hud() {
  const saveLabel = useSnap((s) => s.saveLabel);
  const tierIndex = useSnap((s) => s.tierIndex);
  const tierName = useSnap((s) => s.tierName);
  const tierColor = useSnap((s) => s.tierColor);
  return (
    <header className="hud">
      <CurrencyPill icon="stardust" label="Stardust" value={dustValue} rate={dustRate} />
      <div className="tag-pill chunk tier-pill" style={tint('var(--panel)')} title={`Star Tier ${tierIndex + 1} of 12`}>
        <span className="tier-dot" style={{ background: tierColor, color: tierColor }} />
        <span className="ol-sm">
          <span className="tier-num">Tier {tierIndex + 1} · </span>
          {tierName}
        </span>
      </div>
      <div className="hud-spacer" />
      <span className="save-ind" data-testid="save-indicator">
        {saveLabel}
      </span>
    </header>
  );
}
