// Take it apart, the Terry edition: the home lab in seven sheets, one per
// guide step, drawn in the site's ink and pencil. Each sheet is an inline SVG on
// a 400 × 300 board. The sheets stack, separate on a slider and lift as the
// reader scrolls the guide (assets/js/site.js, "the lab"). All text in the
// drawings is decoration: the real words are the step links and the guide.
// No addresses, usernames or port numbers appear in any drawing.

import { esc, h } from './html.mjs';

const T = (x, y, s, cls = 'tx', extra = '') => `<text class="${cls}" x="${x}" y="${y}"${extra}>${esc(s)}</text>`;
const R = (x, y, w, hgt, cls = 'ln', extra = '') => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${hgt}"${extra}/>`;
const P = (d, cls = 'ln') => `<path class="${cls}" d="${d}"/>`;
const L = (x1, y1, x2, y2, cls = 'ln') => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const rows = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');

// The drawing sheet: numeral, name, rule. Every layer starts the same way.
const sheet = (n, name, note, body) => `<svg class="lab-svg" viewBox="0 0 400 300" aria-hidden="true" focusable="false">
${T(16, 40, n, 'nm')}${T(64, 24, name, 'tp')}${T(64, 38, note, 'tm')}${P('M16 50H384', 'ln hair')}${body}</svg>`;

// 01 The machine: an old laptop, top view, lid open flat, with the check-first block.
const machine = () => {
  const keys = rows(4, (r) => rows(13, (c) => R(48 + c * 14.4, 190 + r * 14, 12, 11, 'ln hair')));
  return sheet('01', 'THE MACHINE', 'an old Intel MacBook, one job', `
${R(34, 62, 212, 112, 'ln wash')}${R(44, 71, 192, 94, 'ln hair')}
${rows(8, (i) => L(44 + i * 24, 165, 68 + i * 24, 71, 'ln pen'))}
${T(140, 114, 'NO MONITOR NEEDED', 'tp mid')}${T(140, 130, 'lid shut, headless', 'tm mid')}
${R(26, 176, 228, 104, 'ln f')}${P('M26 184H254', 'ln hair')}
${keys}${R(112, 252, 66, 20, 'ln hair')}
${R(266, 62, 118, 114, 'ln f')}${T(274, 78, 'CHECK FIRST', 'tp')}
${['Model', 'Year', 'RAM', 'Disk'].map((s, i) => T(274, 98 + i * 15, s, 'tx') + L(318, 99 + i * 15, 378, 99 + i * 15, 'ln pen')).join('')}
${R(274, 150, 8, 8, 'ln')}${T(288, 158, 'OS end-of-life?', 'tx')}
${R(266, 192, 118, 88, 'ln dash pr')}${T(274, 212, 'THIS MACHINE', 'tx')}${T(274, 226, 'EXISTS TO', 'tx')}${L(274, 258, 376, 258, 'ln pr')}${T(278, 252, 'one job', 'pt')}`);
};

// 02 The OS: a terminal, the install checklist and a disk the OS takes whole.
const os = () => sheet('02', 'THE OS', 'Ubuntu Server, headless', `
${R(16, 62, 222, 112, 'ln f')}${P('M16 78H238', 'ln hair')}${rows(3, (i) => R(24 + i * 10, 66, 6, 6, 'ln hair'))}
${T(26, 96, '$ df -h /', 'tx')}
${T(26, 112, 'Filesystem   Size   Avail', 'tm')}
${T(26, 128, 'root          whole  disk', 'tp')}
${R(26, 138, 202, 10, 'ln wash')}
${T(26, 164, '$', 'tx')}${R(36, 155, 7, 12, 'fill-fg')}
${R(254, 62, 130, 112, 'ln f')}${T(262, 78, 'INSTALL', 'tp')}
${['Flash the ISO', 'Boot with Option', 'Add OpenSSH', 'Skip the extras', 'Expand the disk'].map((s, i) => R(262, 87 + i * 16, 8, 8, 'ln') + (i < 5 ? P(`M263.5 ${91 + i * 16}l2.5 3 5-7`, 'ln pr tick') : '') + T(278, 95 + i * 16, s, 'tx')).join('')}
${T(16, 204, 'THE DISK', 'tp')}
${R(16, 212, 368, 30, 'ln f')}${R(16, 212, 26, 30, 'ln w')}${R(42, 212, 342, 30, 'ln wash')}
${T(52, 231, 'Ubuntu Server, all of it', 'tx')}${T(20, 231, 'EFI', 'tm', ' style="font-size:7px"')}
${P('M16 258H384M16 252V264M384 252V264', 'ln pr')}${T(200, 276, 'df shows the whole disk', 'tp mid')}`);

