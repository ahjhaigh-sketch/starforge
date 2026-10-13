import { D } from '../engine/decimal';
import { defineStat } from '../engine/stats';
import { BALANCE } from './balance';

/** Stats every phase builds on. Later content adds sources to them. */
export function registerCoreStats(): void {
  defineStat({ id: 'stardustPerSec', label: 'Stardust per second', base: () => D(0) });
  defineStat({ id: 'offlineCap', label: 'Offline cap (seconds)', base: () => D(BALANCE.offline.baseCapSeconds), softcaps: [{ label: 'At most a year', start: () => D(BALANCE.offline.maxCapSeconds), power: 0 }] });
  defineStat({
    id: 'offlineEfficiency',
    label: 'Offline efficiency',
    base: () => D(BALANCE.offline.baseEfficiency),
    // never more than full value, however many relics and nodes stack up
    softcaps: [{ label: 'Full value', start: () => D(BALANCE.offline.maxEfficiency), power: 0 }],
  });
}
