import { Perch, Flyer } from './fox.js';

const SRC_W = 1920;
const SRC_H = 1080;
const ARRIVE_MS = 2100;
const THINK_AFTER = 700;
const NEAR = 0.55;
const LEDGE = 668 / 726;
const FRAME = {
  perch: { w: 1262, h: 726, box: [0.4, 0.25, 0.8, LEDGE] },
  fly: { w: 920, h: 544, box: [0.29, 0.04, 0.72, 0.87] },
};
const FLY = { scale: 0.5, x: 1480, feet: 660, clear: 170 };
const CAIRN_TOP = 555;
const ASK = { w: 340, h: 52, floor: 28 };
const TAIL = 20;
const BUBBLE_RADIUS = 26;
const EDGE = 16;
const SVG = 'http://www.w3.org/2000/svg';
const NARROW = 700;
const README = 'https://github.com/lukesj28/cairn';
const LINES = {
  intro: 'hi! I’m an AI helper for cairn. ask me anything, or scroll down to the cairn to explore on your own.',
  introTouch: 'hi! I’m an AI helper for cairn. ask me anything, or swipe up to the cairn to explore on your own.',
  winded: 'phew, my wings need a rest. give me a minute, then ask again.',
  lost: `I dropped my notes mid-flight. try again, or the README has it all: ${README}`,
  tired: 'I’ve answered all I can for today. the docs have everything: https://cairnstacks.app/docs',
};

const ALLOWED_HOSTS = new Set(['github.com', 'cairnstacks.app', 'ko-fi.com', 'apple.com']);

const CLIPS = 'https://cdn.cairnstacks.app/tutorials';
const TUTORIALS = {
  install: 'installing cairn',
  accessibility: 'turning on Accessibility for cairn',
  snapshot: 'saving your windows with Snapshot to New Stack',
  apply: 'applying a stack from the menu bar',
  'add-app': 'adding apps, resizing tiles and using two displays in the editor',
};
const CAIRN_LEFT = 898;
const CLIP = { max: 520, min: 260, gap: 32, edge: 32, aspect: 3 / 2 };

function isAllowedUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function label(url) {
  const u = new URL(url);
  const parts = u.pathname.split('/').filter(Boolean);
  const last = parts.at(-1) ?? '';
  if (/\.[a-z0-9]{2,4}$/i.test(last)) return last.toLowerCase();
  const host = u.hostname.replace(/^www\./, '');
  const short = host + u.pathname.replace(/\/$/, '') + u.hash;
  return (short.length <= 30 || parts.length < 3 ? short : `${host}/…/${last}${u.hash}`).toLowerCase();
}

function frameGeo({ w, h, box }, s) {
  const fw = w * s;
  const fh = h * s;
  return { fw, fh, x: box[0] * fw, y: box[1] * fh, w: (box[2] - box[0]) * fw, h: (box[3] - box[1]) * fh };
}

function words(text) {
  const out = [];
  let at = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')\]]+/g)) {
    const url = m[0].replace(/[.,;:!?]+$/, '');
    if (!isAllowedUrl(url)) continue;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label(url);
    out.push(text.slice(at, m.index).toLowerCase(), a);
    at = m.index + url.length;
  }
  out.push(text.slice(at).toLowerCase());
  return out;
}

