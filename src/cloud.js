// Procedural cloud lettering: a word traced with hundreds of lit puffs,
// painted to match the cumulus in the footage (bright crowns, blue-grey bellies).

const TAU = Math.PI * 2;
const F = 300; // design font size; all puff geometry lives in this space

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// A lumpy puff, not a disc: several soft lobes merged, filled with a
// top-lit vertical ramp so every puff carries its own light.
function makeSprite(rand, top, bottom, lobes, core = 0.5) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const R = S / 2;

  const blob = (x, y, r, a) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(0,0,0,${a})`);
    if (core > 0) rg.addColorStop(core, `rgba(0,0,0,${a})`);
    rg.addColorStop(Math.min(1, core + (1 - core) * 0.55), `rgba(0,0,0,${a * 0.35})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  };

  blob(R, R, R * 0.78, 1);
  for (let i = 0; i < lobes; i++) {
    const a = rand() * TAU;
    const d = R * (0.2 + rand() * 0.32);
    blob(R + Math.cos(a) * d, R + Math.sin(a) * d * 0.85, R * (0.26 + rand() * 0.22), 0.9);
  }

  g.globalCompositeOperation = 'source-in';
  const lg = g.createLinearGradient(0, S * 0.15, 0, S * 0.92);
  lg.addColorStop(0, top);
  lg.addColorStop(0.42, top);
  lg.addColorStop(1, bottom);
  g.fillStyle = lg;
  g.fillRect(0, 0, S, S);
  return c;
}

function buildMask(text, family) {
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `700 ${F}px ${family}`;
  const m = probe.measureText(text);
  const pad = Math.round(F * 0.32);
  const asc = Math.ceil(m.actualBoundingBoxAscent);
  const desc = Math.ceil(m.actualBoundingBoxDescent);
  const w = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + pad * 2;
  const h = asc + desc + pad * 2;

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = probe.font;
  g.fillStyle = '#000';
  g.fillText(text, pad + m.actualBoundingBoxLeft, pad + asc);
  const data = g.getImageData(0, 0, w, h).data;

  const inside = new Uint8Array(w * h);
  let ink = 0, inkY = 0;
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] > 127) {
      inside[i] = 1;
      ink++;
      inkY += Math.floor(i / w);
    }
  }
  // vertical centre of the ink, so a lone i-dot doesn't pull the word off-centre
  const massY = ink ? inkY / ink : h / 2;
  return { w, h, inside, pad, asc, desc, massY };
}

// Two-pass chamfer distance to the nearest outside pixel.
function distanceInside({ w, h, inside }) {
  const INF = 1e6;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = inside[i] ? INF : 0;
  const D1 = 1, D2 = Math.SQRT2;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], d[i - 1] + D1, d[i - w] + D1, d[i - w - 1] + D2, d[i - w + 1] + D2);
    }
  }
  for (let y = h - 2; y > 0; y--) {
    for (let x = w - 2; x > 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(d[i], d[i + 1] + D1, d[i + w] + D1, d[i + w + 1] + D2, d[i + w - 1] + D2);
    }
  }
  return d;
}

