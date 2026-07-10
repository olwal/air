# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A client-side web app that visualizes Bay Area air quality (PM2.5 → AQI) as animated 3D overlays on a satellite terrain map. It plays back hourly sensor data for 2020 (the year of the Bay Area fires). There is **no build step and no backend** — it's static HTML + vanilla JS loaded directly by the browser, deployed via GitHub Pages at `https://olwal.github.io/air/3d/`.

The 3D globe/terrain is rendered by [procedural-gl.js](https://github.com/felixpalmer/procedural-gl-js) (WebGL); all application logic, the 2D HUD/timeline, and data loading run on [p5.js](https://p5js.org/).

## Running & developing

- **Run locally:** serve the repo root over HTTP (e.g. `python -m http.server` then open `/index.htm`). Opening the file directly with `file://` will fail because the app fetches CSV/binary data via XHR.
- **No build, no lint, no tests, no package manager.** Edit the JS/HTML and reload the browser. There is nothing to compile.
- **The data is preprocessed offline.** The README notes data files were prepared with Python + Jupyter, but those preprocessing scripts are **not in this repo** — only the resulting `data/` artifacts are committed.

## Entry point and load order

`index.htm` is the page. It pulls p5.js and procedural-gl from CDNs, then loads local scripts **in this order (order matters — everything is global, no modules):**

1. `js/config.js` — all global constants/config (API keys, paths, dataset list, camera/environment presets)
2. `js/geo3d.js` — initializes the `Procedural` 3D map singleton and its data sources
3. `js/p5_extra.js` — adds `p5.prototype.loadArrayBuffer` for fetching binary data
4. `js/airquality.js` — `AirQuality` class (PM2.5→AQI math + AQI→color)
5. `js/features.js` — `Features` class (builds GeoJSON `FeatureCollection`s for city labels)
6. `js/observations.js` — `Observations` class (loads one binary frame → GeoJSON overlay)
7. `js/observations_remote.js` — `ObservationsRemote` class (live PurpleAir fetch mode)
8. `js/application.js` — **the actual application** (p5 `preload`/`setup`/`draw`, all interaction)

> `js/air-2d.js` is **not loaded** by `index.htm`. It's a superseded standalone variant (references a nonexistent `Air` class and `Features.buildFromData`). Ignore it unless explicitly asked; `application.js` is the live code.

## Two modes

`application.js` branches on the `realtime` URL param at every p5 lifecycle hook (`preload`/`setup`/`draw` each dispatch to a `*Live` or `*TimeSeries` variant):

- **Time-series mode (default):** plays back committed binary data from `data/binary/`. This is what the deployed demos use.
- **Live mode (`?realtime=<seconds>`, min 60):** polls `https://www.purpleair.com/json` per sensor via `ObservationsRemote`. Note this endpoint/format is legacy and may no longer work.

## Data pipeline & formats

The core loop: pick a location+radius+date range → load the relevant binary frames → decode to per-sensor AQI → generate GeoJSON → hand to `Procedural.addOverlay()`.

- **Sensor index** (`data/sensors/*.csv`): `id,longitude,latitude`. Maps a sensor id to a location. `Observations.getLocation(id)` looks up coordinates here; sensor ids missing from the index are dropped.
- **Binary frames** (`data/binary/<dataset>/YYYY-MM-DD_HH.bin`): one file per hour (8784 files = full year). Each is a flat `Uint16Array` of `[id, aqi, id, aqi, ...]` pairs. `65535` is the sentinel for missing/NaN. `data/binary/<dataset>/index.txt` lists the filenames. Datasets: `bay_area`, `california` (see `DATASETS` in config for the full expected list).
- **Aggregate frames** (`data/binary_averages/<dataset>/`): same format, city-level averages, shown as the low-detail base layer when no specific city is selected. Uses a separate index CSV (`SENSOR_INDEX_AGGREGATE_FILE`) keyed by a synthetic city id.
- **Landmarks** (`data/landmarks/*.csv`): `name,latitude,longitude,show` — city labels. `show=0` hides by default.

**AQI encoding** (`AirQuality`): `getAqiFromPm25` applies the EPA piecewise-linear breakpoints; `getColor(aqi)` interpolates the green→yellow→orange→red→purple ramp (clamped 0–300). Overlay bar height scales with `aqi^1.5`.

## Overlay / selection model (the tricky part)

Overlays are added/removed on the `Procedural` map by **name** (`Procedural.addOverlay(json)` / `removeOverlay(name)`). Feature `id`s encode intent so the single `onFeatureClicked` handler can route clicks:

- Sensor features: id = `<name>#<sensorId>` (e.g. `San Francisco#1168`) — the `#` suffix lets an individual sensor be toggled the same way as its city.
- Aggregate features use the prefix `%` (`AVERAGE_NAME`); live sensors use `$` (`SENSORS_NAME`).
- Landmark/city clicks are non-numeric ids.

State lives in module-level globals in `application.js`, chiefly:
- `observations` — array of `Observations` frames currently driving playback (the active/detailed layer)
- `observationsAggregate` — the city-average frames (base layer)
- `observationsCache` — `{ locationName: framesArray }`, so re-selecting a city is instant
- `observationsVisible` — names of currently-shown detailed layers; clicking a shown city hides it, clicking empty space hides all

`current` is the frame index (hour) shared across all visible layers; `setObservations(index)` re-applies that index to every visible cached layer plus the aggregate so **any timeline change propagates to all visible observations at once**. `changeObservation(delta)` advances during playback.

## Conventions & gotchas

- **Static class methods, not instance state, and no ES6 static fields.** `AirQuality`/`Features` are all `static`. `Observations`/`ObservationsRemote` deliberately duplicate constants as instance fields (e.g. `MONTHS`, column names) because Safari at the time didn't support static class fields — keep that pattern rather than "cleaning it up."
- **`self` is used as a global alias for the active `air` object** (set via `self = air`) so p5 async callbacks can reach it. This shadows the browser `window.self`; it's intentional here.
- **Loading is interruptible and staggered.** Frames load via cascaded `setTimeout`s (large date ranges = thousands of files); `ESC` sets `cancelLoading` on every `Observations` to bail mid-load.
- **API keys are committed in `config.js`** (`API_KEY_ELEVATION`, `API_KEY_MAP_TILER`) — this is an existing public client-side app, so they're already exposed. Don't treat finding them as a new secret leak.
- **The GL div height (73%) is duplicated** in `index.htm` CSS and `config.js` (`CONFIG_GEO_HEIGHT`/`CONFIG_GEO_HEIGHT = 0.73`) — changing one requires changing the other.
- **Behavior is configured almost entirely via URL parameters** (`location`, `longitude`/`latitude`, `radius`, `distance`, `unit`, `start_date`, `end_date`, `dataset`, `landmarks`, `play`, `realtime`). See README's URL-parameters table for the authoritative list, ranges, and defaults. Dates are constrained to `2020-01-01 .. 2021-01-01`.
- **Keyboard/mouse interaction** is handled in `application.js` `keyPressed`/`mousePressed`/`mouseDragged`/`mouseWheel`. The timeline graph occupies the top p5 canvas strip; clicks/drags in its lower half scrub time, clicks on the 3D map below select features. See README for the full key map.
