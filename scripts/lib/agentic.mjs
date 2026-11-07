// /work/vpat-vault/design-system/: what a design system looks like when agents
// read it too, with VPAT Vault as the worked example. Static copy lives here, not
// in data/: it is one essay, not a record. The copy gate is in site.js.

import { h } from './html.mjs';
import { page } from './layout.mjs';
import { img } from './parts.mjs';

export const DS_PATH = '/work/vpat-vault/design-system/';

// VPAT Vault's own tokens, shown as content (they are not this site's colours).
const SWATCHES = [
  ['--bg', '#EFEBE4', 'paper'], ['--surface', '#F8F5EF', 'sheet'], ['--ink', '#0E0E0C', 'type'],
  ['--muted', '#55514A', 'captions'], ['--signal', '#A3402B', 'one accent'], ['--field-2', '#CCD8CA', 'quiet field'],
];
const TESTS = [
  'stylesheet_defines_token_set', 'all_pages_share_one_stylesheet', 'motion_only_inside_no_preference', 'no_flashing_or_webgl',
  'banned_copy', 'no_purchasing_language_or_shop_links', 'no_external_font_or_script_urls', 'h1_skip_link_landmarks_and_alt',
  'nav_identical_on_every_page', 'pipeline_has_human_signoff_gate', 'extension_copy_matches_manifest', 'states_nothing_uploaded',
];
const COMPARE = [
  ['Look', 'A component library beside the product', 'Tokens in the stylesheet that ships, one stylesheet enforced'],
  ['Guidelines', 'Principles to interpret', 'Rules with reasons and numbers'],
  ['Voice', 'Tone adjectives', 'Names table, must say, never say, fixed-length boilerplate'],
  ['Imagery', 'Mockups and stock', 'Recipes that capture real output'],
  ['Review', 'By eye, at the end', 'Tests on every change'],
  ['Done means', 'It looks right', 'It looks right, and the checks pass'],
];

const layer = (id, tag, heading, body) => h`
<section class="ads-row" id="${id}" aria-labelledby="${id}-h">
  <div class="ads-label"><p class="note ads-tag">${tag}</p><h2 class="cs-h" id="${id}-h">${heading}</h2></div>
  <div class="ads-body">${body}</div>
</section>`;

