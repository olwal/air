/*
  Application entry point. Parses the URL-parameter contract (kept compatible
  with the original app), wires the MapLibre map + deck.gl overlay + timeline HUD
  + controls, and manages time-series loading, playback, and multi-city show/hide.
*/

import {
  SENSOR_INDEX_FILE, LANDMARKS_FILE, SENSOR_INDEX_AGGREGATE_FILE,
  BINARY_DATA_PATH, BINARY_AGGREGATE_DATA_PATH, BINARY_INDEX,
  DATASET_START_DATE, DATASET_END_DATE,
  DEFAULT_LONGITUDE, DEFAULT_LATITUDE, DEFAULT_LOCATION,
  DEFAULT_RADIUS, DEFAULT_DISTANCE, DEFAULT_START_DATE, DEFAULT_END_DATE,
  AUTOPLAY, UPDATE_MS, UPDATE_MULTIPLIER, EXTRA_LOCATIONS, KM_TO_MILES,
} from './config.js';
import {
  fetchText, loadIndex, loadLandmarks, selectFrames, loadSeries,
} from './data.js';
import { createMap, setImagery, addLabels, updateLabels, LABELS_LAYER } from './map.js';
import { IMAGERY_SOURCES, DEFAULT_IMAGERY, AUTO_ESRI_ZOOM, AUTO_ESRI_HYSTERESIS } from './config.js';
import { createOverlay, columnLayer } from './sensorLayer.js';
import { TERRAIN_EXAGGERATION } from './config.js';
import { Timeline } from './timeline.js';
import { Controls } from './controls.js';
import { focusOn, panTo, toggleOrbit, stopOrbit } from './camera.js';

class App {
  constructor() {
    // Pick starting imagery from ?imagery= (falling back to the default), only
    // honoring key-gated sources when a key is present.
    const wanted = new URLSearchParams(location.search).get('imagery');
    const src = IMAGERY_SOURCES[wanted];
    // imageryPref = what the user chose (dropdown); imageryDisplayed = what's
    // actually on the map (may be auto-promoted to Esri when zoomed in).
    this.imageryPref = src && !src.requiresKey ? wanted : DEFAULT_IMAGERY;
    this.imageryDisplayed = this.imageryPref;

    this.map = createMap('map', this.imageryDisplayed);
    this.overlay = createOverlay();
    this.map.addControl(this.overlay);

    this.timeline = new Timeline(document.getElementById('timeline'), {
      onSeek: (i) => this.setCurrent(i),
      onTogglePlay: () => this.setPlaying(!this.playing),
    });
    this.controls = new Controls({
      onSubmit: (p) => this.onSubmit(p),
      onImagery: (id) => {
        this.imageryPref = id;
        this.applyImagery();
      },
    });
    this.hint = document.getElementById('hint');

    // State
    this.landmarks = [];
    this.sensorIndex = null;
    this.aggregateIndex = null;
    this.frames = [];
    this.aggregate = null;              // { sensors, hours }
    this.visible = new Map();           // name -> { sensors, hours }
    this.cache = new Map();             // rangeKey|name -> { sensors, hours }
    this.primary = null;                // name driving the timeline graph
    this.current = 0;
    this.nFrames = 0;
    this.playing = false;
    this.speedMs = UPDATE_MS;
    this.range = { start: null, end: null, radius: null };
    this.controller = null;             // AbortController for the active load
    this.posVersion = 0;                // bump to force deck to re-read baked z
    this.bakeTimer = 0;
    this.framed = false;                // has the camera been framed once this session
    this.showLabels = true;

    // Dev-only handle for the headless smoke test (stripped from prod builds).
    if (import.meta.env.DEV) window.__app = this;
  }

