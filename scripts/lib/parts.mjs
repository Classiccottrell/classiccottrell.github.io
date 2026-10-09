// Shared pieces of markup. Every page is assembled from these.

import { esc, h, inline, link, pad2, longDate } from './html.mjs';

export const mark = (m) => h`<i class="sm sm-${esc(m)}" aria-hidden="true"></i>`;
export const status = (s) => h`${mark(s.mark)}${esc(s.label)}`;
export const arrow = h`<span aria-hidden="true">→</span>`;

export const avail = (site) =>
  h`<a class="avail" href="/work-with-me/#availability">${status(site.availability)}</a>`;

export const btn = (href, label, cls = 'btn') => h`<a class="${cls}" href="${esc(href)}">${esc(label)} ${arrow}</a>`;

// Page header: kicker note, splash title, standfirst.
export const pageHead = ({ kicker, title, lede, splash = true, extra = '' }) => h`
<header class="wrap ph">
  <p class="note">${kicker}</p>
  <h1 class="${splash ? 'splash' : 'h1'}">${title}</h1>
  ${lede ? h`<p class="lede">${lede}</p>` : ''}
  ${extra}
</header>`;

// The technical-drawing title block. rows: [{ dt, dd (html), wide }]
export const tblock = (rows, cls = '') => h`
<dl class="tblock ${cls}">${rows.map((r) => h`<div${r.wide ? ' class="wide"' : ''}><dt>${esc(r.dt)}</dt><dd>${r.dd}</dd></div>`)}</dl>`;

export const projectMeta = (p) => h`${esc(p.kind)} · ${p.year} · ${status(p.status)}`;

// An index row linking to a case study. `pic` adds the data the cut preview needs.
export const idxRow = (p, { pic = false, heading = 'h3' } = {}) => {
  const data = pic && p.plate ? h` data-src="${esc(p.plate.src)}"` : '';
  return h`<li><a class="idx-row" href="/work/${esc(p.slug)}/"${data}><span class="n">${pad2(p.number)}</span><${heading} class="t">${inline(p.title)}</${heading}><span class="d">${inline(p.summary)}</span><span class="m">${projectMeta(p)}</span></a></li>`;
};

export const img = ({ src, width, height, alt = '', cls = '', lazy = true, srcset = '', sizes = '' }) =>
  h`<img${cls ? h` class="${cls}"` : ''} src="${esc(src)}"${srcset ? h` srcset="${esc(srcset)}" sizes="${esc(sizes)}"` : ''} width="${width}" height="${height}" alt="${esc(alt)}"${lazy ? ' loading="lazy" decoding="async"' : ''}>`;

// A screenshot plate: inked border, pencil crop marks, numbered callouts and a legend.
export const plate = (pl, { label = 'Fig. 1', lazy = false } = {}) => {
  const marks = pl.callouts.map((c, i) => h`<span class="mk" style="--x:${c.x}%;--y:${c.y}%" aria-hidden="true">${i + 1}</span>`);
  const legend = pl.callouts.length
    ? h`<ol class="legend">${pl.callouts.map((c, i) => h`<li><span class="mk" aria-hidden="true">${i + 1}</span><span>${inline(c.text)}</span></li>`)}</ol>`
    : '';
  return h`
<figure class="plate${legend ? ' has-legend' : ''}">
  <div class="panel crop callouts">${img({ src: pl.src, width: pl.width, height: pl.height, alt: pl.alt, lazy })}${marks}</div>
  ${legend}
  <figcaption class="note cap">${esc(label)} · ${inline(pl.caption)}</figcaption>
</figure>`;
};

// Pencils, then inks: the pencil layer sits under the ink, which a mask reveals.
export const inking = ({ ink, pencil, width, height, alt, caption, dur = 2000, cls = '', lazy = false }) => h`
<figure class="${cls}" data-inking data-dur="${dur}">
  <div class="inking">${img({ src: pencil, width, height, alt: '', cls: 'pen', lazy })}${img({ src: ink, width, height, alt, cls: 'ink', lazy })}</div>
  ${caption ? h`<figcaption class="note cap">${inline(caption)}</figcaption>` : ''}
</figure>`;