function buildPuffs(mask, rand) {
  const { w, h, inside } = mask;
  const dist = distanceInside(mask);
  const puffs = [];
  const grid = new Map();
  const cell = F * 0.06;
  const key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  const fits = (x, y, r, k) => {
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    const reach = Math.ceil((r + F * 0.12) / cell);
    for (let gy = cy - reach; gy <= cy + reach; gy++) {
      for (let gx = cx - reach; gx <= cx + reach; gx++) {
        const list = grid.get(`${gx},${gy}`);
        if (!list) continue;
        for (const p of list) {
          if (Math.hypot(p.x - x, p.y - y) < (p.r + r) * k) return false;
        }
      }
    }
    return true;
  };
  const add = (p) => {
    puffs.push(p);
    const k = key(p.x, p.y);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(p);
  };

  // Body: variable-radius packing along each stroke's spine outward.
  const cand = [];
  for (let y = 2; y < h - 2; y += 3) {
    for (let x = 2; x < w - 2; x += 3) {
      const i = y * w + x;
      if (inside[i]) cand.push([x + rand() * 2, y + rand() * 2, dist[i]]);
    }
  }
  cand.sort((a, b) => b[2] - a[2]);
  for (const [x, y, dd] of cand) {
    const r = Math.max(F * 0.042, Math.min(F * 0.12, dd * (1.05 + rand() * 0.3)));
    if (fits(x, y, r, 0.58)) add({ x, y, r, kind: 0 });
  }

  // Billows: cauliflower crowns on edges that face the sky, tight bellies below.
  const edge = [];
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const i = y * w + x;
      if (!inside[i]) continue;
      if (inside[i - 1] && inside[i + 1] && inside[i - w] && inside[i + w]) continue;
      const up = !inside[i - w * 2];
      const down = !inside[i + w * 2];
      edge.push([x, y, up, down]);
    }
  }
  for (let n = edge.length - 1; n > 0; n--) {
    const j = Math.floor(rand() * (n + 1));
    [edge[n], edge[j]] = [edge[j], edge[n]];
  }
  for (const [x, y, up, down] of edge) {
    let r, ox = 0, oy = 0;
    if (up) {
      r = F * (0.055 + rand() * 0.035);
      oy = -r * (0.25 + rand() * 0.12);
    } else if (down) {
      continue; // bellies stay flat
    } else {
      continue; // sides stay smooth; the crowns carry the billow
    }
    if (fits(x + ox, y + oy, r, 1.05)) add({ x: x + ox, y: y + oy, r, kind: up ? 1 : 2 });
  }

  // Wisps: loose vapour that breaks the silhouette.
  let tries = 0, wisps = 0;
  while (wisps < 10 && tries++ < 6000) {
    const [ex, ey, up] = edge[Math.floor(rand() * edge.length)];
    const a = up ? -Math.PI / 2 + (rand() - 0.5) * 2.2 : rand() * TAU;
    const d = F * (0.04 + rand() * 0.04);
    const x = ex + Math.cos(a) * d, y = ey + Math.sin(a) * d;
    if (x < 0 || y < 0 || x >= w || y >= h || inside[Math.floor(y) * w + Math.floor(x)]) continue;
    add({ x, y, r: F * (0.03 + rand() * 0.04), kind: 3 });
    wisps++;
  }

  const maxX = w;
  const cx = w / 2, cy = mask.pad + mask.asc * 0.55;
  for (const p of puffs) {
    // dispersal: outward from the word's heart, lifted, carried downwind
    const ox = (p.x - cx) / w, oy = (p.y - cy) / h;
    const len = Math.hypot(ox, oy) || 1;
    const reach = F * (0.35 + rand() * 0.5);
    p.dx = (0.5 + (ox / len) * 0.2 + (rand() - 0.5) * 0.25) * reach;
    p.dy = (-0.28 + (oy / len) * 0.15 + (rand() - 0.5) * 0.2) * reach;
    p.grow = 0.35 + rand() * 0.45;
    // the wind comes from the left: the upwind edge lets go first
    p.lag = (p.x / w) * 0.3 + rand() * 0.08;
    p.ph = rand() * TAU;
    p.ph2 = rand() * TAU;
    p.z = rand() * 2 - 1;
    p.v = Math.floor(rand() * 6);
    p.born = 0.1 + (p.x / maxX) * 1.15 + rand() * 0.45 + (p.kind >= 3 ? 0.5 : 0);
  }
  // Paint bottom-up so higher puffs lap over lower ones.
  puffs.sort((a, b) => b.y + b.r - (a.y + a.r));
  return puffs;
}

