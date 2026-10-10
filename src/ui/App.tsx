import { useEffect } from 'react';
import { game } from '../app/game';
import { useSnap } from '../app/uiSnapshot';
import { DevPanel } from '../dev/DevPanel';
import { FloatTipHost } from './kit/FloatTip';
import { PanelHost } from './kit/Panel';
import { ToastHost } from './kit/Toasts';
import { BottomBar } from './screens/BottomBar';
import { EngineShop } from './screens/EngineShop';
import { Hud } from './screens/Hud';
import { LeftRail, TeaserStack } from './screens/Rails';
import { SettingsPanel } from './screens/SettingsPanel';
import { StarStage } from './screens/StarStage';
import { useUi } from './store';

export function App() {
  const reducedMotion = useSnap((s) => s.reducedMotion);
  const drawer = useUi((s) => s.drawer);
  const setDrawer = useUi((s) => s.setDrawer);
  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  }, [reducedMotion]);

  return (
    <>
      <div className="app">
        <Hud />
        <LeftRail />
        <main className="stage">
          <StarStage />
        </main>
        <BottomBar />
        <aside className={`side ${drawer ? 'open' : ''}`}>
          <EngineShop />
          <TeaserStack />
        </aside>
        {drawer && <div className="drawer-scrim phone-only" onClick={() => setDrawer(false)} aria-hidden="true" />}
      </div>

      <SettingsPanel />
      <PanelHost />
      <ToastHost />
      <FloatTipHost />
      {game.devMode && <DevPanel />}
    </>
  );
}
