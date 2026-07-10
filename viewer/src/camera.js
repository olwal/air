/*
  Camera helpers: focus/fly to a location and an orbit loop.
  Replaces Procedural.focusOnLocation / orbitTarget.
*/

// Rough conversion from the original "distance" (camera distance in meters) to a
// MapLibre zoom level, so existing ?distance= links land at a similar framing.
export function distanceToZoom(distanceM) {
  if (!distanceM || Number.isNaN(distanceM)) return 10.5;
  // Empirical: ~5km -> z12.2, ~20km -> z10.2, ~50km -> z8.9.
  const z = 24.5 - Math.log2(distanceM);
  return Math.max(8, Math.min(15, z));
}

// First framing of a session: set a sensible zoom from the ?distance= param.
export function focusOn(map, { lon, lat, distance, pitch = 62 }) {
  map.flyTo({
    center: [lon, lat],
    zoom: distanceToZoom(distance),
    pitch,
    // Preserve current bearing so it doesn't snap north on reload.
    bearing: map.getBearing(),
    duration: 1500,
    essential: true,
  });
}

// Subsequent navigation: pan to the new location but keep the user's current
// zoom / pitch / bearing (don't zoom out on every load or city expand).
export function panTo(map, { lon, lat }) {
  map.easeTo({ center: [lon, lat], duration: 1200, essential: true });
}

let orbitRaf = 0;
export function isOrbiting() {
  return orbitRaf !== 0;
}

export function toggleOrbit(map, degPerSec = 8) {
  if (orbitRaf) {
    cancelAnimationFrame(orbitRaf);
    orbitRaf = 0;
    return false;
  }
  let last = performance.now();
  const step = (now) => {
    const dt = (now - last) / 1000;
    last = now;
    map.setBearing(map.getBearing() + degPerSec * dt);
    orbitRaf = requestAnimationFrame(step);
  };
  orbitRaf = requestAnimationFrame(step);
  return true;
}

export function stopOrbit() {
  if (orbitRaf) {
    cancelAnimationFrame(orbitRaf);
    orbitRaf = 0;
  }
}
