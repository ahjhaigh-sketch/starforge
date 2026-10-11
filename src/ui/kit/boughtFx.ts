/**
 * Purchase feedback (UI style tab, motion table: "Purchase: row punches, cost chip flashes green").
 * Call it with the bought row after a purchase succeeds; it restarts the CSS animation each time.
 */
export function boughtFx(el: Element | null | undefined): void {
  if (!el) return;
  el.classList.remove('bought-fx');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('bought-fx');
}
