
const BASE = 'https://cdn.cairnstacks.app/fox';
const FPS = 24;
const BEAT = 24;
const FADE_MS = 160;
const GONE = 56;
const CLEAR = 35;
const DIVE_AT = [
  28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 26, 26, 25, 24, 24, 23, 23, 22,
  22, 22, 23, 23, 24, 25, 26, 26, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 27, 27, 26, 25,
  16, 16, 17, 17, 18, 21, 21, 21, 21, 22, 23, 23, 24, 25, 25, 26, 27, 28, 28, 28, 28, 28,
];
const LAST = { jump_up: 31, think: 47, answer: 71 };
const ANSWER_AT = [0, 0, 1, 1, 1, 3, 4, 6, 8, 9, 11, 12];

const probe = document.createElement('video');
const EXT = /Apple/.test(navigator.vendor) && probe.canPlayType('video/mp4; codecs="hvc1"') ? 'hevc.mov' : 'webm';

function frames(v, fn) {
  let live = true;
  let last = -1;
  const seen = (t) => {
    const f = Math.round(t * FPS);
    if (f !== last) fn(f, last);
    last = f;
  };
  if (v.requestVideoFrameCallback) {
    const next = (_, m) => {
      if (!live) return;
      seen(m.mediaTime);
      if (live) v.requestVideoFrameCallback(next);
    };
    v.requestVideoFrameCallback(next);
  } else {
    const next = () => {
      if (!live) return;
      if (!v.paused) seen(v.currentTime);
      requestAnimationFrame(next);
    };
    requestAnimationFrame(next);
  }
  return () => {
    live = false;
  };
}

function firstFrame(v, fn) {
  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(() => fn());
  else v.addEventListener('playing', () => fn(), { once: true });
}

class Clips {
  constructor(art, stage, names, reduceMotion, later = names) {
    this.art = art;
    this.reduceMotion = reduceMotion;
    this.clips = {};
    for (const name of names) {
      const v = document.createElement('video');
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.loop = name === 'idle';
      v.preload = later.includes(name) ? 'metadata' : 'auto';
      v.disablePictureInPicture = true;
      v.setAttribute('aria-hidden', 'true');
      v.className = 'fox__clip';
      v.src = `${BASE}/${stage}/${name}.${EXT}`;
      art.append(v);
      this.clips[name] = v;
      if (!v.loop) v.addEventListener('ended', () => this.name === name && this.frame(name, Infinity, -1));
    }
    this.name = null;
    this.on = null;
    this.stop = () => {};
    this.still = false;
  }

  warm() {
    for (const v of Object.values(this.clips)) v.preload = 'auto';
  }

  get calm() {
    return this.reduceMotion.matches || this.still;
  }

  set hidden(on) {
    this.art.classList.toggle('is-out', on);
    this.art.parentElement.inert = on;
  }
  get hidden() {
    return this.art.classList.contains('is-out');
  }

  show(name, at = 0) {
    this.stop();
    const v = this.clips[name];
    v.pause();
    v.currentTime = at / FPS;
    this.name = name;
    this.#swapTo(v);
  }

  get playing() {
    const v = this.clips[this.name];
    return !!v && !v.paused;
  }

  pause() {
    if (!this.playing) return;
    this.stop();
    this.clips[this.name].pause();
    this.on?.pause();
  }

  #swapTo(v, fade = 0) {
    const prev = this.on;
    this.on = v;
    for (const c of Object.values(this.clips)) {
      if (c !== v && c !== prev) c.classList.remove('is-on');
    }
    if (!prev || prev === v || !fade) {
      v.style.transition = '';
      v.classList.add('is-on');
      if (prev && prev !== v) this.#park(prev);
      return;
    }
    for (const c of [v, prev]) c.style.transition = `opacity ${fade}ms linear`;
    v.classList.add('is-on', 'is-fading-in');
    void v.offsetWidth;
    v.classList.remove('is-fading-in');
    prev.classList.add('is-fading-out');
    setTimeout(() => {
      prev.classList.remove('is-fading-out');
      if (this.on !== prev) this.#park(prev);
    }, fade);
  }

  #park(v) {
    v.classList.remove('is-on');
    v.style.transition = '';
    v.pause();
  }

  run(name, at = 0, fade = 0) {
    this.stop();
    const v = this.clips[name];
    if (Math.abs(v.currentTime - at / FPS) > 0.5 / FPS) v.currentTime = at / FPS;
    this.name = name;
    firstFrame(v, () => {
      if (this.name === name) this.#swapTo(v, fade);
    });
    v.play().catch((e) => {
      if (e.name !== 'NotAllowedError' || this.name !== name) return;
      this.still = true;
      this.refused();
    });
    this.stop = frames(v, (f, last) => {
      if (this.name === name) this.frame(name, f, last);
    });
  }

  refused() {
    this.show('idle');
  }

  frame() {}
}

export class Perch extends Clips {
  constructor(art, reduceMotion) {
    super(art, 'stage1', ['jump_up', 'idle', 'jump_down'], reduceMotion, ['jump_down']);
    this.diving = false;
  }

  reset() {
    this.diving = false;
    this.art.parentElement.classList.remove('is-diving');
    this.show(this.calm ? 'idle' : 'jump_up');
    this.hidden = true;
  }

  jumpUp() {
    this.warm();
    this.hidden = false;
    if (this.calm) this.show('idle');
    else this.run('jump_up');
  }

  dive() {
    if (this.hidden || this.diving) return;
    if (this.calm || this.name === 'jump_up') {
      this.pause();
      this.hidden = true;
      return;
    }
    this.diving = true;
    const f = Math.round(this.clips.idle.currentTime * FPS) % DIVE_AT.length;
    this.run('jump_down', DIVE_AT[f], FADE_MS);
  }

  refused() {
    super.refused();
    if (this.diving) {
      this.hidden = true;
      this.diving = false;
    }
  }

  frame(name, f) {
    if (name === 'jump_up' && f >= LAST.jump_up) {
      this.run('idle');
    } else if (name === 'jump_down' && f >= GONE) {
      this.pause();
      this.hidden = true;
      this.diving = false;
    } else if (name === 'jump_down' && f >= CLEAR) {
      this.art.parentElement.classList.add('is-diving');
    }
  }
}

export class Flyer extends Clips {
  constructor(art, reduceMotion) {
    super(art, 'stage2', ['idle', 'think', 'answer'], reduceMotion);
    this.want = 'idle';
  }

  start() {
    this.hidden = false;
    this.want = 'idle';
    if (this.calm) this.show('idle');
    else if (this.name !== 'idle' || !this.playing) this.run('idle');
  }

  end() {
    this.pause();
    this.hidden = true;
  }

  resume() {
    if (this.hidden || this.calm || !this.name || this.playing) return;
    this.run(this.name, Math.round(this.clips[this.name].currentTime * FPS));
  }

  frame(name, f, last) {
    if (name === 'idle') {
      if (this.want === 'answer' && f % BEAT < ANSWER_AT.length) {
        this.run('answer', ANSWER_AT[f % BEAT], FADE_MS);
        return;
      }
      const beat = f % BEAT === BEAT - 1 || (last >= 0 && Math.floor(f / BEAT) !== Math.floor(last / BEAT));
      if (beat && this.want !== 'idle') this.run(this.want);
    } else if (name === 'think' && f >= LAST.think) {
      if (this.want === 'think') this.want = 'idle';
      this.run(this.want);
    } else if (name === 'answer' && f >= LAST.answer) {
      this.want = 'idle';
      this.run('idle');
    }
  }
}
