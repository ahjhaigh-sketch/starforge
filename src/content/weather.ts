import { BALANCE } from './balance';
import type { Requirement } from './requirements';

/**
 * Space Weather (Ideas menu 7). A kind joins the sky once the systems it touches are open, so the
 * first Supernova brings only Meteor Showers and Solar Flares. Strengths live in balance.ts.
 * IDs never change.
 */
const W = BALANCE.weather;

export interface WeatherDef {
  id: string;
  name: string;
  desc: string;
  /** A short label for the HUD chip. */
  chip: string;
  color: string;
  req: Requirement;
  effects: ReadonlyArray<{ stat: string; value: number }>;
}

export const WEATHERS: readonly WeatherDef[] = [
  { id: 'meteor', name: 'Meteor Shower', desc: `Comets come ${W.meteor} times as often.`, chip: `Comets x${W.meteor}`, color: '#2EE6FF', req: { kind: 'none' }, effects: [{ stat: 'cometRate', value: W.meteor }] },
  { id: 'flare', name: 'Solar Flare', desc: `Taps x${W.flare}.`, chip: `Taps x${W.flare}`, color: '#FF7A2E', req: { kind: 'none' }, effects: [{ stat: 'tapPower', value: W.flare }] },
  { id: 'wind', name: 'Stellar Wind', desc: `Starships fly x${W.windShips} as fast and asteroids drift in x${W.windBelt} as often.`, chip: 'Ships and Belt x2', color: '#8FD3FF', req: { kind: 'count', stat: 'supernovasAll', count: 15, noun: 'Supernova' }, effects: [{ stat: 'shipSpeed', value: W.windShips }, { stat: 'beltSpawn', value: W.windBelt }] },
  { id: 'eclipse', name: 'Eclipse', desc: `Rune Luck x${W.eclipseLuck} and Nebula Essence x${W.eclipseEssence}.`, chip: `Rune Luck x${W.eclipseLuck}`, color: '#6B4BC8', req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' }, effects: [{ stat: 'runeLuck', value: W.eclipseLuck }, { stat: 'essenceGain', value: W.eclipseEssence }] },
  { id: 'storm', name: 'Nebula Storm', desc: `Nova Shards and Nebula Essence x${W.storm}.`, chip: `Shards x${W.storm}`, color: '#FF4FC1', req: { kind: 'count', stat: 'nebulasAll', count: 1, noun: 'Nebula' }, effects: [{ stat: 'shardGain', value: W.storm }, { stat: 'essenceGain', value: W.storm }] },
  { id: 'aurora', name: 'Aurora', desc: `Aura and Mutation luck x${W.aurora}.`, chip: `Aura luck x${W.aurora}`, color: '#3EE08A', req: { kind: 'count', stat: 'nebulasAll', count: 3, noun: 'Nebula' }, effects: [{ stat: 'auraLuck', value: W.aurora }, { stat: 'mutationLuck', value: W.aurora }] },
];

export const WEATHER_BY_ID: ReadonlyMap<string, WeatherDef> = new Map(WEATHERS.map((w) => [w.id, w]));
