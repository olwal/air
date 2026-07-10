// Headless smoke test: load the viewer, drive a time-series load, report
// console/page errors and network failures, capture a screenshot.
import { chromium } from 'playwright';

const URL =
  process.env.SMOKE_URL ||
  'http://localhost:5173/?location=Santa%20Cruz&start_date=2020-08-16&end_date=2020-08-20&radius=20000&unit=km&play=true';

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
const failed = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on('requestfailed', (r) => failed.push(`${r.url()} — ${r.failure()?.errorText}`));

await page.goto(URL, { waitUntil: 'load', timeout: 30000 });

// Give MapLibre style + terrain + the data load a chance to run.
await page.waitForTimeout(9000);

// Probe app state from the page.
const state = await page.evaluate(() => {
  const c = document.getElementById('timeline');
  return {
    mapCanvas: !!document.querySelector('#map canvas'),
    locationOptions: document.getElementById('location')?.options.length ?? 0,
    timelineHasPixels: !!c && c.width > 0,
  };
});

await page.screenshot({ path: 'smoke.png' });
await browser.close();

console.log('--- SMOKE RESULT ---');
console.log('map canvas present :', state.mapCanvas);
console.log('location options   :', state.locationOptions);
console.log('timeline sized     :', state.timelineHasPixels);
console.log('console errors     :', errors.length);
errors.slice(0, 20).forEach((e) => console.log('  ✗', e));
console.log('failed requests    :', failed.length);
failed.slice(0, 20).forEach((f) => console.log('  ✗', f));

const ok = state.mapCanvas && state.locationOptions > 0 && errors.length === 0;
console.log(ok ? '\nPASS' : '\nFAIL');
process.exit(ok ? 0 : 1);