export class Helper {
  constructor(root, { reduceMotion, step }) {
    this.root = root;
    this.reduceMotion = reduceMotion;
    this.step = step;
    this.body = root.querySelector('.helper__body');
    this.flyer = new Flyer(this.body.querySelector('.helper__art'), reduceMotion);
    this.perchEl = root.querySelector('.perch');
    this.perch = new Perch(this.perchEl.querySelector('.helper__art'), reduceMotion);
    this.bubble = root.querySelector('.helper__bubble');
    this.tail = document.createElementNS(SVG, 'svg');
    this.tail.classList.add('helper__tail');
    this.tail.setAttribute('aria-hidden', 'true');
    this.tailPath = document.createElementNS(SVG, 'path');
    this.tail.append(this.tailPath);
    this.bubble.append(this.tail);
    this.asked = root.querySelector('.helper__asked');
    this.says = root.querySelector('.helper__say');
    this.form = root.querySelector('.helper__ask');
    this.input = this.form.querySelector('input');
    this.clip = root.querySelector('.helper__clip');
    this.video = this.clip.querySelector('video');
    this.clipFits = false;
    this.bareControls = null;
    this.clip.querySelector('.helper__clip-close').addEventListener('click', () => this.#tutorial(null));
    const full = this.clip.querySelector('.helper__clip-full');
    if (this.video.requestFullscreen || this.video.webkitEnterFullscreen) {
      full.addEventListener('click', () => {
        const v = this.video;
        (v.requestFullscreen ? v.requestFullscreen() : Promise.resolve(v.webkitEnterFullscreen())).catch(() => {});
      });
      document.addEventListener('fullscreenchange', () => {
        const v = this.video;
        if (document.fullscreenElement === v) {
          this.bareControls = v.controls;
          v.controls = true;
        } else if (this.bareControls != null) {
          v.controls = this.bareControls;
          this.bareControls = null;
          if (!v.controls && this.clip.classList.contains('is-open')) v.play().catch(() => {});
        }
      });
    } else {
      full.hidden = true;
    }
    this.clip.addEventListener('transitionend', (e) => {
      if (e.target === this.clip && e.propertyName === 'visibility' && !this.clip.classList.contains('is-open')) this.clip.hidden = true;
    });
    this.video.addEventListener('error', () => this.#tutorial(null));

    this.state = -1;
    this.side = null;
    this.focusX = 0;
    this.carried = '';
    this.off = false;
    this.turn = 0;
    this.moving = false;
    this.busy = false;
    this.said = false;
    this.history = [];
    this.vw = 0;
    this.vh = 0;

    this.body.addEventListener('click', () => {
      if (!this.moving && this.state === 1) this.input.focus({ preventScroll: true });
    });
    this.perchEl.addEventListener('click', () => {
      if (!this.moving && this.state === 0) this.step(1);
    });
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.#ask(this.input.value);
    });
  }

  layout(vw, vh, cover, bar, head) {
    this.vw = vw;
    this.vh = vh;
    this.head = head;
    const narrow = vw < NARROW;
    const k = cover.h / SRC_H;
    const g1 = frameGeo(FRAME.perch, Math.min(k, ((narrow ? 0.8 : 0.5) * vw) / FRAME.perch.w));
    this.#size(this.perchEl, g1);
    const pe = this.perchEl.style;
    pe.setProperty('--x', `${(vw + 2 - g1.fw + g1.x).toFixed(1)}px`);
    pe.setProperty('--y', `${(vh - bar - LEDGE * g1.fh + g1.y).toFixed(1)}px`);
    const g2 = frameGeo(FRAME.fly, Math.min(FLY.scale * k, ((narrow ? 0.6 : 0.75) * vw) / FRAME.fly.w));
    this.fly = g2;
    this.#size(this.body, g2);
    const wingR = (g2.fw - g2.x - g2.w / 2) * 0.85;
    const sx = Math.min(cover.x + FLY.x * (cover.w / SRC_W), vw - 8 - wingR);
    let feet = cover.y + FLY.feet * k;
    if (narrow) feet = Math.min(feet, cover.y + CAIRN_TOP * k - 12);
    feet = Math.min(Math.max(feet, head + 120 + g2.h), vh - bar - ASK.h - ASK.floor - 24 - FLY.clear * k);
    const sy = feet - g2.h / 2;
    this.side = { x: sx, y: sy };
    const bs = this.body.style;
    bs.setProperty('--x', `${sx.toFixed(1)}px`);
    bs.setProperty('--y', `${sy.toFixed(1)}px`);
    this.focusX = cover.x + cover.w / 2;
    this.carried = '';
    const f = this.form.style;
    const fw = Math.min(ASK.w, vw - 2 * EDGE);
    f.width = `${Math.round(fw)}px`;
    f.left = `${Math.round((vw - fw) / 2)}px`;
    f.top = `${Math.round(vh - bar - ASK.floor - ASK.h)}px`;
    const cairnX = cover.x + CAIRN_LEFT * (cover.w / SRC_W);
    const cx = cairnX / 2;
    const cy = (head + vh - bar) / 2;
    const cw = Math.min(
      CLIP.max,
      2 * (cx - CLIP.edge),
      2 * (cairnX - CLIP.gap - cx),
      2 * (vh - bar - CLIP.edge - cy) * CLIP.aspect,
    );
    this.clipFits = !narrow && cw >= CLIP.min;
    const c = this.clip.style;
    c.width = `${Math.round(cw)}px`;
    c.left = `${Math.round(cx - cw / 2)}px`;
    c.top = `${Math.round(cy - cw / CLIP.aspect / 2)}px`;
    if (!this.clipFits) this.#tutorial(null);
    this.#place();
  }

