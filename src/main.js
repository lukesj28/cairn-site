import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './style.css';
import { CloudWord } from './cloud.js';
import { Cairn } from './cairn.js';
import { Buddy } from './buddy.js';
import appleLogo from './icons/apple.svg?raw';
import arrowUp from '@phosphor-icons/core/bold/arrow-up-bold.svg?raw';
import cross from '@phosphor-icons/core/bold/x-bold.svg?raw';

for (const [name, svg] of [['apple', appleLogo], ['arrow-up', arrowUp], ['x', cross]]) {
  for (const el of document.querySelectorAll(`[data-icon="${name}"]`)) el.innerHTML = svg;
}

const FPS = 24;
const SRC_ASPECT = 1080 / 1920;
const TILT = 72;
const PAN = [
  0, 0.0019, 0.0052, 0.0094, 0.0149, 0.0217, 0.0293, 0.0382, 0.0478, 0.0587, 0.0703, 0.083, 0.0964,
  0.1109, 0.1259, 0.1419, 0.1585, 0.1758, 0.1939, 0.2125, 0.2316, 0.2515, 0.2718, 0.2924, 0.3135,
  0.3352, 0.3572, 0.3794, 0.4018, 0.4245, 0.4473, 0.4705, 0.4939, 0.5174, 0.5411, 0.5647, 0.5883,
  0.6119, 0.6354, 0.6587, 0.6817, 0.7045, 0.7271, 0.7495, 0.7718, 0.7939, 0.8156, 0.8368, 0.8574,
  0.8777, 0.8976, 0.9167, 0.9352, 0.9534, 0.9706, 0.9872, 1.0032, 1.0182, 1.0327, 1.046, 1.0588,
  1.0703, 1.0812, 1.0908, 1.0997, 1.1073, 1.1141, 1.1196, 1.1238, 1.1272, 1.129, 1.1295,
];
const LOOP2_REENTRY = 91 / FPS;
const JOIN_MS = 140;
const LEAVE_MS = 320;
const DISSOLVE_MS = 480;

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const reel = document.getElementById('reel');
const wordCanvas = document.getElementById('word');
const get = document.getElementById('get');
const signoff = document.getElementById('signoff');
const root = document.documentElement;
const sky = document.createElement('canvas');
const skyCtx = sky.getContext('2d', { alpha: false });
const decoders = document.createElement('div');
decoders.className = 'decoders';
reel.append(sky, decoders);

const HERO_BASE = 'https://cdn.cairnstacks.app/hero';
const SOURCES = [
  ['av1.mp4', 'video/mp4; codecs="av01.0.09M.10"'],
  ['hevc.mp4', 'video/mp4; codecs="hvc1.2.4.L123.B0"'],
  ['mp4', 'video/mp4; codecs="avc1.640032"'],
];

function clip(name, loop = false) {
  const v = document.createElement('video');
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  v.loop = loop;
  v.preload = 'auto';
  v.disablePictureInPicture = true;
  for (const [ext, type] of SOURCES) {
    const s = document.createElement('source');
    s.src = `${HERO_BASE}/${name}.${ext}`;
    s.type = type;
    v.append(s);
  }
  decoders.append(v);
  return v;
}

const t1Fwd = clip('t1-fwd');
const t1Rev = clip('t1-rev');
const loop2 = clip('loop2', true);
const t2Fwd = clip('t2-fwd');
const t2Rev = clip('t2-rev');
const loop3 = clip('loop3', true);
const clips = [t1Fwd, t1Rev, loop2, t2Fwd, t2Rev, loop3];

const TILT_FPS = 60;
const TILT_STEPS = Math.round(((TILT - 1) * TILT_FPS) / FPS);

const stones = document.getElementById('stones');
const cairn = new Cairn(document.getElementById('cairn'), stones, { reduceMotion });

const buddy = new Buddy(document.getElementById('buddy'), { reduceMotion, step });

