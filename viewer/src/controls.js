/*
  Responsive control panel: populate the location dropdown from landmarks +
  fire complexes, sync form fields, and emit a normalized submit payload.
*/

import { EXTRA_LOCATIONS, KM_TO_MILES, IMAGERY_SOURCES } from './config.js';

export class Controls {
  constructor({ onSubmit, onImagery }) {
    this.form = document.getElementById('controls');
    this.locationSel = document.getElementById('location');
    this.radiusSel = document.getElementById('radius');
    this.unitSel = document.getElementById('unit');
    this.startInput = document.getElementById('start_date');
    this.endInput = document.getElementById('end_date');
    this.imagerySel = document.getElementById('imagery');
    this.toggle = document.getElementById('panel-toggle');

    this.toggle.addEventListener('click', () => this.form.classList.toggle('collapsed'));

    // Populate imagery options; disable key-gated sources without a key.
    for (const [id, src] of Object.entries(IMAGERY_SOURCES)) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = src.label + (src.requiresKey ? ' — unavailable' : '');
      opt.disabled = !!src.requiresKey;
      this.imagerySel.appendChild(opt);
    }
    // Changing imagery applies immediately (no Load needed).
    this.imagerySel.addEventListener('change', () => onImagery(this.imagerySel.value));

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const unit = parseFloat(this.unitSel.value) || 1;
      const radiusRaw = this.radiusSel.value ? parseFloat(this.radiusSel.value) : null;
      onSubmit({
        location: this.locationSel.value,
        // radius options are stored in meters already (3000..50000); unit only
        // affects the label, so meters pass straight through.
        radius: radiusRaw,
        unit,
        start_date: this.startInput.value,
        end_date: this.endInput.value,
      });
      if (window.matchMedia('(max-width: 640px)').matches) this.form.classList.add('collapsed');
    });

    // Start collapsed on small screens.
    if (window.matchMedia('(max-width: 640px)').matches) this.form.classList.add('collapsed');
  }

  // landmarks: [{name, show}] — show!=0 are user-selectable cities.
  populateLocations(landmarks) {
    const names = landmarks.filter((l) => l.show !== 0).map((l) => l.name);
    const all = [...names.sort(), ...EXTRA_LOCATIONS.map((l) => l.name)];
    this.locationSel.innerHTML = '';
    for (const name of all) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      this.locationSel.appendChild(opt);
    }
  }

  set({ location, radiusMeters, unit, start_date, end_date }) {
    if (location != null) this.locationSel.value = location;
    if (unit != null) this.unitSel.value = String(unit);
    if (radiusMeters != null) {
      const u = parseFloat(this.unitSel.value) || 1;
      // Snap to nearest available option in display units.
      const disp = Math.round(radiusMeters / (u === KM_TO_MILES ? 1000 * KM_TO_MILES : 1000));
      const match = [...this.radiusSel.options].find((o) => o.textContent === String(disp));
      this.radiusSel.value = match ? match.value : '';
    }
    if (start_date) this.startInput.value = start_date;
    if (end_date) this.endInput.value = end_date;
  }

  setImagery(id) {
    if ([...this.imagerySel.options].some((o) => o.value === id && !o.disabled)) {
      this.imagerySel.value = id;
    }
  }
}