// 03 The network: the nodes on a private network, one of them not bought yet.
const network = () => sheet('03', 'THE NETWORK', 'fixed address, SSH key, private', `
${R(10, 58, 380, 226, 'ln dash pr')}${T(18, 72, 'PRIVATE NETWORK', 'tp')}
${L(80, 126, 170, 158, 'ln pr')}${L(320, 126, 230, 158, 'ln pr')}${L(80, 226, 170, 198, 'ln pr')}${L(320, 226, 230, 198, 'ln pr dash')}
${R(20, 82, 120, 44, 'ln f')}${T(80, 100, 'MacBook, 2015', 'th mid')}${T(80, 115, 'thinking machine', 'tm mid')}
${R(260, 82, 120, 44, 'ln f')}${T(320, 100, 'iMac, old', 'th mid')}${T(320, 115, 'memory and backups', 'tm mid')}
${R(20, 226, 120, 44, 'ln f')}${T(80, 244, 'my computer', 'th mid')}${T(80, 259, 'ssh server', 'tp mid')}
${R(260, 226, 120, 44, 'ln dash')}${T(320, 244, 'Mac mini', 'th mid')}${T(320, 259, 'planned', 'tm mid')}
${R(166, 150, 68, 56, 'ln wash heavy')}${T(200, 174, 'TERRY', 'th mid')}${T(200, 188, 'the server', 'tm mid')}
${R(158, 138, 84, 13, 'ln f')}${T(200, 148, 'FIXED ADDRESS', 'pt mid', ' style="font-size:8px"')}
<g class="key"><circle class="ln pr" cx="34" cy="188" r="6"/>${P('M40 188H66M58 188v6M63 188v5', 'ln pr')}</g>${T(26, 208, 'SSH key', 'pt')}
${T(200, 262, 'closed to the internet', 'tm mid', ' style="font-size:8px"')}`);

// 04 The services: four chips docked into the server, and a compose file read first.
const services = () => {
  const chips = [['git', 'the code'], ['chat', 'local models'], ['design', 'the design tool'], ['media', 'the library']];
  return sheet('04', 'THE SERVICES', 'chips docked into the server', `
${R(18, 62, 128, 218, 'ln f heavy')}${T(30, 80, 'TERRY', 'th')}${T(30, 92, 'Ubuntu server', 'tm')}
${chips.map(([n, s], i) => {
    const y = 102 + i * 44;
    return R(28, y, 108, 34, 'ln dash') + R(104, y + 2, 98, 30, 'ln f chip') + rows(3, (k) => L(104, y + 9 + k * 8, 112, y + 9 + k * 8, 'ln pr')) + T(120, y + 17, n.toUpperCase(), 'th') + T(120, y + 28, s, 'tm', ' style="font-size:7.5px"');
  }).join('')}
${R(232, 62, 152, 218, 'ln f')}${T(242, 80, 'docker-compose.yml', 'tp')}${T(242, 94, 'read it, then run it', 'tm')}
${['ports it binds', 'volumes with data', 'secrets', 'every localhost'].map((s, i) => R(242, 108 + i * 26, 132, 20, i === 3 ? 'ln wash' : 'ln hair') + T(250, 122 + i * 26, s, 'tx')).join('')}
${P('M242 232H374', 'ln pen')}${P('M242 244H340', 'ln pen')}${P('M242 256H360', 'ln pen')}`);
};