  async init() {
    const params = new URLSearchParams(location.search);
    this.landmarks = await loadLandmarks(LANDMARKS_FILE);
    // Fire complexes aren't in the CSV; add so they resolve + label. Normalize
    // to the landmark {lon,lat} shape (EXTRA_LOCATIONS uses longitude/latitude).
    for (const l of EXTRA_LOCATIONS) {
      this.landmarks.push({ name: l.name, lon: l.longitude, lat: l.latitude, show: 2 });
    }
    this.controls.populateLocations(this.landmarks);
    this.controls.setImagery(this.imageryId);

    [this.sensorIndex, this.aggregateIndex] = await Promise.all([
      loadIndex(SENSOR_INDEX_FILE),
      loadIndex(SENSOR_INDEX_AGGREGATE_FILE),
    ]);

    await new Promise((r) => (this.map.isStyleLoaded() ? r() : this.map.once('load', r)));
    addLabels(this.map, this.landmarks, null, this.visible);
    // Re-evaluate imagery whenever the zoom settles (auto-promote/revert Esri).
    this.map.on('zoomend', () => this.applyImagery());
    this.bindClicks();
    this.bindKeys();
    this.startPlaybackLoop();

    // Resolve initial view from URL params.
    const req = this.parseParams(params);
    this.controls.set({
      location: req.location ?? DEFAULT_LOCATION,
      radiusMeters: req.radius,
      unit: req.unit,
      start_date: req.start_date,
      end_date: req.end_date,
    });
    autoplayFromParams(params) && (this.autoplay = true);
    await this.load(req);
    if (this.autoplay) this.setPlaying(true);
  }

  parseParams(params) {
    const num = (k) => {
      const v = parseFloat(params.get(k));
      return Number.isNaN(v) ? undefined : v;
    };
    let location = params.get('location') ?? params.get('city') ?? undefined;
    if (location) location = location.replace(/\+/g, ' ');
    const unit = params.get('unit') === 'km' ? 1 : params.get('unit') ? KM_TO_MILES : 1;
    let radius = num('radius');
    if (radius != null && params.get('unit')) radius *= params.get('unit') === 'km' ? 1 : KM_TO_MILES;
    return {
      location,
      longitude: num('longitude'),
      latitude: num('latitude'),
      radius: radius ?? DEFAULT_RADIUS,
      unit,
      distance: num('distance') ?? DEFAULT_DISTANCE,
      start_date: clampDate(params.get('start_date')) ?? DEFAULT_START_DATE,
      end_date: clampDate(params.get('end_date')) ?? DEFAULT_END_DATE,
    };
  }

  resolveCenter({ location, longitude, latitude }) {
    if (location) {
      const l = this.landmarks.find((x) => x.name === location);
      if (l) return { lon: l.lon, lat: l.lat, name: location };
    }
    if (longitude != null && latitude != null) {
      return { lon: longitude, lat: latitude, name: `${longitude.toFixed(2)}, ${latitude.toFixed(2)}` };
    }
    return { lon: DEFAULT_LONGITUDE, lat: DEFAULT_LATITUDE, name: DEFAULT_LOCATION };
  }

  rangeKey(name) {
    return `${this.range.start}|${this.range.end}|${this.range.radius}|${name}`;
  }

  async load(req) {
    // Cancel any in-flight load.
    this.controller?.abort();
    this.controller = new AbortController();
    const signal = this.controller.signal;

    const startMs = Date.parse(req.start_date);
    const endMs = Date.parse(req.end_date);
    const center = this.resolveCenter(req);

    const rangeChanged =
      this.range.start !== req.start_date ||
      this.range.end !== req.end_date ||
      this.range.radius !== req.radius;

    if (rangeChanged) {
      // Reset everything tied to the range.
      this.visible.clear();
      this.cache.clear();
      this.aggregate = null;
      this.range = { start: req.start_date, end: req.end_date, radius: req.radius };
      this.frames = selectFrames(await fetchText(BINARY_INDEX, signal), startMs, endMs);
      this.nFrames = this.frames.length;
      this.current = Math.min(this.current, Math.max(0, this.nFrames - 1));
    }

    // First framing sets zoom from ?distance=; afterwards just pan (keep zoom).
    if (this.framed) {
      panTo(this.map, { lon: center.lon, lat: center.lat });
    } else {
      focusOn(this.map, { lon: center.lon, lat: center.lat, distance: req.distance });
      this.framed = true;
    }

    // Load aggregate (city-average) base layer once per range.
    if (!this.aggregate) {
      this.timeline.setStatus({ text: 'Loading overview', percent: 0 });
      this.aggregate = await loadSeries({
        index: this.aggregateIndex, basePath: BINARY_AGGREGATE_DATA_PATH,
        frames: this.frames, center, radius: 0, tolerant: true, signal,
        onProgress: (d, t) => this.timeline.setStatus({ text: 'Loading overview', percent: Math.round((100 * d) / t) }),
      });
    }

    // Load (or reuse) the detailed series for this location.
    const key = this.rangeKey(center.name);
    let series = this.cache.get(key);
    if (!series) {
      this.timeline.setStatus({ text: center.name, percent: 0 });
      series = await loadSeries({
        index: this.sensorIndex, basePath: BINARY_DATA_PATH,
        frames: this.frames, center, radius: req.radius, signal,
        onProgress: (d, t) => this.timeline.setStatus({ text: center.name, percent: Math.round((100 * d) / t) }),
      });
      this.cache.set(key, series);
    }

    this.visible.set(center.name, series);
    this.primary = center.name;
    this.timeline.setStatus(null);
    this.timeline.setData(series.hours);
    this.timeline.setInfo(series.sensors.length);
    updateLabels(this.map, this.landmarks, center.name, this.visible);
    this.setCurrent(Math.min(this.current, this.nFrames - 1));
    this.scheduleBake();
  }

