// Contact sheet of screenshots: node scripts/sheet.mjs out.png cols img1 img2 ...
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
const [out, cols, ...files] = process.argv.slice(2);
const imgs = files.map((f) => `<figure><img src="data:image/png;base64,${readFileSync(f).toString('base64')}"><figcaption>${f.split('/').pop()}</figcaption></figure>`).join('');
const html = `<body style="margin:0;background:#111;color:#ccc;font:12px sans-serif;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px">${imgs}</body><style>figure{margin:0}img{width:100%;display:block}</style>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 800 } });
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true });
await b.close();
