// Every page on the site. Each function returns { path, html } pairs via page().

import { esc, h, inline, link, pad2, plain } from './html.mjs';
import { page } from './layout.mjs';
import {
  arrow, avail, btn, essay, exploded, heat, idxRow, img, inking, linefield, mark, pageHead, plate,
  projectMeta, receipts, rule, status, takeItem, tblock,
} from './parts.mjs';

const GROUPS = ['Products', 'Agents', 'Systems', 'Tools'];
const takeOf = (ctx, id) => ctx.takes.find((t) => t.id === id);
const live = (takes) => takes.filter((t) => !t.retired);
const drawingSrcset = (d) => `${d.image.replace('.webp', '-700.webp')} 700w, ${d.image} 1100w`;

// ---------------------------------------------------------------- home
export function home(ctx) {
  const { site, work, rules, writing, drawings } = ctx;
  const featured = work.filter((p) => p.featured);
  const takes = live(ctx.takes);
  const first = takes[0];
  const kurtz = drawings.drawings.find((d) => d.slug === 'kurtz');
  const stageData = JSON.stringify(takes.map((t) => ({ id: t.id, heat: t.heat, text: plain(t.text), href: `/takes/${t.slug}/`, src: `Receipts · ${t.sources.map((s) => s.label).join(', ')}` })))
    .replace(/</g, '\\u003c');
  const main = h`
<section class="hero wrap" aria-labelledby="hero-h">
  <canvas class="trail" aria-hidden="true"></canvas>
  <div class="g12 hero-in">
    <div class="hero-text">
      <p class="note">${esc(site.kicker)}</p>
      <h1 class="hero-h" id="hero-h">${esc(site.headline)}</h1>
      <p class="lede">${esc(site.standfirst)}</p>
      <p class="ctas">${btn('/work-with-me/', 'Work with me')}<a class="lnk" href="/work/">See the work</a></p>
    </div>
    ${inking({ ...site.portrait, cls: 'hero-fig', caption: site.portrait.caption, dur: 2200 })}
  </div>
</section>

<section class="wrap sec" aria-labelledby="sel-h">
  <div class="sec-head"><h2 class="note" id="sel-h">Selected work</h2><a class="note" href="/work/">All ${work.length} projects ${arrow}</a></div>
  <div class="sel">
    <ol class="idx" data-cut="sel-pic">${featured.map((p) => idxRow(p, { pic: true }))}</ol>
    <div class="sel-pic panel crop" aria-hidden="true">${img({ src: featured[0].plate.src, width: featured[0].plate.width, height: featured[0].plate.height, alt: '' })}</div>
  </div>
</section>

<section class="wrap sec" aria-labelledby="xv-h">
  <div class="xv-wrap">
    <div class="xv-text">
      <p class="note">The job</p>
      <h2 class="h2" id="xv-h">Take it apart.</h2>
      <p>Drag the slider. A sample service-desk screen comes apart into the five layers I design, from the words on top to the rules underneath. Most fixes live a layer or two below where the problem shows.</p>
      <div class="ink-ctl" data-js>
        <label class="note" for="explode">Apart</label>
        <input type="range" id="explode" min="0" max="100" value="0">
        <output for="explode">0%</output>
        <button type="button" class="tool" id="explode-btn">Take it apart</button>
      </div>
      <p class="note xv-legend">05 Content · 04 Components · 03 Layout · 02 Tokens · 01 Rules</p>
      <p class="note cap">A sample screen. On a real project, it’s yours.</p>
    </div>
    ${exploded(['R-02', 'R-04', 'R-05', 'R-07', 'R-09'].map((id) => rules.find((r) => r.id === id)))}
  </div>
</section>

<section class="band stage" aria-labelledby="stage-h" data-stage>
  ${linefield('grain-field', 'Grain Field, a linefield piece, drifting behind the take')}
  <div class="wrap stage-in">
    <div>
      <h2 class="note" id="stage-h">Hot takes</h2>
      <p class="stage-n note"><span data-stage-n>${esc(first.id)}</span><span data-stage-heat>${heat(first.heat)}</span></p>
      <p class="stage-t"><a href="/takes/${esc(first.slug)}/" data-stage-text>${inline(first.text)}</a></p>
      <p class="note" data-stage-src>Receipts · ${esc(first.sources.map((s) => s.label).join(', '))}</p>
    </div>
    <div class="stage-ctl">
      <span class="stage-btns" data-js><button type="button" class="tool" data-stage-prev>← Prev</button><button type="button" class="tool" data-stage-play>Pause</button><button type="button" class="tool" data-stage-next>Next →</button></span>
      <a class="lnk" href="/takes/">All ${takes.length} takes</a>
    </div>
  </div>
  <script type="application/json" id="takes-data">${stageData}</script>
</section>

<section class="wrap sec" aria-labelledby="rules-h">
  <div class="sec-head"><h2 class="note" id="rules-h">How I work</h2><a class="note" href="/about/#rules">All ${rules.length} rules ${arrow}</a></div>
  <ol class="rules">${['R-02', 'R-03', 'R-05'].map((id) => rule(rules.find((r) => r.id === id)))}</ol>
</section>

<section class="band draw-band" aria-labelledby="draw-h">
  <div class="wrap band-grid">
    <div>
      <h2 class="note" id="draw-h">Drawings</h2>
      <p class="h2">${esc(drawings.intro.split('.')[0])}.</p>
      <blockquote class="quote"><p>“${esc(kurtz.quote.split('. But')[0])}.”</p></blockquote>
      <p class="note">${esc(kurtz.character)} · ${esc(kurtz.film)} · ${kurtz.year}</p>
      <p class="band-link"><a class="lnk" href="/drawings/">See the drawings</a></p>
    </div>
    ${img({ src: kurtz.image, srcset: drawingSrcset(kurtz), sizes: '(min-width: 760px) 40vw, 100vw', width: kurtz.width, height: kurtz.height, alt: kurtz.alt, cls: 'screen' })}
  </div>
</section>

<section class="wrap sec" aria-labelledby="essays-h">
  <div class="sec-head"><h2 class="note" id="essays-h">Writing</h2><a class="note" href="${esc(writing.subscribe)}">Subscribe on Substack <span aria-hidden="true">↗</span></a></div>
  <ol class="essays">${writing.essays.map((e) => essay(e))}</ol>
</section>`;
  return page(ctx, {
    path: '/', card: 'home', main,
    head: h`<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: site.name, jobTitle: 'Product designer', url: site.url, sameAs: site.social.map((s) => s.url) })}</script>`,
  });
}