  // Sample terrain elevation under every visible/aggregate sensor and bake it as
  // the column base (d.z), so bars sit on the 3D surface. Deferred so terrain
  // tiles have loaded; re-runs on the latest data only.
  scheduleBake() {
    clearTimeout(this.bakeTimer);
    this.bakeTimer = setTimeout(() => {
      const bake = (sensors) => {
        for (const s of sensors) {
          const e = this.map.queryTerrainElevation([s.lon, s.lat]);
          // queryTerrainElevation returns raw metres; multiply by exaggeration
          // to match the rendered terrain height.
          s.z = (e ?? 0) * TERRAIN_EXAGGERATION;
        }
      };
      if (this.aggregate) bake(this.aggregate.sensors);
      for (const series of this.visible.values()) bake(series.sensors);
      this.posVersion++;
      this.buildLayers();
    }, 1400);
  }

  // Decide the displayed imagery from the user's preference + current zoom.
  // Only Sentinel-2 auto-promotes to Esri when zoomed in; Esri/MapTiler stay put.
  applyImagery() {
    let target = this.imageryPref;
    if (this.imageryPref === 's2cloudless') {
      const z = this.map.getZoom();
      // Hysteresis: promote above the threshold, only revert once clearly below.
      if (this.imageryDisplayed === 'esri') {
        if (z < AUTO_ESRI_ZOOM - AUTO_ESRI_HYSTERESIS) target = 's2cloudless';
        else target = 'esri';
      } else {
        target = z >= AUTO_ESRI_ZOOM ? 'esri' : 's2cloudless';
      }
    }
    if (target !== this.imageryDisplayed) {
      setImagery(this.map, target);
      this.imageryDisplayed = target;
    }
  }

  buildLayers() {
    const layers = [];
    if (this.aggregate) {
      layers.push(columnLayer({
        id: 'aggregate', sensors: this.aggregate.sensors, hour: this.current,
        // Aggregates are wide and fairly solid so they read as the summary layer.
        radius: 700, opacity: this.visible.size ? 0.35 : 0.7, pickable: false,
        posVersion: this.posVersion,
      }));
    }
    for (const [name, series] of this.visible) {
      layers.push(columnLayer({
        id: `loc:${name}`, sensors: series.sensors, hour: this.current,
        // Individual sensors are thin and semi-transparent to distinguish them
        // from the fat aggregate columns.
        radius: 55, opacity: 0.6, pickable: true, location: name,
        posVersion: this.posVersion,
      }));
    }
    this.overlay.setProps({ layers, onClick: (info) => this.handleClick(info) });
  }

  setCurrent(i) {
    if (this.nFrames) i = ((i % this.nFrames) + this.nFrames) % this.nFrames;
    this.current = i;
    this.buildLayers();
    this.timeline.setCurrent(i);
  }

  setPlaying(p) {
    this.playing = p;
    this.timeline.setPlaying(p);
  }

