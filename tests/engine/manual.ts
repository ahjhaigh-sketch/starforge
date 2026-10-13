import { AUTO_LAYERS } from '../../src/content/layers';
import { setLayerAuto } from '../../src/engine/layerAuto';
import type { GameState } from '../../src/engine/state';
import { AUTO_BUYERS, setAuto } from '../../src/engine/systems/automation';

/** 1.4.0: layers you've passed run themselves; tests of a system's own behaviour switch that (and the auto-buyers) off. */
export function manual(s: GameState): GameState {
  for (const l of AUTO_LAYERS) setLayerAuto(s, l, { on: false });
  for (const a of AUTO_BUYERS) setAuto(s, a.id, { on: false });
  return s;
}