export const heat = (n) =>
  h`<span class="heat" role="img" aria-label="Heat ${n} of 3">${[1, 2, 3].map((i) => h`<i${i <= n ? ' class="f"' : ''}></i>`)}</span>`;

export const receipts = (t) => h`Receipts · ${t.sources.map((s, i) => h`${i ? ', ' : ''}${link(s.href, s.label)}`)}`;

export const takeItem = (t, { linkText = true } = {}) => h`
<li class="take" id="${esc(t.id.toLowerCase())}">
  <div class="take-top"><p class="note">${esc(t.id)}</p>${heat(t.heat)}</div>
  <p class="take-t">${linkText ? h`<a href="/takes/${esc(t.slug)}/">${inline(t.text)}</a>` : inline(t.text)}</p>
  <p class="take-r">${inline(t.receipt)}</p>
  <p class="note take-s">${receipts(t)}</p>
</li>`;

export const rule = (r, { withSource = true } = {}) => h`
<li class="rule" id="${esc(r.id.toLowerCase())}"><p class="note">${esc(r.id)}</p><q>${inline(r.text)}</q>${withSource ? h`<p class="src"><a href="${esc(r.href)}">${esc(r.source)}</a></p>` : ''}</li>`;

export const essay = (e, { big = false, heading = 'h3' } = {}) => h`
<li class="essay">
  <a class="essay-a" href="${esc(e.url)}">
    <span class="n">No. ${pad2(e.number)}</span>
    <${heading} class="t">${inline(e.title)}</${heading}>
    <span class="s">${inline(e.subtitle)}</span>
    <span class="m note"><time datetime="${e.date}">${longDate(e.date)}</time> · Substack <span aria-hidden="true">↗</span></span>
    ${big ? img({ src: e.image, width: 640, height: 480, alt: '' }) : ''}
  </a>
</li>`;

