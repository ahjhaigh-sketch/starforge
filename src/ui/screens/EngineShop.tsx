import { memo } from 'react';
import { commands } from '../../app/commands';
import { type EngineRow as Row, useSnap } from '../../app/uiSnapshot';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { cx, tint } from '../kit/Chunk';
import { tipProps } from '../kit/FloatTip';
import { Icon } from '../kit/Icon';
import { Num } from '../kit/Num';
import { useUi } from '../store';

const EngineRow = memo(function EngineRow({ row }: { row: Row }) {
  return (
    <button
      type="button"
      className={cx('eng chunk pop', row.can ? 'can' : 'cant')}
      style={tint('#4A3BA8')}
      onClick={() => commands.buyEngine(row.id)}
      aria-label={`${row.name}: buy ${row.count || 'x1'} for ${row.cost} Stardust. You own ${row.owned}.`}
      data-engine={row.id}
      {...tipProps(`eng-${row.id}`, 'left', row.name, (
        <>
          <span>{row.blurb}</span>
          <span className="tip-line">{row.each}</span>
          <span className="tip-line">{row.msNext}</span>
        </>
      ))}
    >
      <span className="tile chunk" style={tint(row.color)}>
        <Icon name={row.icon} />
      </span>
      <span className="nm">{row.name}</span>
      <Num value={row.owned} className="own" />
      <span className="meta">
        <span className={cx('cost-chip', row.can && 'can')}>
          <Icon name="stardust" />
          {row.cost}
          {row.count && <small>{row.count}</small>}
        </span>
        <span className="each">{row.each}</span>
        <span className="ms" title={row.msNext}>
          <i style={{ width: `${row.msPct}%` }} />
        </span>
      </span>
    </button>
  );
});

/** The Cookie Clicker shop: 15 engines, buy amounts, milestone bars, and a "???" row for the next one. */
export function EngineShop() {
  const rows = useSnap((s) => s.engineRows);
  const mystery = useSnap((s) => s.engineMystery);
  const total = useSnap((s) => s.enginesOwned);
  const setDrawer = useUi((s) => s.setDrawer);
  return (
    <section className="store chunk" style={tint('var(--panel)')} aria-label="Engines">
      <div className="store-head">
        <h2 className="ol">Engines</h2>
        <button type="button" className="x-btn chunk gloss pop drawer-close" onClick={() => setDrawer(false)} aria-label="Close engines">
          <Icon name="x" />
        </button>
      </div>
      <BuyAmountControl />
      <div className="eng-list">
        {rows.map((r) => (
          <EngineRow key={r.id} row={r} />
        ))}
        {mystery && (
          <div className="eng chunk mystery" style={tint('#4A3BA8')} aria-label={`Hidden engine. ${mystery}.`}>
            <span className="tile chunk" style={tint('#2B2558')}>
              <Icon name="mystery" />
            </span>
            <span className="nm">???</span>
            <span className="own num">–</span>
            <span className="meta">{mystery}</span>
          </div>
        )}
      </div>
      <div className="store-foot">{total} engines · output doubles at 10, 25, 50, 100 owned and on to 1,000</div>
    </section>
  );
}
