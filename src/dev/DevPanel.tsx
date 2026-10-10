import { commands } from '../app/commands';
import { useSnap } from '../app/uiSnapshot';

/** Only rendered with ?dev=1. Adds currency, skips time, wipes. */
export function DevPanel() {
  const tickMs = useSnap((s) => s.tickMs);
  const playtime = useSnap((s) => s.playtime);
  return (
    <div className="dev" data-testid="dev-panel">
      <b>Dev panel</b>
      <span>
        tick {tickMs} ms · played {playtime}
      </span>
      <div className="row">
        <button type="button" onClick={() => commands.devAdd('stardust', 1000)}>+1K dust</button>
        <button type="button" onClick={() => commands.devMultiply('stardust', 10)}>x10 dust</button>
        <button type="button" onClick={() => commands.devMultiply('stardust', 1000)}>x1000 dust</button>
      </div>
      <div className="row">
        <button type="button" onClick={() => commands.devWarp(60)}>+1 min</button>
        <button type="button" onClick={() => commands.devWarp(3600)}>+1 hour</button>
        <button type="button" onClick={() => commands.devWarp(86400)}>+1 day</button>
      </div>
      <div className="row">
        <button type="button" onClick={() => commands.wipe()}>Wipe save</button>
      </div>
    </div>
  );
}