// 05 The port list and the keychain rule. The ports themselves stay private, inked out.
const ports = () => sheet('05', 'THE PORT LIST', 'what is bound where, and where secrets live', `
${R(16, 62, 236, 130, 'ln f')}${T(26, 80, 'SERVICE', 'tp')}${T(112, 80, 'PORT', 'tp')}${T(188, 80, 'STATE', 'tp')}${P('M16 88H252', 'ln hair')}
${['git', 'chat', 'design', 'media'].map((s, i) => T(26, 106 + i * 20, s, 'tx') + R(112, 97 + i * 20, 52, 12, 'fill-fg') + T(188, 106 + i * 20, 'in use', 'tm') + P(`M16 ${114 + i * 20}H252`, 'ln hair')).join('')}
${R(16, 202, 236, 24, 'ln dash pr')}${T(26, 218, 'next one: pick a free port', 'pt')}
${R(268, 62, 116, 164, 'ln f')}${T(276, 80, 'KEYCHAIN', 'tp')}
<circle class="ln heavy" cx="304" cy="124" r="16"/><circle class="ln" cx="304" cy="124" r="6"/>${P('M320 124H372M356 124v14M366 124v10', 'ln heavy')}
${T(276, 168, 'read at call time', 'tx')}${P('M326 174v18', 'ln pr')}${P('M321 188l5 6 5-6', 'ln pr')}
${R(276, 198, 100, 20, 'ln f')}${T(282, 211, '$ cmd --token ****', 'tm', ' style="font-size:8px"')}
${R(16, 238, 368, 42, 'ln f')}${T(26, 254, 'PRE-DEPLOY CHECK', 'tp')}
${['pick a free port', 'refuse to reuse one', 'say when done'].map((s, i) => R(26 + i * 118, 260, 108, 14, i === 2 ? 'ln wash' : 'ln hair') + T(34 + i * 118, 270, s, 'tx', ' style="font-size:8.5px"')).join('')}`);

// 06 The runbook: the page you write after deploy one, and the second deploy that fixes it.
const runbook = () => {
  const loop = (cx, cy, a, b) => `<circle class="ln pr" cx="${cx}" cy="${cy}" r="38"/>${P(`M${cx - 5} ${cy - 43}L${cx + 3} ${cy - 38}L${cx - 5} ${cy - 33}`, 'ln pr')}${T(cx, cy - 1, a, 'th mid', ' style="font-size:12px"')}${T(cx, cy + 13, b, 'tm mid', ' style="font-size:8px"')}`;
  return sheet('06', 'THE RUNBOOK', 'deploy twice, write it down', `
${R(16, 62, 172, 218, 'ln f')}${T(26, 80, 'RUNBOOK', 'tp')}
${['Prerequisites', 'Steps', 'How to verify', 'Known mistakes'].map((s, i) => R(24, 90 + i * 48, 156, 40, i === 3 ? 'ln wash pr' : 'ln hair') + T(32, 105 + i * 48, s, 'th', ' style="font-size:11px"') + P(`M32 ${116 + i * 48}H172M32 ${126 + i * 48}H150`, 'ln pen')).join('')}
${loop(310, 112, 'DEPLOY 1', 'a web app')}${loop(310, 224, 'DEPLOY 2', 'a desktop app')}
${P('M310 150V186', 'ln pr dash')}${P('M272 224H196', 'ln pr')}${P('M202 218l-6 6 6 6', 'ln pr')}${T(204, 214, 'it breaks,', 'tp', ' style="font-size:8px"')}${T(204, 244, 'one line in', 'tp', ' style="font-size:8px"')}`);
};