const OUT = {
  second: 'https://github.com/lukesj28/cairn',
  third: 'https://github.com/lukesj28/cairn/releases/latest',
};
const kofi = document.getElementById('kofi');
stones.addEventListener('stone', ({ detail: { name } }) => {
  if (name === 'top') return location.assign('/docs');
  if (OUT[name]) return window.open(OUT[name], '_blank', 'noopener');
  if (name !== 'bottom') return;
  const frame = kofi.querySelector('iframe');
  if (!frame.src) frame.src = frame.dataset.src;
  kofi.showModal();
});
kofi.querySelector('.kofi__close').addEventListener('click', () => kofi.close());
kofi.addEventListener('click', (e) => e.target === kofi && kofi.close());

const poster = new Image();
poster.src = `${HERO_BASE}/poster.webp`;
poster.decode?.().then(() => document.documentElement.classList.add('ready'), () => {});
t1Fwd.addEventListener('loadeddata', () => document.documentElement.classList.add('ready'), { once: true });

const drawable = (v) => v.readyState >= 2 && !v.seeking;

let onScreen = t1Fwd;
let fade = null;

function show(v, ms) {
  if (fade) fade.done();
  const from = onScreen;
  onScreen = v;
  return new Promise((resolve) => {
    const done = () => {
      if (fade?.to === v) fade = null;
      if (onScreen === v) for (const c of clips) if (c !== v && !c.paused) c.pause();
      resolve();
    };
    if (!ms || from === v) {
      fade = null;
      done();
    } else {
      fade = { from, to: v, ms, t0: null, done };
    }
  });
}

function paint(now) {
  const { x, y, w, h } = cover;
  skyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  skyCtx.globalAlpha = 1;
  if (fade) {
    const f = fade;
    if (f.t0 == null && drawable(f.to)) f.t0 = now;
    const a = f.t0 == null ? 0 : Math.min(1, (now - f.t0) / f.ms);
    if (drawable(f.from) || a === 0) paintFrame(f.from, x, y, w, h);
    if (a > 0) {
      skyCtx.globalAlpha = a < 0.5 ? 2 * a * a : 1 - 2 * (1 - a) * (1 - a);
      paintFrame(f.to, x, y, w, h);
      skyCtx.globalAlpha = 1;
    }
    if (a >= 1) f.done();
    return;
  }
  if (drawable(onScreen) || onScreen.readyState < 2) paintFrame(onScreen, x, y, w, h);
}

function paintFrame(v, x, y, w, h) {
  if (v.readyState >= 2) skyCtx.drawImage(v, x, y, w, h);
  else if (v === t1Fwd && poster.complete && poster.naturalWidth) skyCtx.drawImage(poster, x, y, w, h);
}

function play(v) {
  return v.play().catch(() => {
    if (!v.loop && Number.isFinite(v.duration)) v.currentTime = v.duration;
  });
}

function untilEnded(v) {
  return new Promise((resolve) => {
    if (v.ended || (Number.isFinite(v.duration) && v.currentTime >= v.duration - 0.01 && v.paused)) {
      resolve();
      return;
    }
    v.addEventListener('ended', resolve, { once: true });
    v.addEventListener('pause', () => v.currentTime >= v.duration - 0.05 && resolve(), { once: true });
  });
}

function rewind(v, t = 0) {
  if (Math.abs(v.currentTime - t) > 0.001) v.currentTime = t;
}

let state = 0;
let moving = null;

async function transition(clipIn, fadeIn, next, nextAt, joinMs) {
  moving = clipIn;
  rewind(clipIn);
  await show(clipIn, fadeIn);
  rewind(next, nextAt);
  await play(clipIn);
  await untilEnded(clipIn);
  if (next.loop && !reduceMotion.matches) play(next);
  await show(next, joinMs);
  rewind(clipIn);
  moving = null;
}

