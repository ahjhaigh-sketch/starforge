/** The one-file build has no service worker: registering one is a no-op there. */
export function registerSW(_options?: unknown): (reload?: boolean) => Promise<void> {
  return async () => {};
}
