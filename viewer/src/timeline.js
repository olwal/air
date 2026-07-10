/*
  Timeline HUD drawn on a 2D canvas, styled after the original hand-designed bar:

    [>]        2020  SEP 08  (clock)  AM                    Loaded
                                                          39 sensors
    o------- thin AQI gradient band across the bottom -----------
    SEP 08                                                  SEP 10

  Interaction: the bottom gradient band seeks; the top-left play glyph toggles.
*/

import { aqiColor } from './aqi.js';

const PLAY_ZONE = 44; // px, top-left play/pause hit area
const BAND_H = 14; // px, gradient band height at the bottom

export class Timeline {
  constructor(canvas, { onSeek, onTogglePlay }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSeek = onSeek;
    this.onTogglePlay = onTogglePlay;
    this.hours = [];
    this.current = 0;
    this.playing = false;
    this.status = null; // { text, percent } while loading
    this.sensorCount = null; // shown on the right once loaded
    this.showGraph = true;

    this._bind();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  _bind() {
    const c = this.canvas;
    let dragging = false;
    const bandTop = () => c.clientHeight - BAND_H - 6;
    const seek = (e) => {
      const rect = c.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      if (!this.hours.length) return;
      const t = Math.max(0, Math.min(1, x / rect.width));
      this.onSeek(Math.round(t * (this.hours.length - 1)));
    };
    c.addEventListener('pointerdown', (e) => {
      const rect = c.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < PLAY_ZONE && y < bandTop()) {
        this.onTogglePlay();
        return;
      }
      dragging = true;
      c.setPointerCapture(e.pointerId);
      seek(e);
    });
    c.addEventListener('pointermove', (e) => dragging && seek(e));
    c.addEventListener('pointerup', () => (dragging = false));
    c.addEventListener('pointercancel', () => (dragging = false));
    c.addEventListener(
      'wheel',
      (e) => {
        if (!this.hours.length) return;
        e.preventDefault();
        this.onSeek(
          Math.max(0, Math.min(this.hours.length - 1, this.current + Math.sign(e.deltaY))),
        );
      },
      { passive: false },
    );
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  setData(hours) { this.hours = hours || []; this.render(); }
  setCurrent(i) { this.current = i; this.render(); }
  setPlaying(p) { this.playing = p; this.render(); }
  setStatus(status) { this.status = status; this.render(); }
  setInfo(sensorCount) { this.sensorCount = sensorCount; this.render(); }
  toggleGraph() { this.showGraph = !this.showGraph; this.render(); }

  render() {
    const ctx = this.ctx;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    ctx.clearRect(0, 0, W, H);

    const bandTop = H - BAND_H - 6;
    const midY = bandTop / 2 + 2; // vertical centre of the text row

    this.drawPlay(22, midY);

    if (this.status) {
      // Loading: show the centred label + percent, skip the rest.
      ctx.fillStyle = '#fff';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const pct = this.status.percent != null ? `  ${this.status.percent}%` : '';
      ctx.fillText(`${this.status.text}${pct}`, W / 2, midY);
      if (this.showGraph && this.hours.length) this.drawBand(W, bandTop);
      return;
    }

    if (this.showGraph && this.hours.length) this.drawBand(W, bandTop);

    const oc = this.hours[this.current];
    if (oc) {
      this.drawCenter(W, midY, oc);
      this.drawRightInfo(W, midY);
      if (this.showGraph) this.drawEndLabels(W, H);
    }
  }

  drawPlay(cx, cy) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#f2f2f2';
    ctx.fillStyle = '#f2f2f2';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    if (this.playing) {
      ctx.fillRect(cx - 6, cy - 8, 4, 16);
      ctx.fillRect(cx + 2, cy - 8, 4, 16);
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 8);
      ctx.lineTo(cx + 8, cy);
      ctx.lineTo(cx - 6, cy + 8);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // "2020  SEP 08  (clock)  AM" as one centred, vertically-aligned row.
  drawCenter(W, midY, oc) {
    const ctx = this.ctx;
    const pm = oc.hour >= 12;
    const gap = 14;
    const r = 15;

    const yearFont = '300 18px Inter, sans-serif';
    const dateFont = '600 27px Inter, sans-serif';
    const amFont = '400 15px Inter, sans-serif';
    const yearStr = oc.year;
    const dateStr = `${oc.monthText} ${oc.day}`;
    const amStr = pm ? 'PM' : 'AM';

    ctx.font = yearFont; const yW = ctx.measureText(yearStr).width;
    ctx.font = dateFont; const dW = ctx.measureText(dateStr).width;
    ctx.font = amFont; const aW = ctx.measureText(amStr).width;

    const total = yW + gap + dW + gap + 2 * r + gap + aW;
    let x = W / 2 - total / 2;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    ctx.fillStyle = '#9a9a9a';
    ctx.font = yearFont;
    ctx.fillText(yearStr, x, midY + 1);
    x += yW + gap;

    ctx.fillStyle = '#ffffff';
    ctx.font = dateFont;
    ctx.fillText(dateStr, x, midY);
    x += dW + gap;

    this.drawClock(x + r, midY, r, oc.hour, 0);
    x += 2 * r + gap;

    ctx.fillStyle = '#9a9a9a';
    ctx.font = amFont;
    ctx.fillText(amStr, x, midY + 1);
  }

  drawRightInfo(W, midY) {
    if (this.sensorCount == null) return;
    const ctx = this.ctx;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#cfcfcf';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.fillText('Loaded', W - 12, midY - 8);
    ctx.fillStyle = '#9a9a9a';
    ctx.font = '400 12px Inter, sans-serif';
    const n = this.sensorCount;
    ctx.fillText(`${n} sensor${n === 1 ? '' : 's'}`, W - 12, midY + 8);
  }

  // Analog clock: dashed ring + thin hour/minute hands (vector, per the design).
  drawClock(cx, cy, r, hours, minutes) {
    const ctx = this.ctx;
    // Hour-of-day tint: brighter toward midday.
    const h = (hours + 20) % 24;
    const v = Math.sin((2 * Math.PI * h) / 24);
    const g = Math.round(v * 45 + 185);
    const color = `rgb(${g},${g},${g})`;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;

    // 12 radial ticks pointing orthogonally outward (no connecting ring).
    ctx.lineWidth = 1;
    ctx.lineCap = 'butt';
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(0.78 * r * cosA, 0.78 * r * sinA);
      ctx.lineTo(1.0 * r * cosA, 1.0 * r * sinA);
      ctx.stroke();
    }

    const ha = -2 * Math.PI * (((hours + minutes / 60) % 12) / 12) - Math.PI / 2;
    const ma = -2 * Math.PI * (minutes / 60) - Math.PI / 2;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-0.45 * r * Math.cos(ha), 0.45 * r * Math.sin(ha));
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-0.72 * r * Math.cos(ma), 0.72 * r * Math.sin(ma));
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 1.4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  // Thin AQI-average gradient band + cursor dot at the bottom.
  drawBand(W, bandTop) {
    const ctx = this.ctx;
    const n = this.hours.length;
    const bw = W / n;
    for (let i = 0; i < n; i++) {
      const [r, g, b] = aqiColor(this.hours[i].avg);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(i * bw, bandTop, Math.max(1, bw + 0.5), BAND_H);
    }
    // Subtle month boundary ticks (no text — end labels carry the dates).
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i < n; i++) {
      if (this.hours[i].day === '01' && this.hours[i].hour === 0) {
        const x = i * bw;
        ctx.beginPath();
        ctx.moveTo(x, bandTop);
        ctx.lineTo(x, bandTop + BAND_H);
        ctx.stroke();
      }
    }
    // Cursor: a hairline through the band with a color-matched circle offset
    // above it (matches the original design; circle color = current AQI value).
    const cx = (W * this.current) / Math.max(1, n - 1);
    const [cr, cg, cb] = aqiColor(this.hours[this.current]?.avg ?? 0);
    const circleY = bandTop - 10;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + 0.5, circleY);
    ctx.lineTo(cx + 0.5, bandTop + BAND_H);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, circleY, 5.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
    ctx.beginPath();
    ctx.arc(cx, circleY, 4, 0, 2 * Math.PI);
    ctx.fill();
  }

  drawEndLabels(W, H) {
    const ctx = this.ctx;
    const first = this.hours[0];
    const last = this.hours[this.hours.length - 1];
    if (!first || !last) return;
    ctx.fillStyle = '#8a8a8a';
    ctx.font = '10px Inter, sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText(`${first.monthText} ${first.day}`, 6, H - BAND_H - 8);
    ctx.textAlign = 'right';
    ctx.fillText(`${last.monthText} ${last.day}`, W - 6, H - BAND_H - 8);
  }
}
