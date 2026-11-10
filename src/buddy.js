import { STONES } from './cairn-stones.js';

const SRC_W = 1920;
const FAR = 0.8;
const TURN = 320;
const POP_AFTER = 3400;
const README = 'https://github.com/lukesj28/cairn';
const EASE = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  pop: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  drop: 'cubic-bezier(0.5, 0, 0.9, 0.4)',
  glide: 'cubic-bezier(0.45, 0, 0.25, 1)',
};
const ALOFT = ['side', 'far'];
const LINES = {
  scroll: 'psst, there’s more. scroll down.',
  swipe: 'psst, there’s more. swipe up.',
  intro: 'hi! I answer questions about cairn. ask me anything, or scroll down to the cairn to explore on your own.',
  introTouch: 'hi! I answer questions about cairn. ask me anything, or swipe up to the cairn to explore on your own.',
  cairn: 'each stone goes somewhere. pick one, or ask me anything about cairn.',
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
    a.textContent = url.replace(/^https?:\/\/(www\.)?/, '');
    out.push(text.slice(at, m.index), a);
    at = m.index + url.length;
  }
  out.push(text.slice(at));
  return out;
}

export class Buddy {
  constructor(root, { reduceMotion, step }) {
    this.root = root;
    this.reduceMotion = reduceMotion;
    this.step = step;
    this.body = root.querySelector('.buddy__body');
    this.bubble = root.querySelector('.buddy__bubble');
    this.asked = root.querySelector('.buddy__asked');
    this.says = root.querySelector('.buddy__say');
    this.form = root.querySelector('.buddy__ask');
    this.input = this.form.querySelector('input');
    this.clip = root.querySelector('.buddy__clip');
    this.video = this.clip.querySelector('video');
    this.clipFits = false;
    this.bareControls = null;
    this.clip.querySelector('.buddy__clip-close').addEventListener('click', () => this.#tutorial(null));
    const full = this.clip.querySelector('.buddy__clip-full');
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

    let holder = root;
    this.veils = STONES.map(() => {
      const v = document.createElement('div');
      v.className = 'buddy__veil';
      holder.prepend(v);
      holder = v;
      return v;
    });
    holder.append(this.body);

    this.state = -1;
    this.pose = 'below';
    this.spots = {};
    this.turn = 0;
    this.moving = false;
    this.veiled = false;
    this.open = false;
    this.busy = false;
    this.hinted = false;
    this.greeted = false;
    this.line = null;
    this.history = [];
    this.vw = 0;
    this.vh = 0;
    this.cover = { x: 0, y: 0, w: SRC_W };

    this.body.addEventListener('click', () => {
      if (this.moving) return;
      if (this.state === 0) this.step(1);
      else this.#toggle(!this.open);
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
    this.cover = cover;
    const w = this.body.offsetWidth;
    const h = this.body.offsetHeight;
    const cornerX = vw - Math.max(20, Math.min(64, vw * 0.045)) - w / 2;
    const cornerY = vh - bar - h / 2 + 6;
    const sideX = vw - Math.max(22, vw * 0.07) - w / 2;
    this.spots = {
      below: { x: cornerX, y: vh + h, s: 1 },
      hop: { x: cornerX, y: cornerY - 26, s: 1 },
      corner: { x: cornerX, y: cornerY, s: 1 },
      away: { x: vw + w, y: vh * 0.5, s: 1 },
      side: { x: sideX, y: vh * 0.5, s: 1 },
      far: { x: sideX - vw * 0.06, y: vh * 0.43, s: FAR },
    };
    this.h = h;
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
    this.#move(this.pose);
    this.#veil(this.veiled);
    this.#place();
  }

  leave(from, to, ms) {
    this.turn++;
    this.moving = true;
    this.#toggle(false);
    this.root.classList.toggle('is-turned', to === 2);
    if (from === 0) {
      this.#move('hop', 160, EASE.out);
      this.#after(160, () => this.#move('below', 340, EASE.drop));
    } else if (to === 0) {
      this.#move('away', 450, EASE.drop);
    } else if (to === 2) {
      this.#after(TURN, () => this.#move('far', Math.max(TURN, ms - TURN), EASE.glide));
    } else {
      this.#veil(false);
      this.#move('side', ms, EASE.glide);
    }
  }

  arrive(state) {
    this.turn++;
    this.state = state;
    this.moving = false;
    this.root.classList.remove('is-turned');
    this.body.setAttribute('aria-label', state === 0 ? 'Scroll down' : 'Ask about cairn');
    if (state === 0) this.body.removeAttribute('aria-expanded');
    else this.body.setAttribute('aria-expanded', String(this.open));

    if (state === 0) {
      this.#veil(false);
      this.#move('below');
      const wait = this.hinted ? 200 : POP_AFTER;
      this.#after(wait, () => this.#move('corner', 700, EASE.pop));
      this.#after(wait + 750, () => {
        if (this.hinted) return;
        this.hinted = true;
        this.#toggle(true);
      });
    } else if (state === 1) {
      this.#veil(false);
      const fromGround = !ALOFT.includes(this.pose);
      if (fromGround) this.#move('away');
      this.#after(60, () => this.#move('side', fromGround ? 1100 : 600, EASE.out));
      this.#after(800, () => {
        if (this.greeted) return;
        this.greeted = true;
        this.#toggle(true);
      });
    } else {
      this.#veil(true);
      this.#move('far', 600, EASE.out);
    }
  }

  #after(ms, fn) {
    const turn = this.turn;
    setTimeout(() => turn === this.turn && fn(), this.reduceMotion.matches ? Math.min(ms, 60) : ms);
  }

  #move(pose, ms = 0, ease = EASE.out) {
    const p = this.spots[pose];
    this.pose = pose;
    if (!p) return;
    const b = this.body.style;
    b.setProperty('--ms', `${this.reduceMotion.matches ? 0 : Math.round(ms)}ms`);
    b.setProperty('--ease', ease);
    b.setProperty('--x', `${p.x.toFixed(1)}px`);
    b.setProperty('--y', `${p.y.toFixed(1)}px`);
    b.setProperty('--s', p.s.toFixed(3));
    this.root.classList.toggle('is-aloft', ALOFT.includes(pose));
    this.root.classList.toggle('is-gone', pose === 'below' || pose === 'away');
  }

  #veil(on) {
    this.veiled = on;
    if (!on) {
      for (const v of this.veils) v.style.clipPath = '';
      return;
    }
    const { cover, vw, vh } = this;
    const s = cover.w / SRC_W;
    this.veils.forEach((v, i) => {
      const pts = STONES[i].points;
      let d = `M0 0H${vw}V${vh}H0Z`;
      for (let j = 0; j < pts.length; j += 2) {
        d += `${j ? 'L' : 'M'}${(cover.x + pts[j] * s).toFixed(1)} ${(cover.y + pts[j + 1] * s).toFixed(1)}`;
      }
      v.style.clipPath = `path(evenodd, "${d}Z")`;
    });
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
      } else if (this.state === 2) {
        text = LINES.cairn;
      } else {
        text = touch ? LINES.introTouch : LINES.intro;
      }
    }
    this.line = { greeting };
    this.asked.hidden = !asked;
    this.asked.textContent = asked;
    if (thinking) {
      this.says.innerHTML =
        '<span class="buddy__dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="visually-hidden">thinking</span>';
    } else {
      this.says.replaceChildren(...words(text));
    }
    this.says.scrollTop = 0;
    this.form.hidden = hint;
    this.bubble.classList.toggle('buddy__bubble--hint', hint);
    this.root.classList.toggle('is-thinking', thinking);
    this.#place();
  }

  #place() {
    const p = this.spots[this.pose];
    if (!p || !this.vw) return;
    const edge = 16;
    const top = p.y - (this.h * p.s) / 2 - 30;
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
    let text = LINES.lost;
    let clip = null;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: q, history: this.history }),
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
          this.history = [...this.history, { role: 'user', content: q }, { role: 'assistant', content: reply }].slice(-6);
        }
      }
    } catch {
    } finally {
      this.busy = false;
    }
    this.#say({ asked: q, text });
    this.#tutorial(this.state === 1 && !this.moving && this.open && this.clipFits && Object.hasOwn(TUTORIALS, clip ?? '') ? clip : null);
  }
}
