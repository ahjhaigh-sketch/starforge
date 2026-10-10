import { useEffect } from 'react';
import { game } from '../app/game';
import { useSnap } from '../app/uiSnapshot';
import { DevPanel } from '../dev/DevPanel';
import { Button, Chunk } from './kit/Chunk';
import { Icon } from './kit/Icon';
import { Panel, PanelHost } from './kit/Panel';
import { CurrencyPill } from './kit/Pill';
import { ToastHost } from './kit/Toasts';
import { BuyAmountControl } from './kit/BuyAmountControl';
import { SettingsPanel } from './screens/SettingsPanel';
import { useUi } from './store';

const dustValue = (s: { dust: string }) => s.dust;
const dustRate = (s: { dustRate: string }) => s.dustRate;

export function App() {
  const saveLabel = useSnap((s) => s.saveLabel);
  const reducedMotion = useSnap((s) => s.reducedMotion);
  const open = useUi((s) => s.open);
  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  }, [reducedMotion]);

  return (
    <>
      <div className="app">
        <header className="hud">
          <CurrencyPill icon="stardust" label="Stardust" value={dustValue} rate={dustRate} />
          <div className="hud-spacer" />
          <span className="save-ind" data-testid="save-indicator">
            {saveLabel}
          </span>
          <Button size="sm" color="#4A4F7A" onClick={() => open('settings')} aria-label="Open settings">
            <Icon name="gear" /> Settings
          </Button>
        </header>
        <main className="stage">
          <Chunk className="welcome" gloss>
            <h1>Hello, Starsmith</h1>
            <p>The engine is running. The star, engines and everything else arrive in the next phases.</p>
            <Button size="lg" color="var(--magenta)" onClick={() => open('hello')}>
              Open a panel
            </Button>
          </Chunk>
        </main>
      </div>

      <Panel id="hello" title="Hello, Starsmith">
        <p>Panels pop in, blur the game behind them, and only one is ever open. Press Esc or the red button to close.</p>
        <h3>Buy amount</h3>
        <p>Every shop in the game will use this control.</p>
        <BuyAmountControl />
      </Panel>
      <SettingsPanel />
      <PanelHost />
      <ToastHost />
      {game.devMode && <DevPanel />}
    </>
  );
}
