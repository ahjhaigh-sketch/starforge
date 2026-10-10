import { BALANCE } from './balance';

/**
 * The 12 Star Tiers (Math and balance tab). Evolving spends Stardust and resets nothing; each tier
 * is x2 everything, a new look and one unlock. Visual numbers drive the Star Core shader.
 */
export interface TierDef {
  id: string;
  name: string;
  /** Main colour: tier pill, burst, glow. */
  color: string;
  /** Shader colours: hot centre, surface, corona. */
  hot: string;
  body: string;
  corona: string;
  /** Star radius as a share of the star stage's width. */
  size: number;
  /** Corona ray count and length (in star radii). */
  rays: number;
  rayLength: number;
  /** Plasma churn speed and strength. */
  churn: number;
  /** Extra effect drawn by the shader: 0 none, 1 beams (pulsar), 2 jets (quasar/blazar), 3 rainbow fringe. */
  feature: 0 | 1 | 2 | 3;
  unlocks: string;
}

export const TIERS: readonly TierDef[] = [
  { id: 'protostar', name: 'Protostar', color: '#FF9E5E', hot: '#FFF1D6', body: '#FF9E5E', corona: '#FF7A2E', size: 0.17, rays: 10, rayLength: 1.55, churn: 0.6, feature: 0, unlocks: 'Tapping and the first engines' },
  { id: 'reddwarf', name: 'Red Dwarf', color: '#FF5640', hot: '#FFD9C2', body: '#FF5640', corona: '#FF2E4F', size: 0.176, rays: 12, rayLength: 1.6, churn: 0.7, feature: 0, unlocks: 'Asteroid Belt, comets and Starsmith Level' },
  { id: 'goldensun', name: 'Golden Sun', color: '#FFC83D', hot: '#FFFFFF', body: '#FFC83D', corona: '#FFB01F', size: 0.182, rays: 16, rayLength: 1.7, churn: 0.8, feature: 0, unlocks: 'Cosmic Constants, Star Quests and crit taps' },
  { id: 'bluegiant', name: 'Blue Giant', color: '#4FB6FF', hot: '#FFFFFF', body: '#4FB6FF', corona: '#2EE6FF', size: 0.19, rays: 18, rayLength: 1.75, churn: 0.9, feature: 0, unlocks: 'Supernova and the first Orbital ring' },
  { id: 'redsupergiant', name: 'Red Supergiant', color: '#FF6A3D', hot: '#FFE0B8', body: '#F0502E', corona: '#FF7A2E', size: 0.196, rays: 20, rayLength: 1.7, churn: 1.1, feature: 0, unlocks: 'Engine Mastery and the second Orbital ring' },
  { id: 'hypergiant', name: 'Hypergiant', color: '#FFE9B0', hot: '#FFFFFF', body: '#FFF0C8', corona: '#FF8A3D', size: 0.204, rays: 22, rayLength: 1.8, churn: 1.25, feature: 0, unlocks: 'Heavier elements for the Codex' },
  { id: 'neutronstar', name: 'Neutron Star', color: '#CFF6FF', hot: '#FFFFFF', body: '#BFEFFF', corona: '#7FDBFF', size: 0.21, rays: 26, rayLength: 1.95, churn: 1.6, feature: 0, unlocks: 'Elements up to iron' },
  { id: 'magnetar', name: 'Magnetar', color: '#B98CFF', hot: '#FFFFFF', body: '#B98CFF', corona: '#2EE6FF', size: 0.216, rays: 24, rayLength: 1.9, churn: 1.8, feature: 3, unlocks: 'Magnet Storm comets and the third Orbital ring' },
  { id: 'pulsar', name: 'Pulsar', color: '#7FE7FF', hot: '#FFFFFF', body: '#8FD8FF', corona: '#9B7CFF', size: 0.222, rays: 20, rayLength: 1.8, churn: 2, feature: 1, unlocks: 'Pulsar comets' },
  { id: 'quasar', name: 'Quasar', color: '#FF4FC1', hot: '#FFFFFF', body: '#FF6FD0', corona: '#B06BFF', size: 0.228, rays: 28, rayLength: 2, churn: 2.2, feature: 2, unlocks: 'Elements up to barium' },
  { id: 'blazar', name: 'Blazar', color: '#FFB347', hot: '#FFFFFF', body: '#FFC46B', corona: '#FF4FC1', size: 0.234, rays: 30, rayLength: 2.1, churn: 2.5, feature: 2, unlocks: 'The fourth Orbital ring' },
  { id: 'whitehole', name: 'White Hole', color: '#FFFFFF', hot: '#FFFFFF', body: '#F4F0FF', corona: '#FFFFFF', size: 0.24, rays: 32, rayLength: 2.2, churn: 2.8, feature: 3, unlocks: 'Every element up to 118' },
];

/** Stardust needed to evolve INTO tier index `t` (t >= 1). */
export function tierCost(t: number): number {
  return BALANCE.tiers.firstCost * BALANCE.tiers.ratio ** (t - 1);
}
