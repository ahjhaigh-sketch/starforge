import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { D } from '../../src/engine/decimal';
import { createInitialState, gain } from '../../src/engine/state';
import { invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { buyEngine, engineAdds, engineEach, engineTotal } from '../../src/engine/systems/stardust';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

describe('1.2.0: engines show their total and what the next purchase adds', () => {
  it('"adds" is exactly what each purchase adds, milestone jumps included; "total" is owned x each', () => {
    const s = createInitialState(1_000_000, 3);
    gain(s, 'stardust', D(1e12));
    for (let n = 0; n < 30; n++) {
      const before = stat(s, 'stardustPerSec');
      const adds = engineAdds(s, 'mote', 1);
      buyEngine(s, 'mote', 1);
      invalidateStats();
      expect(stat(s, 'stardustPerSec').sub(before).sub(adds).abs().lt(1e-9)).toBe(true);
      expect(engineTotal(s, 'mote').eq(engineEach(s, 'mote').mul(n + 1))).toBe(true);
    }
    // ten at once from zero: 0.1 each, doubled at 10 owned
    const fresh = createInitialState(1_000_000, 4);
    expect(engineAdds(fresh, 'mote', 10).toNumber()).toBeCloseTo(2, 12);
    expect(engineAdds(fresh, 'mote', 9).toNumber()).toBeCloseTo(0.9, 12);
  });
});
