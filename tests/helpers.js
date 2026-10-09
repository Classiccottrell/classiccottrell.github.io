import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

export const work = JSON.parse(read('data/work.json'));
export const takes = JSON.parse(read('data/takes.json')).filter((t) => !t.retired);
export const AXE = read('node_modules/axe-core/axe.min.js');

export const PAGES = [
  '/', '/work/', ...work.map((p) => `/work/${p.slug}/`),
  '/takes/', ...takes.map((t) => `/takes/${t.slug}/`),
  '/work-with-me/', '/work-with-me/thanks/', '/writing/', '/drawings/', '/about/', '/colophon/', '/404.html',
];

export const CARDS = ['home', 'work', ...work.map((p) => `work-${p.slug}`), 'takes', ...takes.map((t) => `take-${t.slug}`), 'work-with-me', 'writing', 'drawings', 'about', 'colophon'];

export async function axeViolations(page) {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
      resultTypes: ['violations'],
    });
    return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  });
}