export class CloudWord {
  constructor(canvas, text, family) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    const rand = mulberry32(0x5eed);
    this.mask = buildMask(text, family);
    this.puffs = buildPuffs(this.mask, rand);
    this.body = [], this.vapour = [];
    for (let i = 0; i < 6; i++) {
      this.body.push(makeSprite(rand, '#ffffff', '#9ab3d8', 4, 0.22));
      this.vapour.push(makeSprite(rand, '#ffffff', '#d6e4f6', 9, 0));
    }
    this.aspect = this.mask.h / this.mask.w;
    // where the lobes actually paint (a lobe is drawn 0.12r high and its soft edge reads ~1.3r out);
    // loose vapour is left out so a stray wisp can't move the layout
    let l = Infinity, t = Infinity, rgt = -Infinity, b = -Infinity;
    for (const p of this.puffs) {
      if (p.kind === 3) continue;
      const cy = p.y - p.r * 0.12, e = p.r * 1.3;
      l = Math.min(l, p.x - e);
      rgt = Math.max(rgt, p.x + e);
      t = Math.min(t, cy - e);
      b = Math.max(b, cy + e);
    }
    this.ink = { l, t, r: rgt, b };
  }

  // cssWidth sizes the word itself; the canvas carries extra sky around it
  // so dispersing puffs never hit an edge.
  resize(cssWidth, dpr) {
    const M = F * 1.1;
    this.M = M;
    const unit = cssWidth / this.mask.w;
    this.cssW = (this.mask.w + M * 2) * unit;
    this.cssH = (this.mask.h + M * 2) * unit;
    // offsets from the canvas centre (margins are symmetric, so it is also the mask centre)
    const { h, pad, asc, massY } = this.mask;
    this.baseY = (pad + asc - h / 2) * unit;
    this.massY = (massY - h / 2) * unit;
    this.massTop = this.massY - (this.baseY - this.massY);
    const { w } = this.mask;
    this.inkTop = (this.ink.t - h / 2) * unit;
    this.inkBottom = (this.ink.b - h / 2) * unit;
    this.inkCx = ((this.ink.l + this.ink.r) / 2 - w / 2) * unit;
    this.xHeight = (this.baseY - this.massTop);
    this.canvas.style.width = `${this.cssW}px`;
    this.canvas.style.height = `${this.cssH}px`;
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);
    this.scale = this.canvas.width / (this.mask.w + M * 2);
  }

  // spread: 0 = formed word, 1 = fully dispersed on the wind
  render(t, tilt, still, spread = 0) {
    const { ctx, scale, puffs } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, this.M * scale, this.M * scale);

    const n = puffs.length;
    const X = this._x || (this._x = new Float32Array(n));
    const Y = this._y || (this._y = new Float32Array(n));
    const R = this._r || (this._r = new Float32Array(n));
    const L = this._l || (this._l = new Float32Array(n));
    const E = this._e || (this._e = new Float32Array(n));
    for (let i = 0; i < n; i++) {
      const p = puffs[i];
      const life = still ? 1 : easeOutExpo(clamp01((t - p.born) / 1.6));
      const drift = still ? 0 : 1;
      // each puff lets go at its own moment, so the word tears rather than fades
      const s = clamp01((spread - p.lag * 0.6) / (1 - p.lag * 0.6));
      const e = s * s * (3 - 2 * s);
      L[i] = life * (1 - e) * (1 - e * 0.3);
      E[i] = e;
      X[i] = p.x + drift * Math.sin(t * 0.32 + p.ph) * F * 0.006 + tilt.x * p.z * F * 0.016;
      Y[i] =
        p.y +
        drift * Math.cos(t * 0.26 + p.ph2) * F * 0.004 +
        tilt.y * p.z * F * 0.01 +
        (1 - life) * F * 0.06 +
        e * p.dy;
      X[i] += e * p.dx;
      R[i] = p.r * (0.35 + 0.65 * life) * (1 + drift * Math.sin(t * 0.5 + p.ph2) * 0.035) * (1 + e * p.grow);
    }

    // Never let a puff meet the canvas edge: fade it out while it still has sky around it.
    const M = this.M, x0 = -M, y0 = -M, x1 = this.mask.w + M, y1 = this.mask.h + M;
    const room = F * 0.3;
    for (let i = 0; i < n; i++) {
      const ext = R[i] * 1.6 * (1 + E[i] * 1.2);
      const d = Math.min(X[i] - x0, x1 - X[i], Y[i] - y0, y1 - Y[i]) - ext;
      L[i] *= clamp01(d / room);
    }

    // 1. vapour around the silhouette
    for (let i = 0; i < n; i++) {
      if (puffs[i].kind !== 3 || L[i] < 0.001) continue;
      const r = R[i] * 1.6;
      ctx.globalAlpha = 0.16 * L[i];
      ctx.drawImage(this.vapour[puffs[i].v], X[i] - r, Y[i] - r, r * 2, r * 2);
    }
    // 2. lobes, painted bottom-up: each lobe's shaded belly creases the one below it.
    // As a puff lets go it shears downwind and softens into vapour.
    for (let i = 0; i < n; i++) {
      if (puffs[i].kind === 3 || L[i] < 0.001) continue;
      const r = R[i], e = E[i], v = puffs[i].v;
      const bw = r * 2.7 * (1 + e * 1.2), bh = r * 2.7 * (1 - e * 0.25);
      const x = X[i] - bw / 2, y = Y[i] - bh / 2 - r * 0.12;
      if (e < 0.999) {
        ctx.globalAlpha = L[i] * (1 - e);
        ctx.drawImage(this.body[v], x, y, bw, bh);
      }
      if (e > 0.001) {
        ctx.globalAlpha = L[i] * e * 0.8;
        ctx.drawImage(this.vapour[v], x, y, bw, bh);
      }
    }

    // flatten the base: cumulus sit on a shaded, level floor
    ctx.globalAlpha = 1 - clamp01(spread * 1.5);
    ctx.globalCompositeOperation = 'source-atop';
    const { h, pad, asc } = this.mask;
    const base = pad + asc;
    const g = ctx.createLinearGradient(0, base - F * 0.35, 0, h);
    g.addColorStop(0, 'rgba(120,150,196,0)');
    g.addColorStop(0.5, 'rgba(120,150,196,0.22)');
    g.addColorStop(1, 'rgba(96,128,182,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(-this.M, -this.M, this.mask.w + this.M * 2, h + this.M * 2);
    ctx.globalCompositeOperation = 'source-over';
  }

  settled(t) {
    return t > 4.2;
  }
}