// ---------------------------------------------------------------- work
export function workIndex(ctx) {
  const { work } = ctx;
  const legacy = Object.fromEntries(work.flatMap((p) => p.legacyIds.map((id) => [id, p.slug])));
  const main = h`
${pageHead({ kicker: `Work · ${work.length} projects`, title: 'Work', lede: 'Products, systems, agents and tools. Each case study opens with a title block and the take it proves, and ends with what it actually took.' })}
<div class="wrap groups">${GROUPS.map((g) => {
    const items = work.filter((p) => p.group === g);
    return items.length ? h`
  <section class="group" aria-labelledby="g-${g.toLowerCase()}">
    <h2 class="note" id="g-${g.toLowerCase()}">${esc(g)}</h2>
    <ol class="idx">${items.map((p) => idxRow(p))}</ol>
  </section>` : '';
  })}
</div>`;
  // Old projects.html#id links arrive here (Netlify keeps the hash on its 301).
  const scripts = h`<script>(function(){var m=${JSON.stringify(legacy)};var id=location.hash.slice(1);if(m[id])location.replace('/work/'+m[id]+'/');})();</script>`;
  return page(ctx, { path: '/work/', title: 'Work', description: 'Case studies by Matthew A. Cottrell: products, design systems, AI agents and tools.', card: 'work', main, scripts });
}

const roadmap = (stages, linkTo) => {
  const marks = { Shipped: 'ship', Next: 'prog', Planned: 'priv' };
  return h`
<ol class="roadmap">${stages.map((s) => h`<li><p class="note">${mark(marks[s.status] || 'priv')}${esc(s.status)}</p><p class="rm-l">${inline(s.label)}</p><p>${inline(s.detail)}</p></li>`)}</ol>
${linkTo ? h`<p>${link(linkTo.url, linkTo.label)}</p>` : ''}`;
};

