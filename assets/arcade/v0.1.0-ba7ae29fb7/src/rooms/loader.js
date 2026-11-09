// Room JSON validation (docs/design.md s5). Pure; no DOM.
export const SCREEN_W = 320;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class RoomError extends Error {
  constructor(errors) {
    super(`Invalid room: ${errors.join('; ')}`);
    this.name = 'RoomError';
    this.errors = errors;
  }
}

const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function isCanonicalHref(h) {
  return typeof h === 'string' && h.startsWith('/work/') && !h.startsWith('//')
    && !h.includes('..') && !/[\s\\:]/.test(h);
}

// opts.knownSprites: optional Set/array of allowed sprite names.
export function loadRoom(json, { knownSprites } = {}) {
  const errs = [];
  const j = json;
  if (j === null || typeof j !== 'object' || Array.isArray(j)) throw new RoomError(['room must be an object']);
  if (!isStr(j.slug) || !SLUG_RE.test(j.slug)) errs.push('slug must be a lowercase-hyphen string');
  if (!isStr(j.title)) errs.push('title must be a non-empty string');
  if (!isStr(j.href)) errs.push('href must be a non-empty string');
  else if (!isCanonicalHref(j.href)) errs.push('href must start with "/work/" and be a site-relative path');
  if (!isStr(j.theme)) errs.push('theme must be a non-empty string');
  const widthOk = Number.isInteger(j.width) && j.width >= 1 && j.width <= 3;
  if (!widthOk) errs.push('width must be an integer 1 to 3 (screens)');
  const maxX = widthOk ? j.width * SCREEN_W : Infinity;
  const known = knownSprites ? new Set(knownSprites) : null;

  const props = [];
  if (!Array.isArray(j.props)) errs.push('props must be an array');
  else j.props.forEach((p, i) => {
    if (p === null || typeof p !== 'object') { errs.push(`props[${i}] must be an object`); return; }
    if (!isStr(p.sprite)) errs.push(`props[${i}].sprite must be a non-empty string`);
    else if (known && !known.has(p.sprite)) errs.push(`props[${i}].sprite "${p.sprite}" is unknown`);
    if (!isNum(p.x) || p.x < 0 || p.x > maxX) errs.push(`props[${i}].x must be a number within 0..${maxX}`);
    props.push({ sprite: p.sprite, x: p.x });
  });

  const it = j.interact;
  if (it === null || typeof it !== 'object' || Array.isArray(it)) errs.push('interact must be an object');
  else {
    if (!isNum(it.x) || it.x < 0 || it.x > maxX) errs.push(`interact.x must be a number within 0..${maxX}`);
    if (!isStr(it.card)) errs.push('interact.card must be a non-empty string');
  }

  if (errs.length) throw new RoomError(errs);
  return {
    slug: j.slug, title: j.title, href: j.href, theme: j.theme, width: j.width,
    props, interact: { x: it.x, card: it.card },
  };
}

export async function fetchRoom(url, opts) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`room fetch failed: ${res.status}`);
  return loadRoom(await res.json(), opts);
}
