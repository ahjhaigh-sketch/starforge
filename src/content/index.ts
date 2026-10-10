import { registerStardust } from '../engine/systems/stardust';
import { registerUnlocks } from '../engine/systems/unlocks';
import { registerCoreStats } from './core';

/** Registers every stat, source and system. Called once at boot (and by tests and the simulator). */
export function registerContent(): void {
  registerCoreStats();
  registerStardust();
  registerUnlocks();
}