const section = (sec, p, printIt) => h`
<section class="cs-sec${printIt ? ' cs-print' : ''}">
  ${sec.heading ? h`<h2 class="cs-h">${inline(sec.heading)}</h2>` : ''}
  ${sec.intro ? h`<p class="cs-intro">${inline(sec.intro)}</p>` : ''}
  ${(sec.paragraphs || []).map((t) => h`<p>${inline(t)}</p>`)}
  ${sec.items ? h`<ul class="items">${sec.items.map((it) => h`<li><strong>${inline(it.lead)}</strong> ${inline(it.text)}</li>`)}</ul>` : ''}
  ${sec.outro ? h`<p>${inline(sec.outro)}</p>` : ''}
  ${sec.roadmap ? roadmap(sec.roadmap, p.roadmapLink) : ''}
  ${sec.image ? h`<figure class="cs-fig"><div class="panel">${img(sec.image)}</div>${sec.image.caption ? h`<figcaption class="note cap">${inline(sec.image.caption)}</figcaption>` : ''}</figure>` : ''}
</section>
${p.pullQuote && (sec.paragraphs || []).some((t) => t.includes(p.pullQuote)) ? h`<figure class="pq-fig"><blockquote class="pq"><p>${inline(p.pullQuote)}</p></blockquote><figcaption class="note">From “${inline(sec.heading)}”</figcaption></figure>` : ''}`;

export function caseStudy(ctx, p) {
  const { work } = ctx;
  const i = work.indexOf(p);
  const prev = work[i - 1], next = work[i + 1];
  const take = p.take && takeOf(ctx, p.take);
  // Printed, a case study is a spec sheet: title block, plate and what it actually took.
  const took = p.sections.find((s) => /what it actually took/i.test(s.heading || ''));
  const rows = [
    { dt: 'Role', dd: esc(p.role) },
    { dt: 'Year', dd: String(p.year) },
    { dt: 'Status', dd: status(p.status) },
    { dt: 'Stack', dd: esc(p.stack) },
    { dt: 'Numbers', dd: esc(p.numbers.join(' · ')) },
    { dt: 'Links', dd: p.links.length ? p.links.map((l, j) => h`${j ? ' · ' : ''}${link(l.url, l.label)}`).join('') : 'Private repository' },
  ];
  if (take) rows.push({ dt: `Take · ${take.id}`, dd: h`<a class="tb-take" href="/takes/${esc(take.slug)}/">${inline(take.text)}</a>`, wide: true });
  const main = h`
<article class="cs">
  ${pageHead({ kicker: h`<a href="/work/">Work</a> / ${pad2(p.number)} · ${esc(p.kind)}`, title: inline(p.title), lede: inline(p.standfirst), extra: tblock(rows, 'cs-tb') })}
  ${p.plate ? h`<div class="wrap">${plate(p.plate, { label: 'Fig. 1' })}</div>` : ''}
  ${p.live ? h`
  <section class="band live-band" aria-labelledby="live-h">
    ${linefield(p.live, 'Grain Field, a linefield piece, running live')}
    <div class="wrap live-in"><h2 class="note" id="live-h">Running live</h2><p class="h2">Grain Field, baked.</p><p>One of the twenty, exported as a single HTML file and dropped into this page. No dependencies, no build step.</p></div>
  </section>` : ''}
  <div class="wrap cs-body">${p.sections.map((s) => section(s, p, !took || s === took))}</div>
  <nav class="wrap pn-wrap" aria-label="More work"><div class="pn-nav">
    ${prev ? h`<a class="lnk" href="/work/${esc(prev.slug)}/"><span aria-hidden="true">←</span> ${pad2(prev.number)} ${inline(prev.title)}</a>` : h`<a class="lnk" href="/work/">All work</a>`}
    ${next ? h`<a class="lnk" href="/work/${esc(next.slug)}/">${pad2(next.number)} ${inline(next.title)} <span aria-hidden="true">→</span></a>` : h`<a class="lnk" href="/work/">All work</a>`}
  </div></nav>
</article>`;
  return page(ctx, { path: `/work/${p.slug}/`, title: plain(p.title), description: plain(p.standfirst), card: `work-${p.slug}`, type: 'article', bodyClass: 'case', main });
}