  leave(from, to) {
    this.turn++;
    this.moving = true;
    this.#show(false);
    this.flyer.want = 'idle';
    if (from === 0) {
      this.perch.dive();
      this.flyer.start();
    } else if (to === 2) {
      if (this.reduceMotion.matches) this.flyer.end();
    } else if (from === 2) {
      this.flyer.start();
    }
  }

  arrive(state) {
    this.turn++;
    const first = this.state < 0;
    this.state = state;
    this.moving = false;

    if (state === 0) {
      this.flyer.end();
      this.perch.reset();
      const wait = first ? ARRIVE_MS : 200;
      this.#after(wait, () => {
        this.perch.jumpUp();
        this.flyer.warm();
      });
    } else if (state === 2) {
      this.flyer.end();
    } else if (state === 1) {
      this.flyer.start();
      this.flyer.want = 'answer';
      this.#after(800, () => this.#show(true));
    }
  }

  carry(rideY, passU) {
    if (!this.side) return;
    const k = NEAR / (NEAR - Math.min(passU, NEAR * 0.99));
    const x = (this.side.x - this.focusX) * (k - 1);
    const g = this.fly;
    const off =
      this.side.x + x - k * (g.x + g.w / 2) >= this.vw || this.side.y + rideY - k * (g.y + g.h / 2) >= this.vh;
    if (off !== this.off) {
      this.off = off;
      this.body.style.display = off ? 'none' : '';
    }
    if (off) this.flyer.pause();
    else this.flyer.resume();
    const css = off || (!x && !rideY && k === 1) ? '' : `translate3d(${x.toFixed(1)}px, ${rideY.toFixed(1)}px, 0) scale(${k.toFixed(4)})`;
    if (css === this.carried) return;
    this.carried = css;
    this.body.style.transform = css;
  }

  #size(el, g) {
    const b = el.style;
    b.setProperty('--w', `${g.w.toFixed(1)}px`);
    b.setProperty('--h', `${g.h.toFixed(1)}px`);
    b.setProperty('--fw', `${g.fw.toFixed(1)}px`);
    b.setProperty('--fx', `${(-g.x).toFixed(1)}px`);
    b.setProperty('--fy', `${(-g.y).toFixed(1)}px`);
  }

  #after(ms, fn) {
    const turn = this.turn;
    setTimeout(() => turn === this.turn && fn(), this.reduceMotion.matches ? Math.min(ms, 60) : ms);
  }

  #show(on) {
    if (!on) this.#tutorial(null);
    for (const el of [this.bubble, this.form]) {
      el.classList.toggle('is-open', on);
      el.inert = !on;
    }
    if (on && !this.said) this.#say({});
    else if (on) this.#place();
  }

  #tutorial(id) {
    const v = this.video;
    v.onloadeddata = null;
    if (!id) {
      this.clip.classList.remove('is-open');
      this.clip.inert = true;
      v.pause();
      return;
    }
    this.clip.setAttribute('aria-label', `video: ${TUTORIALS[id]}`);
    v.controls = this.reduceMotion.matches;
    v.onloadeddata = () => {
      if (this.clip.hidden) {
        this.clip.hidden = false;
        void this.clip.offsetWidth;
      }
      this.clip.classList.add('is-open');
      this.clip.inert = false;
      if (!v.controls) v.play().catch(() => {});
    };
    v.src = `${CLIPS}/${id}.mp4`;
  }

  #say({ text, asked = '', thinking = false }) {
    const greeting = text == null && !thinking;
    if (greeting) text = matchMedia('(pointer: coarse)').matches ? LINES.introTouch : LINES.intro;
    this.said = !greeting;
    this.asked.hidden = !asked;
    this.asked.textContent = asked;
    if (thinking) {
      this.says.innerHTML =
        '<span class="helper__dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="visually-hidden">thinking</span>';
    } else {
      this.says.replaceChildren(...words(text));
    }
    this.says.scrollTop = 0;
    this.#place();
  }

  #place() {
    if (!this.vw || !this.side) return;
    const g = this.fly;
    const tip = { x: this.side.x - g.w * 0.14, y: this.side.y - g.h / 2 - 6 };
    const bottom = tip.y - TAIL;
    const b = this.bubble.style;
    b.setProperty('--room', `${Math.round(Math.max(120, bottom - this.head - 12))}px`);
    const w = this.bubble.offsetWidth;
    const h = this.bubble.offsetHeight;
    const r = Math.min(BUBBLE_RADIUS, h / 2);
    const left = Math.max(EDGE, Math.min(this.vw - EDGE - w, tip.x - w * 0.7));
    b.left = `${Math.round(left)}px`;
    b.bottom = `${Math.round(this.vh - bottom)}px`;
    const tx = tip.x - left;
    const half = Math.min(12, (w - 2 * r) / 2 - 2);
    const bx = Math.max(r + half, Math.min(w - r - half, tx - 6));
    const H = TAIL + 1;
    this.tail.setAttribute('width', String(w));
    this.tail.setAttribute('height', String(H + 1));
    this.tail.setAttribute('viewBox', `0 -1 ${w} ${H + 1}`);
    this.tailPath.setAttribute(
      'd',
      `M${(bx - half).toFixed(1)} -1 Q${(bx - half * 0.2).toFixed(1)} ${(H * 0.55).toFixed(1)} ${tx.toFixed(1)} ${H} ` +
        `Q${(bx + half * 0.5).toFixed(1)} ${(H * 0.45).toFixed(1)} ${(bx + half).toFixed(1)} -1 Z`,
    );
    b.setProperty('--tail', `${Math.round(tx)}px`);
  }

  async #ask(raw) {
    const q = raw.trim();
    if (!q || this.busy) return;
    this.busy = true;
    this.input.value = '';
    this.#say({ asked: q, thinking: true });
    const think = setTimeout(() => {
      this.flyer.want = 'think';
    }, THINK_AFTER);
    let text = LINES.lost;
    let clip = null;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: q, history: this.history, videos: this.state === 1 && this.clipFits }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 429) {
        text = LINES.winded;
      } else if (res.status === 503) {
        text = LINES.tired;
      } else if (res.ok) {
        const { reply, video } = await res.json();
        if (typeof reply === 'string' && reply) {
          text = reply;
          clip = video;
          this.history = [...this.history, { role: 'user', content: q }, { role: 'assistant', content: reply, video }].slice(-6);
        }
      }
    } catch {
    } finally {
      this.busy = false;
      clearTimeout(think);
    }
    this.flyer.want = text === LINES.lost || text === LINES.winded || text === LINES.tired ? 'idle' : 'answer';
    this.#say({ asked: q, text });
    this.#tutorial(this.state === 1 && !this.moving && this.clipFits && Object.hasOwn(TUTORIALS, clip ?? '') ? clip : null);
  }
}
