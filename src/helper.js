import { Perch, Flyer } from './fox.js';

const SRC_W = 1920;
const SRC_H = 1080;
const ARRIVE_MS = 2100;
const JUMP_MS = 1400;
const THINK_AFTER = 700;
const NEAR = 0.55;
const LEDGE = 668 / 726;
const FRAME = {
  perch: { w: 1262, h: 726, box: [0.4, 0.25, 0.8, LEDGE] },
  fly: { w: 920, h: 544, box: [0.29, 0.04, 0.72, 0.87] },
};
const README = 'https://github.com/lukesj28/cairn';
const LINES = {
  scroll: 'psst, there’s more. scroll down.',
  swipe: 'psst, there’s more. swipe up.',
  intro: 'hi! I answer questions about cairn. ask me anything, or scroll down to the cairn to explore on your own.',
  introTouch: 'hi! I answer questions about cairn. ask me anything, or swipe up to the cairn to explore on your own.',
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
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOSTS.has(host) || Array.from(ALLOWED_HOSTS).some((h) => host.endsWith(`.${h}`));
  } catch {
    return false;
  }
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
    a.textContent = url.replace(/^https?:\/\/(www\.)?/, '').toLowerCase();
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
    this.geo = {};
    this.side = null;
    this.focusX = 0;
    this.carried = '';
    this.off = false;
    this.turn = 0;
    this.moving = false;
    this.open = false;
    this.busy = false;
    this.hinted = false;
    this.greeted = false;
    this.line = null;
    this.history = [];
    this.vw = 0;
    this.vh = 0;

    this.body.addEventListener('click', () => {
      if (!this.moving && this.state === 1) this.#toggle(!this.open);
    });
    this.perchEl.addEventListener('click', () => {
      if (!this.moving && this.state === 0) this.step(1);
    });
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.#ask(this.input.value);
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !this.open) return;
      this.#toggle(false);
      this.body.focus({ preventScroll: true });
    });
  }

  layout(vw, vh, cover, bar) {
    this.vw = vw;
    this.vh = vh;
    const s = Math.min(cover.h / SRC_H, ((vw < 700 ? 0.8 : 0.5) * vw) / FRAME.perch.w);
    for (const [n, { w, h, box }] of Object.entries(FRAME)) {
      const fw = w * s;
      const fh = h * s;
      this.geo[n] = { fw, fh, x: box[0] * fw, y: box[1] * fh, w: (box[2] - box[0]) * fw, h: (box[3] - box[1]) * fh };
    }
    const g1 = this.geo.perch;
    this.perchAt = { x: vw + 2 - g1.fw + g1.x, y: vh - bar - LEDGE * g1.fh + g1.y };
    this.#size(this.perchEl, g1);
    const pe = this.perchEl.style;
    pe.setProperty('--x', `${this.perchAt.x.toFixed(1)}px`);
    pe.setProperty('--y', `${this.perchAt.y.toFixed(1)}px`);
    const g2 = this.geo.fly;
    this.#size(this.body, g2);
    const left2 = vw - Math.max(12, vw * 0.035) - g2.fw;
    this.side = { x: left2 + g2.x + g2.w / 2, y: Math.min(vh * 0.58, vh - bar - g2.fh / 2) - g2.fh / 2 + g2.y + g2.h / 2 };
    this.body.style.setProperty('--x', `${this.side.x.toFixed(1)}px`);
    this.body.style.setProperty('--y', `${this.side.y.toFixed(1)}px`);
    this.focusX = cover.x + cover.w / 2;
    this.carried = '';
    this.bar = bar;
    const head = document.querySelector('.head')?.offsetHeight ?? 0;
    const cx = vw / 4;
    const cy = (head + vh - bar) / 2;
    const cairnX = cover.x + CAIRN_LEFT * (cover.w / SRC_W);
    const cw = Math.min(
      CLIP.max,
      2 * (cx - CLIP.edge),
      2 * (cairnX - CLIP.gap - cx),
      2 * (vh - bar - CLIP.edge - cy) * CLIP.aspect,
    );
    this.clipFits = vw >= 700 && cw >= CLIP.min;
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
    this.#toggle(false);
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
    this.body.setAttribute('aria-expanded', String(this.open));

    if (state === 0) {
      this.flyer.end();
      this.perch.reset();
      const wait = first ? ARRIVE_MS : 200;
      this.#after(wait, () => {
        this.perch.jumpUp();
        this.flyer.warm();
      });
      this.#after(wait + JUMP_MS, () => {
        if (this.hinted) return;
        this.hinted = true;
        this.#toggle(true);
      });
    } else if (state === 2) {
      this.flyer.end();
    } else if (state === 1) {
      this.flyer.start();
      this.flyer.want = 'answer';
      this.#after(800, () => {
        if (this.greeted) return;
        this.greeted = true;
        this.#toggle(true);
      });
    }
  }

  carry(rideY, passU) {
    if (!this.side) return;
    const k = NEAR / (NEAR - Math.min(passU, NEAR * 0.99));
    const x = (this.side.x - this.focusX) * (k - 1);
    const g = this.geo.fly;
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

  #toggle(open) {
    if (!open) this.#tutorial(null);
    if (open && (!this.line || this.line.greeting)) this.#say({});
    this.open = open;
    this.bubble.classList.toggle('is-open', open);
    this.bubble.inert = !open;
    if (this.state > 0) this.body.setAttribute('aria-expanded', String(open));
    if (open) this.#place();
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
    let hint = false;
    const greeting = text == null && !thinking;
    const touch = matchMedia('(pointer: coarse)').matches;
    if (greeting) {
      if (this.state === 0) {
        hint = true;
        text = touch ? LINES.swipe : LINES.scroll;
      } else {
        text = touch ? LINES.introTouch : LINES.intro;
      }
    }
    this.line = { greeting };
    this.asked.hidden = !asked;
    this.asked.textContent = asked;
    if (thinking) {
      this.says.innerHTML =
        '<span class="helper__dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="visually-hidden">thinking</span>';
    } else {
      this.says.replaceChildren(...words(text));
    }
    this.says.scrollTop = 0;
    this.form.hidden = hint;
    this.bubble.classList.toggle('helper__bubble--hint', hint);
    this.#place();
  }

  #place() {
    if (!this.vw) return;
    let p;
    let top;
    if (this.state <= 0) {
      const g = this.geo.perch;
      p = { x: this.perchAt.x + g.w / 2 };
      top = this.perchAt.y - 22;
    } else {
      p = this.side;
      top = p.y - this.geo.fly.h / 2 - 22;
    }
    const edge = 16;
    const b = this.bubble.style;
    b.setProperty('--room', `${Math.round(Math.max(140, top - this.bar - 12))}px`);
    const w = this.bubble.offsetWidth;
    const left = Math.max(edge, Math.min(this.vw - edge - w, p.x + 44 - w));
    b.left = `${Math.round(left)}px`;
    b.bottom = `${Math.round(this.vh - top)}px`;
    b.setProperty('--tail', `${Math.round(Math.max(26, Math.min(w - 26, p.x - left)))}px`);
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
    this.#tutorial(this.state === 1 && !this.moving && this.open && this.clipFits && Object.hasOwn(TUTORIALS, clip ?? '') ? clip : null);
  }
}
