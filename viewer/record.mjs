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
  // 1x device scale: matches the video size, so software WebGL isn't rendering
  // 4x the pixels — much smoother capture (on a real GPU you could bump to 2).
  deviceScaleFactor: Number(process.env.RECORD_DPR || 1),
  recordVideo: { dir: OUT, size: SIZE },
});
const page = await context.newPage();

await page.goto(`${BASE}?${query.replace(/ /g, '%20')}`, { waitUntil: 'load' });

// Optional clean look: hide the left control panel (form + mobile toggle) and
// the corner map control buttons — but keep the attribution (licensing) and the
// top HUD.
if (process.argv.includes('--hide-ui')) {
  await page.addStyleTag({
    content:
      '#controls,#panel-toggle{display:none!important}' +
      '.maplibregl-ctrl-group{display:none!important}',
  });
}

// Wait for the terrain + first data to be ready before we start recording motion.
await page
  .waitForFunction(() => window.__app && window.__app.nFrames > 0 && window.__app.visible.size > 0, { timeout: 60000 })
  .catch(() => {});
await page.waitForTimeout(4000);

// Cinematic tour: sweep the whole date span while orbiting and pushing in.
// The timeline is driven directly from tour progress (not the app's playback
// clock), so the full span always fits the clip regardless of frame count or
// render speed. The promise resolves when the tour ends, bounding the recording.
const zoomIn = Number(process.env.RECORD_ZOOM_IN || 2.0); // zoom levels gained over the clip
const degPerSec = Number(process.env.RECORD_ORBIT_DEG || 8);
const doOrbit = !process.argv.includes('--no-orbit');

await page.evaluate(
  ({ secs, zoomIn, degPerSec, doOrbit }) =>
    new Promise((resolve) => {
      const app = window.__app;
      const map = app.map;
      app.applyImagery = () => {}; // freeze imagery source (no tile swap mid-shot)
      app.setPlaying(false); // we drive the frame index ourselves
      const n = Math.max(1, app.nFrames);
      const z0 = map.getZoom(); // start at the load framing
      const z1 = z0 + zoomIn; // push in over the clip
      const b0 = map.getBearing();
      const t0 = performance.now();
      (function tick(now) {
        const t = Math.min(1, (now - t0) / (secs * 1000));
        const e = t * t * (3 - 2 * t); // smoothstep easing for the zoom
        map.setZoom(z0 + (z1 - z0) * e);
        if (doOrbit) map.setBearing(b0 + degPerSec * secs * t);
        app.setCurrent(Math.round(t * (n - 1))); // linear timeline sweep
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      })(t0);
    }),
  { secs: seconds, zoomIn, degPerSec, doOrbit },
);

// Hold the final view briefly so the browser teardown / video finalization
// jank lands here (after the tour). We trim this tail off during encoding, so
// the clip ends on clean tour footage instead of dropped/frozen frames.
await page.waitForTimeout(1500);

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
