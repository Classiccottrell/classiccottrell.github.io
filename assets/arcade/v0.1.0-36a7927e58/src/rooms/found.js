// Found-rooms persistence. Storage may be missing or throw (private mode); never propagate.
export const FOUND_KEY = 'cc-sidescroller:found';
export const TOTAL_ROOMS = 1;

function defaultStorage() { try { return globalThis.localStorage ?? null; } catch { return null; } }

export function readFound(storage = defaultStorage()) {
  try {
    const v = JSON.parse(storage?.getItem(FOUND_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string') : [];
  } catch { return []; }
}

// Returns { isNew, count }. Without working storage, falls back to in-memory `session` set.
const session = new Set();
export function markFound(slug, storage = defaultStorage()) {
  const found = new Set([...readFound(storage), ...session]);
  const isNew = !found.has(slug);
  found.add(slug);
  session.add(slug);
  try { storage?.setItem(FOUND_KEY, JSON.stringify([...found])); } catch { /* ignore */ }
  return { isNew, count: found.size };
}
export function _resetSession() { session.clear(); }
