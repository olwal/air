/*
  deck.gl overlay: AQI columns rendered over the MapLibre terrain, interleaved
  so they occlude correctly against 3D terrain. Replaces the per-hour GeoJSON
  overlays from observations.js.

  A single `currentHour` index drives the height/color accessors; changing it and
  bumping updateTriggers re-renders on the GPU without rebuilding data.
*/

import { MapboxOverlay } from '@deck.gl/mapbox';
import { ColumnLayer } from '@deck.gl/layers';
import { aqiColor, aqiHeight } from './aqi.js';

export function createOverlay() {
  return new MapboxOverlay({ interleaved: true, layers: [] });
}

/**
 * @param {object} opts
 * @param {string} opts.id            unique layer id
 * @param {{id,lon,lat,aqi:Float32Array}[]} opts.sensors
 * @param {number} opts.hour          current frame index
 * @param {number} [opts.radius]      column radius in meters
 * @param {number} [opts.opacity]     0..1
 * @param {boolean} [opts.pickable]
 * @param {string} [opts.location]    location name attached to picked objects
 */
export function columnLayer({
  id,
  sensors,
  hour,
  radius = 120,
  opacity = 0.85,
  pickable = false,
  location,
  posVersion = 0,
}) {
  const alpha = Math.round(opacity * 255);
  return new ColumnLayer({
    id,
    data: sensors,
    diskResolution: 12,
    radius,
    extruded: true,
    pickable,
    // Attach the location so main.js can route clicks (replaces name#id encoding).
    _location: location,
    // d.z (terrain elevation, baked in main.js) sets the column base so bars sit
    // on the 3D surface instead of at sea level (where hills would bury them).
    getPosition: (d) => [d.lon, d.lat, d.z || 0],
    getElevation: (d) => {
      const v = d.aqi[hour];
      return Number.isNaN(v) ? 0 : aqiHeight(v);
    },
    getFillColor: (d) => {
      const v = d.aqi[hour];
      if (Number.isNaN(v)) return [0, 0, 0, 0]; // hide missing readings
      const [r, g, b] = aqiColor(v);
      return [r, g, b, alpha];
    },
    updateTriggers: {
      getPosition: posVersion,
      getElevation: hour,
      getFillColor: [hour, alpha],
    },
    parameters: { depthTest: true },
  });
}