async function step(dir) {
  const to = state + dir;
  if (moving || to < 0 || to > 2) return false;
  signoff.classList.remove('is-here');
  cairn.leave();
  const clip = dir > 0 ? (state === 0 ? t1Fwd : t2Fwd) : (state === 1 ? t1Rev : t2Rev);
  const glide = clip?.duration;
  buddy.leave(state, to, reduceMotion.matches || !Number.isFinite(glide) ? 600 : glide * 1000);

  if (reduceMotion.matches) {
    const still = [t1Fwd, loop2, loop3][to];
    rewind(still, to === 1 && dir < 0 ? LOOP2_REENTRY : 0);
    moving = still;
    await show(still, 600);
    moving = null;
  } else if (state === 0) {
    await transition(t1Fwd, 0, loop2, 0, JOIN_MS);
  } else if (state === 1 && dir > 0) {
    await transition(t2Fwd, LEAVE_MS, loop3, 0, JOIN_MS);
  } else if (state === 1) {
    await transition(t1Rev, LEAVE_MS, t1Fwd, 0, JOIN_MS);
  } else {
    await transition(t2Rev, LEAVE_MS, loop2, LOOP2_REENTRY, DISSOLVE_MS);
  }

  state = to;
  signoff.classList.toggle('is-here', state === 2);
  if (state === 2) cairn.enter();
  get.inert = state !== 0;
  buddy.arrive(state);
  return true;
}

async function goTo(n) {
  while (state !== n) if (!(await step(Math.sign(n - state)))) return;
}

let wheelSum = 0;
let wheelSpent = false;
let wheelQuiet = 0;
addEventListener(
  'wheel',
  (e) => {
    if (e.ctrlKey || kofi.open) return;
    const says = e.target instanceof Element && e.target.closest('.buddy__say');
    if (says && says.scrollHeight > says.clientHeight) return;
    e.preventDefault();
    clearTimeout(wheelQuiet);
    wheelQuiet = setTimeout(() => {
      wheelSpent = false;
      wheelSum = 0;
    }, 220);
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (wheelSpent || moving) return;
    wheelSum += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (Math.abs(wheelSum) < 8) return;
    wheelSpent = true;
    step(Math.sign(wheelSum));
  },
  { passive: false },
);

let touchY = null;
addEventListener(
  'touchstart',
  (e) => {
    touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
  },
  { passive: true },
);
addEventListener(
  'touchmove',
  (e) => {
    if (touchY == null || kofi.open || e.target.closest?.('.buddy__bubble')) return;
    const dy = touchY - e.touches[0].clientY;
    if (Math.abs(dy) < 24) return;
    touchY = null;
    step(Math.sign(dy));
  },
  { passive: true },
);

addEventListener('keydown', (e) => {
  if (e.altKey || e.metaKey || e.ctrlKey || kofi.open) return;
  if (e.target instanceof Element && e.target.closest('input, textarea')) return;
  const onControl = e.target instanceof Element && e.target.closest('button, a, input, textarea');
  const k = e.key;
  let dir = 0;
  if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey && !onControl)) dir = 1;
  else if (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey && !onControl)) dir = -1;
  else if (k === 'Home') return e.preventDefault(), goTo(0);
  else if (k === 'End') return e.preventDefault(), goTo(2);
  if (!dir) return;
  e.preventDefault();
  if (!e.repeat) step(dir);
});

document.getElementById('back-up').addEventListener('click', async () => {
  await goTo(0);
  get.querySelector('a')?.focus({ preventScroll: true, focusVisible: false });
});

function tiltFrame() {
  const at = (v) => Math.min(TILT - 1, (v.currentTime * TILT_FPS * (TILT - 1)) / TILT_STEPS);
  if (moving === t1Fwd) return at(t1Fwd);
  if (moving === t1Rev) return TILT - 1 - at(t1Rev);
  return state === 0 ? 0 : TILT - 1;
}
const WORD_GONE = 0.4238;
const GET_GONE = 0.1027;
function panAt(f) {
  const i = Math.min(TILT - 2, Math.floor(f));
  return PAN[i] + (PAN[i + 1] - PAN[i]) * Math.min(1, f - i);
}