  startPlaybackLoop() {
    let last = performance.now();
    const tick = (now) => {
      if (this.playing && this.nFrames && now - last > this.speedMs) {
        this.setCurrent(this.current + 1);
        last = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  onSubmit(p) {
    const req = {
      location: p.location,
      longitude: undefined,
      latitude: undefined,
      radius: p.radius ?? DEFAULT_RADIUS,
      unit: p.unit,
      distance: DEFAULT_DISTANCE,
      start_date: clampDate(p.start_date) ?? this.range.start ?? DEFAULT_START_DATE,
      end_date: clampDate(p.end_date) ?? this.range.end ?? DEFAULT_END_DATE,
    };
    this.load(req);
  }

  toggleCity(name) {
    if (this.visible.has(name)) {
      this.visible.delete(name);
      if (this.primary === name) this.primary = [...this.visible.keys()].pop() ?? null;
      this.timeline.setData((this.primary && this.visible.get(this.primary)?.hours) || this.aggregate?.hours || []);
      updateLabels(this.map, this.landmarks, this.primary, this.visible);
      this.setCurrent(this.current);
      return;
    }
    this.load({
      location: name, radius: this.range.radius ?? DEFAULT_RADIUS, unit: 1,
      distance: DEFAULT_DISTANCE, start_date: this.range.start, end_date: this.range.end,
    });
  }

  hideAll() {
    if (!this.visible.size) return;
    this.visible.clear();
    this.primary = null;
    this.hint.hidden = true;
    this.timeline.setData(this.aggregate?.hours || []);
    updateLabels(this.map, this.landmarks, null, this.visible);
    this.setCurrent(this.current);
  }

  handleClick(info) {
    if (info?.object) {
      this.showSensorInfo(info.object, info.layer?.props?._location);
      return;
    }
    // No column picked — was it a city label?
    if (info?.x != null) {
      const feats = this.map.queryRenderedFeatures([info.x, info.y], { layers: [LABELS_LAYER] });
      if (feats.length) {
        this.toggleCity(feats[0].properties.name);
        return;
      }
    }
    this.hideAll();
  }

  showSensorInfo(sensor, location) {
    const aqi = sensor.aqi[this.current];
    this.hint.hidden = false;
    this.hint.innerHTML =
      `<strong>${location ?? 'Sensor'} #${sensor.id}</strong><br>` +
      `AQI ${Number.isNaN(aqi) ? '—' : Math.round(aqi)}<br>` +
      `lon ${sensor.lon.toFixed(4)}, lat ${sensor.lat.toFixed(4)}`;
  }

  bindClicks() {
    // Change cursor over labels for affordance.
    this.map.on('mouseenter', LABELS_LAYER, () => (this.map.getCanvas().style.cursor = 'pointer'));
    this.map.on('mouseleave', LABELS_LAYER, () => (this.map.getCanvas().style.cursor = ''));
  }

  bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      switch (e.key) {
        case ' ': case 'p': e.preventDefault(); this.setPlaying(!this.playing); break;
        case 'r': this.setCurrent(0); break;
        case ']': case '.': case 'm': this.setCurrent(this.current + 1); break;
        case '[': case ',': case 'n': this.setCurrent(this.current - 1); break;
        case '}': case '>': case 'M': this.setCurrent(this.current + 10); break;
        case '{': case '<': case 'N': this.setCurrent(this.current - 10); break;
        case 'x': this.speedMs = Math.max(16, this.speedMs / UPDATE_MULTIPLIER); break;
        case 'X': this.speedMs *= UPDATE_MULTIPLIER; break;
        case 'o': case 'Enter': toggleOrbit(this.map); break;
        case 'f': this.focusPrimary(); break;
        case 'l': this.toggleLabels(); break;
        case 'g': this.timeline.toggleGraph(); break;
        case 'Escape': this.controller?.abort(); stopOrbit(); break;
        case 'h': this.hint.hidden = !this.hint.hidden; break;
      }
    });
  }

  toggleLabels() {
    this.showLabels = !this.showLabels;
    if (this.map.getLayer(LABELS_LAYER)) {
      this.map.setLayoutProperty(LABELS_LAYER, 'visibility', this.showLabels ? 'visible' : 'none');
    }
  }

  // 'f' — recenter on the active location (keeps the user's current zoom).
  focusPrimary() {
    const name = this.primary;
    const l = name && this.landmarks.find((x) => x.name === name);
    if (l) panTo(this.map, { lon: l.lon, lat: l.lat });
  }
}

function clampDate(s) {
  if (!s) return undefined;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return undefined;
  if (t < Date.parse(DATASET_START_DATE) || t > Date.parse(DATASET_END_DATE)) return undefined;
  return s;
}

function autoplayFromParams(params) {
  const p = params.get('play');
  return p != null && p !== 'false' ? true : AUTOPLAY;
}

new App().init().catch((err) => {
  if (err.name !== 'AbortError') console.error(err);
});
