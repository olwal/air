/*
  MapLibre GL JS base map: satellite imagery + 3D terrain + sky, plus a
  GeoJSON symbol layer for city labels. Replaces geo3d.js / procedural-gl.
*/

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  IMAGERY_SOURCES, DEFAULT_IMAGERY, TERRAIN, TERRAIN_EXAGGERATION, INITIAL_VIEW,
} from './config.js';

export const LABELS_SOURCE = 'city-labels';
export const LABELS_LAYER = 'city-labels-symbols';
const SAT_SOURCE = 'satellite';
const SAT_LAYER = 'satellite';

export function createMap(container, imageryId = DEFAULT_IMAGERY) {
  const img = IMAGERY_SOURCES[imageryId] || IMAGERY_SOURCES[DEFAULT_IMAGERY];
  const map = new maplibregl.Map({
    container,
    // Keep world copies off so terrain/tiles behave near the antimeridian.
    renderWorldCopies: false,
    maxPitch: 85,
    center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
    zoom: INITIAL_VIEW.zoom,
    pitch: INITIAL_VIEW.pitch,
    bearing: INITIAL_VIEW.bearing,
    attributionControl: { compact: true },
    style: {
      version: 8,
      glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      sources: {
        [SAT_SOURCE]: {
          type: 'raster',
          tiles: img.tiles,
          tileSize: img.tileSize,
          maxzoom: img.maxzoom,
          attribution: img.attribution,
        },
        terrain: {
          type: 'raster-dem',
          tiles: TERRAIN.tiles,
          encoding: TERRAIN.encoding,
          tileSize: TERRAIN.tileSize,
          maxzoom: TERRAIN.maxzoom,
          attribution: TERRAIN.attribution,
        },
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#222222' } },
        { id: SAT_LAYER, type: 'raster', source: SAT_SOURCE, paint: { 'raster-opacity': 1 } },
      ],
      terrain: { source: 'terrain', exaggeration: TERRAIN_EXAGGERATION },
      sky: {
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 8, 0],
      },
    },
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), 'bottom-right');
  return map;
}

// Swap the satellite imagery source at runtime. tileSize/maxzoom differ per
// source, so we remove and re-add the source + layer, reinserting it just above
// the background so labels and deck columns stay on top.
export function setImagery(map, imageryId) {
  const img = IMAGERY_SOURCES[imageryId];
  if (!img) return false;
  if (map.getLayer(SAT_LAYER)) map.removeLayer(SAT_LAYER);
  if (map.getSource(SAT_SOURCE)) map.removeSource(SAT_SOURCE);
  map.addSource(SAT_SOURCE, {
    type: 'raster',
    tiles: img.tiles,
    tileSize: img.tileSize,
    maxzoom: img.maxzoom,
    attribution: img.attribution,
  });
  const beforeId = map.getStyle().layers.find((l) => l.id !== 'bg')?.id;
  map.addLayer(
    { id: SAT_LAYER, type: 'raster', source: SAT_SOURCE, paint: { 'raster-opacity': 1 } },
    beforeId,
  );
  return true;
}

// Build a GeoJSON FeatureCollection for city labels. `selected` highlights one.
function labelsGeoJson(landmarks, selected, visible) {
  return {
    type: 'FeatureCollection',
    features: landmarks
      .filter((l) => l.show !== 0 || l.name === selected || visible.has(l.name))
      .map((l) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [l.lon, l.lat] },
        properties: {
          name: l.name,
          active: l.name === selected || visible.has(l.name) ? 1 : 0,
        },
      })),
  };
}

export function addLabels(map, landmarks, selected, visible) {
  const data = labelsGeoJson(landmarks, selected, visible);
  if (map.getSource(LABELS_SOURCE)) {
    map.getSource(LABELS_SOURCE).setData(data);
    return;
  }
  map.addSource(LABELS_SOURCE, { type: 'geojson', data });
  map.addLayer({
    id: LABELS_LAYER,
    type: 'symbol',
    source: LABELS_SOURCE,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 6, 11, 12, 18],
      'text-anchor': 'bottom',
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': ['case', ['==', ['get', 'active'], 1], '#ffffff', 'rgba(255,255,255,0.7)'],
      'text-halo-color': 'rgba(0,0,0,0.6)',
      'text-halo-width': 1.4,
    },
  });
}

export function updateLabels(map, landmarks, selected, visible) {
  const src = map.getSource(LABELS_SOURCE);
  if (src) src.setData(labelsGeoJson(landmarks, selected, visible));
}
