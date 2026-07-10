/*
  Demo-video recorder. Drives a scripted tour (focus a location, play through the
  time series, optionally orbit) and records the viewport to a .webm.

  Best run locally on a real GPU with a headed browser for smooth, high-quality
  output — headless software WebGL (SwiftShader) renders slowly and choppily.

  Usage:
    npm run dev                       # in one terminal
    node record.mjs "<query>" <name> [seconds] [--headed]

  Examples:
    node record.mjs "location=Santa Cruz&start_date=2020-08-16&end_date=2020-09-23&radius=20000&unit=km&play=true" santa_cruz 25 --headed
    node record.mjs "location=Napa&start_date=2020-08-16&end_date=2020-10-11&radius=50000&unit=km&play=true" napa 30 --headed

  Convert to GIF (needs ffmpeg), matching the repo's ~320px media:
    ffmpeg -i out/santa_cruz.webm -vf "fps=15,scale=640:-1:flags=lanczos" -loop 0 ../media/santa_cruz_new.gif
*/

import { chromium } from 'playwright';
import { rename, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const query = process.argv[2] || 'location=Santa Cruz&start_date=2020-08-16&end_date=2020-09-23&radius=20000&unit=km&play=true';
const name = process.argv[3] || 'demo';
const seconds = Number(process.argv[4] || 25);
const headed = process.argv.includes('--headed');
const orbit = process.argv.includes('--orbit');

const BASE = process.env.RECORD_URL || 'http://localhost:5173/';
const SIZE = { width: 1280, height: 720 };
const OUT = 'out';

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: !headed,
  args: ['--use-gl=angle', '--use-angle=default', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: SIZE,
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT, size: SIZE },
});
const page = await context.newPage();

await page.goto(`${BASE}?${query.replace(/ /g, '%20')}`, { waitUntil: 'load' });

// Wait for the terrain + first data to be ready before we start recording motion.
await page
  .waitForFunction(() => window.__app && window.__app.nFrames > 0 && window.__app.visible.size > 0, { timeout: 60000 })
  .catch(() => {});
await page.waitForTimeout(4000);

await page.evaluate(() => window.__app.setPlaying(true));
if (orbit) await page.keyboard.press('o');

await page.waitForTimeout(seconds * 1000);

const video = page.video();
await context.close(); // finalizes the video file
await browser.close();

if (video) {
  const src = await video.path();
  const dest = join(OUT, `${name}.webm`);
  await rename(src, dest).catch(() => {});
  console.log('saved', dest);
} else {
  console.log('no video captured');
}