// ---------------------------------------------------------------- takes
export function takesIndex(ctx) {
  const takes = live(ctx.takes);
  const retired = ctx.takes.filter((t) => t.retired);
  const main = h`
${pageHead({ kicker: `Takes · ${takes.length}, with receipts`, title: 'Takes', lede: 'Opinions I’ll defend in a meeting, each backed by work you can check. When I change my mind, the take stays here with a date and a reason.' })}
<div class="wrap"><ol class="takes">${takes.map((t) => takeItem(t))}</ol></div>
${retired.length ? h`
<section class="wrap sec" aria-labelledby="retired-h">
  <h2 class="h2" id="retired-h">Retired</h2>
  <ol class="takes retired">${retired.map((t) => h`<li class="take killed"><p class="note">${esc(t.id)} · retired ${esc(t.retired.date)}</p><p class="take-t">${inline(t.text)}</p><p class="take-r">${inline(t.retired.reason)}</p></li>`)}</ol>
</section>` : ''}`;
  return page(ctx, { path: '/takes/', title: 'Takes', description: 'Hot takes on design, enterprise software and AI, each with receipts, by Matthew A. Cottrell.', card: 'takes', main });
}

export function takePage(ctx, t) {
  const takes = live(ctx.takes);
  const i = takes.indexOf(t);
  const prev = takes[i - 1], next = takes[i + 1];
  const main = h`
<article class="take-page">
  <section class="band take-hero" aria-labelledby="take-h">
    <div class="wrap">
      <p class="note crumb"><a href="/takes/">Takes</a> / ${esc(t.id)} ${heat(t.heat)}</p>
      <h1 class="take-big" id="take-h">${inline(t.text)}</h1>
      <p class="take-r">${inline(t.receipt)}</p>
      <p class="note">${receipts(t)}</p>
      <p class="take-share" data-js><button type="button" class="tool" data-copy-link>Copy link</button> <span class="note" role="status" data-copy-status></span></p>
    </div>
  </section>
  <nav class="wrap pn-wrap" aria-label="More takes"><div class="pn-nav">
    ${prev ? h`<a class="lnk" href="/takes/${esc(prev.slug)}/"><span aria-hidden="true">←</span> ${esc(prev.id)}</a>` : h`<a class="lnk" href="/takes/">All takes</a>`}
    ${next ? h`<a class="lnk" href="/takes/${esc(next.slug)}/">${esc(next.id)} <span aria-hidden="true">→</span></a>` : h`<a class="lnk" href="/takes/">All takes</a>`}
  </div></nav>
</article>`;
  return page(ctx, { path: `/takes/${t.slug}/`, title: `${t.id}: ${plain(t.text)}`, description: plain(t.receipt), card: `take-${t.slug}`, type: 'article', bodyClass: 'take-body', main });
}

// ---------------------------------------------------------------- work with me
const radios = (name, values, checked) => values.map((v, i) => h`<label class="opt"><input type="radio" name="${name}" value="${esc(v)}"${i === checked ? ' checked' : ''}><span>${esc(v)}</span></label>`);

