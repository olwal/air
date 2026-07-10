/*
  Configuration and defaults, ported from the original js/config.js.
  Values that were hard-coded there are kept; secrets/paths now come from
  Vite env (import.meta.env) with public defaults.
*/

// Base URL for the data/ directory. Dev: "/data" (served from repo root by
// vite.config.js). Prod: set VITE_DATA_BASE to wherever data/ is hosted.
export const DATA_BASE = (import.meta.env.VITE_DATA_BASE || '/data').replace(/\/$/, '');

// Data files (relative to DATA_BASE), matching the original layout.
export const SENSOR_INDEX_FILE = 'sensors/outside_sensors_bay_area.csv';
export const LANDMARKS_FILE = 'landmarks/california_cities_selected.csv';
export const SENSOR_INDEX_AGGREGATE_FILE = 'sensors/california_cities_selected_ids.csv';
export const BINARY_DATA_PATH = 'binary/bay_area/';
export const BINARY_AGGREGATE_DATA_PATH = 'binary_averages/bay_area_selected/';
export const BINARY_INDEX = BINARY_DATA_PATH + 'index.txt';
export const BINARY_AGGREGATE_INDEX = BINARY_AGGREGATE_DATA_PATH + 'index.txt';

export const DATASETS = ['bay_area', 'europe', 'eurasia', 'california', 'bay_area_selected'];
export const DATASET_PATH = 'binary/';

// Sentinel for missing/NaN AQI in the binary frames.
export const ERROR_VALUE = 65535;

// Dataset temporal bounds (inclusive clamp for URL date params).
export const DATASET_START_DATE = '2020-01-01';
export const DATASET_END_DATE = '2021-01-01';

// Defaults (San Francisco), ported.
export const DEFAULT_LONGITUDE = -122.44198789673219;
export const DEFAULT_LATITUDE = 37.7591527514897;
export const DEFAULT_LOCATION = 'San Francisco';
export const KM_TO_MILES = 1.609;
export const DEFAULT_RADIUS = Math.round(5000 * KM_TO_MILES); // 5 miles in m
export const DEFAULT_DISTANCE = 20000;

export const DEFAULT_START_DATE = '2020-09-08';
export const DEFAULT_END_DATE = '2020-09-10';

// Playback.
export const AUTOPLAY = false;
export const UPDATE_MS = 100; // inter-frame delay at 1x
export const UPDATE_MULTIPLIER = 1.2;

// Fire complexes are not in the landmarks CSV; the original added them at runtime.
export const EXTRA_LOCATIONS = [
  { name: 'LNU Lightning Complex Fires', longitude: -122.506, latitude: 38.549 },
  { name: 'CZU Lightning Complex Fires', longitude: -122.223, latitude: 37.262 },
  { name: 'SCU Lightning Complex Fires', longitude: -121.777, latitude: 37.882 },
];

// Imagery + terrain. Esri World Imagery (keyless) matches the original satellite
// look; AWS Terrarium DEM is a keyless global elevation source.
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';

// Switchable satellite imagery sources (see the imagery dropdown). Each is a
// self-contained raster source spec. `requiresKey` sources are only usable when
// the matching env key is set.
export const IMAGERY_SOURCES = {
  s2cloudless: {
    label: 'Sentinel-2 (seamless)',
    tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'],
    tileSize: 256,
    maxzoom: 14,
    attribution: 'Sentinel-2 cloudless 2020 by EOX IT Services GmbH',
  },
  esri: {
    label: 'Esri (high-res, seams)',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    tileSize: 256,
    maxzoom: 19,
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
  maptiler: {
    label: 'MapTiler (needs key)',
    tiles: [`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`],
    tileSize: 512,
    maxzoom: 20,
    attribution:
      '<a href="https://www.maptiler.com/copyright/">MapTiler</a> <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    requiresKey: !MAPTILER_KEY,
  },
};

// Seamless source by default (addresses the Esri mosaic patchwork).
export const DEFAULT_IMAGERY = 's2cloudless';

// When Sentinel-2 is the chosen source, auto-promote to Esri past this zoom
// (Sentinel-2 tops out ~z14 and softens); revert below it. Small hysteresis
// band avoids flapping right at the boundary.
export const AUTO_ESRI_ZOOM = 13;
export const AUTO_ESRI_HYSTERESIS = 0.4;

export const TERRAIN = {
  tiles: ['https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png'],
  encoding: 'terrarium',
  tileSize: 256,
  maxzoom: 15,
  attribution: 'Elevation: Mapzen / AWS Terrain Tiles',
};

export const TERRAIN_EXAGGERATION = 1.4;

// Initial camera (approx. of the original MAP_TARGET over SF).
export const INITIAL_VIEW = {
  longitude: DEFAULT_LONGITUDE,
  latitude: DEFAULT_LATITUDE,
  zoom: 10.5,
  pitch: 62,
  bearing: 20,
};
