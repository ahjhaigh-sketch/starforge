import { BALANCE } from '../content/balance';
import { planPurchase } from '../engine/buy';
import { events } from '../engine/events';
import { saveToSlots } from '../engine/save/store';
import { catchComet, type CometKind } from '../engine/systems/comets';
import { buyUpgrade } from '../engine/systems/upgrades';
import { buyConstant } from '../engine/systems/constants';
import { buyPlanet, levelPlanet, setPlanetType } from '../engine/systems/orbitals';
import { claimQuest } from '../engine/systems/quests';
import { performReset } from '../engine/layers';
import { setAuto } from '../engine/systems/automation';
import { buyNode } from '../engine/systems/novaTree';
import { type BeltUpgradeId } from '../content/belt';
import { beltTierUp, buyBeltUpgrade, buyDrillBit, buyDrillDrone, harvest, tapCore } from '../engine/systems/belt';
import { addPerk, resetPerks } from '../engine/systems/starsmith';
import type { ForgeUpgradeId } from '../content/forge';
import type { AttuneId } from '../content/extras';
import { buyAutoFuse, buyFusionUpgrade, fuse, type FusionUpgradeId } from '../engine/systems/fusion';
import { equipAttune, unequipAttune, unlockAttune } from '../engine/systems/attune';
import { buyDeal, buyLuck, reroll } from '../engine/systems/merchant';
import { buyShip, buyShipUpgrade, launch, setShipAuto, type ShipUpgradeId } from '../engine/systems/ships';
import { buyNebulaNode } from '../engine/systems/nebulaTree';
import { rollOnce, type RollResult, setShrine } from '../engine/systems/runes';
import { craftRune, salvage, starUp } from '../engine/systems/starring';
import { type AuraRoll, equipAura, rollAuras } from '../engine/systems/auras';
import { buyEggs, equipWyrm, fuseWyrms, type HatchResult, trainWyrm, unequipWyrm } from '../engine/systems/wyrms';
import { buyNurseryUpgrade, buySeeds, crossbreed, harvestPlot, plant, uprootPlot } from '../engine/systems/nursery';
import { buySpectral, setFocus } from '../engine/systems/spectral';
import { openPacks, placeCard, removeCard } from '../engine/systems/tarot';
import { buyKey, singularityTree } from '../engine/systems/singularity';
import { feedDarkMatter, feedReactor, moveBoundary, setDustShare, setShare } from '../engine/systems/blackhole';
import { autoTrialsOpen, completeTrial, enterTrial, exitTrial } from '../engine/systems/trials';
import { flyBanner, setClimbing } from '../engine/systems/spire';
import { chooseLeviathan, scaleTree, setFighting } from '../engine/systems/leviathans';
import { buyMirrorUpgrade, collapse, MIRROR_ENGINES, nextPriceStep } from '../engine/systems/mirror';
import { closeLink, openLink, setLinkShare } from '../engine/systems/wormholes';
import { buyForgeUpgrade, buyRelic, equipRelic, setForgeGrade, setForgeOn, setForgeShare, unequipRelic } from '../engine/systems/forge';
import { backupNow, readBackup } from './backups';
import { D } from '../engine/decimal';
import { simulateElapsed } from '../engine/offline';
import { exportSave, importSave } from '../engine/save/store';
import { type BuyAmount, createInitialState, cur, gain, type Notation } from '../engine/state';
import { invalidateStats, stat } from '../engine/stats';
import { buyEngine, createTapRuntime, engineCurve, evolve, milestoneSpan, owned, tapStar } from '../engine/systems/stardust';
import { checkUnlocks } from '../engine/systems/unlocks';
import { requestPersistentStorage, webStore } from '../platform/web';
import { format } from '../ui/format';
import { game } from './game';
import { saveNow, wipeSave } from './persistence';
import { publish } from './uiSnapshot';

/**
 * The only API the UI calls. Each command changes the engine state, then publishes the snapshot
 * immediately so clicks feel instant instead of waiting for the next 10 Hz refresh.
 */
function done(): void {
  invalidateStats();
  checkUnlocks(game.state);
  publish();
}

let askedToKeepData = false;

