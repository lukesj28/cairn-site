import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './style.css';
import { CloudWord } from './cloud.js';
import appleLogo from '@phosphor-icons/core/fill/apple-logo-fill.svg?raw';
import arrowUp from '@phosphor-icons/core/bold/arrow-up-bold.svg?raw';

for (const [name, svg] of [['apple', appleLogo], ['arrow-up', arrowUp]]) {
  for (const el of document.querySelectorAll(`[data-icon="${name}"]`)) el.innerHTML = svg;
}

// The footage has three states joined by two camera moves (see scripts/build_hero.py):
//   0  sky        a still (frame 1)
//   1  meadow     looped
//   2  cairn      looped
const FPS = 24;
const SRC_ASPECT = 1080 / 1920;
const TILT = 48; // frames in the sky -> meadow tilt
// How far the sky has travelled up the frame (in frame heights) over the tilt,
// measured from the footage so the cloud word rides with the real clouds.
const PAN = [
  0, 0.0041, 0.0112, 0.0206, 0.0326, 0.047, 0.0636, 0.0822, 0.1027, 0.125, 0.1491, 0.175, 0.2024,
  0.2309, 0.2607, 0.2917, 0.3235, 0.3564, 0.3898, 0.4238, 0.4585, 0.4935, 0.5286, 0.5639, 0.5991,
  0.6342, 0.6691, 0.7036, 0.7376, 0.771, 0.804, 0.8358, 0.867, 0.8968, 0.9254, 0.9528, 0.9786,
  1.0028, 1.0251, 1.0456, 1.0642, 1.0808, 1.0953, 1.1072, 1.1166, 1.1238, 1.1279, 1.1295,
];
// Coming back down to the meadow, join its loop where the clouds sit closest to frame 288.
const LOOP2_REENTRY = 8;
// Crossfades: a clean hand-off hides a decoder hiccup; leaving a loop mid-way dissolves onto
// the move's first frame; arriving mid-loop dissolves between two moments of the same view.
const JOIN_MS = 140;
const LEAVE_MS = 320;
const DISSOLVE_MS = 480;

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const reel = document.getElementById('reel');
const wordCanvas = document.getElementById('word');
const get = document.getElementById('get');
const signoff = document.getElementById('signoff');

// ---------- clips ----------
// The <video> elements only decode. Every pixel on screen is painted into one canvas,
// crossfades included, so the footage always goes through a single render path and
// colour conversion. Fading <video> elements directly makes Chrome hop between its
// hardware overlay and the compositor, and wake parked decoders, and each hop shows
// up as a dark flicker at the start and end of a move.
const sky = document.createElement('canvas');
const skyCtx = sky.getContext('2d', { alpha: false });
const decoders = document.createElement('div');
decoders.className = 'decoders';
reel.append(sky, decoders);

