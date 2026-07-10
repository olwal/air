/*
  Data loading: CSV indexes + binary hourly frames -> per-sensor time series.

  Binary frame format (unchanged from the original): a flat Uint16Array of
  [id, aqi, id, aqi, ...] pairs. 65535 is the missing/NaN sentinel. One file per
  hour, named "YYYY-MM-DD_HH.bin", listed in the dataset's index.txt.

  Instead of building one GeoJSON FeatureCollection per hour (the old approach),
  we load the whole selected range once into a compact per-sensor series so
  deck.gl accessors can read aqi[currentHour] and scrub/animate on the GPU.
*/

import { DATA_BASE, ERROR_VALUE } from './config.js';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const monthText = (m) => MONTHS[m]; // m: 0-based

const url = (rel) => `${DATA_BASE}/${rel.replace(/^\//, '')}`;

export async function fetchText(rel, signal) {
  const res = await fetch(url(rel), { signal });
  if (!res.ok) throw new Error(`fetch ${rel}: ${res.status}`);
  return res.text();
}

async function fetchFrame(rel, signal) {
  const res = await fetch(url(rel), { signal });
  if (!res.ok) throw new Error(`fetch ${rel}: ${res.status}`);
  return new Uint16Array(await res.arrayBuffer());
}

// Minimal CSV parse (no embedded commas/quotes in this dataset).
export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  const rows = lines.slice(1).map((l) => l.split(','));
  return { header, rows };
}

// Haversine distance in meters (ported from js/observations.js getDistanceM).
export function haversineMeters(lon1, lat1, lon2, lat2) {
  const R = 6371; // km
  const p = Math.PI / 180;
  const dLat = (lat2 - lat1) * p;
  const dLon = (lon2 - lon1) * p;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
}

// Load a sensor index CSV (id,longitude,latitude) -> Map<id, {lon, lat}>.
export async function loadIndex(rel, signal) {
  const { header, rows } = parseCsv(await fetchText(rel, signal));
  const iId = header.indexOf('id');
  const iLon = header.indexOf('longitude');
  const iLat = header.indexOf('latitude');
  const index = new Map();
  for (const r of rows) {
    const id = Number(r[iId]);
    const lon = parseFloat(r[iLon]);
    const lat = parseFloat(r[iLat]);
    if (Number.isNaN(id) || Number.isNaN(lon) || Number.isNaN(lat)) continue;
    index.set(id, { lon, lat });
  }
  return index;
}

// Load landmark labels CSV (name,latitude,longitude,show) -> [{name,lon,lat,show}].
export async function loadLandmarks(rel, signal) {
  const { header, rows } = parseCsv(await fetchText(rel, signal));
  const iName = header.indexOf('name');
  const iLat = header.indexOf('latitude');
  const iLon = header.indexOf('longitude');
  const iShow = header.indexOf('show');
  const out = [];
  for (const r of rows) {
    const lat = parseFloat(r[iLat]);
    const lon = parseFloat(r[iLon]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    const showRaw = iShow >= 0 ? r[iShow] : '1';
    out.push({ name: r[iName], lon, lat, show: showRaw === '' ? 1 : Number(showRaw) });
  }
  return out;
}

// Parse index.txt -> [{ name, ms, hour }] filtered to [startMs, endMs].
export function selectFrames(indexText, startMs, endMs) {
  return indexText
    .trim()
    .split(/\r?\n/)
    .filter((n) => n.length)
    .map((name) => {
      const ms = Date.parse(name.slice(0, -7)); // "YYYY-MM-DD"
      const hour = parseInt(name.slice(-6, -4), 10);
      return { name, ms: ms + hour * 3600_000, hour };
    })
    .filter((f) => !Number.isNaN(f.ms) && f.ms >= startMs && f.ms <= endMs)
    .sort((a, b) => a.ms - b.ms);
}

// Bounded-concurrency map with progress + abort.
async function pool(items, worker, { concurrency = 12, onProgress, signal } = {}) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  async function run() {
    while (next < items.length) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
      const i = next++;
      results[i] = await worker(items[i], i);
      onProgress?.(++done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

/**
 * Load a time series for one dataset/location.
 *
 * @returns {{
 *   sensors: {id:number, lon:number, lat:number, aqi:Float32Array}[],
 *   hours: {ms:number, hour:number, day:string, monthIndex:number, monthText:string, year:string, avg:number}[],
 *   nFrames: number
 * }}  aqi[frame] is NaN where a sensor has no valid reading that hour.
 */
export async function loadSeries({
  index,
  basePath,
  frames,
  center,
  radius,
  onProgress,
  signal,
  tolerant = false, // if true, a per-frame fetch failure leaves NaNs instead of throwing
}) {
  // Candidate sensors: those in the index and within radius of center.
  const candidates = [];
  const col = new Map(); // sensor id -> column index in the series
  for (const [id, { lon, lat }] of index) {
    if (radius > 0) {
      if (haversineMeters(center.lon, center.lat, lon, lat) > radius) continue;
    }
    col.set(id, candidates.length);
    candidates.push({ id, lon, lat, aqi: new Float32Array(frames.length).fill(NaN) });
  }

  const hours = new Array(frames.length);

  await pool(
    frames,
    async (frame, fi) => {
      let data;
      try {
        data = await fetchFrame(basePath + frame.name, signal);
      } catch (err) {
        if (err.name === 'AbortError' || !tolerant) throw err;
        const d = new Date(frame.ms);
        hours[fi] = {
          ms: frame.ms, hour: frame.hour,
          day: String(d.getUTCDate()).padStart(2, '0'),
          monthIndex: d.getUTCMonth(), monthText: monthText(d.getUTCMonth()),
          year: String(d.getUTCFullYear()), avg: 0,
        };
        return;
      }
      let sum = 0;
      let count = 0;
      for (let i = 0; i + 1 < data.length; i += 2) {
        const id = data[i];
        const aqi = data[i + 1];
        if (aqi === ERROR_VALUE) continue;
        const c = col.get(id);
        if (c === undefined) continue;
        candidates[c].aqi[fi] = aqi;
        sum += aqi;
        count++;
      }
      const d = new Date(frame.ms);
      hours[fi] = {
        ms: frame.ms,
        hour: frame.hour,
        day: String(d.getUTCDate()).padStart(2, '0'),
        monthIndex: d.getUTCMonth(),
        monthText: monthText(d.getUTCMonth()),
        year: String(d.getUTCFullYear()),
        avg: count ? sum / count : 0,
      };
    },
    { onProgress, signal },
  );

  // Drop sensors that never reported in this range to keep the layer lean.
  const sensors = candidates.filter((s) => s.aqi.some((v) => !Number.isNaN(v)));
  return { sensors, hours, nFrames: frames.length };
}
