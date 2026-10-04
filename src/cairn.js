import { STONES } from './cairn-stones.js';

const SRC_W = 1920;
const LABELS = ['Top stone', 'Second stone', 'Third stone', 'Bottom stone'];
const GLOW = { color: '#ffe3a0', reach: 150, bloom: 1, bloomBlur: 55, rim: 0.28, rimBlur: 40, rimWidth: 44, lift: 0.05, seamBlur: 16 };
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
    this.cover = { x: 0, y: 0, w: 0, h: 0 };
    this.dpr = 1;
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
    const sd = s * dpr;
    this.stones.forEach((st, i) => {
      const { x, y, w, h } = st.box;
      const b = st.button.style;
      b.left = `${(cover.x + x * s).toFixed(2)}px`;
      b.top = `${(cover.y + y * s).toFixed(2)}px`;
      b.width = `${(w * s).toFixed(2)}px`;
      b.height = `${(h * s).toFixed(2)}px`;
      b.clipPath = `path('${path(st.points, x, y, s)}')`;
      this.#sprite(st, i, sd);
    });
    this.dirty = true;
  }

  paint(dt) {
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
    if (!moved) return;
    this.dirty = false;

    const { ctx, canvas, cover, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!any) return;
    const s = (cover.w / SRC_W) * dpr;
    ctx.globalCompositeOperation = 'screen';
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const st = this.stones[i];
      if (st.level <= 0) continue;
      ctx.globalAlpha = st.level;
      ctx.drawImage(
        st.sprite,
        Math.round(cover.x * dpr + st.box.x * s - st.pad),
        Math.round(cover.y * dpr + st.box.y * s - st.pad),
      );
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  #sprite(st, i, sd) {
    const pad = Math.ceil(GLOW.reach * sd);
    const c = document.createElement('canvas');
    c.width = Math.ceil(st.box.w * sd) + pad * 2;
    c.height = Math.ceil(st.box.h * sd) + pad * 2;
    const g = c.getContext('2d');
    const away = c.width + 100;
    const mAway = new DOMMatrix([sd, 0, 0, sd, pad - st.box.x * sd - away, pad - st.box.y * sd]);
    const mInPlace = new DOMMatrix([sd, 0, 0, sd, pad - st.box.x * sd, pad - st.box.y * sd]);
    const shape = new Path2D();
    shape.addPath(st.outline, mAway);
    const inPlace = new Path2D();
    inPlace.addPath(st.outline, mInPlace);

    g.shadowColor = g.fillStyle = g.strokeStyle = GLOW.color;
    g.shadowOffsetX = away;
    g.lineJoin = 'round';

    g.save();
    const outside = new Path2D();
    outside.rect(0, 0, c.width, c.height);
    outside.addPath(inPlace);
    g.clip(outside, 'evenodd');
    g.globalAlpha = GLOW.bloom;
    g.shadowBlur = GLOW.bloomBlur * sd;
    g.fill(shape);
    g.restore();

    g.save();
    g.clip(inPlace);
    g.globalAlpha = GLOW.rim;
    g.shadowBlur = GLOW.rimBlur * sd;
    g.lineWidth = GLOW.rimWidth * sd;
    g.stroke(shape);
    g.shadowColor = 'transparent';
    g.globalAlpha = GLOW.lift;
    g.fill(inPlace);
    g.restore();
    g.shadowColor = '#000';
    g.shadowBlur = GLOW.seamBlur * sd;
    g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = 1;
    for (let j = 0; j < i; j++) {
      const cover = new Path2D();
      cover.addPath(this.stones[j].outline, mAway);
      g.fill(cover);
    }
    st.sprite = c;
    st.pad = pad;
  }
}
