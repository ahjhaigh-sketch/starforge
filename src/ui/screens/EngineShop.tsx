import { memo } from 'react';
import { commands } from '../../app/commands';
import { type EngineRow as Row, type UpgradeTile as Tile, useSnap } from '../../app/uiSnapshot';
import { boughtFx } from '../kit/boughtFx';
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
      onClick={(e) => commands.buyEngine(row.id) && boughtFx(e.currentTarget)}
      aria-label={`${row.name}: buy ${row.count || 'x1'} for ${row.cost} Stardust. You own ${row.owned}.`}
      data-engine={row.id}
      {...tipProps(`eng-${row.id}`, 'left', row.name, (
        <>
          <span>{row.blurb}</span>
          <span className="tip-line">{row.each} each · {row.total} in all</span>
          <span className="tip-line">Buying {row.count || 'one'} adds {row.adds}</span>
          <span className="tip-line">{row.msNext}</span>
        </>
      ))}
    >
      <span className="tile chunk" style={tint(row.color)}>
        <Icon name={row.icon} />
        {row.rank && <span className="rank-pip" style={{ background: row.rank }} title={row.rankName} />}
      </span>
      <span className="nm">{row.name}</span>
      <span className="own-col">
        <Num value={row.owned} className="own" />
        <span className="tot" title="Stardust a second from all of these">{row.total}</span>
      </span>
      <span className="meta">
        <span className={cx('cost-chip', row.can && 'can')}>
          <Icon name="stardust" />
          {row.cost}
          {row.count && <small>{row.count}</small>}
        </span>
        <span className="each" title={`Buying ${row.count || 'one'} adds this much Stardust a second (each one makes ${row.each})`}>{row.adds}</span>
        <span className="ms" title={row.msNext}>
          <i style={{ width: `${row.msPct}%` }} />
        </span>
      </span>
    </button>
  );
});

const UpgradeTileButton = memo(function UpgradeTileButton({ tile }: { tile: Tile }) {
  return (
    <button
      type="button"
      className={cx('upg-tile chunk gloss pop', tile.can ? 'can' : 'cant')}
      style={tint(tile.color)}
      onClick={() => commands.buyUpgrade(tile.id)}
      aria-label={`${tile.name}: ${tile.desc} Costs ${tile.cost} Stardust.`}
      data-upgrade={tile.id}
      {...tipProps(`tile-${tile.id}`, 'left', tile.name, (
        <>
          <span>{tile.desc}</span>
          <span className="tip-line">{tile.when}</span>
          <span className="tip-line">Costs {tile.cost} Stardust</span>
        </>
      ))}
    >
      <Icon name={tile.icon} />
    </button>
  );
});

/** Upgrades you can buy right now, as icon tiles above the engines (cheapest first). */
function UpgradeTiles() {
  const tiles = useSnap((s) => s.upgradeTiles);
  const bulk = useSnap((s) => s.upgradeBulk);
  const open = useUi((s) => s.open);
  if (tiles.length === 0) return null;
  return (
    <div className="upg-tiles" aria-label="Upgrades you can buy">
      {bulk && tiles.some((t) => t.can) && (
        <button type="button" className="upg-tile upg-all chunk gloss pop can" style={tint('#2E9C78')} onClick={() => commands.buyAllUpgrades()} aria-label="Buy every upgrade you can afford" title="Buy every upgrade you can afford" data-testid="tiles-buy-all">
          All
        </button>
      )}
      {tiles.map((t) => (
        <UpgradeTileButton key={t.id} tile={t} />
      ))}
      <button type="button" className="upg-more chunk pop" style={tint('#4A3BA8')} onClick={() => open('upgrades')}>
        All
      </button>
    </div>
  );
}

/** The Cookie Clicker shop: 15 engines, buy amounts, milestone bars, and a "???" row for the next one. */
export function EngineShop() {
  const rows = useSnap((s) => s.engineRows);
  const mystery = useSnap((s) => s.engineMystery);
  const total = useSnap((s) => s.enginesOwned);
  const compact = useSnap((s) => s.engineCompact);
  const view = useSnap((s) => s.engineView);
  const rate = useSnap((s) => s.dustRate);
  const setDrawer = useUi((s) => s.setDrawer);
  if (view === 'min')
    return (
      <section className="store store-min chunk" style={tint('var(--panel)')} aria-label="Engines" data-testid="engines-min">
        <div className="store-head">
          <h2 className="ol" onClick={() => commands.poke('name')}>
            Engines
          </h2>
          <button type="button" className="store-size chunk pop" onClick={() => commands.setSetting('engineList', 'compact')} title="Show the engines again" data-testid="engine-show">
            Show
          </button>
          <button type="button" className="x-btn chunk gloss pop drawer-close" onClick={() => setDrawer(false)} aria-label="Close engines">
            <Icon name="x" />
          </button>
        </div>
        <p className="store-min-line">
          <span className="num">{total}</span> engines, every one buying itself: <b className="num">{rate}</b>
        </p>
      </section>
    );
  return (
    <section className={cx('store chunk', compact && 'compact')} style={tint('var(--panel)')} aria-label="Engines">
      <div className="store-head">
        <h2 className="ol" onClick={() => commands.poke('name')}>
          Engines
        </h2>
        <button
          type="button"
          className="store-size chunk pop"
          onClick={() => commands.setSetting('engineList', compact ? 'full' : 'compact')}
          aria-pressed={compact}
          title={compact ? 'Show full engine rows' : 'Show compact engine rows'}
          data-testid="engine-size"
        >
          {compact ? 'Full' : 'Compact'}
        </button>
        <button type="button" className="store-size chunk pop" onClick={() => commands.setSetting('engineList', 'min')} title="Minimize the engine list to one line" data-testid="engine-min">
          Hide
        </button>
        <button type="button" className="x-btn chunk gloss pop drawer-close" onClick={() => setDrawer(false)} aria-label="Close engines">
          <Icon name="x" />
        </button>
      </div>
      <UpgradeTiles />
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
