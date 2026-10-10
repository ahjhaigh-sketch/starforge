import { ICON_SVG } from '../iconData';

/** Chunky ink-outlined SVG icons (never emoji). Markup is static and trusted. */
export function Icon({ name, className }: { name: string; className?: string }) {
  const inner = ICON_SVG[name] ?? ICON_SVG.mystery ?? '';
  return (
    <span
      className={className ? `icon ${className}` : 'icon'}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 24 24" width="100%" height="100%">${inner}</svg>` }}
    />
  );
}
