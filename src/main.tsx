import '@fontsource-variable/fredoka';
import '@fontsource-variable/baloo-2';
import '@fontsource/lilita-one';
import './ui/theme.css';
import './ui/layout.css';
import './ui/game.css';
import './ui/panels.css';
import './ui/early.css';
import './ui/nova.css';
import './ui/belt.css';
import './ui/forge.css';
import './ui/extras.css';
import './ui/runes.css';
import './ui/runedepth.css';
import './ui/wyrms.css';
import './ui/nebulaextras.css';
import './ui/singularity.css';
import './ui/challenges.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { backupNow, listBackups, readBackup } from './app/backups';
import { startClock } from './app/clock';
import { commands } from './app/commands';
import { game } from './app/game';
import { installNotifications } from './app/notify';
import { installSaveHooks, saveNow } from './app/persistence';
import { publish } from './app/uiSnapshot';
import { installAudio } from './audio';
import { BALANCE } from './content/balance';
import { registerContent } from './content';
import { D } from './engine/decimal';
import { events } from './engine/events';
import { simulateElapsedAsync } from './engine/offline';
import { importSave, loadFromSlots } from './engine/save/store';
import { breakdown, stat } from './engine/stats';
import { webStore } from './platform/web';
import { burst, liveParticles } from './render/particles';
import * as renderStage from './render/stage';
import { App } from './ui/App';
import { installHotkeys } from './ui/hotkeys';
import { useUi } from './ui/store';

/** When both save slots are unreadable, the newest readable backup takes over. */
async function restoreFromBackups(): Promise<boolean> {
  for (const b of await listBackups()) {
    const code = await readBackup(b.key);
    if (!code) continue;
    try {
      game.state = importSave(code).state;
      return true;
    } catch {
      /* try the next one */
    }
  }
  return false;
}

async function boot(): Promise<void> {
  registerContent();
  game.devMode = new URLSearchParams(location.search).has('dev');

  let away = 0;
  let notice: { title: string; body: string } | null = null;
  const loaded = loadFromSlots(webStore);
  if (loaded.status === 'ok') {
    game.state = loaded.state;
    away = (Date.now() - game.state.lastTick) / 1000;
  } else if (loaded.status === 'newer') {
    game.saveBlocked = 'A newer version of Starforge saved this game. Reload the page to update; nothing will be saved until then.';
  } else if (loaded.status === 'corrupt') {
    console.error('Saves could not be read. Copies kept under starforge:corrupt:*', loaded.errors);
    notice = (await restoreFromBackups())
      ? { title: 'Backup loaded', body: 'Your save could not be read, so the newest backup was loaded.' }
      : { title: 'Fresh start', body: 'Your save could not be read. A copy was kept for recovery.' };
  }

  publish();
  installNotifications();
  installAudio();
  installSaveHooks();
  installHotkeys();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  void renderStage.initRender();
  if (notice) events.emit({ t: 'toast', ...notice, icon: 'gear' });

  // Offline progress: the tab was closed, so the offline cap and efficiency apply.
  if (away > 60) {
    if (away > BALANCE.backups.afterAwaySeconds) await backupNow(); // the game as it was, before catching up
    const s = game.state;
    const ui = useUi.getState();
    ui.setCatchUp(0);
    game.bootReport = await simulateElapsedAsync(
      s,
      away,
      { cap: stat(s, 'offlineCap').toNumber(), efficiency: Math.min(BALANCE.offline.maxEfficiency, stat(s, 'offlineEfficiency').toNumber()), offline: true },
      (share) => ui.setCatchUp(share),
    );
    ui.setCatchUp(null);
    if (game.bootReport.secondsCounted > 0) ui.open('welcome');
  }
  game.state.lastTick = Date.now();
  publish();
  startClock();

  if (game.devMode) {
    Object.assign(window, { sf: { game, commands, stat, breakdown, D, saveNow, fx: { burst, liveParticles, renderMs: () => renderStage.renderMs, wyrms: () => renderStage.swimmingWyrms() } } });
  }
}

void boot();
