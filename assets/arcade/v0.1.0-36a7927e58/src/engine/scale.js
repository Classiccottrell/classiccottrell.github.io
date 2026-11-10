export const BASE_W = 320;
export const BASE_H = 180;

// Pure: largest integer scale (>=1) that fits w x h, plus centred letterbox offsets (never negative).
export function fitScale(w, h, baseW = BASE_W, baseH = BASE_H) {
  const scale = Math.max(1, Math.floor(Math.min(w / baseW, h / baseH)));
  return {
    scale,
    width: baseW * scale,
    height: baseH * scale,
    offsetX: Math.max(0, Math.floor((w - baseW * scale) / 2)),
    offsetY: Math.max(0, Math.floor((h - baseH * scale) / 2)),
  };
}

// Sizes the canvas. Scale is integer in DEVICE pixels so every game pixel is a whole number of
// physical pixels; CSS size = device size / dpr. availW/availH are CSS px (default: viewport).
export function applyScale(canvas, availW, availH, dpr = (globalThis.devicePixelRatio || 1)) {
  const r = fitScale(availW * dpr, availH * dpr);
  canvas.width = BASE_W;
  canvas.height = BASE_H;
  canvas.style.width = `${r.width / dpr}px`;
  canvas.style.height = `${r.height / dpr}px`;
  canvas.style.imageRendering = 'pixelated';
  return r;
}

export const MAX_WIDE_W = 1280;

// Pure: wide mode. Internal height stays BASE_H; scale is the integer fitting the HEIGHT (>=1, capped so width >= 240);
// internal width = ceil(w / scale) clamped to maxW (extra space letterboxes, centred). Inputs in device px.
export function fitWide(w, h, { baseH = BASE_H, maxW = MAX_WIDE_W, minW = 240 } = {}) {
  // Height picks the scale, but never so large the view drops below minW internal px (portrait phones).
  const scale = Math.max(1, Math.min(Math.floor(h / baseH), Math.floor(w / minW)));
  const width = Math.max(1, Math.min(maxW, Math.ceil(w / scale)));
  return { scale, width, height: baseH, pxW: width * scale, pxH: baseH * scale };
}

// Sizes the canvas for wide mode; availW/availH are CSS px. Returns fitWide's result (internal width/height).
export function applyWide(canvas, availW, availH, dpr = (globalThis.devicePixelRatio || 1)) {
  const r = fitWide(availW * dpr, availH * dpr);
  canvas.width = r.width;
  canvas.height = r.height;
  canvas.style.width = `${r.pxW / dpr}px`;
  canvas.style.height = `${r.pxH / dpr}px`;
  canvas.style.maxWidth = 'none';
  canvas.style.imageRendering = 'pixelated';
  return r;
}

export const WORLD_ZOOM = 2;
export const worldViewWidth = (width) => Math.ceil(width / WORLD_ZOOM);
