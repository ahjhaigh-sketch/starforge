import { altarReport } from '../../app/sigilReports';
import { commands } from '../../app/commands';
import { Button, cx } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { useReport } from '../kit/useReport';

/** Phase 20.6: the Sigil Altar: every sigil you own, switched on and off for free. */
const VIOLET = '#6B4BC8';

export function AltarPanel() {
  const r = useReport('altar', altarReport, 300);
  const data = r ?? altarReport();
  return (
    <Panel id="altar" title="Sigil Altar" color={VIOLET} size="wide">
      <p className="mv-note">Seven sigils hide in the big trees, one in each. A sigil shows once you own both nodes beside its hiding place; buy it there with that tree's currency. Each one you own makes the rest x100 dearer. Every sigil bends a rule: a big boost, a real cost. Switch them here as often as you like; they stay through every reset.</p>
      <div className="alt-grid">
        {data.sigils.map((x) => (
          <div key={x.id} className={cx('well alt-card', !x.shown && 'unknown', x.on && 'lit')} data-sigil={x.id}>
            <span className="alt-glyph" aria-hidden="true">
              <Icon name="sigil" />
            </span>
            <div className="alt-text">
              <b>{x.name}</b>
              <small>Hidden in the {x.where}</small>
              {x.shown && (
                <span>
                  <span className="alt-boon">{x.boon}</span> · <span className="alt-bane">{x.bane}</span>
                </span>
              )}
            </div>
            {x.owned ? (
              <Button size="sm" gloss={false} color={x.on ? VIOLET : '#3A3466'} aria-pressed={x.on} onClick={() => commands.toggleSigil(x.id)} data-toggle={x.id}>
                {x.on ? 'On' : 'Off'}
              </Button>
            ) : (
              <small className="alt-state">{x.shown ? 'Buy it in its tree' : 'Not found'}</small>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
