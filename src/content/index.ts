import { registerComets } from '../engine/systems/comets';
import { registerMedals } from '../engine/systems/medals';
import { registerStardust } from '../engine/systems/stardust';
import { registerUnlocks } from '../engine/systems/unlocks';
import { registerUpgrades } from '../engine/systems/upgrades';
import { registerCoreStats } from './core';

/** Registers every stat, source and system. Called once at boot (and by tests and the simulator). */
export function registerContent(): void {
  registerCoreStats();
  registerStardust();
  registerComets();
  registerUpgrades();
  registerMedals();
  registerUnlocks();
}
