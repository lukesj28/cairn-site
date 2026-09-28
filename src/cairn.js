import { STONES } from './cairn-stones.js';

const SRC_W = 1920;
const LABELS = ['Top stone', 'Second stone', 'Third stone', 'Bottom stone'];
const SHOW = { color: 0.62, screen: 0.08 };
const HIDE = { color: 0.3, screen: 0.07 };
const LINE = 1.75;
const ON = 0.06;
const OFF = 0.14;

function box(points) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    x0 = Math.min(x0, points[i]);
    x1 = Math.max(x1, points[i]);
    y0 = Math.min(y0, points[i + 1]);
    y1 = Math.max(y1, points[i + 1]);
  }
  return { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1) - Math.floor(x0), h: Math.ceil(y1) - Math.floor(y0) };
}

function path(points, ox = 0, oy = 0, s = 1) {
  let d = '';
  for (let i = 0; i < points.length; i += 2) {
    d += `${i ? 'L' : 'M'}${((points[i] - ox) * s).toFixed(1)} ${((points[i + 1] - oy) * s).toFixed(1)}`;
  }
  return d + 'Z';
}

export class Cairn {
  constructor(canvas, group, { reduceMotion }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.group = group;
    this.reduceMotion = reduceMotion;
    this.here = false;
    this.lit = -1;
    this.stones = STONES.map((s, i) => ({
      ...s,
      box: box(s.points),
      outline: new Path2D(path(s.points)),
      level: 0,
      button: this.#button(i),
    }));
    const all = this.stones.map((s) => s.box);
    const x = Math.min(...all.map((b) => b.x));
    const y = Math.min(...all.map((b) => b.y));
    this.area = {
      x,
      y,
      w: Math.max(...all.map((b) => b.x + b.w)) - x,
      h: Math.max(...all.map((b) => b.y + b.h)) - y,
    };
    this.key = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    this.key.canvas.width = this.area.w;
    this.key.canvas.height = this.area.h;
    this.wash = document.createElement('canvas').getContext('2d');
    this.wash.canvas.width = this.area.w;
    this.wash.canvas.height = this.area.h;
    this.keyed = null;
    this.cover = { x: 0, y: 0, w: 0, h: 0 };
    this.dpr = 1;
    this.yellow = getComputedStyle(document.documentElement).getPropertyValue('--flower').trim() || '#f4d31f';
    this.touch = false;

    group.addEventListener('pointerdown', (e) => (this.touch = e.pointerType !== 'mouse'));
    addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' && !group.contains(e.target)) this.#light(-1);
    });
  }

  #button(i) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'stone';
    b.setAttribute('aria-label', LABELS[i]);
    b.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && this.#light(i));
    b.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && this.lit === i && this.#light(-1));
    b.addEventListener('focus', () => b.matches(':focus-visible') && this.#light(i));
    b.addEventListener('blur', () => this.lit === i && !b.matches(':hover') && this.#light(-1));
    b.addEventListener('click', () => {
      if (this.touch) this.#light(i);
      this.group.dispatchEvent(
        new CustomEvent('stone', { bubbles: true, detail: { index: i, name: STONES[i].name } }),
      );
    });
    this.group.prepend(b);
    return b;
  }

  #light(i) {
    this.lit = this.here ? i : -1;
  }

  enter() {
    this.here = true;
    this.group.inert = false;
    this.group.classList.add('is-here');
    const over = this.stones.findIndex((s) => s.button.matches(':hover'));
    if (over >= 0) this.#light(over);
  }

  leave() {
    this.here = false;
    this.lit = -1;
    this.group.inert = true;
    this.group.classList.remove('is-here');
  }

  layout(vw, vh, cover, dpr) {
    this.cover = cover;
    this.dpr = dpr;
    this.canvas.width = Math.round(vw * dpr);
    this.canvas.height = Math.round(vh * dpr);
    const s = cover.w / SRC_W;
    for (const st of this.stones) {
      const { x, y, w, h } = st.box;
      const b = st.button.style;
      b.left = `${(cover.x + x * s).toFixed(2)}px`;
      b.top = `${(cover.y + y * s).toFixed(2)}px`;
      b.width = `${(w * s).toFixed(2)}px`;
      b.height = `${(h * s).toFixed(2)}px`;
      b.clipPath = `path('${path(st.points, x, y, s)}')`;
    }
    this.dirty = true;
  }

  paint(v, dt) {
    let any = false;
    let moved = this.dirty;
    for (let i = 0; i < this.stones.length; i++) {
      const st = this.stones[i];
      const to = i === this.lit ? 1 : 0;
      const was = st.level;
      if (this.reduceMotion.matches) st.level = to;
      else st.level += (to - st.level) * (1 - Math.exp(-dt / (to ? ON : OFF)));
      if (Math.abs(to - st.level) < 0.002) st.level = to;
      if (st.level !== was) moved = true;
      if (st.level > 0) any = true;
    }
    const fresh = any && this.#keyFrom(v);
    if (!moved && !fresh) return;
    this.dirty = false;

    const { ctx, canvas, cover, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!any) return;
    const s = (cover.w / SRC_W) * dpr;
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const st = this.stones[i];
      if (st.level > 0) this.#paintStone(i, st.level, s);
    }
  }

  #keyFrom(v) {
    if (!v || v.readyState < 2 || v.seeking) return false;
    if (this.keyed?.v === v && this.keyed.t === v.currentTime) return false;
    const k = v.videoWidth / SRC_W;
    const { x, y, w, h } = this.area;
    const key = this.key;
    key.globalCompositeOperation = 'copy';
    key.drawImage(v, x * k, y * k, w * k, h * k, 0, 0, w, h);
    const img = key.getImageData(0, 0, w, h);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      const b = px[i + 2];
      const on = b > px[i + 1] + 8 && b > px[i] + 8;
      px[i] = px[i + 1] = px[i + 2] = 255;
      px[i + 3] = on ? 255 : 0;
    }
    key.putImageData(img, 0, 0);
    this.keyed = { v, t: v.currentTime };
    return true;
  }

  #paintStone(i, level, s) {
    const { ctx, cover, dpr, area, yellow } = this;
    const st = this.stones[i];
    const toScreen = () => ctx.setTransform(s, 0, 0, s, cover.x * dpr, cover.y * dpr);

    const wash = this.wash;
    wash.globalCompositeOperation = 'copy';
    wash.drawImage(this.key.canvas, 0, 0);
    wash.globalCompositeOperation = 'source-in';
    wash.fillStyle = yellow;
    wash.fillRect(0, 0, area.w, area.h);
    wash.globalCompositeOperation = 'destination-out';
    wash.setTransform(1, 0, 0, 1, -area.x, -area.y);
    for (let j = 0; j < i; j++) wash.fill(this.stones[j].outline);
    wash.setTransform(1, 0, 0, 1, 0, 0);

    const layer = (draw, { color, screen }) => {
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = color * level;
      draw();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = screen * level;
      draw();
    };
    toScreen();
    ctx.save();
    ctx.clip(st.outline);
    ctx.fillStyle = yellow;
    layer(() => ctx.fill(st.outline), HIDE);
    const top = { color: 1 - (1 - SHOW.color) / (1 - HIDE.color), screen: 1 - (1 - SHOW.screen) / (1 - HIDE.screen) };
    layer(() => ctx.drawImage(wash.canvas, area.x, area.y), top);
    ctx.globalCompositeOperation = 'source-over';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const line = new Path2D();
    line.addPath(st.outline, new DOMMatrix([s, 0, 0, s, cover.x * dpr, cover.y * dpr]));
    ctx.globalAlpha = level;
    ctx.lineJoin = 'round';
    ctx.lineWidth = LINE * 2 * dpr;
    ctx.strokeStyle = yellow;
    ctx.stroke(line);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
