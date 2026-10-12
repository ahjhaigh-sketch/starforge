import { BADGE_SVG } from '../badgeData';
import { ICON_SVG } from '../iconData';

/**
 * Chunky ink-outlined SVG icons (never emoji). Markup is static and trusted.
 * A name can carry a corner badge: "comet+magnet" draws the comet with a magnet badge (a badge glyph
 * or another icon), and "trophy#1K" a small number badge, so each upgrade, system and medal has its
 * own symbol while sharing one family of glyphs.
 */
const cache = new Map<string, string>();

function svgFor(name: string): string {
  let out = cache.get(name);
  if (out) return out;
  const hash = name.indexOf('#');
  const plus = name.indexOf('+');
  const baseName = hash >= 0 ? name.slice(0, hash) : plus >= 0 ? name.slice(0, plus) : name;
  const base = ICON_SVG[baseName] ?? ICON_SVG.mystery ?? '';
  let badge = '';
  if (plus >= 0) {
    const glyph = BADGE_SVG[name.slice(plus + 1)] ?? ICON_SVG[name.slice(plus + 1)];
    if (glyph) badge = `<circle cx="18.4" cy="18.4" r="6.3" fill="#1B1240" stroke="#140B2E" stroke-width="1.4"/><g transform="translate(13.3 13.3) scale(0.425)">${glyph}</g>`;
  } else if (hash >= 0) {
    const text = name.slice(hash + 1);
    const w = Math.max(7.5, 3.4 + text.length * 3.4);
    badge = `<rect x="${24 - w - 0.3}" y="15.6" width="${w}" height="8" rx="3.6" fill="#FFC83D" stroke="#140B2E" stroke-width="1.4"/><text x="${24 - w / 2 - 0.3}" y="21.9" text-anchor="middle" font-size="6.4" font-weight="800" font-family="Baloo 2, sans-serif" fill="#140B2E">${text}</text>`;
  }
  out = `<svg viewBox="0 0 24 24" width="100%" height="100%">${base}${badge}</svg>`;
  cache.set(name, out);
  return out;
}

export function Icon({ name, className }: { name: string; className?: string }) {
  return <span className={className ? `icon ${className}` : 'icon'} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgFor(name) }} />;
}
