import { useEffect, useState } from 'react';
import { type CurrencyReport, currencyReport } from '../../app/currencyReports';
import { snapshotStore } from '../../app/uiSnapshot';

/** 1.3.0: a currency pill's tooltip body, rebuilt with the snapshot (at most twice a second) while it shows. */
export function CurrencyTip({ id }: { id: string }) {
  const [r, setR] = useState<CurrencyReport>(() => currencyReport(id));
  useEffect(() => {
    let last = performance.now();
    return snapshotStore.subscribe(() => {
      const now = performance.now();
      if (now - last < 500) return;
      last = now;
      setR(currencyReport(id));
    });
  }, [id]);
  return (
    <span className="cur-tip">
      <span className="tip-line">
        Kept safe: <span className="num">{r.kept}</span>
      </span>
      <span className="cur-tip-note">Automation never spends the last {r.keepPct} of what you earn. Your own purchases can.</span>
      {r.spending.length > 0 ? (
        <>
          <span className="tip-line">Spent automatically</span>
          {r.spending.map((x) => (
            <span key={x.name} className="cur-tip-row">
              <span>{x.name}</span>
              <span className="num">
                {x.rate} · {x.pct}%
              </span>
            </span>
          ))}
        </>
      ) : (
        <span className="cur-tip-note">Nothing is spending it automatically right now.</span>
      )}
    </span>
  );
}