const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType !== 'mouse' || reduceMotion.matches) return;
    tilt.tx = (e.clientX / innerWidth) * 2 - 1;
    tilt.ty = (e.clientY / innerHeight) * 2 - 1;
  },
  { passive: true },
);

let vw = 0, vh = 0, dpr = 1, coverH = 0;
const snap = (v) => Math.round(v * dpr) / dpr;
let cover = { x: 0, y: 0, w: 0, h: 0 };
let word = null;
let getH = 56;

function layout() {
  vw = innerWidth;
  vh = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  sky.width = Math.round(vw * dpr);
  sky.height = Math.round(vh * dpr);
  coverH = Math.max(vh, vw * SRC_ASPECT);
  const coverW = coverH / SRC_ASPECT;
  cover = { x: (vw - coverW) / 2, y: (vh - coverH) / 2, w: coverW, h: coverH };
  getH = get.offsetHeight;
  const bar = snap(Math.min(28, Math.max(14, vh * 0.025)));
  root.style.setProperty('--bar', `${bar}px`);
  cairn.layout(vw, vh, cover, dpr);
  buddy.layout(vw, vh, cover, bar);
  if (word) word.resize(Math.min(vw < 700 ? vw * 0.84 : vw * 0.48, 860), dpr);
}
addEventListener('resize', layout);

let revealStart = null;
let last = performance.now();
let lastWordKey = '';

function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  paint(now);
  cairn.paint(dt);

  tilt.x += (tilt.tx - tilt.x) * (1 - Math.exp(-dt * 3));
  tilt.y += (tilt.ty - tilt.y) * (1 - Math.exp(-dt * 3));

  if (word) {
    const f = tiltFrame();
    const rise = panAt(f) * coverH;
    const spread = reduceMotion.matches ? (state === 0 && !moving ? 0 : 1) : Math.min(1, panAt(f) / WORD_GONE);
    const visible = spread < 1 && rise < vh * 0.5 + word.cssH * 0.5;
    wordCanvas.style.visibility = visible ? 'visible' : 'hidden';

    const gap = Math.min(80, Math.max(40, word.xHeight * 0.58));
    const inkH = word.inkBottom - word.inkTop;
    const groupTop = vh * 0.485 - (inkH + gap + getH) / 2;
    const centre = groupTop - word.inkTop;
    const wordX = snap(vw / 2 - word.cssW / 2 - word.inkCx);
    const wordY = snap(centre - word.cssH / 2 - rise);
    wordCanvas.style.transform =
      `translate3d(${wordX}px, ${wordY}px, 0) ` +
      `perspective(1400px) rotateX(${(-tilt.y * 5).toFixed(2)}deg) rotateY(${(tilt.x * 7).toFixed(2)}deg)`;

    const gone = reduceMotion.matches ? spread : Math.min(1, panAt(f) / GET_GONE);
    get.style.transform = `translate3d(-50%, ${(groupTop + inkH + gap - rise - gone * 24).toFixed(2)}px, 0)`;
    get.style.opacity = String(1 - gone);
    get.style.visibility = gone < 1 ? 'visible' : 'hidden';

    if (visible) {
      const t = revealStart == null ? 0 : (now - revealStart) / 1000;
      const still = reduceMotion.matches;
      const key = still ? `${word.cssW}|${spread.toFixed(3)}` : '';
      if (!still || key !== lastWordKey) {
        word.render(t, still ? { x: 0, y: 0 } : tilt, still, spread);
        lastWordKey = key;
      }
    }
  }

  requestAnimationFrame(tick);
}

async function boot() {
  layout();
  requestAnimationFrame(tick);
  try {
    await document.fonts.load('700 300px Fredoka');
  } catch {}
  word = new CloudWord(wordCanvas, 'cairn', 'Fredoka');
  lastWordKey = '';
  layout();
  revealStart = performance.now();
  buddy.arrive(0);
}
boot();
