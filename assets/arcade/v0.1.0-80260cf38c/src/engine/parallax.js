// Pure: integer wrapped scroll offset in [0, layerW) for a layer.
export function layerOffset(camX, factor, layerW, ambient = 0) {
  const o = Math.floor(camX * factor + ambient) % layerW;
  return o < 0 ? o + layerW : o;
}

// Pure: x draw positions covering [0, viewW) for a layer of width layerW at offset.
export function tilePositions(offset, layerW, viewW = 320) {
  const xs = [];
  for (let x = 0 - offset || 0; x < viewW; x += layerW) xs.push(x);
  return xs;
}

// layers: [{ source: drawable, factor, ambient?: px/sec, y?: number, density?: sheet px per world unit (default 1) }]
export function drawParallax(ctx, layers, camX, time = 0, viewW = 320) {
  for (const l of layers) {
    if (l.fit) {ctx.drawImage(l.source,0,l.y||0,viewW,l.source.height);continue;}
    const d = l.density || 1, w = l.source.width / d; // world-unit width, so scroll/tiling ignore pixel density
    const off = layerOffset(camX, l.factor, w, (l.ambient || 0) * time);
    for (const x of tilePositions(off, w, viewW)) {
      if (d === 1) ctx.drawImage(l.source, x, l.y || 0); else ctx.drawImage(l.source, x, l.y || 0, w, l.source.height / d);
    }
  }
}
