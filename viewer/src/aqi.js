/*
  Air Quality Index math and color mapping.
  Ported verbatim (logic-for-logic) from the original js/airquality.js —
  the EPA piecewise-linear PM2.5 -> AQI breakpoints and the green->purple ramp.
*/

// Color stops interpolated across AQI 0..300 (categories of 50).
const COLORS = [
  [104, 225, 67],
  [255, 255, 85],
  [239, 133, 51],
  [234, 51, 36],
  [140, 26, 76],
  [140, 26, 76],
  [115, 20, 37],
  [115, 20, 37],
];

function linear(aqiHigh, aqiLow, concHigh, concLow, concentration) {
  const conc = parseFloat(concentration);
  return Math.round(((conc - concLow) / (concHigh - concLow)) * (aqiHigh - aqiLow) + aqiLow);
}

// PM2.5 concentration (µg/m³) -> AQI, or undefined if out of range.
export function aqiFromPm25(concentration) {
  const c = Math.floor(10 * concentration) / 10;
  if (c >= 0 && c < 12.1) return linear(50, 0, 12, 0, c);
  if (c >= 12.1 && c < 35.5) return linear(100, 51, 35.4, 12.1, c);
  if (c >= 35.5 && c < 55.5) return linear(150, 101, 55.4, 35.5, c);
  if (c >= 55.5 && c < 150.5) return linear(200, 151, 150.4, 55.5, c);
  if (c >= 150.5 && c < 250.5) return linear(300, 201, 250.4, 150.5, c);
  if (c >= 250.5 && c < 350.5) return linear(400, 301, 350.4, 250.5, c);
  if (c >= 350.5 && c < 500.5) return linear(500, 401, 500.4, 350.5, c);
  return undefined;
}

// AQI -> [r, g, b], clamped to 0..300 and interpolated between stops.
export function aqiColor(aqi) {
  if (aqi < 0) aqi = 0;
  else if (aqi > 300) aqi = 300;

  const i = Math.floor(aqi / 50);
  const c0 = COLORS[i];
  const c1 = COLORS[i + 1];
  if (!c0 || !c1) return [0, 0, 0];

  const t = (aqi % 50) / 50.0;
  return [
    Math.round(c0[0] + (c1[0] - c0[0]) * t),
    Math.round(c0[1] + (c1[1] - c0[1]) * t),
    Math.round(c0[2] + (c1[2] - c0[2]) * t),
  ];
}

// Column height in meters for a given AQI (matches the original aqi^1.5 curve,
// scaled up for legibility at MapLibre map scale).
export function aqiHeight(aqi) {
  const base = 20 + (150 * Math.min(5000, Math.pow(Math.max(aqi, 0), 1.5))) / 5000;
  return base * 12; // exaggerate vs. the old overlay units so bars read on terrain
}
