// The page shell: head, masthead, footer. Every page goes through page().

import { esc, h, link, plain } from './html.mjs';
import { avail, arrow } from './parts.mjs';

const current = (href, path) => {
  if (href === path) return ' aria-current="page"';
  if (href !== '/' && path.startsWith(href)) return ' aria-current="true"';
  return '';
};

const masthead = (ctx, path) => {
  const { site } = ctx;
  const items = site.nav.map((n) => h`<li><a href="${esc(n.href)}"${current(n.href, path)}>${esc(n.label)}</a></li>`);
  const cta = h`<a class="lnk mast-cta" href="/work-with-me/"${current('/work-with-me/', path)}>Work with me</a>`;
  return h`
<a class="skip" href="#main">Skip to content</a>
<header class="mast">
  <div class="wrap mast-in">
    <a class="mast-name" href="/"${path === '/' ? ' aria-current="page"' : ''}>${esc(site.name)}</a>
    <nav class="mast-nav" aria-label="Main"><ul>${items}</ul></nav>
    <div class="mast-end">${avail(site)}${cta}</div>
    <details class="menu">
      <summary>Menu</summary>
      <nav class="menu-panel" aria-label="Menu"><ul>${items}<li>${cta}</li></ul>${avail(site)}</nav>
    </details>
  </div>
</header>`;
};

const footer = (ctx, path) => {
  const { site } = ctx;
  const cta = path.startsWith('/work-with-me/') ? '' : h`
    <div class="foot-cta">
      <p class="foot-h">Bring me a problem.</p>
      <p class="foot-row"><a class="btn" href="/work-with-me/">Work with me ${arrow}</a>${avail(site)}</p>
    </div>`;
  const pages = [...site.nav, { label: 'Takes', href: '/takes/' }, { label: 'Work with me', href: '/work-with-me/' }, { label: 'Colophon', href: '/colophon/' }];
  return h`
<footer class="foot">
  <div class="wrap">${cta}
    <div class="foot-grid">
      <nav aria-label="Elsewhere"><p class="note">Elsewhere</p><ul>${site.social.map((s) => h`<li>${link(s.url, s.label)}</li>`)}</ul></nav>
      <nav aria-label="This site"><p class="note">This site</p><ul>${pages.map((p) => h`<li><a class="lnk" href="${esc(p.href)}"${current(p.href, path)}>${esc(p.label)}</a></li>`)}</ul></nav>
    </div>
    <div class="foot-base">
      <a class="terry-a" href="/work/terry-time/" aria-label="Terry Time, Terry’s shop"${current('/work/terry-time/', path)}><span class="terry" aria-hidden="true"></span></a>
      <p>${esc(site.footerLine)}</p>
      <p class="note">© ${site.since}–<span data-year>${ctx.year}</span> ${esc(site.name)}</p>
      <button type="button" class="tool" data-pencils aria-pressed="false" hidden>Pencils</button>
    </div>
  </div>
</footer>`;
};

// meta: { path, title, description, card, type, bodyClass, main, scripts, noindex }
export const page = (ctx, meta) => {
  const { site, assets } = ctx;
  const url = site.url + meta.path;
  const title = meta.title ? `${meta.title} · ${site.name}` : `${site.name} · Product designer`;
  const description = plain(meta.description || site.description);
  const card = `${site.url}/assets/cards/${meta.card || 'home'}.png`;
  // An ink page tints the phone's browser chrome to match it.
  const ink = meta.bodyClass === 'ink-page';
  return h`<!doctype html>
<html lang="en-CA" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${meta.noindex ? '<meta name="robots" content="noindex">' : h`<link rel="canonical" href="${esc(url)}">`}
<meta property="og:type" content="${meta.type || 'website'}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:locale" content="en_CA">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(card)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image:alt" content="${esc(title)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="${ink ? ctx.band.light : '#FFFFFF'}">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${ink ? ctx.band.dark : '#0A0A0A'}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/familjen-grotesk.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/newsreader.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css?v=${assets.css}">
<script>document.documentElement.className='js'</script>
<script src="/assets/js/site.js?v=${assets.js}" defer></script>
${meta.head || ''}
</head>
<body${meta.bodyClass ? h` class="${meta.bodyClass}"` : ''}>
${masthead(ctx, meta.path)}
<main id="main">
<p class="print-id">${esc(site.name)} · ${esc(url.replace(/^https?:\/\//, ''))}</p>
${meta.main}
</main>
${footer(ctx, meta.path)}
${meta.scripts || ''}
</body>
</html>
`;
};
