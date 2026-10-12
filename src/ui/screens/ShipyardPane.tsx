import { useState } from 'react';
import { commands } from '../../app/commands';
import { shipyardReport } from '../../app/extrasReports';
import { Button, cx, tint } from '../kit/Chunk';
import { useReport } from '../kit/useReport';

/**
 * Phase 20.4: the Shipyard, inside the Starship Expeditions panel. Pick a ship, fit its four parts
 * (free while it's docked), buy new parts once with alloy, and see its trip time and loot an hour in
 * every open sector. Best fit picks the owned hull, engine and pod that bring home the most.
 */
export function ShipyardPane() {
  const [ship, setShip] = useState(0);
  const [sector, setSector] = useState('');
  // the read-out depends on the chosen ship and sector, so it is built each render; this only paces it
  useReport('expeditions', () => performance.now(), 250);
  const r = shipyardReport(ship, sector);
  const chosen = r.sectors.some((x) => x.id === sector) ? sector : (r.sectors[r.sectors.length - 1]?.id ?? '');
  return (
    <div className="yard" role="tabpanel" id="ships-pane-yard" aria-labelledby="ships-tab-yard">
      <div className="yard-ships" role="group" aria-label="Ship to refit">
        {r.ships.map((x) => (
          <button key={x.i} type="button" className={cx('yard-ship chunk pop', x.i === r.ship && 'on')} style={tint(x.i === r.ship ? '#2B7FD0' : '#2B1F6E')} aria-pressed={x.i === r.ship} onClick={() => setShip(x.i)} data-yard-ship={x.i}>
            <b>Ship {x.i + 1}</b>
            <small>{x.where}</small>
          </button>
        ))}
      </div>
      {!r.docked && (
        <p className="mv-note yard-flying">
          Ship {r.ship + 1} is flying: parts change only while it&rsquo;s docked.{' '}
          <Button size="sm" color="#B23A3A" onClick={() => commands.recallShip(r.ship)} data-testid="recall">
            Call it home now
          </Button>{' '}
          (the trip in progress brings nothing)
        </p>
      )}
      <div className="yard-slots">
        {r.slots.map((sl) => (
          <div key={sl.slot} className="well yard-slot">
            <h4>{sl.name}</h4>
            <div className="yard-parts">
              {sl.parts.map((p) =>
                p.owned ? (
                  <button key={p.id} type="button" className={cx('yard-part chunk pop', p.fitted && 'on')} style={tint(p.fitted ? '#2E8FD0' : '#3A3466')} aria-pressed={p.fitted} disabled={!r.docked} onClick={() => commands.fitShipPart(r.ship, p.id)} data-part={p.id}>
                    <b>{p.name}</b>
                    <small>{p.desc}</small>
                  </button>
                ) : (
                  <div key={p.id} className="yard-part for-sale" data-part={p.id}>
                    <b>{p.name}</b>
                    <small>{p.desc}</small>
                    <small className="num yard-price">{p.price}</small>
                    <Button size="sm" color={p.can ? 'var(--lime)' : '#5A5F8F'} disabled={!p.can} onClick={() => commands.buyShipPart(p.id)} data-buy-part={p.id}>
                      Buy
                    </Button>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <h4 className="section-h">Ship {r.ship + 1} in each sector</h4>
      {r.sectors.length > 0 && (
        <div className="yard-best">
          <label>
            Fit for{' '}
            <select className="ship-dest" value={chosen} onChange={(e) => setSector(e.target.value)} aria-label="Sector to fit for">
              {r.sectors.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" disabled={!r.docked || !r.better} onClick={() => commands.fitShipBest(r.ship, chosen)} data-testid="best-fit">
            {r.better ? 'Best fit' : 'Fitted best'}
          </Button>
        </div>
      )}
      <div className="well belt-odds">
      <ul className="sectors yard-sectors">
        {r.sectors.map((x) => (
          <li key={x.id} data-yard-sector={x.id}>
            <i style={{ background: x.color }} />
            <b>{x.name}</b>
            <span className="num">{x.trip}</span>
            <small>{x.perHour} an hour</small>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
