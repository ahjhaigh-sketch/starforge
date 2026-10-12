import { captureStar } from './stage';

/**
 * Photo Mode (the Wardrobe): your star, framed, with a card of your best numbers underneath, as a
 * 1200 x 1200 PNG to share. Everything is drawn here from the renderer's own picture of the sky, so
 * no part of the interface ends up in the photo.
 */
export interface PhotoCard {
  title: string;
  subtitle: string;
  lines: ReadonlyArray<{ label: string; value: string }>;
  footer: string;
}

const SIZE = 1200;
/** Where the card starts; the star sits in the middle of the sky above it. */
const CARD_TOP = 830;

export async function takePhoto(card: PhotoCard, background: string): Promise<Blob | null> {
  const sky = captureStar(SIZE, CARD_TOP / SIZE / 2);
  if (!sky) return null;
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const g = canvas.getContext('2d');
  if (!g) return null;
  // the backdrop: the Wardrobe background's colour fading to the deep sky
  const bg = g.createRadialGradient(SIZE / 2, CARD_TOP / 2, 40, SIZE / 2, CARD_TOP / 2, SIZE * 0.8);
  bg.addColorStop(0, background);
  bg.addColorStop(1, '#06031A');
  g.fillStyle = bg;
  g.fillRect(0, 0, SIZE, SIZE);
  g.drawImage(sky, 0, 0, SIZE, SIZE);
  // the card: an ink-outlined panel along the bottom
  const top = CARD_TOP;
  g.fillStyle = 'rgba(36, 24, 94, 0.94)';
  g.strokeStyle = '#140B2E';
  g.lineWidth = 8;
  g.beginPath();
  g.roundRect(40, top, SIZE - 80, SIZE - top - 40, 28);
  g.fill();
  g.stroke();
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#FFC83D';
  g.font = '64px "Lilita One", sans-serif';
  g.fillText(card.title, 80, top + 78);
  g.fillStyle = '#C9C2F2';
  g.font = '600 30px "Baloo 2 Variable", "Baloo 2", sans-serif';
  g.fillText(card.subtitle, 80, top + 120);
  // the numbers in two columns
  g.font = '700 30px "Baloo 2 Variable", "Baloo 2", sans-serif';
  card.lines.slice(0, 6).forEach((l, i) => {
    const x = 80 + (i % 2) * 540;
    const y = top + 176 + Math.floor(i / 2) * 44;
    g.fillStyle = '#C9C2F2';
    g.fillText(l.label, x, y);
    g.fillStyle = '#FFFFFF';
    g.fillText(l.value, x + 250, y);
  });
  g.fillStyle = '#8C97C2';
  g.font = '600 24px "Baloo 2 Variable", "Baloo 2", sans-serif';
  g.fillText(card.footer, 80, SIZE - 64);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
