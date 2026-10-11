import { dismissUpdate, updateNow, useAppShell } from '../../app/pwa';
import { Button } from '../kit/Chunk';
import { Icon } from '../kit/Icon';

/** "A new version is ready": it waits for the player, and saves before it reloads. */
export function UpdateBanner() {
  const ready = useAppShell((s) => s.updateReady);
  if (!ready) return null;
  return (
    <div className="update-banner chunk" role="status" aria-live="polite" data-testid="update-banner">
      <Icon name="gear" />
      <span>A new version of Starforge is ready.</span>
      <Button size="sm" color="var(--lime)" onClick={() => void updateNow()}>
        Save and update
      </Button>
      <Button size="sm" color="#5A5F8F" onClick={dismissUpdate}>
        Later
      </Button>
    </div>
  );
}
