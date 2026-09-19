// liquidglass.dev page behaviour: language, code blocks, demos, playground.
import { toast, renderLensMap } from '../lib/components.js';
import { zh, ui } from './i18n.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

/* ---------------------------------------------------------------- language */

const i18nNodes = $$('[data-i18n]');
const english = new Map(i18nNodes.map((n) => [n, n.innerHTML]));
let lang = 'en';
try {
  lang = localStorage.getItem('lang') || (navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en');
} catch {
  lang = navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
const t = () => ui[lang];
const langListeners = [];

function applyLang(next) {
  lang = next === 'zh' ? 'zh' : 'en';
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  for (const n of i18nNodes) {
    const key = n.dataset.i18n;
    n.innerHTML = lang === 'zh' && zh[key] ? zh[key] : english.get(n);
  }
  try {
    localStorage.setItem('lang', lang);
  } catch {}
  for (const el of $$('lg-navbar, lg-segmented')) el.refresh?.();
  for (const fn of langListeners) fn();
}

const langSwitch = $('#lang-switch');
if (langSwitch) {
  langSwitch.value = lang;
  langSwitch.addEventListener('change', (e) => applyLang(e.detail.value));
}
applyLang(lang);

/* ---------------------------------------------------------------- code blocks */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function spans(src, re, classify) {
  let out = '';
  let last = 0;
  for (const m of src.matchAll(re)) {
    out += esc(src.slice(last, m.index));
    const cls = classify(m);
    out += cls ? `<span class="tok-${cls}">${esc(m[0])}</span>` : esc(m[0]);
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}

const JS_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\b(import|from|export|default|const|let|var|function|return|new|if|else|await|async|for|of|class|extends|true|false|null|undefined)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\()/g;
const highlightJS = (src) => spans(src, JS_RE, (m) => (m[1] ? 'com' : m[2] ? 'str' : m[3] ? 'key' : m[4] ? 'num' : 'fn'));

const CSS_RE = /(\/\*[\s\S]*?\*\/)|("[^"]*"|'[^']*')|(--[\w-]+|[\w-]+)(?=\s*:)|(-?\d+(?:\.\d+)?(?:px|%|s|ms|deg)?)/g;
const highlightCSS = (src) => spans(src, CSS_RE, (m) => (m[1] ? 'com' : m[2] ? 'str' : m[3] ? 'attr' : 'num'));

const SH_RE = /((?:^|(?<=\s))#[^\n]*)|("[^"]*"|'[^']*')|(^|(?<=\n))([\w.-]+)/g;
const highlightSH = (src) => spans(src, SH_RE, (m) => (m[1] ? 'com' : m[2] ? 'str' : 'fn'));

function highlightTag(tag) {
  if (tag.startsWith('<!--')) return `<span class="tok-com">${esc(tag)}</span>`;
  const m = tag.match(/^<(\/?)([\w-]+)([\s\S]*?)(\/?)>$/);
  if (!m) return esc(tag);
  const attrs = m[3].replace(/([^\s=]+)(=)("[^"]*"|'[^']*'|[^\s"'>]+)?|([^\s=]+)|(\s+)/g, (all, name, eq, value, bare, ws) => {
    if (ws) return ws;
    if (bare) return `<span class="tok-attr">${esc(bare)}</span>`;
    return `<span class="tok-attr">${esc(name)}</span>=${value ? `<span class="tok-str">${esc(value)}</span>` : ''}`;
  });
  return `&lt;${m[1]}<span class="tok-tag">${m[2]}</span>${attrs}${m[4]}&gt;`;
}

function highlightHTML(src) {
  let out = '';
  let last = 0;
  const re = /<!--[\s\S]*?-->|<\/?[\w-]+(?:\s[^<>]*?)?\/?>/g;
  for (const m of src.matchAll(re)) {
    const text = src.slice(last, m.index);
    // Script bodies inside HTML samples read better as JavaScript.
    out += /<script[^>]*>\s*$/.test(src.slice(0, m.index)) || /\bimport\b|=>/.test(text) ? highlightJS(text) : esc(text);
    out += highlightTag(m[0]);
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}

const HIGHLIGHT = { html: highlightHTML, js: highlightJS, css: highlightCSS, bash: highlightSH };
const LABEL = { html: 'HTML', js: 'JavaScript', css: 'CSS', bash: 'Terminal' };

function dedent(text) {
  const lines = text.replace(/<\\\//g, '</').replace(/^\s*\n/, '').replace(/\n\s*$/, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
}

export function codeBlock(code, kind, title) {
  const figure = document.createElement('figure');
  figure.className = 'code';
  figure.innerHTML = `<div class="code__bar"><span></span><button type="button" class="code__copy"><svg class="icon" aria-hidden="true"><use href="${ICONS}#copy"/></svg><span></span></button></div><pre><code></code></pre>`;
  const label = figure.querySelector('.code__bar > span');
  const button = figure.querySelector('.code__copy');
  const buttonText = button.querySelector('span');
  const codeEl = figure.querySelector('code');
  const set = (src) => {
    figure.dataset.source = src;
    codeEl.innerHTML = (HIGHLIGHT[kind] ?? esc)(src);
  };
  set(code);
  label.textContent = title || LABEL[kind] || '';
  buttonText.textContent = t().copy;
  langListeners.push(() => (buttonText.textContent = t().copy));
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(figure.dataset.source);
      buttonText.textContent = t().copied;
      setTimeout(() => (buttonText.textContent = t().copy), 1600);
    } catch {}
  });
  figure.update = set;
  return figure;
}

const ICONS = new URL('icons.svg', import.meta.url).pathname;
for (const script of $$('script[type="text/plain"][data-code]')) {
  script.replaceWith(codeBlock(dedent(script.textContent), script.dataset.code, script.dataset.title));
}

/* ---------------------------------------------------------------- demos */

function browserName() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\/|FxiOS/.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS/.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'your browser';
}

const hero = $('#hero');
if (hero) {
  setTimeout(() => toast(t().refracting(browserName()), { container: hero, icon: 'check', tone: 'light', duration: 4200 }), 900);
}

let note = 0;
$('#notify-trigger')?.addEventListener('click', () => {
  const list = t().notifications;
  toast(list[note++ % list.length], { container: $('#notify-stage'), icon: 'bell' });
});

$('#toast-demo-button')?.addEventListener('click', () => {
  const list = t().notifications;
  toast(list[note++ % list.length], { container: $('#toast-demo'), icon: 'bell' });
});

// docs: highlight the section in view
const docLinks = $$('.docs__nav a[href^="#"]');
if (docLinks.length) {
  const targets = docLinks.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const spy = () => {
    let current = targets[0];
    for (const s of targets) if (s.getBoundingClientRect().top < 140) current = s;
    docLinks.forEach((a) => a.classList.toggle('is-active', a.hash === `#${current.id}`));
  };
  addEventListener('scroll', spy, { passive: true });
  spy();
}

const brightness = $('#brightness');
brightness?.addEventListener('input', () => {
  $('[data-brightness]').textContent = `${Math.round(brightness.value)}%`;
});

const clock = $('[data-clock]');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  const tick = () => (clock.textContent = fmt.format(new Date()).replace(',', ''));
  tick();
  setInterval(tick, 30000);
}