export const commands = {
  /** One tap on the Star Core. Returns the floating text, or null if the 30-a-second cap dropped it. */
  tap(): { text: string; crit: boolean; grade?: string } | null {
    const r = tapStar(game.state, game.tapRuntime, performance.now());
    if (!r) return null;
    done();
    if (r.grade === 'Off beat') return { text: 'Off beat', crit: false, grade: r.grade };
    return { text: `+${format(r.amount, game.state.settings.notation)}`, crit: r.crit, ...(r.grade ? { grade: r.grade } : {}) };
  },
  /** Buys an engine with the current buy amount (x1, x10, x100, x1,000, Max or typed). */
  buyEngine(id: string): boolean {
    const s = game.state;
    const plan = planPurchase(engineCurve(id), owned(s, id), cur(s, 'stardust'), s.settings.buyAmount, s.settings.customBuyAmount, stat(s, 'engineCostMult'), milestoneSpan(owned(s, id), s)?.to);
    const ok = plan.canAfford && buyEngine(s, id, plan.count);
    if (ok && !askedToKeepData) {
      askedToKeepData = true;
      requestPersistentStorage();
    }
    done();
    return ok;
  },
  evolve(): boolean {
    const ok = evolve(game.state);
    done();
    return ok;
  },
  /** The one way to reset a layer from the UI: performs it, then saves straight away. */
  reset(layerId: string): boolean {
    const g = performReset(game.state, layerId);
    if (!g) return false;
    game.tapRuntime = createTapRuntime();
    saveNow();
    void backupNow();
    done();
    return true;
  },
  /** Asteroids the tractor beam touched. */
  harvest(ids: number[]): number {
    const n = harvest(game.state, ids);
    if (n > 0) done();
    return n;
  },
  buyBeltUpgrade(id: BeltUpgradeId): boolean {
    const ok = buyBeltUpgrade(game.state, id);
    done();
    return ok;
  },
  beltTierUp(): boolean {
    const ok = beltTierUp(game.state);
    if (ok) saveNow();
    done();
    return ok;
  },
  tapCore(): number {
    const n = tapCore(game.state);
    done();
    return n;
  },
  buyDrillDrone(): boolean {
    const ok = buyDrillDrone(game.state);
    done();
    return ok;
  },
  buyDrillBit(): boolean {
    const ok = buyDrillBit(game.state);
    done();
    return ok;
  },
  addPerk(id: string): boolean {
    const ok = addPerk(game.state, id);
    done();
    return ok;
  },
  resetPerks() {
    resetPerks(game.state);
    done();
  },
  setForgeGrade(grade: string) {
    setForgeGrade(game.state, grade);
    done();
  },
  setForgeOn(on: boolean) {
    setForgeOn(game.state, on);
    done();
  },
  setForgeShare(share: number) {
    setForgeShare(game.state, share);
    done();
  },
  buyForgeUpgrade(id: ForgeUpgradeId): boolean {
    const ok = buyForgeUpgrade(game.state, id);
    done();
    return ok;
  },
  /** Crafts a relic, or levels it by the buy amount. */
  buyRelic(id: string): boolean {
    const ok = buyRelic(game.state, id);
    done();
    return ok;
  },
  equipRelic(id: string): boolean {
    const ok = equipRelic(game.state, id);
    done();
    return ok;
  },
  unequipRelic(id: string): boolean {
    const ok = unequipRelic(game.state, id);
    done();
    return ok;
  },
  fuse(from: number, to: number): boolean {
    const ok = fuse(game.state, from, to);
    done();
    return ok;
  },
  buyFusionUpgrade(id: FusionUpgradeId): boolean {
    const ok = buyFusionUpgrade(game.state, id);
    done();
    return ok;
  },
  buyAutoFuse(): boolean {
    const ok = buyAutoFuse(game.state);
    done();
    return ok;
  },
  unlockAttune(id: AttuneId): boolean {
    const ok = unlockAttune(game.state, id);
    done();
    return ok;
  },
  equipAttune(id: AttuneId): boolean {
    const ok = equipAttune(game.state, id);
    done();
    return ok;
  },
  unequipAttune(id: AttuneId): boolean {
    const ok = unequipAttune(game.state, id);
    done();
    return ok;
  },
  buyDeal(index: number): boolean {
    const ok = buyDeal(game.state, index);
    done();
    return ok;
  },
  rerollDeals(): boolean {
    const ok = reroll(game.state);
    done();
    return ok;
  },
  buyMerchantLuck(): boolean {
    const ok = buyLuck(game.state);
    done();
    return ok;
  },
  buyShip(): boolean {
    const ok = buyShip(game.state);
    done();
    return ok;
  },
  launchShip(ship: number, sector: string): boolean {
    const ok = launch(game.state, ship, sector);
    done();
    return ok;
  },
  buyShipUpgrade(id: ShipUpgradeId): boolean {
    const ok = buyShipUpgrade(game.state, id);
    done();
    return ok;
  },
  setAutoFuse(on: boolean) {
    game.state.fusion.autoOn = on;
    done();
  },
  setShipAuto(ship: number, auto: boolean) {
    setShipAuto(game.state, ship, auto);
    done();
  },
  buyNebulaNode(id: string): boolean {
    const ok = buyNebulaNode(game.state, id);
    done();
    return ok;
  },
  /** Auto-Supernova at this gain (0 turns it off). */
  setAutoNova(shards: number) {
    game.state.nebula.autoAt = D(Math.max(0, Number.isFinite(shards) ? Math.floor(shards) : 0));
    done();
  },
  /** One roll by hand at a shrine; returns what came up for the roll card. */
  rollRunes(shrine: string): RollResult | null {
    const r = rollOnce(game.state, shrine);
    done();
    return r;
  },
  setShrine(shrine: string, patch: { auto?: boolean; rate?: number; luck?: number; keep?: number }) {
    setShrine(game.state, shrine, patch);
    done();
  },
  /** Rune Starring: sacrifices exactly the copies the shrine's next star asks for. */
  starUp(shrine: string): boolean {
    const ok = starUp(game.state, shrine);
    done();
    return ok;
  },
  salvageRunes(shrine: string): string {
    const got = salvage(game.state, shrine);
    done();
    return format(got, game.state.settings.notation);
  },
  craftRune(id: string): boolean {
    const ok = craftRune(game.state, id);
    done();
    return ok;
  },
  rollAuras(): AuraRoll | null {
    const r = rollAuras(game.state);
    done();
    return r;
  },
  setAuraAuto(on: boolean) {
    game.state.auras.auto = on;
    done();
  },
  equipAura(id: string | null): boolean {
    const ok = equipAura(game.state, id);
    done();
    return ok;
  },
  /** Void Wyrms: eggs with the buy amount; fusion takes exactly five. */
  buyEggs(): HatchResult | null {
    const r = buyEggs(game.state);
    done();
    return r;
  },
  fuseWyrms(key: string): boolean {
    const ok = fuseWyrms(game.state, key);
    done();
    return ok;
  },
  equipWyrm(key: string): boolean {
    const ok = equipWyrm(game.state, key);
    done();
    return ok;
  },
  unequipWyrm(key: string) {
    unequipWyrm(game.state, key);
    done();
  },
  trainWyrm(key: string): boolean {
    const ok = trainWyrm(game.state, key);
    done();
    return ok;
  },
  /** The Star Nursery. */
  buyNurseryUpgrade(id: string): boolean {
    const ok = buyNurseryUpgrade(game.state, id);
    done();
    return ok;
  },
  buySeeds(id: string): boolean {
    const ok = buySeeds(game.state, id);
    done();
    return ok;
  },
  plant(plot: number, id: string): boolean {
    const ok = plant(game.state, plot, id);
    done();
    return ok;
  },
  harvestPlot(plot: number): boolean {
    const ok = harvestPlot(game.state, plot) !== null;
    done();
    return ok;
  },
  /** The Singularity: the Event Horizon key, auto-Nebula, the tree. */
  buyKey(): boolean {
    const ok = buyKey(game.state);
    done();
    return ok;
  },
  setAutoNebula(essence: number) {
    game.state.singularity.autoAt = D(Math.max(0, Number.isFinite(essence) ? Math.floor(essence) : 0));
    done();
  },
  buySingularityNode(id: string): boolean {
    const ok = singularityTree.buy(game.state, id);
    done();
    return ok;
  },
  /** The Black Hole, the Prism Wheel and the Reactor. */
  feedBlackHole(): boolean {
    const ok = feedDarkMatter(game.state);
    done();
    return ok;
  },
  setDustShare(share: number) {
    setDustShare(game.state, share);
    done();
  },
  setWheelOn(on: boolean) {
    game.state.wheel.on = on;
    done();
  },
  moveWheelBoundary(k: number, delta: number) {
    moveBoundary(game.state, k, delta);
    done();
  },
  setWheelShare(i: number, v: number) {
    setShare(game.state, i, v);
    done();
  },
  feedReactor(): boolean {
    const ok = feedReactor(game.state);
    done();
    return ok;
  },
  /** Trials: one at a time, or a Fusion of 2 to 4; claim when the goal is met, or leave. */
  enterTrial(ids: string[]): boolean {
    const ok = enterTrial(game.state, ids);
    done();
    return ok;
  },
  claimTrial(): boolean {
    const ok = completeTrial(game.state) !== null;
    done();
    return ok;
  },
  leaveTrial() {
    exitTrial(game.state);
    done();
  },
  setTrialsAuto(on: boolean) {
    game.state.trials.auto = on && autoTrialsOpen(game.state);
    done();
  },
  /** The Spire. */
  setClimbing(on: boolean) {
    setClimbing(game.state, on);
    done();
  },
  flyBanner(id: string | null): boolean {
    const ok = flyBanner(game.state, id);
    done();
    return ok;
  },
  /** The Void Leviathans and the Scale Tree. */
  setFighting(on: boolean) {
    setFighting(game.state, on);
    done();
  },
  chooseLeviathan(k: number): boolean {
    const ok = chooseLeviathan(game.state, k);
    done();
    return ok;
  },
  buyScaleNode(id: string): boolean {
    const ok = scaleTree.buy(game.state, id);
    done();
    return ok;
  },
  /** The Antimatter Mirror: engines with the buy amount, collapses and upgrades. */
  buyAmEngine(id: string): boolean {
    const s = game.state;
    const own = MIRROR_ENGINES.owned(s, id);
    const plan = planPurchase(MIRROR_ENGINES.curve(id), own, cur(s, 'antimatter'), s.settings.buyAmount, s.settings.customBuyAmount, stat(s, 'amCostMult'), nextPriceStep(own));
    const ok = plan.canAfford && MIRROR_ENGINES.buy(s, id, plan.count);
    done();
    return ok;
  },
  collapseMirror(): boolean {
    const ok = collapse(game.state);
    done();
    return ok;
  },
  buyMirrorUpgrade(id: string): boolean {
    const ok = buyMirrorUpgrade(game.state, id);
    done();
    return ok;
  },
  /** The Wormhole Network. */
  openWormhole(from: string, to: string): boolean {
    const ok = openLink(game.state, from, to);
    done();
    return ok;
  },
  setWormholeShare(index: number, share: number) {
    setLinkShare(game.state, index, share);
    done();
  },
  closeWormhole(index: number) {
    closeLink(game.state, index);
    done();
  },
  /** Spectral Focus. */
  setFocus(id: string | null): boolean {
    const ok = setFocus(game.state, id);
    done();
    return ok;
  },
  buySpectral(id: 'lens' | 'afterglow'): boolean {
    const ok = buySpectral(game.state, id);
    done();
    return ok;
  },
  /** Tarot of the Void: packs with the buy amount; cards in and out of the deck. */
  openPacks(): string[] {
    const drawn = openPacks(game.state).map((c) => c.id);
    done();
    return drawn;
  },
  placeCard(id: string, slot: number): boolean {
    const ok = placeCard(game.state, id, slot);
    done();
    return ok;
  },
  removeCard(slot: number) {
    removeCard(game.state, slot);
    done();
  },
  uprootPlot(plot: number): boolean {
    const ok = uprootPlot(game.state, plot);
    done();
    return ok;
  },
  crossbreed(a: string, b: string): string | null {
    const child = crossbreed(game.state, a, b);
    done();
    return child;
  },
  buyNode(id: string): boolean {
    const ok = buyNode(game.state, id);
    done();
    return ok;
  },
  setAuto(id: string, change: { on?: boolean; spend?: number }) {
    setAuto(game.state, id, change);
    done();
  },
  buyConstant(id: string): boolean {
    const ok = buyConstant(game.state, id);
    done();
    return ok;
  },
  /** Claims a finished quest; a new one takes its place at once. */
  claimQuest(index: number): boolean {
    const r = claimQuest(game.state, index);
    done();
    if (r) events.emit({ t: 'toast', title: 'Quest complete', body: `+${format(r, game.state.settings.notation)} Stardust and +1% production.`, icon: 'quests' });
    return !!r;
  },
  buyPlanet(slot: string, type: string): boolean {
    const ok = buyPlanet(game.state, slot, type);
    done();
    return ok;
  },
  levelPlanet(slot: string): boolean {
    const ok = levelPlanet(game.state, slot);
    done();
    return ok;
  },
  setPlanetType(slot: string, type: string): boolean {
    const ok = setPlanetType(game.state, slot, type);
    done();
    return ok;
  },
  buyUpgrade(id: string): boolean {
    const ok = buyUpgrade(game.state, id);
    done();
    return ok;
  },
  /** Catches the comet on screen. Returns the words to float where it was caught. */
  catchComet(): { title: string; body: string } | null {
    const r = catchComet(game.state);
    done();
    if (!r) return null;
    const n = game.state.settings.notation;
    const secs = r.seconds ? `${Math.round(r.seconds)} s` : '';
    const text: Record<CometKind, { title: string; body: string }> = {
      frenzy: { title: 'Frenzy!', body: `Engines x${BALANCE.comets.frenzy.mult} for ${secs}` },
      lucky: { title: 'Lucky!', body: `+${format(r.amount ?? 0, n)} Stardust` },
      tapstorm: { title: 'Tapstorm!', body: `Taps x${BALANCE.comets.tapstorm.mult} for ${secs}` },
      wish: { title: 'A Wish!', body: `Engines half price for ${secs}` },
    };
    return text[r.kind];
  },
  toggleMute() {
    game.state.settings.muted = !game.state.settings.muted;
    done();
  },
  /** Loads a rolling backup (the live game is backed up first). Returns an error message or null. */
  async restoreBackup(key: string): Promise<string | null> {
    const code = await readBackup(key);
    if (!code) return 'That backup could not be read.';
    await backupNow();
    return commands.importCode(code);
  },
  /** The player opened an unlocked system: its rail button stops pulsing. */
  markSeen(id: string) {
    if (!game.state.seen.includes(id)) game.state.seen.push(id);
    done();
  },
  setNotation(n: Notation) {
    game.state.settings.notation = n;
    done();
  },
  setBuyAmount(a: BuyAmount) {
    game.state.settings.buyAmount = a;
    done();
  },
  setCustomBuyAmount(n: number) {
    game.state.settings.customBuyAmount = Math.max(1, Math.min(1e15, Math.floor(n) || 1));
    done();
  },
  setSetting<K extends keyof typeof game.state.settings>(key: K, value: (typeof game.state.settings)[K]) {
    game.state.settings[key] = value;
    done();
  },
  saveNow() {
    const ok = saveNow();
    done();
    return ok;
  },
  exportCode(): { ok: true; code: string } | { ok: false; error: string } {
    return exportSave(game.state);
  },
  /** Replaces the game with an imported save after validating it. Returns an error message or null. */
  importCode(code: string): string | null {
    try {
      const r = importSave(code);
      void backupNow(); // a rolling backup of the current game first
      saveNow(); // and it goes into the other slot
      game.state = r.state;
      game.state.lastTick = Date.now();
      saveNow();
      done();
      return null;
    } catch (err) {
      return (err as Error).message;
    }
  },
  wipe() {
    wipeSave();
    game.state = createInitialState();
    game.tapRuntime = createTapRuntime();
    done();
  },
  // ---- dev tools (only reachable with ?dev=1) ----
  devAdd(currency: string, amount: number) {
    gain(game.state, currency, D(amount));
    done();
  },
  devMultiply(currency: string, factor: number) {
    const have = game.state.currencies[currency] ?? D(0);
    gain(game.state, currency, have.mul(factor - 1).max(D(factor)));
    done();
  },
  /** Saves the game as if it was closed `seconds` ago, then reloads: tests the welcome-back path. */
  devSaveAway(seconds: number) {
    const r = exportSave(game.state);
    if (!r.ok) return;
    const copy = importSave(r.code).state; // a real copy: structuredClone would strip the Decimals
    copy.lastTick = game.state.lastTick - seconds * 1000;
    game.saveBlocked = 'Reloading';
    saveToSlots(webStore, copy);
    location.reload();
  },
  devWarp(seconds: number) {
    simulateElapsed(game.state, seconds, { cap: Infinity, efficiency: 1, offline: false });
    done();
  },
};