export function hire(ctx) {
  const { site, hire: H } = ctx;
  const main = h`
${pageHead({ kicker: 'Work with me', title: esc(H.headline), lede: esc(H.standfirst) })}
<section class="wrap sec avail-sec" id="availability" aria-labelledby="avail-h">
  <h2 class="note" id="avail-h">Availability</h2>
  <p class="avail-big">${status(site.availability)}</p>
</section>

<section class="wrap sec" aria-labelledby="offers-h">
  <h2 class="h2" id="offers-h">Four ways in</h2>
  <ol class="offers">${H.offers.map((o, i) => h`
    <li class="offer" id="offer-${esc(o.id)}">
      <p class="note">Offer ${pad2(i + 1)}</p>
      <h3 class="h3">${esc(o.title)}</h3>
      <p>${inline(o.text)}</p>
      <dl><div><dt>Time</dt><dd>${esc(o.time)}</dd></div><div><dt>Proof</dt><dd>${o.proof.map((pr, j) => h`${j ? ', ' : ''}<a href="${esc(pr.href)}">${esc(pr.label)}</a>`)}</dd></div></dl>
      <a class="btn" href="#brief" data-kind="${esc(o.kind)}" aria-label="Bring me this: ${esc(o.title)}">Bring me this ${arrow}</a>
    </li>`)}
  </ol>
</section>

<section class="wrap sec" id="brief" aria-labelledby="brief-h">
  <div class="g12 brief">
    <div class="s6">
      <h2 class="h2" id="brief-h">The brief</h2>
      <p class="sub-intro">Tell me what’s broken. While you type, the page writes it up as a work order.</p>
      <form class="bf" name="brief" method="POST" action="/work-with-me/thanks/" data-netlify="true" netlify-honeypot="website">
        <input type="hidden" name="form-name" value="brief">
        <input type="hidden" name="order" value="">
        <p hidden><label>Leave this empty <input name="website" tabindex="-1" autocomplete="off"></label></p>
        <fieldset><legend>What are you bringing?</legend><div class="opts">${radios('kind', H.brief.kinds, 0)}</div></fieldset>
        <div class="fld"><label for="bf-what">What’s broken?</label><textarea id="bf-what" name="broken" rows="4" required placeholder="One sentence is enough. “Our change-approval flow takes nine screens.”"></textarea></div>
        <fieldset><legend>When does it need to work?</legend><div class="opts">${radios('when', H.brief.when, 1)}</div></fieldset>
        <fieldset><legend>Who’s on your side?</legend><div class="opts">${radios('team', H.brief.team, 1)}</div></fieldset>
        <div class="pair">
          <div class="fld"><label for="bf-name">Your name</label><input type="text" id="bf-name" name="name" autocomplete="name" required></div>
          <div class="fld"><label for="bf-co">Company <span class="opt-l">(optional)</span></label><input type="text" id="bf-co" name="company" autocomplete="organization"></div>
        </div>
        <div class="fld"><label for="bf-email">Email for my reply</label><input type="email" id="bf-email" name="email" autocomplete="email" required></div>
        <p class="bf-send"><button type="submit" class="btn">Send the brief ${arrow}</button></p>
        <p class="note bf-status" role="status" data-bf-status></p>
      </form>
    </div>
    <div class="s6 wo-col" data-js>
      <div class="wo" data-wo aria-hidden="true">
        <div class="wo-head"><div><p class="note">Work order</p><p class="wo-no" data-wo-no>CC-2026-100</p></div><div class="stamp" data-wo-stamp>Received<br>Classic Cottrell</div></div>
        <dl class="tblock">
          <div><dt>From</dt><dd data-wo="from">Your name, your company</dd></div>
          <div><dt>Bringing</dt><dd data-wo="kind">${esc(H.brief.kinds[0])}</dd></div>
          <div><dt>Needed</dt><dd data-wo="when">${esc(H.brief.when[1])}</dd></div>
          <div class="wide"><dt>What’s broken</dt><dd class="wo-what" data-wo="broken">Tell me what’s broken. One sentence is enough.</dd></div>
          <div><dt>Team</dt><dd data-wo="team">${esc(H.brief.team[1])}</dd></div>
          <div class="wide2"><dt>First step</dt><dd>A 30-minute teardown call. I bring three questions and one sketch.</dd></div>
        </dl>
      </div>
    </div>
  </div>
</section>

<section class="wrap sec" aria-labelledby="next-h">
  <h2 class="h2" id="next-h">What happens next</h2>
  <ol class="steps">${H.steps.map((s) => h`<li>${inline(s)}</li>`)}</ol>
  <p class="sub-intro">Rather talk first? ${link(site.contact.url, `Message me on ${site.contact.label}`)}.</p>
</section>`;
  return page(ctx, { path: '/work-with-me/', title: 'Work with me', description: `${H.headline} ${H.standfirst}`, card: 'work-with-me', main });
}

export function thanks(ctx) {
  const { hire: H } = ctx;
  const main = h`
${pageHead({ kicker: 'Work with me · received', title: 'Received.', lede: 'Your brief is in. Here’s what happens next.' })}
<div class="wrap"><ol class="steps">${H.steps.map((s) => h`<li>${inline(s)}</li>`)}</ol>
<p class="sub-intro"><a class="lnk" href="/work/">Back to the work</a></p></div>`;
  return page(ctx, { path: '/work-with-me/thanks/', title: 'Received', card: 'work-with-me', main, noindex: true });
}