// Take it apart: a sample screen in five layers that separate on a slider.
export const exploded = (rules) => h`
<div class="xv" id="xv" role="img" aria-label="A sample service-desk screen that separates into five layers: content on top, then components, layout, tokens, and the rules underneath.">
  <div class="xv-stage"><div class="xv-stack">
    <div class="xv-layer l1" style="--i:0" data-l="l1"><i class="xv-pin"></i>
      <div class="xv-rules">${rules.map((r) => h`<span class="rule-chip"><b>${esc(r.id)}</b>${inline(r.text)}</span>`)}</div>
    </div>
    <div class="xv-layer l2" style="--i:1" data-l="l2"><i class="xv-pin"></i>
      <div class="xv-tokens">
        <div class="tk-sw"><i style="background:#0A0A0A"></i><i style="background:#FFFFFF"></i><i style="background:#55585C"></i><i style="background:#A4DDED"></i><i style="background:#1B62A0"></i></div>
        <div class="tk-type"><span class="a">Familjen 700 · 22</span><span class="b">Newsreader 400 · 15</span><span class="c">RED HAT MONO 500 · 11</span></div>
        <div class="tk-space"><i style="width:8%"></i><i style="width:16%"></i><i style="width:24%"></i><i style="width:32%"></i><i style="width:48%"></i></div>
      </div>
    </div>
    <div class="xv-layer l3" style="--i:2" data-l="l3"><i class="xv-pin"></i>
      <div class="r-top xl"><span>Header · 56</span></div>
      <div class="r-nav xl"><span>Nav · 20%</span></div>
      <div class="r-main xl"><span>Main · 7 col</span><span class="cols"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>
      <div class="r-side xl"><span>Side · 4 col</span></div>
    </div>
    <div class="xv-layer l4" style="--i:3" data-l="l4"><i class="xv-pin"></i>
      <div class="r-top xc-row"><b class="cmp" style="flex:0 0 18%">Logo</b><b class="cmp" style="flex:1">Search field</b><b class="cmp" style="flex:0 0 22%">Button / primary</b></div>
      <div class="r-nav xc-col"><b class="cmp">Nav item × 5</b></div>
      <div class="r-main xc-col"><b class="cmp" style="flex:0 0 12%">Heading</b><b class="cmp" style="flex:0 0 10%">Chip × 3</b><b class="cmp">Table row × 4</b></div>
      <div class="r-side xc-col"><b class="cmp" style="flex:0 0 22%">Panel header</b><b class="cmp">Meta rows</b><b class="cmp" style="flex:0 0 12%">Progress</b><b class="cmp" style="flex:0 0 14%">Button / secondary</b></div>
    </div>
    <div class="xv-layer l5" style="--i:4" data-l="l5"><i class="xv-pin"></i>
      <div class="r-top ui-top"><span class="ui-logo">Service Desk</span><span class="ui-search">Search incidents</span><span class="ui-btn">New incident</span></div>
      <div class="r-nav ui-nav"><span class="on">Queue</span><span>Assigned to me</span><span>Changes</span><span>Assets</span><span>Reports</span></div>
      <div class="r-main ui-main">
        <span class="ui-h">Incident queue</span>
        <span class="ui-chips"><i>Open</i><i>P1–P2</i><i>My team</i></span>
        <span class="ui-table">
          <span class="ui-tr ui-th"><i>ID</i><i>Summary</i><i>P</i><i>Status</i></span>
          <span class="ui-tr on"><i>INC-20481</i><i>VPN drops on reconnect</i><i>P1</i><i><b class="sm sm-prog"></b>In progress</i></span>
          <span class="ui-tr"><i>INC-20479</i><i>SSO loop after reset</i><i>P2</i><i><b class="sm sm-priv"></b>Open</i></span>
          <span class="ui-tr"><i>INC-20476</i><i>Printer queue, floor 3</i><i>P2</i><i><b class="sm sm-priv"></b>Open</i></span>
          <span class="ui-tr"><i>INC-20470</i><i>Laptop won’t enrol</i><i>P1</i><i><b class="sm sm-live"></b>Resolved</i></span>
        </span>
      </div>
      <div class="r-side ui-side"><span class="ui-id">INC-20481</span><span class="ui-st">VPN drops on reconnect</span><span class="ui-meta"><i>Priority</i><i>P1</i></span><span class="ui-meta"><i>SLA</i><i>2 h 14 m left</i></span><span class="ui-bar"><i style="width:62%"></i></span><span class="ui-btn2">Assign to me</span></div>
    </div>
  </div></div>
  <div class="xv-tags" aria-hidden="true">
    <span class="xv-tag" data-l="l5"><b>05</b><span>Content</span><i class="ld"></i><i class="dt"></i></span>
    <span class="xv-tag" data-l="l4"><b>04</b><span>Components</span><i class="ld"></i><i class="dt"></i></span>
    <span class="xv-tag" data-l="l3"><b>03</b><span>Layout</span><i class="ld"></i><i class="dt"></i></span>
    <span class="xv-tag" data-l="l2"><b>02</b><span>Tokens</span><i class="ld"></i><i class="dt"></i></span>
    <span class="xv-tag" data-l="l1"><b>01</b><span>Rules</span><i class="ld"></i><i class="dt"></i></span>
  </div>
</div>`;

// A linefield piece running behind an ink band. Decorative: hidden from
// assistive tech, never focusable, paused off screen by site.js.
export const linefield = (piece, title) =>
  h`<iframe class="band-art" src="/assets/linefield/${esc(piece)}.html" title="${esc(title)}" loading="lazy" tabindex="-1" aria-hidden="true"></iframe>`;
