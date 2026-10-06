import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import './docs.css';
import appleLogo from './icons/apple.svg?raw';
import github from '@phosphor-icons/core/bold/github-logo-bold.svg?raw';
import caretDown from '@phosphor-icons/core/bold/caret-down-bold.svg?raw';
import link from '@phosphor-icons/core/bold/link-bold.svg?raw';
import copy from '@phosphor-icons/core/bold/copy-bold.svg?raw';
import check from '@phosphor-icons/core/bold/check-bold.svg?raw';

const ICONS = { apple: appleLogo, github, 'caret-down': caretDown, link, copy, check };
const icon = (el, name) => (el.innerHTML = ICONS[name]);
for (const el of document.querySelectorAll('[data-icon]')) icon(el, el.dataset.icon);

const said = document.getElementById('said');
const DONE_MS = 1600;

async function put(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function confirm(button, glyph, rest, words) {
  icon(glyph, 'check');
  button.classList.add('is-done');
  said.textContent = words;
  clearTimeout(button.timer);
  button.timer = setTimeout(() => {
    icon(glyph, rest);
    button.classList.remove('is-done');
    said.textContent = '';
  }, DONE_MS);
}

for (const h of document.querySelectorAll('.page :is(h2, h3)[id]')) {
  const a = document.createElement('a');
  a.className = 'anchor';
  a.href = `#${h.id}`;
  a.setAttribute('aria-label', `Copy link to “${h.textContent.trim()}”`);
  a.innerHTML = '<span class="icon" aria-hidden="true"></span>';
  const glyph = a.firstChild;
  icon(glyph, 'link');
  a.addEventListener('click', async () => {
    if (await put(a.href)) confirm(a, glyph, 'link', 'Link copied');
  });
  h.append(a);
}

for (const b of document.querySelectorAll('.copy')) {
  const glyph = b.querySelector('.icon');
  b.addEventListener('click', async () => {
    const text = b.parentElement.querySelector('code').textContent;
    if (await put(text)) confirm(b, glyph, 'copy', 'Copied');
  });
}

const rail = document.querySelector('.rail');
const toggle = rail.querySelector('.rail__toggle');
const now = rail.querySelector('.rail__now');
const narrow = matchMedia('(max-width: 899px)');
const marks = [...rail.querySelectorAll('.rail__list a')]
  .map((a) => ({ a, el: document.getElementById(a.hash.slice(1)) }))
  .filter((m) => m.el);

function open(on) {
  rail.classList.toggle('is-open', on);
  toggle.setAttribute('aria-expanded', String(on));
}
toggle.addEventListener('click', () => open(!rail.classList.contains('is-open')));
rail.addEventListener('click', (e) => e.target.closest('.rail__list a') && open(false));
addEventListener('pointerdown', (e) => !rail.contains(e.target) && open(false));
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !rail.classList.contains('is-open')) return;
  open(false);
  toggle.focus();
});
narrow.addEventListener('change', () => open(false));

let current = null;
let queued = false;

function spy() {
  queued = false;
  const line = innerHeight * 0.3;
  let at = marks[0];
  for (const m of marks) {
    if (m.el.getBoundingClientRect().top > line) break;
    at = m;
  }
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) at = marks[marks.length - 1];
  if (at === current) return;
  current?.a.removeAttribute('aria-current');
  current = at;
  at.a.setAttribute('aria-current', 'location');
  now.textContent = at.a.textContent;
  if (!narrow.matches) {
    const r = at.a.getBoundingClientRect();
    const box = rail.getBoundingClientRect();
    if (r.top < box.top + 24 || r.bottom > box.bottom - 24) {
      rail.scrollTop += r.top - box.top - box.height / 2;
    }
  }
}
function queue() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(spy);
}
addEventListener('scroll', queue, { passive: true });
addEventListener('resize', queue);
spy();

const cairn = document.querySelector('.cairn');
const stones = cairn?.querySelectorAll('[data-stone]') ?? [];
const HOME = '1';
function light(n) {
  for (const el of stones) el.classList.toggle('is-lit', el.dataset.stone === n);
}
cairn.addEventListener('pointerover', (e) => {
  const hit = e.target.closest('[data-stone]');
  if (hit) light(hit.dataset.stone);
});
cairn.addEventListener('pointerleave', () => light(HOME));
light(HOME);