export function designSystemPage(ctx) {
  const main = h`
<article class="ads">
  <div class="wrap">
    <header class="ph">
      <p class="note"><a href="/work/">Work</a> / <a href="/work/vpat-vault/">VPAT Vault</a> / Design system</p>
      <h1 class="h1">A design system an agent can follow. And prove it did.</h1>
      <p class="lede">Most design systems are written for designers. They assume a reader who can look at a page and feel that something is off. Agents can't feel it. They can read a rule and run a check. This is what a design system looks like when it is built for that reader too.</p>
      <p class="note">Every example is real, from the VPAT Vault build, November 2026.</p>
    </header>

    <section class="ads-row ads-story" aria-labelledby="moment-h">
      <div class="ads-label"><p class="note ads-tag">The moment</p><h2 class="vh" id="moment-h">The moment</h2></div>
      <div class="ads-body">
        <blockquote class="pq"><p>I asked an agent to remove every line on the VPAT Vault site that talked about buying it. It did. Then a test failed.</p></blockquote>
        <p>The test bans commerce words on every page, and it had found "price" inside a CSS class called <code>.price</code>. The rule was right, it was just too blunt. We narrowed it to how the word shows up in copy, and now "no commerce language while it's a free beta" isn't a line in a style guide hoping to be read. It runs on every change.</p>
        <p>That's the whole idea. Right now we hand agents the same brand book we hand people, then review their output by eye. Review is the slow part. An agentic design system moves the review into the system.</p>
      </div>
    </section>

    ${layer('tokens', 'Layer 1 · Tokens', 'The look, as values.', h`
      <p>Tokens live in the stylesheet that ships, not in a separate library that can drift. A test fails if any page adds inline styles or a second stylesheet.</p>
      <ul class="ads-sw" aria-label="VPAT Vault colour tokens">${SWATCHES.map(([n, hex, use]) => h`<li><i style="background:${hex}"></i><span><b>${n}</b> ${hex} ${use}</span></li>`)}</ul>
      <p class="ads-why">"Calm type" is a number, not an adjective. VPAT Vault's display face tops out at 4.75rem, so an agent making a social card knows the headline is about 64px on 1200 × 630 and nothing is bigger.</p>`)}

    ${layer('rules', 'Layer 2 · Rules', 'Rules that carry their reason.', h`
      <ul class="items">
        <li><strong>Real before drawn.</strong> The hero, the share card and product shots are captures of real tool output. Illustration supports, it never proves.</li>
        <li><strong>Calm type.</strong> Headlines lead, they don't shout. No poster-scale display type, no giant numbers.</li>
        <li><strong>Honest claims.</strong> Every image and line must survive a reviewer asking "is that true?"</li>
      </ul>
      <p class="ads-why">The reason is the part agents need most. A rule covers the cases you thought of. Its reason covers the one you didn't, like whether an AI-generated illustration can sit in the hero. (It can't. Rule one says why.)</p>`)}

    ${layer('voice', 'Layer 3 · Voice', 'Voice as data, not adjectives.', h`
      <p>"Friendly but professional" gives an agent nothing to act on. A names table, two lists and fixed-length boilerplate do.</p>
      <div class="ads-two">
        <div class="ads-card"><p class="note">Must say</p><ul>
          <li>Pair every scan claim with its limit</li><li>A person signs off every row</li>
          <li>It runs on your computer</li><li>It is not an audit, certification or legal advice</li>
        </ul></div>
        <div class="ads-card"><p class="note">Never say</p><ul>
          <li>compliant, certified, guaranteed, audit-ready</li><li>AI-powered, AI drafts</li>
          <li>buy, price, checkout, shop links</li><li>seamless, robust, journey, unlock</li>
        </ul></div>
      </div>
      <p class="ads-why">Boilerplate comes at one line, 50 words and 100 words. An agent trims an approved sentence instead of writing a new one, and new sentences are where claims creep in.</p>`)}

    ${layer('recipes', 'Layer 4 · Recipes', 'Recipes, not mockups.', h`
      <p>A mockup shows what an image should look like. A recipe makes it. The VPAT Vault hero is real scanner output, rendered to HTML and screenshotted, so an agent can remake it after every release and it can't drift from the truth.</p>
      <pre class="ads-pre" tabindex="0" aria-label="Capture recipe"><code><span class="c"># 1. Run a real scan of the demo store</span>
$ script -q tty.log wcag-scan --crawl http://127.0.0.1:8799/ --yes \\
    --report-dir ~/wcag-runs/brightside-goods
<span class="c"># 2. Turn the terminal's colour codes into styled HTML</span>
$ python3 render_terminal.py tty.log term.html
<span class="c"># 3. Shoot it at the asset size</span>
$ node shoot.js term.html term.png 1400 788</code></pre>
      <figure class="cs-fig"><div class="panel">${img({ src: '/assets/img/work/vpat-vault-site.webp', width: 1100, height: 619, alt: 'The VPAT Vault site: the headline Evidence in, Claims checked, beside a framed terminal capture of a WCAG CLI scan.' })}</div>
      <figcaption class="note cap">The recipe's output in place on the VPAT Vault site. The numbers in the terminal come from a real run on the bundled demo store, unedited.</figcaption></figure>`)}

    ${layer('gates', 'Layer 5 · Gates', "If a rule matters, it's a test.", h`
      <p>The VPAT Vault site runs 33 checks on every change. These are the ones that guard the design system, by their real names:</p>
      <ul class="ads-tests">${TESTS.map((t) => h`<li><code>${t}</code></li>`)}</ul>
      <div class="ads-gate" data-js>
        <label class="note" for="ads-copy">Try the copy gate. Edit the text and watch the checks.</label>
        <textarea id="ads-copy" rows="4" spellcheck="false">VPAT Vault is an AI-powered, seamless way to get audit-ready. Certified WCAG compliance for just $49.</textarea>
        <p class="ads-out" id="ads-out" role="status" aria-live="polite"></p>
        <p class="ads-act"><button type="button" class="tool" data-ads-load="good">Load the approved one-liner</button> <button type="button" class="tool" data-ads-load="bad">Load the bad example</button></p>
      </div>
      <p class="ads-why">The box runs a small version of the real check in your browser. The real one also scans the CSS, catches "certif" outside a disclaimer, and blocks install commands that don't exist.</p>`)}

    ${layer('package', 'Layer 6 · Package', 'One folder, one command.', h`
      <p>The art direction, the writing guide, the product facts, the real assets, the fonts with their licences and the capture scripts ship together. The build fails if a guide or a font licence is missing.</p>
      <pre class="ads-pre" tabindex="0" aria-label="Brand kit build"><code>$ bash vpat-optimizer/scripts/build_brand_kit.sh
vpat-vault-brand-kit/
  design.md            <span class="c"># art direction</span>
  writing-guide.md     <span class="c"># names, must say, never say, boilerplate</span>
  product.md           <span class="c"># facts and the required disclaimer</span>
  assets/              <span class="c"># share card, hero capture, icon</span>
  fonts/               <span class="c"># three OFL faces + LICENSES.txt</span>
  launch-assets/       <span class="c"># the recipes</span></code></pre>`)}

    ${layer('compare', 'Side by side', 'What changes when agents read it.', h`
      <table class="kt">
        <caption class="vh">A design system built for people compared with one built for agents too</caption>
        <thead><tr><th scope="col">Part</th><th scope="col">Built for people</th><th scope="col">Built for agents too</th></tr></thead>
        <tbody>${COMPARE.map(([a, b, c]) => h`<tr><td data-label="Part">${a}</td><td data-label="Built for people">${b}</td><td data-label="Built for agents too">${c}</td></tr>`)}</tbody>
      </table>`)}

    <section class="ads-row ads-close" aria-labelledby="move-h">
      <div class="ads-label"><p class="note ads-tag">The move</p></div>
      <div class="ads-body">
        <h2 class="cs-h" id="move-h">Write the rule, then write the check. A rule an agent can't verify is still a wish.</h2>
        <p>Start with the rule that hurts most when it breaks. For VPAT Vault it was honest claims. Give it a reason, a list and a test, then the next one.</p>
      </div>
    </section>
  </div>
  <nav class="wrap pn-wrap" aria-label="More work"><div class="pn-nav">
    <a class="lnk" href="/work/vpat-vault/"><span aria-hidden="true">←</span> VPAT Vault</a>
    <a class="lnk" href="/work/">All work</a>
  </div></nav>
</article>`;
  return page(ctx, {
    path: DS_PATH,
    title: 'A design system an agent can follow',
    description: 'What a design system looks like when agents read it too: tokens, rules with reasons, voice as data, image recipes and tests, with VPAT Vault as the worked example.',
    card: 'work-vpat-vault', type: 'article', bodyClass: 'case', main,
  });
}
