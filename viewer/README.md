# Air Quality Viewer (modern rewrite)

A rewrite of the Bay Area air-quality 4D visualization on a maintained stack:

- **[MapLibre GL JS](https://maplibre.org/)** — satellite imagery + 3D terrain + labels
- **[deck.gl](https://deck.gl/)** — GPU-rendered AQI columns, overlaid interleaved so
  they occlude correctly against the terrain
- **Vite** — dev server + build (ES modules, no global-script load order)

It replaces the original root app's abandoned `procedural-gl.js` engine while
**reusing the existing `data/` artifacts and the AQI math unchanged**. It covers the
historical time-series (2020 playback) visualization. (A prior real-time PurpleAir
mode is not included — see [Future work](../README.md#future-work) for why and what
reviving it would take.)

## Develop

```bash
cd viewer
npm install
npm run dev        # http://localhost:5173
```

The dev server serves the repo-root `data/` directory at `/data/*` via a small
plugin in `vite.config.js` — no copying or symlinking. Set `VITE_DATA_BASE` (see
`.env.example`) to point at hosted data instead.

```bash
npm run build      # -> dist/ (deploy alongside a /data directory on the same origin)
```

## URL parameters (compatible with the original)

`location`, `longitude`/`latitude`, `radius`, `distance`, `unit` (`km`|`miles`),
`start_date`, `end_date` (clamped to `2020-01-01`..`2021-01-01`), `play`.

Example: `/?location=Santa Cruz&start_date=2020-08-16&end_date=2020-09-23&radius=20000&unit=km`

## Keyboard

`space`/`p` play·pause · `r` rewind · `[` `]` step ±1 · `{` `}` step ±10 ·
`x`/`X` faster/slower · `o`/`Enter` orbit · `h` toggle info · `Esc` cancel load / stop orbit

## Layout (`src/`)

| file | role |
|---|---|
| `main.js` | orchestration: URL params, loading, playback, multi-city show/hide |
| `config.js` | constants, data paths, env-based keys, camera/terrain presets |
| `data.js` | CSV indexes + `.bin` frame decode → per-sensor hourly series |
| `aqi.js` | PM2.5→AQI breakpoints + color ramp (ported verbatim) |
| `map.js` | MapLibre style: satellite + `raster-dem` terrain + sky + label layer |
| `sensorLayer.js` | deck.gl `ColumnLayer` builder (height/color from AQI) |
| `timeline.js` | canvas HUD: average-AQI graph, scrub, play, date readout |
| `camera.js` | fly-to focus + orbit; `distance`→zoom mapping |
| `controls.js` | responsive location/radius/date panel |

## Data model

The whole selected range loads once into
`sensors = [{ id, lon, lat, aqi: Float32Array(nHours), z }]`. deck.gl accessors read
`aqi[currentHour]`; scrubbing/playback just changes `currentHour` and bumps
`updateTriggers`, so frames animate on the GPU without rebuilding geometry. `z` is
sampled from the terrain (`map.queryTerrainElevation`) so columns sit on the surface.

## Verify

```bash
npm run dev &                 # start server
node smoke.mjs                # headless Playwright: boots app, checks console/network,
                              # writes smoke.png
```

`smoke.mjs` needs Chromium: `npx playwright install chromium`.
Note: under headless software WebGL (SwiftShader) deck.gl may log a benign
"Could not compile fragment shader" — columns still render; this does not occur on
real GPUs.