// ---------------------------------------------------------------- writing
export function writingPage(ctx) {
  const { writing } = ctx;
  const main = h`
${pageHead({ kicker: `Writing · ${writing.essays.length} essays on Substack`, title: 'Writing', lede: esc(writing.intro) })}
<div class="wrap"><ol class="essays big">${writing.essays.map((e) => essay(e, { big: true, heading: 'h2' }))}</ol>
<aside class="sub-box" aria-label="Subscribe"><p>New essays go to Substack first. Subscribe and they arrive when they publish.</p>${link(writing.subscribe, 'Subscribe on Substack', 'btn')}</aside></div>`;
  return page(ctx, { path: '/writing/', title: 'Writing', description: writing.intro, card: 'writing', main });
}

// ---------------------------------------------------------------- drawings
export function drawingsPage(ctx) {
  const { drawings } = ctx;
  const main = h`
${pageHead({ kicker: `Drawings · ${drawings.drawings.length} portraits in ink`, title: 'Drawings', lede: esc(drawings.intro) })}
${drawings.drawings.map((d, i) => h`
<section class="wrap dw dw-${d.ground}" aria-labelledby="dw-${d.slug}">
  <figure class="dw-fig${d.ground === 'black' ? ' screen-fig' : ' sheet'}">${img({ src: d.image, srcset: drawingSrcset(d), sizes: '(min-width: 1320px) 700px, (min-width: 860px) 52vw, 100vw', width: d.width, height: d.height, alt: d.alt, cls: d.ground === 'black' ? 'screen' : '', lazy: i > 0 })}</figure>
  <div class="dw-text">
    <p class="note">${pad2(i + 1)}</p>
    <h2 class="h2" id="dw-${d.slug}">${esc(d.character)}</h2>
    <blockquote class="quote"><p>“${esc(d.quote)}”</p></blockquote>
    <p class="note credits">${esc(d.film)} · ${d.year}<br>Dir. ${esc(d.director)} · ${esc(d.actor)}${d.medium ? h`<br>${esc(d.medium)}${d.drawn ? ` · drawn ${d.drawn}` : ''}` : ''}</p>
  </div>
</section>`)}`;
  return page(ctx, { path: '/drawings/', title: 'Drawings', description: drawings.intro, card: 'drawings', bodyClass: 'ink-page', main });
}

// ---------------------------------------------------------------- about
export function about(ctx) {
  const { site, rules, hire: H } = ctx;
  const main = h`
${pageHead({ kicker: 'About', title: esc(site.name), lede: esc(site.headline) })}
<div class="wrap g12 about">
  ${inking({ ...site.portrait, cls: 'about-fig', caption: site.portrait.caption, dur: 1800 })}
  <div class="about-text prose">${site.bio.map((p) => h`<p>${inline(p)}</p>`)}
    <p class="ctas">${btn('/work-with-me/', 'Work with me')}${link(site.contact.url, site.contact.label)}</p>
  </div>
</div>
<section class="wrap sec" id="rules" aria-labelledby="rules-h">
  <h2 class="h2" id="rules-h">How I work</h2>
  <p class="sub-intro">${rules.length} rules, each pulled from a project where I learned it the hard way.</p>
  <ol class="rules all">${rules.map((r) => rule(r))}</ol>
</section>
<section class="wrap sec" aria-labelledby="what-h">
  <h2 class="h2" id="what-h">What I work on</h2>
  <ul class="what">${H.offers.map((o) => h`<li><a href="/work-with-me/#offer-${esc(o.id)}"><b>${esc(o.title)}</b></a> ${inline(o.text)}</li>`)}</ul>
</section>`;
  return page(ctx, { path: '/about/', title: 'About', description: plain(site.bio[0]), card: 'about', main });
}