/* sticky navbar: appears once the hero has scrolled away, tracks the section in view */
const topbar = $('#topbar');
if (topbar && hero) {
  topbar.hidden = false;
  new IntersectionObserver(([entry]) => topbar.classList.toggle('is-visible', !entry.isIntersecting), { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
  const nav = $('lg-navbar', topbar);
  const links = $$('a', nav);
  const sections = links.map((a) => (a.hash ? document.getElementById(a.hash.slice(1)) : null));
  const seen = new Map();
  const sectionObserver = new IntersectionObserver((entries) => {
    for (const e of entries) seen.set(e.target, e.intersectionRatio);
    let best = -1;
    let bestRatio = 0;
    sections.forEach((s, i) => {
      const r = s ? seen.get(s) ?? 0 : 0;
      if (r > bestRatio) {
        bestRatio = r;
        best = i;
      }
    });
    if (best >= 0 && best !== nav.current) nav.setCurrent?.(best);
  }, { threshold: [0, 0.2, 0.5, 0.8] });
  sections.filter(Boolean).forEach((s) => sectionObserver.observe(s));
}

/* ---------------------------------------------------------------- playground */

const pgLens = $('#pg-lens');
if (pgLens) {
  const params = { width: 240, height: 160, radius: 80, refraction: 28, bezel: 0.6, curvature: 4, chroma: 0.15, blur: 0, specular: 0.5 };
  const RANGES = {
    width: [120, 360, 2],
    height: [80, 280, 2],
    radius: [0, 140, 1],
    refraction: [0, 60, 1],
    bezel: [0.1, 1, 0.05],
    curvature: [1.5, 8, 0.5],
    chroma: [0, 0.5, 0.01],
    blur: [0, 8, 0.5],
    specular: [0, 1, 0.05],
  };
  const box = $('#pg-params');
  const map = $('#pg-map');
  const code = codeBlock('', 'html', 'HTML');
  $('#pg-code').append(code);
  const labels = [];

  for (const [key, [min, max, step]] of Object.entries(RANGES)) {
    const row = document.createElement('div');
    row.className = 'param';
    const id = `pg-${key}`;
    row.innerHTML = `<label for="${id}"></label><output></output>`;
    const slider = document.createElement('lg-slider');
    Object.entries({ min, max, step, value: params[key], label: key, id }).forEach(([k, v]) => slider.setAttribute(k, v));
    row.append(slider);
    box.append(row);
    const label = row.querySelector('label');
    const out = row.querySelector('output');
    labels.push(() => (label.textContent = t().params[key]));
    out.textContent = params[key];
    slider.addEventListener('input', () => {
      params[key] = Number(slider.value);
      out.textContent = params[key];
      update();
    });
  }
  labels.forEach((f) => f());
  langListeners.push(() => labels.forEach((f) => f()));

  function drawMap() {
    const dpr = window.devicePixelRatio || 1;
    map.width = Math.round(map.clientWidth * dpr);
    map.height = Math.round(map.clientHeight * dpr);
    const ctx = map.getContext('2d');
    ctx.fillStyle = 'rgb(128,128,128)';
    ctx.fillRect(0, 0, map.width, map.height);
    const { canvas } = renderLensMap({ ...params, radius: Math.min(params.radius, params.width / 2, params.height / 2) }, 1);
    const s = Math.min(map.width / canvas.width, map.height / canvas.height) * 0.86;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, (map.width - canvas.width * s) / 2, (map.height - canvas.height * s) / 2, canvas.width * s, canvas.height * s);
  }

  let frame = 0;
  function update() {
    pgLens.configure?.({ ...params });
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      drawMap();
      const attrs = Object.entries(params)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      code.update(`<lg-lens ${attrs}>\n  <img src="photo.jpg" alt="">\n</lg-lens>`);
    });
  }
  customElements.whenDefined('lg-lens').then(() => requestAnimationFrame(update));
  new ResizeObserver(() => drawMap()).observe(map);
}