function clip(name, loop = false) {
  const v = document.createElement('video');
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  v.loop = loop;
  v.preload = 'auto';
  v.disablePictureInPicture = true;
  for (const [ext, type] of [['webm', 'video/webm; codecs="vp9"'], ['mp4', 'video/mp4']]) {
    const s = document.createElement('source');
    s.src = `${import.meta.env.BASE_URL}hero/${name}.${ext}`;
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

const poster = new Image();
poster.src = `${import.meta.env.BASE_URL}hero/poster.webp`;
poster.decode?.().then(() => document.documentElement.classList.add('ready'), () => {});
t1Fwd.addEventListener('loadeddata', () => document.documentElement.classList.add('ready'), { once: true });

// a clip can be painted once it holds a decoded frame for where it's parked
const drawable = (v) => v.readyState >= 2 && !v.seeking;

let onScreen = t1Fwd;
let fade = null; // { from, to, ms, t0, done }

// Dissolve to a clip, then park the rest. The fade's clock only starts once the
// incoming clip has a real frame, so nothing blank or stale ever blends in.
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
  // mid-seek or still buffering: hold the last good picture rather than paint a gap
  if (drawable(onScreen) || onScreen.readyState < 2) paintFrame(onScreen, x, y, w, h);
}

function paintFrame(v, x, y, w, h) {
  if (v.readyState >= 2) skyCtx.drawImage(v, x, y, w, h);
  else if (v === t1Fwd && poster.complete && poster.naturalWidth) skyCtx.drawImage(poster, x, y, w, h);
}

function play(v) {
  return v.play().catch(() => {
    // Autoplay refused (e.g. iOS Low Power Mode): land on the clip's last frame instead.
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
    // if playback never starts, don't strand the visitor mid-move
    v.addEventListener('pause', () => v.currentTime >= v.duration - 0.05 && resolve(), { once: true });
  });
}

function rewind(v, t = 0) {
  if (Math.abs(v.currentTime - t) > 0.001) v.currentTime = t;
}

// ---------- states ----------
let state = 0;
let moving = null; // the running transition clip, if any

async function transition(clipIn, fadeIn, next, nextAt, joinMs) {
  moving = clipIn;
  rewind(clipIn);
  // Settle onto the move's first frame before the camera starts: dissolving while it
  // moves leaves a ghost of the old view (a double horizon) behind.
  await show(clipIn, fadeIn);
  rewind(next, nextAt); // seek while it's hidden, so the join never shows a stale frame
  await play(clipIn);
  await untilEnded(clipIn);
  if (next.loop && !reduceMotion.matches) play(next);
  // even a clean join cross-fades briefly: the paint waits for the loop's first frame
  await show(next, joinMs);
  rewind(clipIn);
  moving = null;
}

async function step(dir) {
  const to = state + dir;
  if (moving || to < 0 || to > 2) return false;
  signoff.classList.remove('is-here');

  if (reduceMotion.matches) {
    // no camera moves: dissolve straight to the next state and hold it still
    const still = [t1Fwd, loop2, loop3][to];
    rewind(still, to === 1 && dir < 0 ? LOOP2_REENTRY : 0);
    moving = still;
    await show(still, 600);
    moving = null;
  } else if (state === 0) {
    // sky -> meadow: the tilt runs on into the loop's first frame, so the join is clean
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
  get.inert = state !== 0;
  return true;
}

async function goTo(n) {
  while (state !== n) if (!(await step(Math.sign(n - state)))) return;
}

// ---------- input: every nudge magnetises to the next state ----------
// Wheel and trackpad: the first few pixels commit a move; the rest of that gesture
// (including trackpad inertia) is swallowed until it goes quiet.
let wheelSum = 0;
let wheelSpent = false;
let wheelQuiet = 0;
addEventListener(
  'wheel',
  (e) => {
    if (e.ctrlKey) return; // pinch-zoom
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
    if (touchY == null) return;
    const dy = touchY - e.touches[0].clientY;
    if (Math.abs(dy) < 24) return;
    touchY = null;
    step(Math.sign(dy));
  },
  { passive: true },
);

addEventListener('keydown', (e) => {
  if (e.altKey || e.metaKey || e.ctrlKey) return;
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
  get.querySelector('button')?.focus({ preventScroll: true, focusVisible: false });
});

// ---------- where the camera is in the tilt (drives the cloud word) ----------
function tiltFrame() {
  if (moving === t1Fwd) return Math.min(TILT - 1, t1Fwd.currentTime * FPS);
  if (moving === t1Rev) return Math.max(0, TILT - 1 - t1Rev.currentTime * FPS);
  return state === 0 ? 0 : TILT - 1;
}
function panAt(f) {
  const i = Math.min(TILT - 2, Math.floor(f));
  return PAN[i] + (PAN[i + 1] - PAN[i]) * Math.min(1, f - i);
}

// ---------- pointer depth ----------
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

// ---------- layout ----------
let vw = 0, vh = 0, dpr = 1, coverH = 0;
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
  if (word) word.resize(Math.min(vw < 700 ? vw * 0.84 : vw * 0.48, 860), dpr);
}
addEventListener('resize', layout);

// ---------- loop ----------
let revealStart = null;
let last = performance.now();
let lastWordKey = '';

function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  paint(now);

  tilt.x += (tilt.tx - tilt.x) * (1 - Math.exp(-dt * 3));
  tilt.y += (tilt.ty - tilt.y) * (1 - Math.exp(-dt * 3));

  if (word) {
    // the word lives in the sky: it rises with the real clouds as the camera tilts down
    // and breaks up on the wind over the first stretch of the tilt
    const f = tiltFrame();
    const rise = panAt(f) * coverH;
    const spread = reduceMotion.matches ? (state === 0 && !moving ? 0 : 1) : Math.min(1, f / 19);
    const visible = spread < 1 && rise < vh * 0.5 + word.cssH * 0.5;
    wordCanvas.style.visibility = visible ? 'visible' : 'hidden';

    // Lay out what is actually painted: cloud ink, a gap sized from the letters, the button.
    // The group sits a hair above true centre, where the eye reads "middle".
    const gap = Math.min(80, Math.max(40, word.xHeight * 0.58));
    const inkH = word.inkBottom - word.inkTop;
    const groupTop = vh * 0.485 - (inkH + gap + getH) / 2;
    const centre = groupTop - word.inkTop;
    wordCanvas.style.transform =
      `translate3d(calc(-50% + ${(-word.inkCx).toFixed(2)}px), ${(centre - word.cssH / 2 - rise).toFixed(2)}px, 0) ` +
      `perspective(1400px) rotateX(${(-tilt.y * 5).toFixed(2)}deg) rotateY(${(tilt.x * 7).toFixed(2)}deg)`;

    // the download button sits just under the letters and leaves before they do
    const gone = reduceMotion.matches ? spread : Math.min(1, f / 8);
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

// ---------- boot ----------
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
}
boot();