// ---------------------------------------------------------------- colophon
export function colophon(ctx) {
  const { stats, contrast, site } = ctx;
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  const swatches = [
    ['Bristol', '#FFFFFF', 'The ground. Pure white, so scanned drawings print straight onto it.'],
    ['India ink', '#0A0A0A', 'Type, drawings, panel borders and buttons.'],
    ['Graphite', '#55585C', 'Secondary text only.'],
    ['Non-photo blue', '#A4DDED', 'Construction only: grid, guides, crop marks, highlights. Never text.'],
    ['Blueline', '#1B62A0', 'Notes, captions, links, focus rings and callout numbers.'],
  ];
  const ratioOf = (hex) => contrast.light.find((c) => c.fg === hex && c.bg === '#FFFFFF');
  const main = h`
${pageHead({ kicker: 'Colophon', title: 'Colophon', lede: 'How this site is made, what it’s made of, and a button that checks it.' })}

<section class="wrap sec" aria-labelledby="checks-h">
  <div class="g12">
    <div class="s5">
      <h2 class="h2" id="checks-h">The page audits itself.</h2>
      <p>This runs axe-core, the same engine inside VPAT Vault’s scanner, against this page right now, then checks its images, headings, fonts and colour pairs. Every page also runs it in the test suite before it ships.</p>
      <p class="ctas" data-js><button type="button" class="btn" data-audit>Run the checks</button></p>
    </div>
    <div class="s7"><pre class="term" data-audit-out tabindex="0" role="log" aria-label="Audit output">$ ready. Press “Run the checks”.</pre></div>
  </div>
</section>

<section class="wrap sec" aria-labelledby="numbers-h">
  <h2 class="h2" id="numbers-h">By the numbers</h2>
  ${tblock([
    { dt: 'Pages', dd: String(stats.pages) },
    { dt: 'Stylesheet', dd: `${stats.cssLines} lines · ${kb(stats.cssGzip)} gzipped` },
    { dt: 'Script', dd: `${kb(stats.jsGzip)} gzipped · optional` },
    { dt: 'Fonts', dd: `3 faces · ${kb(stats.fonts)}` },
    { dt: 'Images', dd: `${stats.images} files · ${kb(stats.imageBytes)}` },
    { dt: 'Contrast', dd: `${stats.pairs} text pairs · lowest ${stats.minRatio.toFixed(2)}:1` },
  ])}
  <p class="note cap">Counted by the build. No framework, no tracking, no cookies. Every page reads with JavaScript off.</p>
</section>

<section class="wrap sec" aria-labelledby="type-h">
  <h2 class="h2" id="type-h">Type</h2>
  <div class="faces">
    <div class="face"><p class="note">Ink · display and interface</p><p class="face-n f-ink">Familjen Grotesk</p><p>Headlines, titles, numbers and buttons. Its ink traps, notches cut into the joints of letters like k and 4, show at display sizes.</p></div>
    <div class="face"><p class="note">Voice · reading</p><p class="face-n f-voice">Newsreader</p><p>Essays, case studies, captions and the film quotes.</p></div>
    <div class="face"><p class="note">Pencil · notes and specs</p><p class="face-n f-pencil">Red Hat Mono</p><p>Labels, specs, figure numbers and measurements. Always small, always blue.</p></div>
  </div>
</section>

<section class="wrap sec" aria-labelledby="colour-h">
  <h2 class="h2" id="colour-h">Colour</h2>
  <ul class="swatches">${swatches.map(([n, hex, use]) => {
    const r = ratioOf(hex);
    return h`<li><span class="sw" style="background:${hex}"></span><p class="h3">${esc(n)}</p><p class="note">${hex}${r ? ` · ${r.ratio.toFixed(2)}:1 on Bristol` : ''}</p><p>${esc(use)}</p></li>`;
  })}</ul>
  <p class="sub-intro">The site follows your system setting: Bristol by day, Ink by night. Status is always a symbol plus a word: ${mark('live')}Live, ${mark('prog')}In progress, ${mark('priv')}Private, ${mark('ship')}Shipped.</p>
</section>

<section class="wrap sec" aria-labelledby="parts-h">
  <h2 class="h2" id="parts-h">Parts</h2>
  <p class="sub-intro">The pieces every page is built from. Switch on Pencils in the footer to see the grid under them, with rulers and a spec for anything you point at.</p>
  <div class="parts">
    <div class="part"><p class="note">Buttons and links</p><p class="ctas">${btn('/work-with-me/', 'Work with me')}<a class="lnk" href="/work/">See the work</a></p></div>
    <div class="part"><p class="note">Availability</p><p>${avail(site)}</p></div>
    <div class="part"><p class="note">Index row</p><ol class="idx">${idxRow(ctx.work[2])}</ol></div>
    <div class="part"><p class="note">Title block</p>${tblock([{ dt: 'Role', dd: 'Design and build' }, { dt: 'Status', dd: status({ mark: 'live', label: 'Live, v2' }) }, { dt: 'Numbers', dd: '20 pieces · 299 controls' }])}</div>
    <div class="part"><p class="note">Pull quote</p><blockquote class="pq"><p>So the checks are scripts now instead of opinions.</p></blockquote></div>
    <div class="part"><p class="note">Rule</p><ol class="rules">${rule(ctx.rules[4])}</ol></div>
  </div>
</section>

<section class="wrap sec" aria-labelledby="a11y-h"><div class="prose">
  <h2 class="h2" id="a11y-h">Accessibility</h2>
  <p>This site aims to meet WCAG 2.2 at level AA. Every page is checked with axe-core in the test suite, every text colour pair is checked by a script at build time, and every page works with a keyboard and with JavaScript turned off.</p>
  <p>Motion is optional. With reduced motion turned on in your system settings, drawings arrive inked, the hot takes stop rotating, and the linefield piece holds still. The take-it-apart figure on the home page is an illustration; its text description says what it shows.</p>
  <p>If something doesn’t work for you, tell me through ${link(site.contact.url, site.contact.label)} or <a href="/work-with-me/#brief">the brief</a>, and I’ll fix it.</p>
</div></section>

<section class="wrap sec" aria-labelledby="credits-h"><div class="prose">
  <h2 class="h2" id="credits-h">Credits</h2>
  <p>Familjen Grotesk, Newsreader and Red Hat Mono are used under the SIL Open Font License and served from this site. Run the checks uses <a href="https://github.com/dequelabs/axe-core">axe-core</a> under the Mozilla Public License 2.0. The ink band runs Grain Field from ${link('/work/linefield/', 'linefield')}, which is MIT licensed. Terry drew himself, and he has ${link('/work/terry-time/', 'a shop')}.</p>
  <p>The source is on ${link('https://github.com/Classiccottrell/classiccottrell.github.io', 'GitHub')}. The previous version of the site is kept on the <code>v1-classic</code> branch.</p>
</div></section>`;
  return page(ctx, { path: '/colophon/', title: 'Colophon', description: 'How this site is made, what it’s made of, and a button that checks it.', card: 'colophon', main });
}

