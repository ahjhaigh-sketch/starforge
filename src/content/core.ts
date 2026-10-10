import { D } from '../engine/decimal';
import { defineStat } from '../engine/stats';
import { BALANCE } from './balance';

/** Stats every phase builds on. Later content adds sources to them. */
export function registerCoreStats(): void {
  defineStat({ id: 'stardustPerSec', label: 'Stardust per second', base: () => D(0) });
  defineStat({ id: 'offlineCap', label: 'Offline cap (seconds)', base: () => D(BALANCE.offline.baseCapSeconds) });
  defineStat({
    id: 'offlineEfficiency',
    label: 'Offline efficiency',
    base: () => D(BALANCE.offline.baseEfficiency),
    // never more than full value, however many relics and nodes stack up
    softcaps: [{ label: 'Full value', start: () => D(BALANCE.offline.maxEfficiency), power: 0 }],
  });
}
