#!/usr/bin/env node
// Inlines header.html / footer.html into each page at build time so the
// site works with JavaScript disabled and avoids the layout shift caused by
// the old fetch()+innerHTML runtime injection (loadPartials()).
//
// Usage:
//   node scripts/build-html.mjs          write pages in place
//   node scripts/build-html.mjs --check  exit non-zero if any page is stale

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PAGES = ['index.html', 'art.html', 'projects.html', 'writing.html', 'sandbox.html'];

// Byte-identical block that used to live inline on every page. Removed
// entirely once the header/footer markup is inlined at build time.
const LOAD_PARTIALS_BLOCK = `    async function loadPartials() {
      const header = await fetch("header.html?v=20260806");
      const footer = await fetch("footer.html?v=20260806");
      document.getElementById("header").innerHTML = await header.text();
      document.getElementById("footer").innerHTML = await footer.text();
      var currentPage = location.pathname.split('/').pop() || 'index.html';
      document.querySelectorAll('.nav-links .header-link, .nav-drawer-links .header-link').forEach(function (link) {
        if (link.getAttribute('href') === currentPage) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        }
      });
      var select = document.getElementById('theme-select');
      if (select) {
        select.value = document.documentElement.getAttribute('data-theme') || 'default';
        select.addEventListener('change', function () {
          document.documentElement.setAttribute('data-theme', this.value);
          localStorage.setItem('site-theme', this.value);
          document.cookie = 'site-theme=' + this.value + '; domain=.classiccottrell.ca; path=/; max-age=31536000; samesite=lax';
        });
      }
    }
    loadPartials();`;

function stampActiveLink(block, currentPage) {
  const anchorRe = /<a href="([^"]+)"(\s+target="_blank")?\s+class="([^"]*\bheader-link\b[^"]*)">/g;
  return block.replace(anchorRe, (match, href, target, cls) => {
    if (href !== currentPage) return match;
    const activeCls = cls.includes('active') ? cls : `${cls} active`;
    return `<a href="${href}"${target || ''} class="${activeCls}" aria-current="page">`;
  });
}

function buildHeaderFor(headerSource, page) {
  let content = headerSource;
  // Only stamp active state on links inside .nav-links / .nav-drawer-links,
  // matching the scope of the old runtime querySelectorAll.
  content = content.replace(/<div class="nav-links">[\s\S]*?<\/div>/, (block) =>
    stampActiveLink(block, page)
  );
  content = content.replace(/<nav class="nav-drawer-links"[^>]*>[\s\S]*?<\/nav>/, (block) =>
    stampActiveLink(block, page)
  );
  return content;
}

function injectPartial(html, id, content) {
  const open = `<!-- build:${id} -->`;
  const close = `<!-- /build:${id} -->`;
  const sentinelRe = new RegExp(
    `${open}[\\s\\S]*?${close}`
  );
  if (sentinelRe.test(html)) {
    return html.replace(sentinelRe, `${open}\n${content}\n${close}`);
  }
  const emptyDivRe = new RegExp(`<div id="${id}">\\s*<\\/div>`);
  if (emptyDivRe.test(html)) {
    return html.replace(emptyDivRe, `<div id="${id}">${open}\n${content}\n${close}</div>`);
  }
  throw new Error(`build-html: could not find injection point for #${id}`);
}

function stripLoadPartials(html) {
  if (!html.includes(LOAD_PARTIALS_BLOCK)) return html;
  let out = html.replace(LOAD_PARTIALS_BLOCK, '');
  // Collapse an now-empty <script></script> left behind (index.html, writing.html).
  out = out.replace(/<script>\s*<\/script>\n/, '');
  // Collapse the leftover blank line left behind when other code follows in
  // the same <script> tag (art.html, projects.html, sandbox.html).
  out = out.replace(/<script>\n\n(\s*\/\/)/, '<script>\n$1');
  return out;
}

function buildPage(page, headerSource, footerSource) {
  const filePath = path.join(ROOT, page);
  const original = readFileSync(filePath, 'utf8');

  const headerContent = buildHeaderFor(headerSource, page);
  let next = injectPartial(original, 'header', headerContent);
  next = injectPartial(next, 'footer', footerSource);
  next = stripLoadPartials(next);

  return { filePath, original, next };
}

function main() {
  const check = process.argv.includes('--check');
  const headerSource = readFileSync(path.join(ROOT, 'header.html'), 'utf8').trimEnd();
  const footerSource = readFileSync(path.join(ROOT, 'footer.html'), 'utf8').trimEnd();

  const stale = [];
  for (const page of PAGES) {
    const { filePath, original, next } = buildPage(page, headerSource, footerSource);
    if (original === next) continue;
    if (check) {
      stale.push(page);
    } else {
      writeFileSync(filePath, next, 'utf8');
      console.log(`build-html: updated ${page}`);
    }
  }

  if (check) {
    if (stale.length) {
      console.error(`build-html --check: out of sync with header.html/footer.html: ${stale.join(', ')}`);
      console.error('Run `npm run build:html` and commit the result.');
      process.exit(1);
    }
    console.log('build-html --check: all pages in sync.');
  }
}

main();
