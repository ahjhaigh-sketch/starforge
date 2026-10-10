import { tint } from './Chunk';

export function ProgressBar({ value, color = 'var(--gold)', label }: { value: number; color?: string; label?: string }) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <div className="progress" style={tint(color)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}
