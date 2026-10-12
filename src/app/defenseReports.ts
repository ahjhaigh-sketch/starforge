import { BALANCE } from '../content/balance';
import { TURRETS } from '../content/defense';
import { GRADE_BY_ID } from '../content/forge';
import { D } from '../engine/decimal';
import { cur } from '../engine/state';
import { autoOpen, battleResult, battleSetup, defenseOpen, levelPlan, loadoutKey, placeCost, placedOf, turretLevel, winAlloy } from '../engine/systems/defense';
import { hasArmour, hasBoss, healthLog10, swarmCount } from '../engine/systems/defenseBattle';
import { format, formatMult, formatTime } from '../ui/format';
import { game } from './game';

/** Read-outs for Planet Defense. */
const DF = BALANCE.defense;
const n = () => game.state.settings.notation;
const gradeName = (alloy: string) => GRADE_BY_ID.get(alloy.replace('alloy.', ''))!.name;

export interface TurretRow {
  id: string;
  name: string;
  desc: string;
  color: string;
  alloy: string;
  placed: number;
  placeCost: string;
  canPlace: boolean;
  level: string;
  count: number;
  levelCost: string;
  canLevel: boolean;
}

export function defenseReport() {
  const s = game.state;
  const d = s.defense;
  const next = d.best + 1;
  const armed = d.sockets.some((k) => !!k);
  const farm = autoOpen(s) && armed ? battleResult(battleSetup(s, d.best)) : null;
  const pushing = d.lost !== loadoutKey(s);
  return {
    open: defenseOpen(s),
    req: `${DF.singularities} Singularities and a planet in orbit`,
    best: d.best,
    next,
    wave: {
      count: swarmCount(next) + (hasBoss(next) ? 1 : 0),
      armoured: hasArmour(next) ? Math.floor(swarmCount(next) / 4) : 0,
      boss: hasBoss(next),
      health: format(D(10).pow(healthLog10(next)), n()),
    },
    sockets: d.sockets.map((kind, i) => {
      const t = TURRETS.find((x) => x.id === kind);
      return { i, kind, name: t?.name ?? '', color: t?.color ?? '' };
    }),
    turrets: TURRETS.map((t): TurretRow => {
      const plan = levelPlan(s, t.id);
      const cost = placeCost(s, t.id);
      return {
        id: t.id,
        name: t.name,
        desc: t.desc,
        color: t.color,
        alloy: gradeName(t.alloy),
        placed: placedOf(s, t.id),
        placeCost: format(cost, n()),
        canPlace: cur(s, t.alloy).gte(cost),
        level: `Lv ${turretLevel(s, t.id)}`,
        count: plan.count,
        levelCost: format(plan.cost, n()),
        canLevel: plan.canAfford,
      };
    }),
    canFight: defenseOpen(s) && armed,
    planets: formatMult(D(1 + DF.planetPerBest * d.best), n()),
    stardust: formatMult(D(1 + DF.stardustPerBest * d.best), n()),
    auto: {
      open: autoOpen(s),
      from: DF.autoFrom,
      on: d.auto,
      mode: pushing ? 'pushing' : 'farming',
      wave: d.wave,
      every: farm ? formatTime(farm.seconds) : '',
      perWin: farm?.win ? winAlloy(s, d.best).map((g) => `${format(g.amount, n())} ${gradeName(g.alloy)}`).join(', ') : '',
    },
  };
}
