// Tiny HTML helpers for the build. Nothing is escaped implicitly: wrap every
// piece of data in esc() or inline() where it enters the markup.

export const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Escaped text with two inline marks from the data files: `code` and *emphasis*.
export const inline = (value) => esc(value)
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>');

// Plain text for attributes and meta tags: inline marks removed.
export const plain = (value) => String(value ?? '').replace(/[`*]/g, '');

const flat = (v) => (v == null || v === false ? '' : Array.isArray(v) ? v.map(flat).join('') : String(v));

// Tagged template that joins arrays and drops null/false values.
export const h = (strings, ...values) => strings.reduce((out, s, i) => out + s + (i < values.length ? flat(values[i]) : ''), '');

export const isExternal = (href) => /^https?:\/\//.test(href);

// A link that marks external destinations with ↗, without opening new tabs.
export const link = (href, label, cls = 'lnk') =>
  h`<a class="${cls}" href="${esc(href)}">${inline(label)}${isExternal(href) ? h`<span class="ext" aria-hidden="true"> ↗</span>` : ''}</a>`;

export const pad2 = (n) => String(n).padStart(2, '0');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
