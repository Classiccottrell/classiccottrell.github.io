// The Terry guide page, /work/terry-home-lab/guide/. Content lives in
// data/guide.json; the drawing that follows the reader down the page is lab.mjs.

import { esc, h, inline, link, pad2 } from './html.mjs';
import { page } from './layout.mjs';
import { LAYERS, lab } from './lab.mjs';

// Both Substack references point at the one combined post, Self-Hosting & Homelab Field Notes.
const source = (src) => link(src.url, src.title);

const promptBlock = (text, n, total) => h`
<div class="prompt">
  <p class="note prompt-k">Prompt ${n} of ${total}</p>
  <p class="prompt-t" id="prompt-${n}">${esc(text)}</p>
  <p class="prompt-a" data-js><button type="button" class="tool" data-copy-prompt="prompt-${n}" aria-label="Copy prompt ${n} of ${total}">Copy</button><span class="note prompt-s" role="status" aria-live="polite"></span></p>
</div>`;

export function guidePage(ctx) {
  const g = ctx.guide;
  const total = g.steps.reduce((s, st) => s + st.blocks.filter((b) => b.prompt).length, 0);
  let n = 0;
  const block = (b) => {
    if (b.prompt) return promptBlock(b.prompt, ++n, total);
    if (b.check) return h`<p class="check"><strong>Check:</strong> ${inline(b.check)}</p>`;
    const [head, tail] = b.p.split('{{install}}');
    return h`<p>${inline(head)}${tail === undefined ? '' : h`${source(g.sources.install)}${inline(tail)}`}</p>`;
  };
  const steps = g.steps.map((st, i) => h`
<section class="guide-step" id="${st.id}" data-step="${i + 1}" aria-labelledby="${st.id}-h">
  <p class="note gk">Step ${i + 1} of ${g.steps.length} · ${esc(st.label)}</p>
  <h2 class="gh" id="${st.id}-h" tabindex="-1"><span class="gn" aria-hidden="true">${pad2(i + 1)}</span><span class="vh">Step ${i + 1}: </span>${inline(st.heading)}</h2>
  ${st.blocks.map(block)}
</section>`);
  const gr = g.groundRule;
  const main = h`
<article class="guide">
  <div class="wrap lab-grid">
    <header class="ph lab-head" id="guide-top" data-step="0">
      <p class="note"><a href="/work/">Work</a> / <a href="/work/${esc(g.slug)}/">Terry: Home AI Lab</a> / Guide</p>
      <h1 class="h1">${esc(g.title)}</h1>
      <p class="lede">${inline(g.lede)} <span class="note g-upd">Last updated: <time datetime="${g.updated}">${g.updated}</time></span></p>
      <p class="g-part">${inline(g.partOf)}</p>
    </header>
    <div class="lab-dock"><div class="lab-dock-in">
      ${lab()}
      <div class="lab-side">
        <p class="note lab-now" data-js data-lab-now aria-hidden="true">Seven layers, one per step</p>
        <div class="ink-ctl lab-ctl" data-js>
          <label class="note" for="lab-range">Apart</label>
          <input type="range" id="lab-range" min="0" max="100" value="0" aria-label="How far apart" aria-valuetext="0 percent apart">
          <output for="lab-range">0%</output>
          <button type="button" class="tool" id="lab-btn">Take it apart</button>
        </div>
        <p class="note lab-hint" data-js>Scroll the guide and the layer for that step lifts. Click a layer to jump to its step.</p>
        <p class="vh" role="status" aria-live="polite" data-lab-live></p>
      </div>
    </div></div>
    <div class="lab-main">
      <section class="guide-intro" id="guide-intro" data-step="0">
        ${g.intro.map((t) => h`<p>${inline(t)}</p>`)}
        <p class="ground"><strong>${esc(gr.lead)}</strong> ${esc(gr.text)} <em>“${esc(gr.quote)}”</em></p>
        <nav class="step-index" aria-label="The seven steps">
          <ol>${LAYERS.map((l, i) => h`<li><a class="lnk" href="#${l.id}" data-step="${l.n}"><span class="note">${pad2(l.n)}</span> ${inline(g.steps[i].heading)}</a></li>`)}</ol>
        </nav>
      </section>
      ${steps}
    </div>
  </div>
  <div class="wrap guide-rest">
    <section class="guide-sec" id="${g.questions.id}" aria-labelledby="${g.questions.id}-h">
      <h2 class="cs-h" id="${g.questions.id}-h">${esc(g.questions.heading)}</h2>
      <ul class="items">${g.questions.items.map((t) => h`<li>${inline(t)}</li>`)}</ul>
    </section>
    <section class="guide-sec" id="${g.agents.id}" aria-labelledby="${g.agents.id}-h">
      <h2 class="cs-h" id="${g.agents.id}-h">${esc(g.agents.heading)}</h2>
      <p>${inline(g.agents.text)}</p>
    </section>
    <section class="guide-sec guide-wide" id="${g.mistakes.id}" aria-labelledby="${g.mistakes.id}-h">
      <h2 class="cs-h" id="${g.mistakes.id}-h">${esc(g.mistakes.heading)}</h2>
      <p class="cs-intro">${inline(g.mistakes.note)}</p>
      <table class="kt">
        <caption class="vh">${esc(g.mistakes.caption)}</caption>
        <thead><tr><th scope="col">What happened</th><th scope="col">Fix</th></tr></thead>
        <tbody>${g.mistakes.rows.map((r) => h`<tr><td data-label="What happened">${inline(r.what)}</td><td data-label="Fix">${inline(r.fix)}</td></tr>`)}</tbody>
      </table>
    </section>
    <section class="guide-sec" id="${g.next.id}" aria-labelledby="${g.next.id}-h">
      <h2 class="cs-h" id="${g.next.id}-h">${esc(g.next.heading)}</h2>
      <ul class="items">
        <li>${esc(g.next.storyLead)} ${source(g.sources.story)}</li>
        <li>${inline(g.next.project)}</li>
      </ul>
    </section>
  </div>
  <nav class="wrap pn-wrap" aria-label="More work"><div class="pn-nav">
    <a class="lnk" href="/work/${esc(g.slug)}/"><span aria-hidden="true">←</span> Terry: Home AI Lab</a>
    <a class="lnk" href="/work/">All work</a>
  </div></nav>
</article>`;
  return page(ctx, {
    path: g.path, title: g.title, description: g.description, card: `guide-${g.slug}`, type: 'article', bodyClass: 'case guide', main,
  });
}