// 07 The backups: dated copies, pulled by the other machine, with a free-space floor.
const backups = () => {
  const day = (i) => `2026-10-${String(9 - i).padStart(2, '0')}`;
  const slab = (i) => {
    const y = 104 + i * 26, x = 176;
    return `<polygon class="ln ${i ? 'f' : 'wash'}" points="${x},${y} ${x + 150},${y} ${x + 174},${y - 12} ${x + 24},${y - 12}"/>` +
      `<rect class="ln ${i ? 'f' : 'wash'}" x="${x}" y="${y}" width="150" height="16"/>` +
      `<polygon class="ln ${i ? 'f' : 'wash'}" points="${x + 150},${y} ${x + 174},${y - 12} ${x + 174},${y + 4} ${x + 150},${y + 16}"/>` +
      T(x + 8, y + 11.5, day(i), i ? 'tx' : 'pt', ' style="font-size:9px"');
  };
  return sheet('07', 'THE BACKUPS', 'dated snapshots, pulled to the iMac', `
${R(16, 82, 90, 60, 'ln f')}${T(61, 108, 'TERRY', 'th mid')}${T(61, 122, 'the server', 'tm mid')}
${P('M170 112H114', 'ln pr')}${P('M120 106l-6 6 6 6', 'ln pr')}${T(142, 100, 'pulled', 'pt mid')}${T(142, 140, 'nightly', 'pt mid')}
${rows(6, (i) => slab(5 - i))}
${R(16, 176, 126, 78, 'ln dash pr')}${T(24, 192, 'FREE SPACE', 'tp')}${R(24, 200, 110, 12, 'ln')}${R(24, 200, 70, 12, 'wash')}${P('M104 196V216', 'ln heavy pr')}${T(24, 230, 'under the floor,', 'tx', ' style="font-size:8.5px"')}${T(24, 242, 'no backup runs', 'tx', ' style="font-size:8.5px"')}
${T(176, 270, 'RESTORE ONE FILE FIRST', 'tp')}${T(176, 80, 'THE iMAC', 'tp')}`);
};

export const LAYERS = [
  { n: 1, id: 'step-1-pick', name: 'The machine', draw: machine },
  { n: 2, id: 'step-2-install', name: 'The OS', draw: os },
  { n: 3, id: 'step-3-reach', name: 'The network', draw: network },
  { n: 4, id: 'step-4-deploy', name: 'The services', draw: services },
  { n: 5, id: 'step-5-ports', name: 'The ports', draw: ports },
  { n: 6, id: 'step-6-runbook', name: 'The runbook', draw: runbook },
  { n: 7, id: 'step-7-backups', name: 'The backups', draw: backups },
];

const two = (n) => String(n).padStart(2, '0');

// The figure. Layers run bottom to top, like the guide. Tags are real links to
// the steps; without JavaScript they hide and the step index carries the job.
export const lab = () => h`
<figure class="xv xv-lab" id="lab-xv" aria-labelledby="lab-cap" data-lab>
  <div class="xv-stage" aria-hidden="true"><div class="xv-stack">
    ${LAYERS.map((l) => h`<div class="xv-layer" style="--i:${l.n - 1}" data-l="l${l.n}" data-step="${l.n}"><i class="xv-pin"></i>${l.draw()}</div>`)}
  </div></div>
  <nav class="xv-tags" aria-label="The seven layers">
    ${[...LAYERS].reverse().map((l) => h`<a class="xv-tag" href="#${l.id}" data-l="l${l.n}" data-step="${l.n}"><b>${two(l.n)}</b><span>${esc(l.name)}</span><i class="ld"></i><i class="dt"></i></a>`)}
  </nav>
  <figcaption class="vh" id="lab-cap">The Terry home lab, taken apart into seven layers, one for each step of the guide: the machine, the OS, the network, the services, the port list, the runbook and the backups.</figcaption>
</figure>`;
