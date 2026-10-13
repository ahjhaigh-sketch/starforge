import { BALANCE } from '../content/balance';
import { CURRENCY_LABEL } from '../content/galaxyBuild';
import { D } from '../engine/decimal';
import { cur, keptOf, recentSpending } from '../engine/state';
import { format, formatRate } from '../ui/format';
import { game } from './game';

/**
 * 1.3.0: what a currency pill's tooltip shows. How much of it is the safe tenth (automation can never
 * spend it), and what automation spent of it a second over the last few seconds, biggest first, so
 * "it vanishes into everything" has names and numbers.
 */
export interface CurrencyReport {
  name: string;
  have: string;
  kept: string;
  keepPct: string;
  spending: Array<{ name: string; rate: string; pct: number }>;
}

const NAMES: Record<string, string> = { ...CURRENCY_LABEL, chronons: 'Chronons', sparks: 'Multiverse Sparks' };

export function currencyReport(id: string): CurrencyReport {
  const s = game.state;
  const n = s.settings.notation;
  const list = recentSpending(s, id);
  const total = list.reduce((t, x) => t.add(x.perSecond), D(0));
  return {
    name: NAMES[id] ?? id,
    have: format(cur(s, id), n),
    kept: format(keptOf(s, id), n),
    keepPct: `${Math.round(BALANCE.automation.keepShare * 100)}%`,
    spending: list.slice(0, 5).map((x) => ({ name: x.name, rate: formatRate(x.perSecond, n), pct: total.gt(0) ? Math.round(x.perSecond.div(total).toNumber() * 100) : 0 })),
  };
}
