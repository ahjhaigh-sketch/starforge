import { registerAutomation } from '../engine/systems/automation';
import { registerComets } from '../engine/systems/comets';
import { registerNovaTree } from '../engine/systems/novaTree';
import { registerSupernova } from '../engine/systems/supernova';
import { registerConstants } from '../engine/systems/constants';
import { registerMastery } from '../engine/systems/mastery';
import { registerOrbitals } from '../engine/systems/orbitals';
import { registerQuests } from '../engine/systems/quests';
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
  registerConstants();
  registerMastery();
  registerOrbitals();
  registerQuests();
  registerSupernova();
  registerNovaTree();
  registerAutomation();
  registerUnlocks();
}