// ---------------------------------------------------------------- 404 and moved pages
export function notFound(ctx) {
  const main = h`
<div class="wrap nf">
  <span class="terry nf-terry" aria-hidden="true"></span>
  <p class="note">404</p>
  <h1 class="h1">Terry took this page apart and lost a piece.</h1>
  <p class="lede">The page you wanted isn’t here. These are:</p>
  <ul class="nf-links">${[...ctx.site.nav, { label: 'Work with me', href: '/work-with-me/' }].map((n) => h`<li><a class="lnk" href="${esc(n.href)}">${esc(n.label)}</a></li>`)}</ul>
  <p class="nf-more">Looking for Terry? He has ${link('/work/terry-time/', 'a shop now')}.</p>
</div>`;
  return page(ctx, { path: '/404.html', title: 'Not found', card: 'home', main, noindex: true });
}

// Old URLs keep working: a tiny page that forwards, mapping #hash links too.
export function moved(ctx, to, hashMap = {}) {
  const map = JSON.stringify(hashMap);
  return h`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Moved · ${esc(ctx.site.name)}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(ctx.site.url + to)}">
<script>(function(){var m=${map};var id=location.hash.slice(1);location.replace(m[id]?m[id]:'${to}'+location.hash);})();</script>
<meta http-equiv="refresh" content="0; url=${esc(to)}">
</head>
<body>
<p>This page moved to <a href="${esc(to)}">${esc(ctx.site.url + to)}</a>.</p>
</body>
</html>
`;
}
