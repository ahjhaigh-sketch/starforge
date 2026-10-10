import { BALANCE } from '../content/balance';
import { TIERS } from '../content/tiers';
import { exportSave } from '../engine/save/store';
import { cur, type GameState } from '../engine/state';
import { listBackups, readBackup, writeBackup } from '../platform/backups';
import { format, formatTime } from '../ui/format';
import { game } from './game';

/** One line that tells backups apart: "Golden Sun · 2.75M Stardust · played 1h 12m". */
export function saveSummary(s: GameState): string {
  const tier = TIERS[s.tier]?.name ?? 'Protostar';
  return `${tier} · ${format(cur(s, 'stardust'), s.settings.notation)} Stardust · played ${formatTime(s.playtime)}`;
}

let writing = false;

/** Writes a rolling backup of the live game (skipped while saving is blocked). */
export async function backupNow(): Promise<boolean> {
  if (writing || game.saveBlocked) return false;
  const r = exportSave(game.state);
  if (!r.ok) return false;
  writing = true;
  try {
    return await writeBackup(r.code, saveSummary(game.state), BALANCE.backups.keep);
  } finally {
    writing = false;
  }
}

/** Called alongside autosave: a backup every 5 minutes of play. */
export function maybeBackup(): void {
  const s = game.state;
  if (s.playtime - s.lastBackupAt < BALANCE.backups.everySeconds) return;
  s.lastBackupAt = s.playtime;
  void backupNow();
}

export { listBackups, readBackup };
export type { BackupMeta } from '../platform/backups';
