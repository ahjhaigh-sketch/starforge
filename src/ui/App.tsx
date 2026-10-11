import { type CSSProperties, useEffect } from 'react';
import { game } from '../app/game';
import { useSnap } from '../app/uiSnapshot';
import { DevPanel } from '../dev/DevPanel';
import { TreeBench } from '../dev/TreeBench';

/** Dev-only tree bench size from ?dev=1&treebench=N (read at render: boot sets devMode first). */
const benchSize = () => (game.devMode ? Number(new URLSearchParams(location.search).get('treebench')) || 0 : 0);
import { FloatTipHost } from './kit/FloatTip';
import { PanelHost } from './kit/Panel';
import { ProgressBar } from './kit/ProgressBar';
import { ToastHost } from './kit/Toasts';
import { BottomBar } from './screens/BottomBar';
import { CometLayer } from './screens/Comet';
import { ResetFx } from './screens/ResetFx';
import { EngineShop } from './screens/EngineShop';
import { Hud } from './screens/Hud';
import { MedalsPanel } from './screens/MedalsPanel';
import { LeftRail, TeaserStack } from './screens/Rails';
import { SettingsPanel } from './screens/SettingsPanel';
import { StarStage } from './screens/StarStage';
import { StatsPanel } from './screens/StatsPanel';
import { UpgradesPanel } from './screens/UpgradesPanel';
import { WelcomePanel } from './screens/WelcomePanel';
import { ConstantsPanel, MasteryPanel, OrbitalsPanel, QuestsPanel } from './screens/EarlyPanels';
import { AscentPanel, AutomationPanel, NovaTreePanel, SupernovaPanel } from './screens/NovaPanels';
import { BeltPanel, DrillPanel, StarsmithPanel } from './screens/BeltPanels';
import { StarforgePanel } from './screens/ForgePanels';
import { AttunePanel, FusionPanel, MerchantPanel, ShipsPanel } from './screens/ExtrasPanels';
import { MythicBanner, NebulaConfirmPanel, NebulaPanel, NebulaTreePanel, RunesPanel } from './screens/NebulaPanels';
import { AurasPanel, IndexPanel, MutationsPanel, StarringPanel } from './screens/RuneDepthPanels';
import { NurseryPanel, WyrmsPanel } from './screens/WyrmPanels';
import { SpectralPanel, TarotPanel } from './screens/NebulaExtrasPanels';
import { BlackHolePanel, PrismWheelPanel, ReactorPanel, SingularityConfirmPanel, SingularityPanel, SingularityTreePanel } from './screens/SingularityPanels';
import { ChallengeHud, LeviathansPanel, ScaleTreePanel, SpirePanel, TrialsPanel } from './screens/ChallengePanels';
import { MirrorPanel, WormholesPanel } from './screens/MirrorPanels';
import { GalacticConfirmPanel, GalacticPanel, GalacticTreePanel, GalaxyMapPanel, ObservatoryPanel, StarChartPanel } from './screens/GalacticPanels';
import { useUi } from './store';

/** Shown while time away is being simulated; fades in only if that takes a moment. */
function CatchUpOverlay() {
  const share = useUi((s) => s.catchUp);
  if (share === null) return null;
  return (
    <div className="catchup" role="status" aria-live="polite">
      <div className="catchup-card chunk">
        <b>Catching up on your time away</b>
        <ProgressBar value={share} color="var(--cyan)" label="Catching up" />
      </div>
    </div>
  );
}

export function App() {
  const bench = benchSize();
  if (bench > 0) return <TreeBench count={bench} />;
  const reducedMotion = useSnap((s) => s.reducedMotion);
  const galaxyColor = useSnap((s) => s.galaxyColor);
  const drawer = useUi((s) => s.drawer);
  const setDrawer = useUi((s) => s.setDrawer);
  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  }, [reducedMotion]);

  return (
    <>
      {galaxyColor && <div className="galaxy-tint" style={{ ['--c' as string]: galaxyColor } as CSSProperties} aria-hidden="true" />}
      <div className="app">
        <Hud />
        <LeftRail />
        <main className="stage">
          <StarStage />
          <ChallengeHud />
        </main>
        <BottomBar />
        <aside className={`side ${drawer ? 'open' : ''}`}>
          <EngineShop />
          <TeaserStack />
        </aside>
        {drawer && <div className="drawer-scrim phone-only" onClick={() => setDrawer(false)} aria-hidden="true" />}
      </div>

      <CometLayer />
      <ResetFx />
      <UpgradesPanel />
      <MedalsPanel />
      <StatsPanel />
      <WelcomePanel />
      <ConstantsPanel />
      <QuestsPanel />
      <OrbitalsPanel />
      <MasteryPanel />
      <SupernovaPanel />
      <NovaTreePanel />
      <AutomationPanel />
      <AscentPanel />
      <BeltPanel />
      <DrillPanel />
      <StarsmithPanel />
      <StarforgePanel />
      <FusionPanel />
      <AttunePanel />
      <MerchantPanel />
      <ShipsPanel />
      <NebulaPanel />
      <NebulaConfirmPanel />
      <NebulaTreePanel />
      <RunesPanel />
      <StarringPanel />
      <AurasPanel />
      <MutationsPanel />
      <IndexPanel />
      <WyrmsPanel />
      <NurseryPanel />
      <SpectralPanel />
      <TarotPanel />
      <SingularityPanel />
      <SingularityConfirmPanel />
      <SingularityTreePanel />
      <BlackHolePanel />
      <PrismWheelPanel />
      <ReactorPanel />
      <TrialsPanel />
      <SpirePanel />
      <LeviathansPanel />
      <ScaleTreePanel />
      <MirrorPanel />
      <WormholesPanel />
      <GalacticPanel />
      <GalacticConfirmPanel />
      <GalacticTreePanel />
      <GalaxyMapPanel />
      <ObservatoryPanel />
      <StarChartPanel />
      <SettingsPanel />
      <PanelHost />
      <ToastHost />
      <MythicBanner />
      <FloatTipHost />
      <CatchUpOverlay />
      {game.devMode && <DevPanel />}
    </>
  );
}
