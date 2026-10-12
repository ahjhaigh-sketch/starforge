/**
 * Badge glyphs: small symbols drawn in an icon's corner to say what an upgrade or a system does
 * ("comet+magnet": comets, pulled in). Drawn on the 24-unit grid like every icon, bold enough to
 * read at a third of the size, in the same ink outline.
 */
const INK = 'stroke="#140B2E" stroke-linejoin="round" stroke-linecap="round"';

export const BADGE_SVG: Record<string, string> = {
  bolt: `<path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2L15 2z" fill="#FFE070" ${INK} stroke-width="2"/>`,
  crosshair: `<circle cx="12" cy="12" r="7.5" fill="#FF6F8A" ${INK} stroke-width="2"/><circle cx="12" cy="12" r="2.6" fill="#fff" ${INK} stroke-width="1.6"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5" ${INK} stroke-width="2.4"/>`,
  flame: `<path d="M12 2.5c1 4 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-3 1.6-4.4 2.6-6.4.7 1.8 1.6 2.6 2.5 2.9-.4-2.7-.3-5 .4-7.5z" fill="#FF7A2E" ${INK} stroke-width="1.9"/><path d="M12 13c1.4 1.5 2.4 2.5 2.4 4.1a2.4 2.4 0 0 1-4.8 0c0-1.2.9-2.4 2.4-4.1z" fill="#FFE070"/>`,
  clock: `<circle cx="12" cy="12" r="9" fill="#BFD8FF" ${INK} stroke-width="2"/><path d="M12 6.5V12l3.8 2.4" fill="none" ${INK} stroke-width="2.2"/>`,
  magnet: `<path d="M4.5 3.5h4.5v8a3 3 0 0 0 6 0v-8h4.5v8a7.5 7.5 0 0 1-15 0z" fill="#FF4F6E" ${INK} stroke-width="1.9"/><path d="M4.5 3.5h4.5v3.5H4.5zM15 3.5h4.5v3.5H15z" fill="#E8F6FF" ${INK} stroke-width="1.6"/>`,
  hook: `<path d="M14 2.5v11a5 5 0 0 1-10 0V12" fill="none" ${INK} stroke-width="4.4"/><path d="M14 2.5v11a5 5 0 0 1-10 0V12" fill="none" stroke="#E8F6FF" stroke-width="2" stroke-linecap="round"/><path d="M2 13.5 4 9.5l2.5 3.8" fill="#E8F6FF" ${INK} stroke-width="1.6"/><circle cx="14" cy="3.5" r="2" fill="#FFC83D" ${INK} stroke-width="1.4"/>`,
  eye: `<path d="M1.8 12C5 6.5 19 6.5 22.2 12 19 17.5 5 17.5 1.8 12z" fill="#E8F6FF" ${INK} stroke-width="1.9"/><circle cx="12" cy="12" r="3.8" fill="#6B4BC8" ${INK} stroke-width="1.6"/><circle cx="13.2" cy="10.8" r="1.1" fill="#fff"/>`,
  note: `<path d="M9 18V5l11-2.5v12.8" fill="none" ${INK} stroke-width="2.4"/><ellipse cx="6.4" cy="18.2" rx="3.4" ry="2.7" fill="#2EE6FF" ${INK} stroke-width="1.8"/><ellipse cx="17.4" cy="15.6" rx="3.4" ry="2.7" fill="#2EE6FF" ${INK} stroke-width="1.8"/>`,
  hand: `<path d="M8 21.5c-2.4-1.6-4.2-4.3-4.6-7.4-.2-1.3 1.6-1.9 2.3-.8l1.6 2.4V5.2a1.6 1.6 0 0 1 3.2 0V11V3.6a1.6 1.6 0 0 1 3.2 0V11V4.6a1.6 1.6 0 0 1 3.2 0V11.5V7.2a1.5 1.5 0 0 1 3 0v8.1c0 3.6-2.4 6.2-5.6 6.2z" fill="#FFD2A8" ${INK} stroke-width="1.7"/>`,
  chain: `<rect x="2.5" y="8" width="11" height="8" rx="4" fill="none" ${INK} stroke-width="4.2"/><rect x="2.5" y="8" width="11" height="8" rx="4" fill="none" stroke="#C9D3F2" stroke-width="2"/><rect x="10.5" y="8" width="11" height="8" rx="4" fill="none" ${INK} stroke-width="4.2"/><rect x="10.5" y="8" width="11" height="8" rx="4" fill="none" stroke="#FFC83D" stroke-width="2"/>`,
  arrowup: `<path d="M12 2.2 21 12h-5.4v9.8H8.4V12H3z" fill="#7DFF5A" ${INK} stroke-width="2"/>`,
  swirl: `<path d="M12 12a2.2 2.2 0 1 1 2.2-2.2c0 3.4-4.6 5.2-7.4 2.4C3.4 8.8 6 3 11.6 3c6 0 9.4 5.2 8.2 10.2-1.2 5-6.6 8-11.2 6.6" fill="none" ${INK} stroke-width="4"/><path d="M12 12a2.2 2.2 0 1 1 2.2-2.2c0 3.4-4.6 5.2-7.4 2.4C3.4 8.8 6 3 11.6 3c6 0 9.4 5.2 8.2 10.2-1.2 5-6.6 8-11.2 6.6" fill="none" stroke="#8FD3FF" stroke-width="1.8" stroke-linecap="round"/>`,
  drop: `<path d="M12 2.2c3 4.6 7 8.2 7 12.4a7 7 0 0 1-14 0C5 10.4 9 6.8 12 2.2z" fill="#2EE6FF" ${INK} stroke-width="1.9"/><path d="M9 14.5a3 3 0 0 0 2.6 3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`,
  plus: `<path d="M9 2.5h6v6.5h6.5v6H15v6.5H9V15H2.5V9H9z" fill="#7DFF5A" ${INK} stroke-width="1.9"/>`,
  clover: `<g fill="#3EE08A" ${INK} stroke-width="1.7"><circle cx="8.2" cy="8.2" r="4"/><circle cx="15.8" cy="8.2" r="4"/><circle cx="8.2" cy="15.8" r="4"/><circle cx="15.8" cy="15.8" r="4"/></g><path d="M12 12l5 9" ${INK} stroke-width="2.2"/><circle cx="12" cy="12" r="1.6" fill="#FFE070"/>`,
  coin: `<circle cx="12" cy="12" r="9" fill="#FFC83D" ${INK} stroke-width="2"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#B0701A" stroke-width="1.6"/><path d="M12 8.5l1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z" fill="#fff"/>`,
  bell: `<path d="M6 17.5V11a6 6 0 0 1 12 0v6.5l1.8 2H4.2z" fill="#FFE070" ${INK} stroke-width="1.9"/><circle cx="12" cy="21" r="1.8" fill="#FFC83D" ${INK} stroke-width="1.4"/><path d="M12 3v2" ${INK} stroke-width="2"/>`,
  map: `<path d="M2.5 5.5 8.5 3l7 2.5 6-2.5v15.5l-6 2.5-7-2.5-6 2.5z" fill="#E8F6FF" ${INK} stroke-width="1.8"/><path d="M8.5 3v15.5M15.5 5.5V21" ${INK} stroke-width="1.5"/><path d="M5 12.5l3-2 4 3 4-4 3 2" fill="none" stroke="#FF4F6E" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="1.6 1.6"/>`,
};
