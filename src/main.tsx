import '@fontsource-variable/fredoka';
import '@fontsource-variable/baloo-2';
import '@fontsource/lilita-one';
import './ui/theme.css';
import './ui/layout.css';
import './ui/game.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startClock } from './app/clock';
import { commands } from './app/commands';
import { game } from './app/game';
import { installNotifications } from './app/notify';
import { installSaveHooks, saveNow } from './app/persistence';
import { publish } from './app/uiSnapshot';
import { registerContent } from './content';
import { D } from './engine/decimal';
import { simulateElapsed } from './engine/offline';
import { loadFromSlots } from './engine/save/store';
import { stat, breakdown } from './engine/stats';
import { webStore } from './platform/web';
import { burst, liveParticles } from './render/particles';
import * as renderStage from './render/stage';
import { App } from './ui/App';

function boot(): void {
  registerContent();
  game.devMode = new URLSearchParams(location.search).has('dev');

  const loaded = loadFromSlots(webStore);
  if (loaded.status === 'ok') {
    game.state = loaded.state;
    // Offline progress: the tab was closed, so the offline cap and efficiency apply.
    const away = (Date.now() - game.state.lastTick) / 1000;
    if (away > 60) {
      const s = game.state;
      game.bootReport = simulateElapsed(s, away, {
        cap: stat(s, 'offlineCap').toNumber(),
        efficiency: stat(s, 'offlineEfficiency').toNumber(),
        offline: true,
      });
    }
  } else if (loaded.status === 'newer') {
    game.saveBlocked = 'A newer version of Starforge saved this game. Reload the page to update; nothing will be saved until then.';
  } else if (loaded.status === 'corrupt') {
    console.error('Saves could not be read; starting fresh. Copies kept under starforge:corrupt:*', loaded.errors);
  }
  game.state.lastTick = Date.now();

  publish();
  installNotifications();
  installSaveHooks();
  startClock();

  if (game.devMode) {
    Object.assign(window, { sf: { game, commands, stat, breakdown, D, saveNow, fx: { burst, liveParticles, renderMs: () => renderStage.renderMs } } });
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  void renderStage.initRender();
}

boot();
