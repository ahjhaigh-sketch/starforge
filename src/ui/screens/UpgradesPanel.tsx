import { commands } from '../../app/commands';
import { Button } from '../kit/Chunk';
import { type UpgradeItem, upgradesReport } from '../../app/reports';
import { useSnap } from '../../app/uiSnapshot';
import { cx, tint } from '../kit/Chunk';
import { tipProps } from '../kit/FloatTip';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { useReport } from '../kit/useReport';

function UpgradeCard({ u }: { u: UpgradeItem }) {
  const locked = u.state === 'locked';
  return (
    <button
      type="button"
      className={cx('upg-card chunk pop', u.state, u.state === 'available' && (u.can ? 'can' : 'cant'))}
      style={tint(locked ? '#3A3466' : u.color)}
      disabled={u.state !== 'available'}
      onClick={() => commands.buyUpgrade(u.id)}
      aria-label={locked ? `Locked upgrade. ${u.req}.` : `${u.name}. ${u.desc} ${u.state === 'bought' ? 'Bought.' : `Costs ${u.cost} Stardust.`}`}
      {...tipProps(`upg-${u.id}`, 'above', locked ? '???' : u.name, (
        <>
          {!locked && <span>{u.desc}</span>}
          {!locked && <span className="tip-line">{u.when}</span>}
          {locked && <span className="tip-line">{u.req} · {u.pct}%</span>}
        </>
      ))}
    >
      <span className="upg-ico">
        <Icon name={locked ? 'mystery' : u.icon} />
      </span>
      <span className="upg-name">{locked ? '???' : u.name}</span>
      <span className="upg-foot">
        {u.state === 'bought' ? (
          'Bought'
        ) : locked ? (
          `${u.pct}%`
        ) : (
          <span className={cx('cost-chip', u.can && 'can')}>
            <Icon name="stardust" />
            {u.cost}
          </span>
        )}
      </span>
    </button>
  );
}

export function UpgradesPanel() {
  const list = useReport('upgrades', upgradesReport);
  const owned = useSnap((s) => s.upgradesOwned);
  const bulk = useSnap((s) => s.upgradeBulk);
  return (
    <Panel id="upgrades" title="Upgrades" color="#2E9C78" size="wide">
      <p>
        {owned} bought. New upgrades appear as you grow; each tells you when its effect applies. Available ones also sit above the engine shop.
      </p>
      <div className="set-row">
        <Button size="sm" color={bulk ? 'var(--lime)' : '#5A5F8F'} disabled={!bulk} onClick={() => commands.buyAllUpgrades()} data-testid="upgrades-buy-all">
          {bulk ? 'Buy all I can afford' : 'Buy all (opens at the first Supernova)'}
        </Button>
      </div>
      <div className="upg-grid">{list?.map((u) => <UpgradeCard key={u.id} u={u} />)}</div>
    </Panel>
  );
}
