/**
 * The Windows app (Tauri): the same build in a window. Saves still go to the window's own
 * storage, and every one is also written to a file in the app's data folder by the app's two
 * Rust commands (src-tauri/src/lib.rs). If the window's storage is ever cleared, the game boots
 * from that file. In a browser all of this is a no-op, and the Tauri module is never loaded.
 */
export const inTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

/** Writes the save code to the save file (fire and forget: the slot save already succeeded). */
export function mirrorSaveToFile(code: string): void {
  if (!inTauri()) return;
  call('write_save', { code }).catch((err: unknown) => console.warn('Save file not written:', err));
}

/** The save file's code, or null (in a browser, or when there is no file yet). */
export async function readSaveFile(): Promise<string | null> {
  if (!inTauri()) return null;
  try {
    return await call<string | null>('read_save');
  } catch (err) {
    console.warn('Save file not read:', err);
    return null;
  }
}
