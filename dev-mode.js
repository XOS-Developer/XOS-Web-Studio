/* ==========================================================================
   XOS Web Studio — app.js
   Vanilla JavaScript. No frameworks, no libraries, no network requests.
   ========================================================================== */
(() => {
'use strict';

/* ==========================================================================
   1. Utilities
   ========================================================================== */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
let _uid = 0;
const uid = (p = 'x') => p + Date.now().toString(36) + (++_uid).toString(36);
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/** Tiny element factory: h('div', {class:'x', onclick(){}}, child, 'text') */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}

const store = {
  get(k, d) { try { const v = localStorage.getItem('xos.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v, replacer) { try { localStorage.setItem('xos.' + k, JSON.stringify(v, replacer)); } catch { /* storage unavailable */ } }
};

function relTime(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) { const n = Math.round(s / 3600); return n + (n === 1 ? ' hour ago' : ' hours ago'); }
  if (s < 172800) return 'yesterday';
  if (s < 86400 * 14) return Math.round(s / 86400) + ' days ago';
  return new Date(ts).toLocaleDateString();
}

/* ==========================================================================
   2. Icons (inline SVG, stroke-based)
   ========================================================================== */
const ICONS = {
  file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
  fileCode: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/><polyline points="10 13 8 15 10 17"/><polyline points="14 13 16 15 14 17"/>',
  fileText: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/>',
  filePlus: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  folderOpen: '<path d="M5 19a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v2"/><path d="M3 19l3-8h17l-3 8z"/>',
  folderPlus: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>',
  chevron: '<polyline points="9 18 15 12 9 6"/>',
  chevronDown: '<polyline points="6 9 12 15 18 9"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  undo: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  redo: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  bellOff: '<path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/>',
  git: '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  warn: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  keyboard: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
  command: '<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  collapse: '<polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  rename: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  logo: '<path d="M4 4l7 8-7 8"/><path d="M13 20h7"/>',
  cursor: '<path d="M4 4l7 17 2.5-7.5L21 11z"/>'
};
const icon = (name, size = 16) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ==========================================================================
   3. Settings model
   ========================================================================== */
const MONO = '"Cascadia Code","JetBrains Mono","Fira Code",Consolas,"SF Mono",Menlo,monospace';
const CATS = [
  ['appearance', 'Appearance', 'layout'], ['editor', 'Editor', 'code'], ['projects', 'Projects', 'folder'],
  ['files', 'Files', 'file'], ['themes', 'Themes', 'sun'],
  ['about', 'About', 'info']
];
const SETTINGS = [
  // Appearance
  { cat: 'appearance', key: 'theme', label: 'Color theme', desc: 'Switch between dark, light, or follow your operating system.', type: 'select', def: 'dark', options: [['dark', 'Dark'], ['light', 'Light'], ['system', 'Follow system']] },
  { cat: 'appearance', key: 'density', label: 'Interface density', desc: 'Row height in the explorer, menus and lists.', type: 'select', def: 'default', options: [['compact', 'Compact'], ['default', 'Default'], ['comfortable', 'Comfortable']] },
  { cat: 'appearance', key: 'animations', label: 'Animations', desc: 'Transitions for tabs, menus, dialogs and notifications.', type: 'toggle', def: true },
  { cat: 'appearance', key: 'showToolbar', label: 'Show toolbar', desc: 'The row of quick actions under the menu bar.', type: 'toggle', def: true },
  { cat: 'appearance', key: 'showStatusBar', label: 'Show status bar', desc: 'Language, cursor position and theme switcher at the bottom.', type: 'toggle', def: true },
  { cat: 'appearance', key: 'showBreadcrumbs', label: 'Show breadcrumbs', desc: 'File path above the editor.', type: 'toggle', def: true },
  { cat: 'appearance', key: 'leftWidth', label: 'Explorer width', desc: 'Drag the divider or set it here.', type: 'range', def: 250, min: 180, max: 420, step: 10, unit: 'px' },
  { cat: 'appearance', key: 'rightWidth', label: 'Properties width', desc: 'Width of the inspector panel.', type: 'range', def: 290, min: 240, max: 460, step: 10, unit: 'px' },
  { cat: 'appearance', key: 'toastDuration', label: 'Notification duration', desc: 'How long toasts stay on screen.', type: 'range', def: 5, min: 2, max: 15, step: 1, unit: 's' },
  // Editor
  { cat: 'editor', key: 'fontSize', label: 'Font size', desc: 'Editor text size.', type: 'range', def: 14, min: 10, max: 24, step: 1, unit: 'px' },
  { cat: 'editor', key: 'fontFamily', label: 'Font family', desc: 'Monospace typeface used in the editor.', type: 'select', def: MONO, options: [[MONO, 'System monospace'], ['Consolas,"Courier New",monospace', 'Consolas'], ['"SF Mono",Menlo,Monaco,monospace', 'SF Mono / Menlo'], ['"Courier New",monospace', 'Courier New']] },
  { cat: 'editor', key: 'lineHeight', label: 'Line height', desc: 'Multiplier applied to the font size.', type: 'range', def: 1.6, min: 1.2, max: 2, step: 0.1, unit: '×' },
  { cat: 'editor', key: 'tabSize', label: 'Tab size', desc: 'Number of spaces a tab is worth.', type: 'select', def: 4, num: true, options: [[2, '2'], [4, '4'], [8, '8']] },
  { cat: 'editor', key: 'insertSpaces', label: 'Insert spaces on Tab', desc: 'Turn off to insert tab characters.', type: 'toggle', def: true },
  { cat: 'editor', key: 'lineNumbers', label: 'Line numbers', desc: 'Show the gutter beside the code.', type: 'toggle', def: true },
  { cat: 'editor', key: 'highlightLine', label: 'Highlight current line', desc: 'Subtle background on the line with the caret.', type: 'toggle', def: true },
  { cat: 'editor', key: 'syntaxHighlight', label: 'Syntax highlighting', desc: 'Color HTML, CSS, JavaScript, JSON and Markdown.', type: 'toggle', def: true },
  { cat: 'editor', key: 'autoIndent', label: 'Auto indent', desc: 'Keep the indentation of the previous line on Enter.', type: 'toggle', def: true },
  { cat: 'editor', key: 'ligatures', label: 'Font ligatures', desc: 'Combine characters like => and !== if your font supports it.', type: 'toggle', def: false },
  // Projects
  { cat: 'projects', key: 'restoreProject', label: 'Reopen last project', desc: 'Start where you left off.', type: 'toggle', def: true },
  { cat: 'projects', key: 'showWelcome', label: 'Show welcome page on startup', desc: '', type: 'toggle', def: true },
  { cat: 'projects', key: 'confirmDelete', label: 'Confirm before deleting', desc: 'Ask before removing projects, files or folders.', type: 'toggle', def: true },
  { cat: 'projects', key: 'defaultTemplate', label: 'Default template', desc: 'Used when you create a project without choosing.', type: 'select', def: 'static', options: [['blank', 'Blank'], ['static', 'Static site'], ['landing', 'Landing page'], ['counter', 'Counter app']] },
  { cat: 'projects', key: 'recentLimit', label: 'Recent projects shown', desc: 'On the welcome page.', type: 'select', def: 4, num: true, options: [[3, '3'], [4, '4'], [6, '6'], [8, '8']] },
  // Files
  { cat: 'files', key: 'autoSave', label: 'Auto save', desc: 'When to save changes automatically.', type: 'select', def: 'off', options: [['off', 'Off'], ['delay', 'After a delay'], ['blur', 'When the window loses focus']] },
  { cat: 'files', key: 'autoSaveDelay', label: 'Auto save delay', desc: 'Used with “After a delay”.', type: 'range', def: 1.5, min: 0.5, max: 5, step: 0.5, unit: 's' },
  { cat: 'files', key: 'trimWhitespace', label: 'Trim trailing whitespace on save', desc: '', type: 'toggle', def: false },
  { cat: 'files', key: 'finalNewline', label: 'Insert final newline on save', desc: '', type: 'toggle', def: false },
  { cat: 'files', key: 'encoding', label: 'Default encoding', desc: 'Shown in the status bar. Files in the browser are always stored as text.', type: 'select', def: 'UTF-8', options: [['UTF-8', 'UTF-8'], ['UTF-16', 'UTF-16'], ['ISO-8859-1', 'ISO 8859-1']] },
  { cat: 'files', key: 'eol', label: 'End of line', desc: 'Shown in the status bar.', type: 'select', def: 'LF', options: [['LF', 'LF'], ['CRLF', 'CRLF']] },
  // Themes
  { cat: 'themes', key: 'theme', label: 'Theme', desc: 'Pick a look for the whole workspace.', type: 'themeCards', def: 'dark' },
  { cat: 'themes', key: 'accent', label: 'Accent color', desc: 'Highlights, focus rings and active states.', type: 'accent', def: '' },
   // About
  { cat: 'about', key: 'about', label: 'About XOS Web Studio', desc: '', type: 'about' }
];
/** Solid accents: a single flat color (accent2 === accent). */
const SOLID_ACCENTS = [
  { label: 'Cobalt',  c1: '#1F5CE0' },
  { label: 'Violet',  c1: '#7C5CFF' },
  { label: 'Indigo',  c1: '#4F6BFF' },
  { label: 'Sky',     c1: '#2F80ED' },
  { label: 'Teal',    c1: '#12A594' },
  { label: 'Green',   c1: '#2FAE60' },
  { label: 'Olive',   c1: '#7C9A3B' },
  { label: 'Amber',   c1: '#F5A524' },
  { label: 'Red',     c1: '#E5484D' },
  { label: 'Pink',    c1: '#E93D82' },
];
/** Gradient accents: two-stop linear-gradient(90deg, c1 0%, c2 100%). Required preset is first. */
const GRADIENT_ACCENTS = [
  { label: 'Cobalt Blue', c1: '#1F5CE0', c2: '#1F42E0' },
  { label: 'Violet Dusk', c1: '#7C5CFF', c2: '#B24FE0' },
  { label: 'Ocean',       c1: '#2F80ED', c2: '#12A594' },
  { label: 'Sunset',      c1: '#F5A524', c2: '#E5484D' },
  { label: 'Berry',       c1: '#E93D82', c2: '#7C5CFF' },
  { label: 'Forest',      c1: '#2FAE60', c2: '#12A594' },
  { label: 'Fire',        c1: '#E8703A', c2: '#E5484D' },
  { label: 'Aurora',      c1: '#12A594', c2: '#4F6BFF' },
  { label: 'Grape',       c1: '#7C3AED', c2: '#DB2777' },
  { label: 'Steel',       c1: '#64748B', c2: '#334155' },
];
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 217, g: 138, b: 61 };
}
function hexToRgba(hex, alpha) { const { r, g, b } = hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${alpha})`; }
function pickTextColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#17181c' : '#ffffff';
}

const settings = {};
SETTINGS.forEach(s => { if ('def' in s) settings[s.key] = s.def; });
Object.assign(settings, store.get('settings', {}));
const saveSettings = debounce(() => store.set('settings', settings), 200);

/* ==========================================================================
   4. Project templates & data
   ========================================================================== */
const mkFile = (name, content = '') => ({ id: uid('f'), name, type: 'file', content });
const mkDir = (name, children = [], open = true) => ({ id: uid('d'), name, type: 'folder', open, children });

const BLANK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Untitled</title>
</head>
<body>
  <h1>Hello, world</h1>
</body>
</html>
`;

const TEMPLATES = {
  blank: { name: 'Blank', desc: 'One empty HTML page.', glyph: 'file', build: () => [mkFile('index.html', BLANK_HTML)] },
  static: {
    name: 'Static site', desc: 'HTML, CSS and JavaScript in separate folders.', glyph: 'layout',
    build: () => [
      mkFile('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurora Studio</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="site-header">
    <strong>Aurora</strong>
    <nav>
      <a href="#work">Work</a>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>

  <main>
    <section class="hero">
      <h1>Interfaces with a sense of place.</h1>
      <p>An independent studio designing products for people who notice the details.</p>
      <button id="cta">Say hello</button>
    </section>

    <section class="work" id="work">
      <article class="card"><h2>Harbor</h2><p>Booking tools for small ferries.</p></article>
      <article class="card"><h2>Fieldnotes</h2><p>A calm notebook for researchers.</p></article>
      <article class="card"><h2>Lumen</h2><p>Lighting control that stays out of the way.</p></article>
    </section>
  </main>

  <script src="js/main.js"></script>
</body>
</html>
`),
      mkDir('css', [mkFile('style.css', `:root {
  --ink: #14181f;
  --paper: #f6f4ef;
  --accent: #3b5bdb;
}

* { box-sizing: border-box; margin: 0; }

body {
  font-family: Georgia, "Times New Roman", serif;
  color: var(--ink);
  background: var(--paper);
  line-height: 1.6;
}

.site-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 6vw;
}

.site-header nav a {
  margin-left: 24px;
  color: inherit;
  text-decoration: none;
}

.site-header nav a:hover { color: var(--accent); }

.hero { padding: 12vh 6vw 8vh; max-width: 900px; }
.hero h1 { font-size: clamp(2.5rem, 7vw, 5rem); line-height: 1.05; }
.hero p { margin: 24px 0; font-size: 1.25rem; max-width: 34ch; }

button {
  background: var(--ink);
  color: var(--paper);
  border: 0;
  padding: 12px 22px;
  border-radius: 999px;
  font: inherit;
  cursor: pointer;
  transition: transform .15s;
}
button:hover { transform: translateY(-2px); }

.work {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  padding: 0 6vw 10vh;
}
.card { background: #fff; padding: 24px; border-radius: 12px; }
.card h2 { margin-bottom: 6px; }
`)]),
      mkDir('js', [mkFile('main.js', `const cta = document.getElementById('cta');

cta.addEventListener('click', () => {
  cta.textContent = 'Thanks, talk soon!';
});

document.querySelectorAll('.card').forEach((card, i) => {
  card.style.animation = 'rise .5s ease ' + i * 0.08 + 's both';
});
`)]),
      mkDir('assets', [mkDir('images', [mkFile('README.md', '# Images\n\nPut your image files in this folder.\n')], true)], false)
    ]
  },
  landing: {
    name: 'Landing page', desc: 'A single hero section with a call to action.', glyph: 'eye',
    build: () => [
      mkFile('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Launch</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="hero">
    <p class="kicker">Now in early access</p>
    <h1>Ship the small thing today.</h1>
    <p class="lede">Tempo helps tiny teams plan a week in ten minutes.</p>
    <form class="signup" onsubmit="event.preventDefault(); this.querySelector('button').textContent = 'You are on the list';">
      <input type="email" placeholder="you@company.com" required>
      <button>Join the list</button>
    </form>
  </main>
</body>
</html>
`),
      mkFile('styles.css', `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  color: #f5f5f7;
  background: radial-gradient(circle at 30% 20%, #33206b, #10101a 60%);
}
.hero { max-width: 560px; padding: 32px; }
.kicker { color: #9d8cff; margin: 0 0 12px; }
h1 { font-size: clamp(2.2rem, 6vw, 3.6rem); line-height: 1.05; margin: 0 0 16px; }
.lede { color: #c4c4d0; font-size: 1.1rem; margin: 0 0 28px; }
.signup { display: flex; gap: 8px; }
input { flex: 1; padding: 12px 14px; border-radius: 8px; border: 1px solid #3b3b55; background: #16162a; color: inherit; }
button { padding: 12px 18px; border: 0; border-radius: 8px; background: #7c5cff; color: white; font-weight: 600; cursor: pointer; }
`)
    ]
  },
  counter: {
    name: 'Counter app', desc: 'A tiny interactive example.', glyph: 'play',
    build: () => [
      mkFile('index.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Counter</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="counter">
    <button id="dec" aria-label="Decrease">−</button>
    <output id="value">0</output>
    <button id="inc" aria-label="Increase">+</button>
  </div>
  <script src="app.js"></script>
</body>
</html>
`),
      mkFile('style.css', `body { margin: 0; height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
.counter { display: flex; align-items: center; gap: 24px; }
output { min-width: 3ch; text-align: center; font-size: 4rem; font-variant-numeric: tabular-nums; }
button { width: 56px; height: 56px; border-radius: 50%; border: 0; font-size: 1.6rem; background: #1e293b; color: inherit; cursor: pointer; transition: background .15s; }
button:hover { background: #334155; }
`),
      mkFile('app.js', `let count = 0;
const value = document.getElementById('value');

function render() {
  value.textContent = count;
}

document.getElementById('inc').addEventListener('click', () => { count++; render(); });
document.getElementById('dec').addEventListener('click', () => { count--; render(); });
`)
    ]
  }
};

function makeProject(name, tpl, agoMs = 0, pinned = false) {
  const t = TEMPLATES[tpl] || TEMPLATES.blank;
  const now = Date.now();
  return { id: uid('p'), name, template: tpl, created: now - agoMs, modified: now - agoMs, pinned, root: mkDir(name, t.build()) };
}
function seedProjects() {
  return [
    makeProject('Aurora Portfolio', 'static', 36e5 * 2, true),
    makeProject('Tempo Launch Page', 'landing', 864e5 * 1.2, true),
    makeProject('Counter Demo', 'counter', 864e5 * 5, false)
  ];
}

/* ==========================================================================
   4b. Disk sync — File System Access API + IndexedDB handle persistence
   A project can optionally be linked to a real folder on disk. When linked,
   creating/saving/renaming/deleting files mirrors those operations to disk.
   Everything here is best-effort: failures toast a warning but never block
   the in-browser (localStorage-backed) model, which always works.
   ========================================================================== */
const Disk = (() => {
  const supported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const rootHandles = new Map();   // projectId -> FileSystemDirectoryHandle (the project's own folder)
  const DB_NAME = 'xosFsHandles', STORE = 'dirs';

  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbSet(key, val) {
    try { const db = await idbOpen(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(val, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
    catch { /* IndexedDB unavailable — handle just won't survive reload */ }
  }
  async function idbGet(key) {
    try { const db = await idbOpen(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readonly'); const rq = tx.objectStore(STORE).get(key); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); }); }
    catch { return undefined; }
  }
  async function idbDelete(key) {
    try { const db = await idbOpen(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
    catch { /* ignore */ }
  }

  async function pickParentDirectory() {
    if (!supported) return null;
    try { return await window.showDirectoryPicker({ mode: 'readwrite' }); }
    catch (e) { if (e.name !== 'AbortError') Toast.error('Could not open folder picker', e.message); return null; }
  }

  function isLinked(projectId) { return rootHandles.has(projectId); }

  /** Path (array of folder names) from just below the project root down to `node`, excluding the root itself. */
  function segmentsTo(project, node) {
    const trail = pathTo(project.root, node.id) || [project.root];
    return trail.slice(1).map(n => n.name);
  }
  async function resolveDirHandle(project, folderNode, create) {
    const root = rootHandles.get(project.id);
    if (!root) return null;
    let h = root;
    for (const seg of segmentsTo(project, folderNode)) h = await h.getDirectoryHandle(seg, { create: !!create });
    return h;
  }
  async function resolveParentHandle(project, node, create) {
    const root = rootHandles.get(project.id);
    if (!root) return null;
    const segs = segmentsTo(project, node);
    segs.pop();
    let h = root;
    for (const seg of segs) h = await h.getDirectoryHandle(seg, { create: !!create });
    return h;
  }

  async function writeFile(project, node) {
    if (!isLinked(project.id)) return;
    const parent = await resolveParentHandle(project, node, true);
    const fh = await parent.getFileHandle(node.name, { create: true });
    const w = await fh.createWritable();
    await w.write(node.content || '');
    await w.close();
  }
  async function writeTree(project, node) {
    if (!isLinked(project.id)) return;
    if (node.type === 'file') { await writeFile(project, node); return; }
    await resolveDirHandle(project, node, true);
    for (const child of node.children) await writeTree(project, child);
  }
  async function createEntryOnDisk(project, node) {
    if (!isLinked(project.id)) return;
    if (node.type === 'file') await writeFile(project, node);
    else await resolveDirHandle(project, node, true);
  }
  async function deleteEntryOnDisk(project, node, parentNode) {
    if (!isLinked(project.id)) return;
    const parentHandle = await resolveDirHandle(project, parentNode, false).catch(() => null);
    if (!parentHandle) return;
    await parentHandle.removeEntry(node.name, { recursive: true }).catch(() => {});
  }
  async function renameEntryOnDisk(project, node, oldName) {
    if (!isLinked(project.id)) return;
    const parent = await resolveParentHandle(project, node, true);
    await parent.removeEntry(oldName, { recursive: true }).catch(() => {});
    await writeTree(project, node);
  }
  async function duplicateEntryOnDisk(project, node) { await writeTree(project, node); }

  async function createProjectFolder(parentHandle, project) {
    const dir = await parentHandle.getDirectoryHandle(project.name, { create: true });
    rootHandles.set(project.id, dir);
    project.diskLinked = true;
    project.diskName = project.name;
    project._needsReconnect = false;
    await idbSet('project:' + project.id, dir);
    await writeTree(project, project.root);
    return dir;
  }

  /** On boot: try to silently reconnect projects that were previously linked. */
  async function reconnectAll(projects) {
    if (!supported) return;
    for (const p of projects) {
      if (!p.diskLinked) continue;
      const handle = await idbGet('project:' + p.id);
      if (!handle) { p._needsReconnect = true; continue; }
      try {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') { rootHandles.set(p.id, handle); p._needsReconnect = false; }
        else { p._pendingHandle = handle; p._needsReconnect = true; }
      } catch { p._needsReconnect = true; }
    }
  }
  /** Called from a user gesture (click) to (re)request permission on a previously-linked project. */
  async function reconnect(project) {
    const handle = project._pendingHandle || await idbGet('project:' + project.id);
    if (!handle) { Toast.error('Folder not found', 'This project was never linked, or the browser has no record of it.'); return false; }
    try {
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        rootHandles.set(project.id, handle);
        project._needsReconnect = false;
        project._pendingHandle = null;
        Toast.success('Folder reconnected', project.diskName || project.name);
        return true;
      }
      Toast.warning('Permission denied', 'The browser needs folder access to keep syncing this project.');
      return false;
    } catch (e) { Toast.error('Could not reconnect', e.message); return false; }
  }
  async function unlink(project) {
    rootHandles.delete(project.id);
    project.diskLinked = false;
    project._needsReconnect = false;
    project._pendingHandle = null;
    await idbDelete('project:' + project.id);
  }

  return { supported, isLinked, pickParentDirectory, createProjectFolder, writeFile, writeTree, createEntryOnDisk, deleteEntryOnDisk, renameEntryOnDisk, duplicateEntryOnDisk, reconnectAll, reconnect, unlink };
})();

/* ==========================================================================
   5. Syntax highlighting (tokenizers → token arrays → HTML)
   ========================================================================== */
function runScan(src, re, classes, out) {
  re.lastIndex = 0;
  let last = 0, m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ t: src.slice(last, m.index), c: '' });
    let c = '';
    for (let i = 1; i < m.length; i++) if (m[i] !== undefined) { c = classes[i - 1]; break; }
    out.push({ t: m[0], c });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ t: src.slice(last), c: '' });
}

const JS_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\[\s\S])*`)|\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|from|export|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|this|null|undefined|true|false|void|delete|yield|static|super)\b|(\b(?:0x[\da-fA-F]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?)\b)|([A-Za-z_$][\w$]*)(?=\s*\()/g;
const tokJS = (src, out) => runScan(src, JS_RE, ['cm', 'str', 'kw', 'num', 'fn'], out);

function tokCSS(src, out) {
  const re = /(\/\*[\s\S]*?\*\/)|("[^"\n]*"|'[^'\n]*')|(@[\w-]+)|([{};])|(#[\da-fA-F]{3,8}\b)|((?<![\w#-])-?\d*\.?\d+(?:px|rem|em|vh|vw|ms|s|deg|fr|ch|%)?)|([\w-]+)(?=\s*:)|([\w-]+)(?=\()/g;
  const stack = [];
  let last = 0, m, prelude = '';
  const decl = () => stack[stack.length - 1] === 'rule';
  const plain = txt => { if (txt) { out.push({ t: txt, c: decl() ? '' : 'sel' }); prelude += txt; } };
  while ((m = re.exec(src))) {
    plain(src.slice(last, m.index));
    last = re.lastIndex;
    const s = m[0];
    if (m[1]) out.push({ t: s, c: 'cm' });
    else if (m[2]) out.push({ t: s, c: 'str' });
    else if (m[3]) { out.push({ t: s, c: 'kw' }); prelude += s; }
    else if (m[4]) {
      out.push({ t: s, c: 'pn' });
      if (s === '{') { stack.push(/^\s*@(media|supports|layer|container|keyframes|-webkit-keyframes)/.test(prelude) ? 'group' : 'rule'); prelude = ''; }
      else if (s === '}') { stack.pop(); prelude = ''; }
      else prelude = '';
    }
    else if (m[5]) { out.push({ t: s, c: decl() ? 'num' : 'sel' }); prelude += s; }
    else if (m[6]) { out.push({ t: s, c: decl() ? 'num' : 'sel' }); prelude += s; }
    else if (m[7]) { out.push({ t: s, c: decl() ? 'prop' : 'sel' }); prelude += s; }
    else if (m[8]) { out.push({ t: s, c: decl() ? 'fn' : 'sel' }); prelude += s; }
  }
  plain(src.slice(last));
}

function tokTag(s, out) {
  const m = /^(<\/?)([A-Za-z][\w:-]*)/.exec(s);
  if (!m) { out.push({ t: s, c: '' }); return; }
  out.push({ t: m[1], c: 'pn' }, { t: m[2], c: 'tag' });
  const rest = s.slice(m[0].length);
  const re = /(\s+)|([\w:@.-]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)|([\w:@.-]+)|(\/?>)|([\s\S])/g;
  let a;
  while ((a = re.exec(rest))) {
    if (a[1]) out.push({ t: a[1], c: '' });
    else if (a[2]) out.push({ t: a[2], c: 'attr' }, { t: a[3], c: 'pn' }, { t: a[4], c: 'str' });
    else if (a[5]) out.push({ t: a[5], c: 'attr' });
    else if (a[6]) out.push({ t: a[6], c: 'pn' });
    else out.push({ t: a[7], c: '' });
  }
}
function tokHTML(src, out) {
  const re = /(<!--[\s\S]*?-->)|(<!DOCTYPE[^>]*>)|(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)|(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)|(<\/?[A-Za-z][^>]*>)/gi;
  let last = 0, m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ t: src.slice(last, m.index), c: '' });
    last = re.lastIndex;
    if (m[1]) out.push({ t: m[0], c: 'cm' });
    else if (m[2]) out.push({ t: m[0], c: 'kw' });
    else if (m[3]) { tokTag(m[3], out); if (m[4]) tokJS(m[4], out); tokTag(m[5], out); }
    else if (m[6]) { tokTag(m[6], out); if (m[7]) tokCSS(m[7], out); tokTag(m[8], out); }
    else tokTag(m[9], out);
  }
  if (last < src.length) out.push({ t: src.slice(last), c: '' });
}

function tokJSON(src, out) {
  const re = /("(?:[^"\\\n]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g;
  let last = 0, m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ t: src.slice(last, m.index), c: '' });
    last = re.lastIndex;
    if (m[1] !== undefined) { out.push({ t: m[1], c: m[2] ? 'prop' : 'str' }); if (m[2]) out.push({ t: m[2], c: 'pn' }); }
    else if (m[3]) out.push({ t: m[0], c: 'kw' });
    else out.push({ t: m[0], c: 'num' });
  }
  if (last < src.length) out.push({ t: src.slice(last), c: '' });
}

function tokMD(src, out) {
  const lines = src.split('\n');
  let fence = false;
  lines.forEach((ln, i) => {
    const nl = i < lines.length - 1 ? '\n' : '';
    if (/^```/.test(ln)) { fence = !fence; out.push({ t: ln + nl, c: 'str' }); return; }
    if (fence) { out.push({ t: ln + nl, c: 'str' }); return; }
    if (/^#{1,6}\s/.test(ln)) { out.push({ t: ln + nl, c: 'tag' }); return; }
    const list = /^(\s*(?:[-*+]|\d+\.)\s)(.*)$/.exec(ln);
    let rest = ln;
    if (list) { out.push({ t: list[1], c: 'pn' }); rest = list[2]; }
    runScan(rest, /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\([^)\n]*\))/g, ['str', 'fn', 'attr'], out);
    if (nl) out.push({ t: nl, c: '' });
  });
}

function tokenize(lang, src) {
  const out = [];
  switch (lang) {
    case 'html': tokHTML(src, out); break;
    case 'css': tokCSS(src, out); break;
    case 'js': tokJS(src, out); break;
    case 'json': tokJSON(src, out); break;
    case 'md': tokMD(src, out); break;
    default: out.push({ t: src, c: '' });
  }
  return out;
}

/** Render tokens to HTML, optionally overlaying find-match ranges. */
function renderTokens(tokens, marks) {
  let pos = 0, mi = 0, html = '';
  for (const tok of tokens) {
    const s = pos, e = pos + tok.t.length;
    pos = e;
    let a = s;
    while (a < e) {
      while (mi < marks.length && marks[mi].end <= a) mi++;
      const mk = marks[mi];
      let b = e, mcls = '';
      if (mk && mk.start < e) {
        if (mk.start > a) b = mk.start;
        else { b = Math.min(e, mk.end); mcls = mk.cur ? 'mk cur' : 'mk'; }
      }
      const piece = esc(tok.t.slice(a - s, b - s));
      const cls = [tok.c ? 'tk-' + tok.c : '', mcls].filter(Boolean).join(' ');
      html += cls ? `<span class="${cls}">${piece}</span>` : piece;
      a = b;
    }
  }
  return html;
}

const LANGS = { html: 'HTML', css: 'CSS', js: 'JavaScript', json: 'JSON', md: 'Markdown', text: 'Plain Text' };
function langFromName(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return ({ html: 'html', htm: 'html', svg: 'html', xml: 'html', css: 'css', js: 'js', mjs: 'js', json: 'json', md: 'md', markdown: 'md' })[ext] || 'text';
}
function fileIconHTML(name, size = 16) {
  const lang = langFromName(name);
  const nm = lang === 'md' || lang === 'text' ? 'fileText' : 'fileCode';
  return `<span class="ft ft-${lang}">${icon(nm, size)}</span>`;
}

/* ==========================================================================
   5b. HTML element parser — powers the Element Inspector panel.
   Given a cursor offset in an HTML document, finds the innermost element
   that contains it (start tag through matching end tag), so the panel can
   show its full markup plus any CSS/JS in the project that reference it.
   ========================================================================== */
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

/** Parses `src` into a flat list of {tag, attrsStr, start, openEnd, closeStart, end, voidEl}. Tolerant of unclosed tags. */
function parseHtmlElements(src) {
  const re = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/?([A-Za-z][\w:-]*)((?:"[^"]*"|'[^']*'|[^"'>])*)>/g;
  const stack = [];
  const elements = [];
  let m;
  while ((m = re.exec(src))) {
    const full = m[0];
    if (full.startsWith('<!--') || /^<!DOCTYPE/i.test(full)) continue;
    const tag = m[1] ? m[1].toLowerCase() : null;
    if (!tag) continue;
    const isClose = full[1] === '/';
    const start = m.index, end = m.index + full.length;
    if (isClose) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          const opened = stack[i];
          elements.push({ tag, attrsStr: opened.attrsStr, start: opened.start, openEnd: opened.openEnd, closeStart: start, end, voidEl: false });
          stack.length = i;
          break;
        }
      }
    } else {
      const selfClose = /\/\s*>$/.test(full) || VOID_TAGS.has(tag);
      if (selfClose) elements.push({ tag, attrsStr: m[2] || '', start, openEnd: end, closeStart: start, end, voidEl: true });
      else stack.push({ tag, attrsStr: m[2] || '', start, openEnd: end });
    }
  }
  return elements;
}
/** Innermost element whose full span [start, end] contains `offset`. */
function elementAtOffset(src, offset) {
  const els = parseHtmlElements(src);
  let best = null;
  for (const el of els) {
    if (offset >= el.start && offset <= el.end && (!best || (el.end - el.start) < (best.end - best.start))) best = el;
  }
  return best;
}
function parseAttrs(attrsStr) {
  const attrs = {};
  const re = /([\w:@.-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s"'>]+))?/g;
  let m;
  while ((m = re.exec(attrsStr || ''))) {
    const val = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : (m[2] || '');
    attrs[m[1].toLowerCase()] = val;
  }
  return attrs;
}
function offsetFromLineCol(text, line, col) {
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) offset += lines[i].length + 1;
  return clamp(offset + Math.max(0, col - 1), 0, text.length);
}
function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Finds the smallest enclosing `{ ... }` block containing index `idx` (e.g. a function body), else null. */
function extractEnclosingBlock(src, idx) {
  let depth = 0, braceStart = -1;
  for (let i = idx; i >= 0; i--) {
    const ch = src[i];
    if (ch === '}') depth++;
    else if (ch === '{') { if (depth === 0) { braceStart = i; break; } depth--; }
  }
  if (braceStart === -1) return null;
  let d = 0, end = -1;
  for (let i = braceStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') d++;
    else if (ch === '}') { d--; if (d === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  let stmtStart = 0;
  for (let i = braceStart - 1; i >= 0; i--) {
    const ch = src[i];
    if (ch === ';' || ch === '}' || ch === '{') { stmtStart = i + 1; break; }
  }
  const text = src.slice(stmtStart, end + 1).trim();
  return text.length > 4000 ? null : text; // guard against matching something absurdly large (e.g. whole file)
}

/** CSS rule blocks (project .css files + inline <style>) whose selector references the element's id/classes/tag. */
function findCssMatches(project, tag, id, classes, htmlText) {
  const sources = [];
  allFiles(project.root).forEach(f => { if (langFromName(f.name) === 'css') sources.push(f.content); });
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let sm; while ((sm = styleRe.exec(htmlText))) sources.push(sm[1]);

  const results = [];
  const seen = new Set();
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  for (const src of sources) {
    const clean = src.replace(/\/\*[\s\S]*?\*\//g, '');
    let m;
    ruleRe.lastIndex = 0;
    while ((m = ruleRe.exec(clean))) {
      const selector = m[1].trim();
      if (!selector || selector.startsWith('@')) continue;
      let hit = false;
      if (id && new RegExp('#' + escapeReg(id) + '(?![\\w-])').test(selector)) hit = true;
      if (!hit) for (const c of classes) { if (new RegExp('\\.' + escapeReg(c) + '(?![\\w-])').test(selector)) { hit = true; break; } }
      if (!hit && !id && classes.length === 0 && new RegExp('(^|[\\s,>+~])' + escapeReg(tag) + '(?![\\w-])', 'i').test(selector)) hit = true;
      if (!hit) continue;
      const block = `${selector} {${m[2]}}`.trim();
      if (seen.has(block)) continue;
      seen.add(block);
      results.push(block);
      if (results.length >= 12) return results;
    }
  }
  return results;
}

/** JS snippets (project .js files + inline <script>) that reference the element's id or classes. */
function findJsMatches(project, id, classes, htmlText) {
  const sources = [];
  allFiles(project.root).forEach(f => { if (langFromName(f.name) === 'js') sources.push(f.content); });
  const scriptRe = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let sm; while ((sm = scriptRe.exec(htmlText))) sources.push(sm[1]);

  const needles = [];
  if (id) needles.push(id);
  classes.forEach(c => needles.push(c));
  if (!needles.length) return [];

  const results = [];
  const seen = new Set();
  for (const src of sources) {
    for (const needle of needles) {
      const re = new RegExp('\\b' + escapeReg(needle) + '\\b', 'g');
      let m;
      while ((m = re.exec(src))) {
        const block = extractEnclosingBlock(src, m.index);
        const lineStart = src.lastIndexOf('\n', m.index - 1) + 1;
        const lineEnd = src.indexOf('\n', m.index); 
        const snippet = block || src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd).trim();
        if (!snippet || seen.has(snippet)) continue;
        seen.add(snippet);
        results.push(snippet);
        if (results.length >= 8) return results;
      }
    }
  }
  return results;
}

/* ==========================================================================
   6. Application state
   ========================================================================== */
const state = {
  projects: store.get('projects', null) || seedProjects(),
  currentProjectId: store.get('currentProjectId', null),
  openTabs: [],          // [{fileId, projectId}]
  activeTabId: null,      // fileId
  selectedFileId: null,
  view: 'welcome',        // welcome | editor | projects
  cursor: { line: 1, col: 1 },
  history: new Map(),      // fileId -> {stack:[], idx:-1}
  dirty: new Set(),
  commandRecents: store.get('commandRecents', []),
  recentFiles: store.get('recentFiles', []),   // [{projectId, fileId, name, ts}]
  git: { branch: 'main', changed: 0 },
  selectedNode: null,     // properties inspector target description
};
if (!store.get('projects', null)) saveProjects();

function currentProject() { return state.projects.find(p => p.id === state.currentProjectId) || null; }
/** Fields starting with "_" are transient (e.g. live FileSystemDirectoryHandle refs) and must never hit localStorage. */
function saveProjects() { store.set('projects', state.projects, (k, v) => (k.startsWith('_') ? undefined : v)); }

function findNode(root, id, parent = null) {
  if (root.id === id) return { node: root, parent };
  if (root.type === 'folder') {
    for (const c of root.children) {
      const r = findNode(c, id, root);
      if (r) return r;
    }
  }
  return null;
}
function findFile(projectId, fileId) {
  const p = state.projects.find(pr => pr.id === projectId);
  if (!p) return null;
  return findNode(p.root, fileId);
}
function allFiles(root, out = []) {
  if (root.type === 'file') out.push(root);
  else root.children.forEach(c => allFiles(c, out));
  return out;
}
function siblingNames(parent, excludeId) {
  return new Set((parent.children || []).filter(c => c.id !== excludeId).map(c => c.name.toLowerCase()));
}
function uniqueName(base, taken) {
  if (!taken.has(base.toLowerCase())) return base;
  const m = /^(.*?)(\d*)$/.exec(base);
  const stem = m[1].replace(/\s*$/, ''); let n = parseInt(m[2] || '1', 10) + 1;
  let cand;
  do { cand = `${stem} ${n++}`; } while (taken.has(cand.toLowerCase()));
  return cand;
}

/* ==========================================================================
   7. Root DOM references
   ========================================================================== */
const root = $('#app');

/* ==========================================================================
   8. Toast notifications
   ========================================================================== */
const Toast = (() => {
  let container;
  const icons = { success: 'success', error: 'error', warning: 'warn', info: 'info' };
  function ensure() {
    if (!container) { container = $('#toast-container'); }
    return container;
  }
  function push(type, title, msg) {
    if (settings.notificationsOff) return;
    const c = ensure();
    const dur = clamp(Number(settings.toastDuration) || 5, 2, 15) * 1000;
    const el = h('div', { class: `toast toast-${type}`, role: 'status' },
      h('span', { class: 'toast-icon', html: icon(icons[type] || 'info', 18) }),
      h('div', { class: 'toast-body' },
        h('div', { class: 'toast-title', text: title }),
        msg ? h('div', { class: 'toast-msg', text: msg }) : null),
      h('button', { class: 'toast-close', 'aria-label': 'Dismiss', html: icon('x', 13), onclick: () => dismiss(el) })
    );
    c.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const t = setTimeout(() => dismiss(el), dur);
    el._t = t;
    el.addEventListener('mouseenter', () => clearTimeout(el._t));
    el.addEventListener('mouseleave', () => { el._t = setTimeout(() => dismiss(el), 1600); });
    while (c.children.length > 5) dismiss(c.firstElementChild);
  }
  function dismiss(el) {
    if (!el || el._leaving) return;
    el._leaving = true;
    clearTimeout(el._t);
    el.classList.remove('show'); el.classList.add('hide');
    setTimeout(() => el.remove(), 220);
  }
  return {
    success: (t, m) => push('success', t, m),
    error: (t, m) => push('error', t, m),
    warning: (t, m) => push('warning', t, m),
    info: (t, m) => push('info', t, m)
  };
})();

/* ==========================================================================
   9. Confirm dialog (promise-based, replaces window.confirm)
   ========================================================================== */
function confirmDialog({ title, message, confirmText = 'Delete', tone = 'danger' }) {
  return new Promise(resolve => {
    const overlay = h('div', { class: 'modal-overlay confirm-overlay' });
    const done = v => { overlay.classList.add('closing'); setTimeout(() => overlay.remove(), 140); resolve(v); };
    const dlg = h('div', { class: 'modal confirm-modal', role: 'alertdialog', 'aria-modal': 'true' },
      h('div', { class: 'confirm-icon ' + tone, html: icon(tone === 'danger' ? 'trash' : 'warn', 20) }),
      h('h3', { class: 'confirm-title', text: title }),
      h('p', { class: 'confirm-msg', text: message }),
      h('div', { class: 'confirm-actions' },
        h('button', { class: 'btn btn-ghost', onclick: () => done(false), text: 'Cancel' }),
        h('button', { class: 'btn btn-' + tone, onclick: () => done(true), text: confirmText })
      )
    );
    overlay.appendChild(dlg);
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) done(false); });
    document.addEventListener('keydown', function esc1(e) { if (e.key === 'Escape') { done(false); document.removeEventListener('keydown', esc1); } });
    $('#overlay-root').appendChild(overlay);
    setTimeout(() => $('.btn-' + tone, dlg)?.focus(), 30);
  });
}

/** Inline prompt dialog, replaces window.prompt */
function promptDialog({ title, label, value = '', confirmText = 'OK', validate }) {
  return new Promise(resolve => {
    const overlay = h('div', { class: 'modal-overlay confirm-overlay' });
    const input = h('input', { class: 'text-input', type: 'text', value, spellcheck: 'false' });
    const err = h('div', { class: 'prompt-error' });
    const done = v => { overlay.classList.add('closing'); setTimeout(() => overlay.remove(), 140); resolve(v); };
    const submit = () => {
      const v = input.value.trim();
      const problem = validate && validate(v);
      if (problem) { err.textContent = problem; err.classList.add('show'); input.focus(); return; }
      done(v);
    };
    const dlg = h('div', { class: 'modal confirm-modal prompt-modal', role: 'dialog', 'aria-modal': 'true' },
      h('h3', { class: 'confirm-title', text: title }),
      h('label', { class: 'prompt-label', text: label }),
      input, err,
      h('div', { class: 'confirm-actions' },
        h('button', { class: 'btn btn-ghost', onclick: () => done(null), text: 'Cancel' }),
        h('button', { class: 'btn btn-primary', onclick: submit, text: confirmText })
      )
    );
    overlay.appendChild(dlg);
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) done(null); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') done(null); });
    document.addEventListener('keydown', function esc1(e) { if (e.key === 'Escape') { done(null); document.removeEventListener('keydown', esc1); } });
    $('#overlay-root').appendChild(overlay);
    setTimeout(() => { input.focus(); input.select(); }, 30);
  });
}

/* ==========================================================================
   10. Context menu
   ========================================================================== */
const ContextMenu = (() => {
  let el = null;
  function close() { if (el) { el.remove(); el = null; document.removeEventListener('mousedown', onDoc); } }
  function onDoc(e) { if (el && !el.contains(e.target)) close(); }
  function open(x, y, items) {
    close();
    el = h('div', { class: 'ctx-menu', role: 'menu' },
      items.map(it => it === '-' ? h('div', { class: 'ctx-sep' }) :
        h('button', { class: 'ctx-item' + (it.danger ? ' danger' : ''), role: 'menuitem', disabled: it.disabled, onclick: () => { close(); it.run && it.run(); } },
          h('span', { class: 'ctx-ic', html: icon(it.icon || 'file', 15) }),
          h('span', { class: 'ctx-label', text: it.label }),
          it.hint ? h('span', { class: 'ctx-hint', text: it.hint }) : null))
    );
    document.body.appendChild(el);
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    el.style.left = Math.min(x, vw - r.width - 8) + 'px';
    el.style.top = Math.min(y, vh - r.height - 8) + 'px';
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
  }
  return { open, close };
})();

/* ==========================================================================
   11. File Explorer (left sidebar)
   ========================================================================== */
function iconForFolder(open) { return icon(open ? 'folderOpen' : 'folder', 16); }

function renderTree(node, depth, out, parentNode) {
  const isFolder = node.type === 'folder';
  const selected = state.selectedFileId === node.id;
  const row = h('div', {
    class: 'tree-row' + (selected ? ' selected' : ''),
    style: `padding-left:${10 + depth * 16}px`,
    'data-id': node.id,
    tabindex: '-1',
    onclick: (e) => { e.stopPropagation(); onTreeClick(node, parentNode); },
    oncontextmenu: (e) => { e.preventDefault(); e.stopPropagation(); onTreeContext(e, node, parentNode); },
    ondblclick: (e) => { e.stopPropagation(); if (node.type === 'file') openFile(node.id); }
  },
    isFolder ? h('span', { class: 'tree-chevron' + (node.open ? ' open' : ''), html: icon('chevron', 13) }) : h('span', { class: 'tree-chevron spacer' }),
    h('span', { class: 'tree-icon ' + (isFolder ? '' : 'ft ft-' + langFromName(node.name)), html: isFolder ? iconForFolder(node.open) : icon('fileCode', 15) }),
    h('span', { class: 'tree-name', text: node.name }),
    state.dirty.has(node.id) ? h('span', { class: 'tree-dot', title: 'Unsaved changes' }) : null
  );
  out.push(row);
  if (isFolder && node.open) node.children.forEach(c => renderTree(c, depth + 1, out, node));
}

function onTreeClick(node, parent) {
  state.selectedFileId = node.id;
  state.selectedNode = { node, parent, kind: node.type === 'file' ? 'file' : 'folder' };
  if (node.type === 'folder') node.open = !node.open;
  else openFile(node.id);
  renderExplorer();
  renderProperties();
}

function onTreeContext(e, node, parent) {
  state.selectedFileId = node.id;
  renderExplorer();
  const items = [];
  if (node.type === 'folder') {
    items.push(
      { label: 'New File', icon: 'filePlus', run: () => createEntry(node, 'file') },
      { label: 'New Folder', icon: 'folderPlus', run: () => createEntry(node, 'folder') },
      '-'
    );
  } else {
    items.push({ label: 'Open', icon: 'file', run: () => openFile(node.id) }, '-');
  }
  items.push(
    { label: 'Rename', icon: 'rename', hint: 'F2', run: () => renameEntry(node, parent) },
    { label: 'Duplicate', icon: 'copy', run: () => duplicateEntry(node, parent), disabled: !parent },
    '-',
    { label: 'Delete', icon: 'trash', danger: true, hint: 'Del', run: () => deleteEntry(node, parent), disabled: !parent }
  );
  ContextMenu.open(e.clientX, e.clientY, items);
}

function createEntry(folder, type) {
  folder.open = true;
  promptDialog({
    title: type === 'file' ? 'New file' : 'New folder',
    label: type === 'file' ? 'File name' : 'Folder name',
    value: type === 'file' ? 'untitled.html' : 'new-folder',
    confirmText: 'Create',
    validate: v => {
      if (!v) return 'Name cannot be empty.';
      if (/[\\/]/.test(v)) return 'Name cannot contain slashes.';
      if (siblingNames(folder).has(v.toLowerCase())) return 'That name is already used here.';
      return '';
    }
  }).then(name => {
    if (!name) return;
    const node = type === 'file' ? mkFile(name, name.endsWith('.html') ? BLANK_HTML : '') : mkDir(name, []);
    folder.children.push(node);
    saveProjects(); renderExplorer(); renderStatusBar();
    Toast.success(type === 'file' ? 'File created' : 'Folder created', name);
    if (type === 'file') openFile(node.id);
    const p = currentProject();
    if (p && Disk.isLinked(p.id)) Disk.createEntryOnDisk(p, node).catch(err => Toast.error('Could not create on disk', err.message));
  });
}

function renameEntry(node, parent) {
  const taken = parent ? siblingNames(parent, node.id) : new Set();
  promptDialog({
    title: 'Rename', label: 'New name', value: node.name, confirmText: 'Rename',
    validate: v => {
      if (!v) return 'Name cannot be empty.';
      if (/[\\/]/.test(v)) return 'Name cannot contain slashes.';
      if (taken.has(v.toLowerCase())) return 'That name is already used here.';
      return '';
    }
  }).then(name => {
    if (!name || name === node.name) return;
    const oldName = node.name;
    node.name = name;
    saveProjects(); renderExplorer(); renderTabs(); renderProperties(); renderStatusBar();
    Toast.info('Renamed', name);
    const p = currentProject();
    if (p && Disk.isLinked(p.id)) Disk.renameEntryOnDisk(p, node, oldName).catch(err => Toast.error('Could not rename on disk', err.message));
  });
}

function cloneNode(node) {
  const copy = JSON.parse(JSON.stringify(node));
  const relabel = n => { n.id = uid(n.type === 'file' ? 'f' : 'd'); if (n.type === 'folder') n.children.forEach(relabel); };
  relabel(copy);
  return copy;
}
function duplicateEntry(node, parent) {
  if (!parent) return;
  const copy = cloneNode(node);
  const taken = siblingNames(parent);
  const dot = node.name.lastIndexOf('.');
  const base = dot > 0 ? node.name.slice(0, dot) + ' copy' + node.name.slice(dot) : node.name + ' copy';
  copy.name = uniqueName(base, taken);
  const idx = parent.children.indexOf(node);
  parent.children.splice(idx + 1, 0, copy);
  saveProjects(); renderExplorer();
  Toast.success('Duplicated', copy.name);
  const p = currentProject();
  if (p && Disk.isLinked(p.id)) Disk.duplicateEntryOnDisk(p, copy).catch(err => Toast.error('Could not duplicate on disk', err.message));
}

async function deleteEntry(node, parent) {
  if (!parent) return;
  if (settings.confirmDelete !== false) {
    const ok = await confirmDialog({
      title: `Delete ${node.type === 'file' ? '"' + node.name + '"' : 'folder "' + node.name + '"'}?`,
      message: node.type === 'folder' ? 'This folder and everything inside it will be removed.' : 'This action can’t be undone.',
      confirmText: 'Delete'
    });
    if (!ok) return;
  }
  const affected = node.type === 'file' ? [node.id] : allFiles(node).map(f => f.id);
  affected.forEach(id => closeTab(id, true));
  const p = currentProject();
  const diskLinked = p && Disk.isLinked(p.id);
  parent.children = parent.children.filter(c => c.id !== node.id);
  if (state.selectedFileId === node.id) state.selectedFileId = null;
  saveProjects(); renderExplorer(); renderProperties(); renderStatusBar();
  Toast.success('Deleted', node.name);
  if (diskLinked) Disk.deleteEntryOnDisk(p, node, parent).catch(err => Toast.error('Could not delete on disk', err.message));
}

function renderExplorer() {
  const body = $('#explorer-body');
  if (!body) return;
  const p = currentProject();
  if (!p) {
    body.innerHTML = '';
    body.appendChild(h('div', { class: 'empty-hint' }, 'No project open.'));
    return;
  }
  const rows = [];
  p.root.children.forEach(c => renderTree(c, 0, rows, p.root));
  body.innerHTML = '';
  rows.forEach(r => body.appendChild(r));
  const label = $('#explorer-project-name');
  if (label) label.textContent = p.name;
}

/* ==========================================================================
   12. Tabs & Editor
   ========================================================================== */
function openFile(fileId) {
  const p = currentProject(); if (!p) return;
  const found = findNode(p.root, fileId);
  if (!found || found.node.type !== 'file') return;
  if (!state.openTabs.find(t => t.fileId === fileId)) state.openTabs.push({ fileId, projectId: p.id });
  state.activeTabId = fileId;
  state.selectedFileId = fileId;
  state.view = 'editor';
  if (!state.history.has(fileId)) state.history.set(fileId, { stack: [found.node.content], idx: 0 });
  const rf = state.recentFiles.filter(r => r.fileId !== fileId);
  rf.unshift({ projectId: p.id, fileId, name: found.node.name, ts: Date.now() });
  state.recentFiles = rf.slice(0, 12);
  store.set('recentFiles', state.recentFiles);
  renderAll();
  requestAnimationFrame(() => focusEditor());
}

function closeTab(fileId, silent) {
  const idx = state.openTabs.findIndex(t => t.fileId === fileId);
  if (idx === -1) return;
  const doClose = () => {
    state.openTabs.splice(idx, 1);
    state.dirty.delete(fileId);
    state.history.delete(fileId);
    if (state.activeTabId === fileId) {
      const next = state.openTabs[idx] || state.openTabs[idx - 1];
      state.activeTabId = next ? next.fileId : null;
      if (!next) state.view = state.openTabs.length ? 'editor' : 'welcome';
    }
    renderAll();
  };
  if (!silent && state.dirty.has(fileId)) {
    const found = findFile(state.openTabs[idx].projectId, fileId);
    confirmDialog({ title: `Close "${found ? found.node.name : 'file'}" without saving?`, message: 'Unsaved changes will be lost.', confirmText: 'Close without saving' })
      .then(ok => { if (ok) doClose(); });
  } else doClose();
}

function saveActiveFile(silent) {
  if (!state.activeTabId) return;
  state.dirty.delete(state.activeTabId);
  const p = currentProject();
  const found = p && findNode(p.root, state.activeTabId);
  if (found && (settings.trimWhitespace || settings.finalNewline)) {
    let c = found.node.content;
    if (settings.trimWhitespace) c = c.split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n');
    if (settings.finalNewline && !c.endsWith('\n')) c += '\n';
    found.node.content = c;
  }
  saveProjects();
  renderTabs(); renderExplorer(); renderStatusBar();
  if (!silent) Toast.success('Saved', activeFileName());
  if (found && p && Disk.isLinked(p.id)) {
    Disk.writeFile(p, found.node).catch(err => Toast.error('Could not save to disk', err.message));
  }
}
function activeFileName() {
  const p = currentProject(); if (!p || !state.activeTabId) return '';
  const f = findNode(p.root, state.activeTabId);
  return f ? f.node.name : '';
}

function renderTabs() {
  const bar = $('#tabbar');
  if (!bar) return;
  bar.innerHTML = '';
  const p = currentProject();
  state.openTabs.forEach(t => {
    const found = p && findNode(p.root, t.fileId);
    const name = found ? found.node.name : '(missing)';
    const active = t.fileId === state.activeTabId;
    const dirty = state.dirty.has(t.fileId);
    bar.appendChild(h('div', {
      class: 'tab' + (active ? ' active' : ''), 'data-id': t.fileId, draggable: 'true',
      onclick: () => { state.activeTabId = t.fileId; state.selectedFileId = t.fileId; state.view = 'editor'; renderAll(); },
      onmousedown: (e) => { if (e.button === 1) { e.preventDefault(); closeTab(t.fileId); } },
      ondragstart: (e) => { e.dataTransfer.setData('text/tab', t.fileId); },
      ondragover: (e) => e.preventDefault(),
      ondrop: (e) => { e.preventDefault(); const src = e.dataTransfer.getData('text/tab'); if (src && src !== t.fileId) reorderTabs(src, t.fileId); }
    },
      h('span', { class: 'tab-icon', html: found ? fileIconHTML(name, 14) : icon('file', 14) }),
      h('span', { class: 'tab-name', text: name }),
      h('span', { class: 'tab-state' },
        dirty ? h('span', { class: 'dot' }) : null,
        h('button', { class: 'tab-close', 'aria-label': 'Close', html: icon('x', 12), onclick: (e) => { e.stopPropagation(); closeTab(t.fileId); } })
      )
    ));
  });
  const wc = $('#welcome-tab-btn');
  if (wc) wc.classList.toggle('active', state.view === 'welcome');
}
function reorderTabs(srcId, targetId) {
  const from = state.openTabs.findIndex(t => t.fileId === srcId);
  const to = state.openTabs.findIndex(t => t.fileId === targetId);
  if (from === -1 || to === -1) return;
  const [moved] = state.openTabs.splice(from, 1);
  state.openTabs.splice(to, 0, moved);
  renderTabs();
}

/* ---- Breadcrumb ---- */
function pathTo(root, id, trail = []) {
  if (root.id === id) return [...trail, root];
  if (root.type === 'folder') for (const c of root.children) { const r = pathTo(c, id, [...trail, root]); if (r) return r; }
  return null;
}
function renderBreadcrumb() {
  const bc = $('#breadcrumb');
  if (!bc) return;
  bc.innerHTML = '';
  const p = currentProject();
  if (!p || !state.activeTabId) { bc.classList.add('hidden'); return; }
  bc.classList.toggle('hidden', settings.showBreadcrumbs === false);
  const trail = pathTo(p.root, state.activeTabId) || [];
  trail.forEach((n, i) => {
    if (i > 0) bc.appendChild(h('span', { class: 'crumb-sep', html: icon('chevron', 11) }));
    bc.appendChild(h('span', { class: 'crumb' + (i === trail.length - 1 ? ' current' : '') },
      h('span', { html: n.type === 'folder' ? icon('folder', 12) : fileIconHTML(n.name, 12) }),
      h('span', { text: n.name })));
  });
}

/* ---- Editor (contenteditable-based code surface with a synced highlight layer) ---- */
let editorSaveTimer = null;
function editorEl() { return $('#code-input'); }
function highlightEl() { return $('#code-highlight'); }
function gutterEl() { return $('#code-gutter'); }

function currentLangKey() {
  const p = currentProject(); if (!p || !state.activeTabId) return 'text';
  const f = findNode(p.root, state.activeTabId);
  return f ? langFromName(f.node.name) : 'text';
}

function paintEditor(text, marks = []) {
  const hl = highlightEl(); if (!hl) return;
  const lang = settings.syntaxHighlight === false ? 'text' : currentLangKey();
  const tokens = tokenize(lang, text);
  hl.innerHTML = renderTokens(tokens, marks) + '\n';
  paintGutter(text);
}
function paintGutter(text) {
  const g = gutterEl(); if (!g || settings.lineNumbers === false) { if (g) g.innerHTML = ''; return; }
  const n = text.split('\n').length;
  let out = '';
  for (let i = 1; i <= n; i++) out += `<div class="gutter-line">${i}</div>`;
  g.innerHTML = out;
}

function getCaretOffset(el) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return 0;
  const range = sel.getRangeAt(0).cloneRange();
  range.selectNodeContents(el);
  range.setEnd(sel.focusNode, sel.focusOffset);
  return range.toString().length;
}
function setCaretOffset(el, offset) {
  const range = document.createRange();
  const sel = window.getSelection();
  let node = el.firstChild, remaining = offset;
  if (!node) { el.textContent = ''; return; }
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n = walker.nextNode(), last = null;
  while (n) {
    const len = n.textContent.length;
    if (remaining <= len) { range.setStart(n, remaining); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); return; }
    remaining -= len; last = n; n = walker.nextNode();
  }
  if (last) { range.setStart(last, last.textContent.length); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }
}
function lineColFromOffset(text, offset) {
  const upto = text.slice(0, offset);
  const line = (upto.match(/\n/g) || []).length + 1;
  const col = offset - upto.lastIndexOf('\n');
  return { line, col };
}

function loadEditorContent() {
  const p = currentProject();
  const box = $('#editor-view'); const empty = $('#editor-empty');
  if (!p || !state.activeTabId) { if (box) box.classList.add('hidden'); if (empty) empty.classList.remove('hidden'); return; }
  const found = findNode(p.root, state.activeTabId);
  if (!found) { if (box) box.classList.add('hidden'); if (empty) empty.classList.remove('hidden'); return; }
  if (box) box.classList.remove('hidden'); if (empty) empty.classList.add('hidden');
  const ed = editorEl();
  ed.textContent = found.node.content;
  applyEditorFont();
  paintEditor(found.node.content, activeFindMarks());
  updateCursorFromDom();
}
function applyEditorFont() {
  const ed = editorEl(); const hl = highlightEl();
  const fs = clamp(Number(settings.fontSize) || 14, 10, 24) + 'px';
  const ff = settings.fontFamily || MONO;
  const lh = clamp(Number(settings.lineHeight) || 1.6, 1.2, 2);
  [ed, hl].forEach(el => { if (!el) return; el.style.fontSize = fs; el.style.fontFamily = ff; el.style.lineHeight = lh; });
  const g = gutterEl(); if (g) { g.style.fontSize = fs; g.style.lineHeight = lh; }
}

function onEditorInput() {
  const p = currentProject(); if (!p || !state.activeTabId) return;
  const found = findNode(p.root, state.activeTabId);
  if (!found) return;
  const ed = editorEl();
  const text = ed.textContent.replace(/\u00a0/g, ' ');
  found.node.content = text;
  state.dirty.add(state.activeTabId);
  const caret = getCaretOffset(ed);
  paintEditor(text, activeFindMarks());
  setCaretOffset(ed, caret);
  updateCursorFromDom();
  pushHistory(state.activeTabId, text);
  renderTabs();
  scheduleAutosave();
  if (state.previewLive) schedulePreviewRefresh();
}
function updateCursorFromDom() {
  const ed = editorEl(); if (!ed) return;
  const off = getCaretOffset(ed);
  const text = ed.textContent.replace(/\u00a0/g, ' ');
  state.cursor = lineColFromOffset(text, off);
  renderStatusBar();
  scheduleInspectorUpdate();
}
function pushHistory(fileId, text) {
  let hstate = state.history.get(fileId);
  if (!hstate) { hstate = { stack: [text], idx: 0 }; state.history.set(fileId, hstate); return; }
  if (hstate.stack[hstate.idx] === text) return;
  hstate.stack = hstate.stack.slice(0, hstate.idx + 1);
  hstate.stack.push(text);
  if (hstate.stack.length > 200) hstate.stack.shift();
  hstate.idx = hstate.stack.length - 1;
}
function historyGo(delta) {
  const fileId = state.activeTabId; if (!fileId) return;
  const hstate = state.history.get(fileId); if (!hstate) return;
  const ni = clamp(hstate.idx + delta, 0, hstate.stack.length - 1);
  if (ni === hstate.idx) return;
  hstate.idx = ni;
  const p = currentProject(); const found = p && findNode(p.root, fileId);
  if (!found) return;
  found.node.content = hstate.stack[ni];
  state.dirty.add(fileId);
  const ed = editorEl();
  ed.textContent = found.node.content;
  paintEditor(found.node.content, activeFindMarks());
  setCaretOffset(ed, found.node.content.length);
  updateCursorFromDom();
  renderTabs();
}
function focusEditor() { const ed = editorEl(); if (ed) ed.focus(); }

let autosaveTimer = null;
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  if (settings.autoSave !== 'delay') return;
  const ms = clamp(Number(settings.autoSaveDelay) || 1.5, 0.5, 5) * 1000;
  autosaveTimer = setTimeout(() => saveActiveFile(true), ms);
}
window.addEventListener('blur', () => { if (settings.autoSave === 'blur') saveActiveFile(true); });

function handleEditorKeydown(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const ed = editorEl();
    const size = clamp(Number(settings.tabSize) || 4, 2, 8);
    const unit = settings.insertSpaces === false ? '\t' : ' '.repeat(size);
    document.execCommand('insertText', false, unit);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.stopPropagation(); saveActiveFile(); return; }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); historyGo(-1); return; }
  if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')) { e.preventDefault(); historyGo(1); return; }
  if (e.key === 'Enter') {
    const ed = editorEl();
    e.preventDefault();
    if (settings.autoIndent === false) { document.execCommand('insertText', false, '\n'); return; }
    const text = ed.textContent.replace(/\u00a0/g, ' ');
    const off = getCaretOffset(ed);
    const lineStart = text.lastIndexOf('\n', off - 1) + 1;
    const indent = (text.slice(lineStart, off).match(/^[ \t]*/) || [''])[0];
    const prevChar = text[off - 1];
    const extra = prevChar === '{' || prevChar === '>' ? (settings.insertSpaces === false ? '\t' : ' '.repeat(clamp(Number(settings.tabSize) || 4, 2, 8))) : '';
    document.execCommand('insertText', false, '\n' + indent + extra);
    return;
  }
  const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
  if (settings.ext_autoclose && pairs[e.key] && !e.ctrlKey && !e.metaKey) {
    const ed = editorEl();
    const sel = window.getSelection();
    if (sel.isCollapsed) {
      e.preventDefault();
      document.execCommand('insertText', false, e.key + pairs[e.key]);
      const off = getCaretOffset(ed) - 1;
      requestAnimationFrame(() => setCaretOffset(ed, off));
    }
  }
}

/* ==========================================================================
   13. Find in file
   ========================================================================== */
const findState = { open: false, query: '', matches: [], idx: -1 };
function activeFindMarks() {
  if (!findState.open || !findState.query) return [];
  return findState.matches.map((m, i) => ({ start: m, end: m + findState.query.length, cur: i === findState.idx }));
}
function computeMatches() {
  findState.matches = [];
  const p = currentProject(); const found = p && state.activeTabId && findNode(p.root, state.activeTabId);
  if (!found || !findState.query) { findState.idx = -1; return; }
  const text = found.node.content;
  const q = findState.query.toLowerCase(); const low = text.toLowerCase();
  let i = 0;
  while (true) { const at = low.indexOf(q, i); if (at === -1) break; findState.matches.push(at); i = at + Math.max(1, q.length); }
  findState.idx = findState.matches.length ? 0 : -1;
}
function refreshFindUI() {
  const bar = $('#find-bar'); if (!bar) return;
  bar.classList.toggle('hidden', !findState.open);
  $('#find-count').textContent = findState.matches.length ? `${findState.idx + 1} of ${findState.matches.length}` : (findState.query ? 'No results' : '');
  if (state.activeTabId) { const p = currentProject(); const found = p && findNode(p.root, state.activeTabId); if (found) paintEditor(found.node.content, activeFindMarks()); }
}
function openFind() {
  if (!state.activeTabId) return;
  findState.open = true; refreshFindUI();
  const input = $('#find-input'); input.value = findState.query; input.focus(); input.select();
}
function closeFind() { findState.open = false; refreshFindUI(); focusEditor(); }
function findNext(dir = 1) {
  if (!findState.matches.length) return;
  findState.idx = (findState.idx + dir + findState.matches.length) % findState.matches.length;
  refreshFindUI();
  const marks = $$('.mk', highlightEl());
  const cur = $('.mk.cur', highlightEl());
  if (cur) cur.scrollIntoView({ block: 'center' });
}

/* ==========================================================================
   14. Properties Panel (right sidebar)
   ========================================================================== */
const PROP_GROUPS = [
  { id: 'layout', label: 'Layout & Dimensions', icon: 'layout', fields: [
      ['width', 'Width', 'text', '100%'], ['height', 'Height', 'text', 'auto'],
      ['padding', 'Padding', 'text', '0px'], ['margin', 'Margin', 'text', '0px']
  ]},
  { id: 'style', label: 'Styling', icon: 'sliders', fields: [
      ['background', 'Background', 'color', '#1e1e1e'], ['border', 'Border', 'text', 'none'], ['radius', 'Border radius', 'text', '0px']
  ]},
  { id: 'type', label: 'Typography', icon: 'fileText', fields: [
      ['fontFamily', 'Font family', 'select', 'System UI', ['System UI', 'Serif', 'Monospace', 'Inherit']],
      ['fontSize', 'Size', 'text', '14px'], ['fontWeight', 'Weight', 'select', '400', ['300', '400', '500', '600', '700']]
  ]},
  { id: 'layoutmode', label: 'Flexbox & Grid', icon: 'grid', fields: [
      ['display', 'Display', 'select', 'block', ['block', 'flex', 'grid', 'inline-block']],
      ['justify', 'Justify content', 'select', 'flex-start', ['flex-start', 'center', 'space-between', 'space-around']],
      ['align', 'Align items', 'select', 'stretch', ['stretch', 'center', 'flex-start', 'flex-end']]
  ]},
  { id: 'behavior', label: 'Visibility & Animation', icon: 'eye', fields: [
      ['visibility', 'Visibility', 'select', 'visible', ['visible', 'hidden', 'collapse']],
      ['animation', 'Animation', 'select', 'none', ['none', 'fade-in', 'slide-up', 'pulse']]
  ]}
];
const propOpen = store.get('propGroupsOpen', { layout: true, style: true, type: false, layoutmode: false, behavior: false });
const propValues = store.get('propValues', {});

function renderProperties() {
  const box = $('#properties-body'); if (!box) return;
  box.innerHTML = '';
  const node = state.selectedNode?.node;
  const target = $('#prop-target');
  if (!node) {
    target.textContent = 'Nothing selected';
    box.appendChild(h('div', { class: 'empty-hint' }, 'Select a file or folder in the explorer to inspect it.'));
    return;
  }
  target.textContent = node.name;
  const values = propValues[node.id] || (propValues[node.id] = {});
  PROP_GROUPS.forEach(g => {
    const open = propOpen[g.id];
    const grp = h('div', { class: 'prop-group' + (open ? ' open' : '') },
      h('button', { class: 'prop-group-head', onclick: () => { propOpen[g.id] = !propOpen[g.id]; store.set('propGroupsOpen', propOpen); renderProperties(); } },
        h('span', { class: 'prop-group-ic', html: icon(g.icon, 14) }),
        h('span', { class: 'prop-group-label', text: g.label }),
        h('span', { class: 'prop-group-chev', html: icon('chevronDown', 14) })
      ),
      h('div', { class: 'prop-group-body' },
        g.fields.map(([key, label, type, def, opts]) => {
          const val = values[key] ?? def;
          let ctrl;
          if (type === 'select') {
            ctrl = h('select', { class: 'prop-input', onchange: (e) => { values[key] = e.target.value; store.set('propValues', propValues); } },
              opts.map(o => h('option', { value: o, selected: o === val }, o)));
          } else if (type === 'color') {
            const textInput = h('input', { class: 'prop-input', type: 'text', value: val, oninput: (e) => { values[key] = e.target.value; store.set('propValues', propValues); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) swatch.value = e.target.value; } });
            const swatch = h('input', { type: 'color', class: 'color-swatch', value: /^#[0-9a-fA-F]{6}$/.test(val) ? val : '#1e1e1e', oninput: (e) => { values[key] = e.target.value; store.set('propValues', propValues); textInput.value = e.target.value; } });
            ctrl = h('div', { class: 'color-field' }, swatch, textInput);
          } else {
            ctrl = h('input', { class: 'prop-input', type: 'text', value: val, oninput: (e) => { values[key] = e.target.value; store.set('propValues', propValues); } });
          }
          return h('div', { class: 'property-group' }, h('label', { text: label }), ctrl);
        })
      )
    );
    box.appendChild(grp);
  });
}

/* ==========================================================================
   14b. Element Inspector — shows the HTML/CSS/JS for whatever element the
   cursor is currently inside, while editing an HTML file.
   ========================================================================== */
const inspectorOpenState = store.get('inspectorSectionsOpen', { html: true, css: true, js: true });
function inspectorSection(key, title, iconName, code, lang) {
  const open = inspectorOpenState[key] !== false;
  const pre = h('pre', { class: 'insp-code' });
  pre.innerHTML = renderTokens(tokenize(lang, code), []);
  const body = h('div', { class: 'insp-section-body' + (open ? ' open' : '') }, pre);
  const chev = h('span', { class: 'insp-chev' + (open ? ' open' : ''), html: icon('chevronDown', 13) });
  const headBtn = h('button', {
    class: 'insp-section-head',
    onclick: () => { inspectorOpenState[key] = !inspectorOpenState[key]; store.set('inspectorSectionsOpen', inspectorOpenState); body.classList.toggle('open'); chev.classList.toggle('open'); }
  },
    h('span', { html: icon(iconName, 13) }),
    h('span', { class: 'insp-section-title', text: title }),
    h('span', { class: 'insp-section-spacer' }),
    chev
  );
  return h('div', { class: 'insp-section' }, headBtn, body);
}

let lastInspectedKey = null;
/** Cheap fingerprint of every CSS/JS file so edits to them refresh the inspector. */
function projectSignature(p) {
  return allFiles(p.root).filter(f => /\.(css|js)$/i.test(f.name)).map(f => f.id + ':' + (f.content || '').length).join('|');
}
function renderInspector() {
  const box = $('#inspector-body'); if (!box) return;
  const p = currentProject();
  if (!p || !state.activeTabId) {
    lastInspectedKey = null;
    box.innerHTML = '';
    box.appendChild(h('div', { class: 'insp-hint' }, 'Open an HTML file and place your cursor inside a tag to inspect that element — its full markup, plus any matching CSS rules and JS references in the project.'));
    return;
  }
  const found = findNode(p.root, state.activeTabId);
  if (!found || langFromName(found.node.name) !== 'html') {
    lastInspectedKey = null;
    box.innerHTML = '';
    box.appendChild(h('div', { class: 'insp-hint' }, 'Element inspection works in HTML files. Open one and click inside a tag.'));
    return;
  }
  const text = found.node.content;
  const offset = offsetFromLineCol(text, state.cursor.line, state.cursor.col);
  const el = elementAtOffset(text, offset);
  if (!el) {
    lastInspectedKey = null;
    box.innerHTML = '';
    box.appendChild(h('div', { class: 'insp-hint' }, 'No element at the cursor. Click inside an opening or closing tag to inspect it.'));
    return;
  }
  const attrs = parseAttrs(el.attrsStr);
  const classes = (attrs.class || '').split(/\s+/).filter(Boolean);
  const id = attrs.id || '';
  const key = `${state.activeTabId}:${el.start}:${el.end}:${text.length}:${projectSignature(p)}`;
  if (key === lastInspectedKey) return; // avoid re-tokenizing/re-rendering on every keystroke when the target hasn't changed
  lastInspectedKey = key;

  const outer = text.slice(el.start, el.end);
  const cssMatches = findCssMatches(p, el.tag, id, classes, text);
  const jsMatches = findJsMatches(p, id, classes, text);

  box.innerHTML = '';
  box.appendChild(h('div', { class: 'insp-head' },
    h('span', { class: 'insp-tag' }, '<' + el.tag + '>'),
    id ? h('span', { class: 'insp-badge insp-id' }, '#' + id) : null,
    ...classes.map(c => h('span', { class: 'insp-badge insp-class' }, '.' + c))
  ));
  box.appendChild(inspectorSection('html', 'HTML', 'fileCode', outer, 'html'));
  box.appendChild(inspectorSection('css', cssMatches.length ? `CSS (${cssMatches.length})` : 'CSS', 'fileCode',
    cssMatches.length ? cssMatches.join('\n\n') : '/* No matching rules found in this project */', 'css'));
  box.appendChild(inspectorSection('js', jsMatches.length ? `JS (${jsMatches.length})` : 'JS', 'fileCode',
    jsMatches.length ? jsMatches.join('\n\n') : '// No matching references found in this project', 'js'));
}
const scheduleInspectorUpdate = debounce(renderInspector, 150);

/* ==========================================================================
   15. Preview
   ========================================================================== */
function buildPreviewDoc(p) {
  const htmlFile = findEntryHTML(p.root);
  if (!htmlFile) return '<!DOCTYPE html><html><body style="font-family:system-ui;color:#888;padding:2rem">No HTML file to preview yet.</body></html>';
  const assets = {}; allFiles(p.root).forEach(f => assets[f.name.toLowerCase()] = f);
  const assetsByPath = {}; collectPaths(p.root, '', assetsByPath);
  let html = htmlFile.content;
  html = html.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/gi, (tag) => {
    const m = /href=["']([^"']+)["']/i.exec(tag);
    if (!m) return tag;
    const f = resolveAsset(assetsByPath, m[1]);
    return f ? `<style>${f.content}</style>` : tag;
  });
  html = html.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi, (tag, src) => {
    if (/^https?:|^\/\//.test(src)) return tag;
    const f = resolveAsset(assetsByPath, src);
    return f ? `<script>${f.content}<\/script>` : '';
  });
  return html;
}
function collectPaths(node, prefix, out) {
  if (node.type === 'file') { out[(prefix + node.name).toLowerCase()] = node; out[node.name.toLowerCase()] = node; return; }
  (node.children || []).forEach(c => collectPaths(c, prefix, out));
  (node.children || []).forEach(c => { if (c.type === 'folder') collectPaths(c, prefix + c.name + '/', out); });
}
function resolveAsset(map, ref) {
  const clean = ref.replace(/^\.\//, '').toLowerCase();
  return map[clean] || map[clean.split('/').pop()];
}
function findEntryHTML(root) {
  const files = allFiles(root);
  return files.find(f => f.name.toLowerCase() === 'index.html') || files.find(f => langFromName(f.name) === 'html');
}
let previewRefreshTimer = null;
function schedulePreviewRefresh() { clearTimeout(previewRefreshTimer); previewRefreshTimer = setTimeout(refreshPreview, 400); }
function refreshPreview() {
  const frame = $('#preview-frame'); if (!frame) return;
  const p = currentProject(); if (!p) return;
  frame.srcdoc = buildPreviewDoc(p);
  const stamp = $('#preview-updated'); if (stamp) stamp.textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ==========================================================================
   16. Welcome screen
   ========================================================================== */
function renderWelcome() {
  const box = $('#welcome-view'); if (!box) return;
  box.innerHTML = '';
  const recentLimit = Number(settings.recentLimit) || 4;
  const recents = [...state.projects].sort((a, b) => b.modified - a.modified).slice(0, recentLimit);

  box.appendChild(
    h('div', { class: 'welcome-wrap' },
      h('div', { class: 'welcome-hero' },
        h('div', { class: 'welcome-logo', html: `<img src="icons/logo.png" width="150" height="150" alt="XOS" style="object-fit:contain" onerror='this.outerHTML=\`${icon('logo', 34)}\`'>` }),
        h('h1', {}, 'XOS Web Studio'),
        h('p', { class: 'welcome-sub' }, 'A small, fast workspace for building HTML, CSS and JavaScript.'),
      ),
      h('div', { class: 'welcome-grid' },
        h('div', { class: 'welcome-col' },
          h('div', { class: 'welcome-actions' },
            actionCard('filePlus', 'Create project', 'Start from a template or a blank page.', () => openNewProjectModal()),
            actionCard('folderOpen', 'Open project', 'Jump into the project manager.', () => setView('projects')),
            actionCard('grid', 'Templates', 'Browse starting points.', () => openNewProjectModal()),
          ),
          h('div', { class: 'welcome-section' },
            h('div', { class: 'welcome-section-head' }, h('span', {}, 'Recent projects'), h('button', { class: 'link-btn', onclick: () => setView('projects') }, 'See all')),
            recents.length ? h('div', { class: 'recent-list' }, recents.map(p => recentProjectRow(p))) : h('div', { class: 'empty-hint' }, 'Nothing yet — create your first project.')
          )
        ),
        h('div', { class: 'welcome-col welcome-col-narrow' },
          h('div', { class: 'welcome-section' },
            h('div', { class: 'welcome-section-head' }, h('span', {}, 'Recent files')),
            state.recentFiles.length ? h('div', { class: 'recent-files' }, state.recentFiles.slice(0, 8).map(rf => recentFileRow(rf)))
              : h('div', { class: 'empty-hint' }, 'Files you open will show up here.')
          ),
          h('div', { class: 'welcome-section' },
            h('div', { class: 'welcome-section-head' }, h('span', {}, 'Learn')),
            h('div', { class: 'learn-list' },
              learnRow('book', 'Documentation', () => Toast.info('Documentation', 'This preview build ships its own guide in the Help menu.')),
              learnRow('keyboard', 'Keyboard shortcuts', () => openShortcuts()),
              learnRow('command', 'Command palette', () => openPalette())
            )
          )
        )
      )
    )
  );
}
function actionCard(iconName, title, desc, onclick) {
  return h('button', { class: 'action-card', onclick },
    h('span', { class: 'action-card-ic', html: icon(iconName, 20) }),
    h('span', { class: 'action-card-text' }, h('strong', {}, title), h('span', {}, desc))
  );
}
function recentProjectRow(p) {
  return h('button', { class: 'recent-row', onclick: () => openProject(p.id) },
    h('span', { class: 'recent-row-ic', html: icon(TEMPLATES[p.template]?.glyph || 'file', 16) }),
    h('span', { class: 'recent-row-text' }, h('strong', {}, p.name), h('span', {}, `${TEMPLATES[p.template]?.name || 'Custom'} · edited ${relTime(p.modified)}`)),
    p.pinned ? h('span', { class: 'recent-row-pin', html: icon('star', 13) }) : null
  );
}
function recentFileRow(rf) {
  const p = state.projects.find(pr => pr.id === rf.projectId);
  return h('button', { class: 'recent-file-row', onclick: () => { if (p) { openProject(p.id, false); openFile(rf.fileId); } } },
    h('span', { html: fileIconHTML(rf.name, 15) }),
    h('span', { class: 'recent-file-text' }, h('strong', {}, rf.name), h('span', {}, p ? p.name : 'Unknown project')),
    h('span', { class: 'recent-file-time' }, relTime(rf.ts))
  );
}
function learnRow(iconName, label, onclick) {
  return h('button', { class: 'learn-row', onclick }, h('span', { html: icon(iconName, 15) }), h('span', {}, label), h('span', { class: 'learn-row-ext', html: icon('external', 13) }));
}

/* ==========================================================================
   17. Project Manager view
   ========================================================================== */
const pmState = { query: '', filter: 'all' };
function renderProjectManager() {
  const box = $('#projects-view'); if (!box) return;
  box.innerHTML = '';
  let list = state.projects.filter(p => p.name.toLowerCase().includes(pmState.query.toLowerCase()));
  if (pmState.filter === 'pinned') list = list.filter(p => p.pinned);
  list = [...list].sort((a, b) => (b.pinned - a.pinned) || (b.modified - a.modified));

  box.appendChild(
    h('div', { class: 'pm-wrap' },
      h('div', { class: 'pm-head' },
        h('h1', {}, 'Projects'),
        h('button', { class: 'btn btn-primary', onclick: () => openNewProjectModal() }, h('span', { html: icon('plus', 15) }), ' New project')
      ),
      h('div', { class: 'pm-toolbar' },
        h('div', { class: 'search-field' },
          h('span', { html: icon('search', 14) }),
          h('input', { type: 'text', placeholder: 'Search projects…', value: pmState.query, oninput: (e) => { pmState.query = e.target.value; renderProjectManager(); } })
        ),
        h('div', { class: 'pm-filters' },
          h('button', { class: 'chip' + (pmState.filter === 'all' ? ' active' : ''), onclick: () => { pmState.filter = 'all'; renderProjectManager(); } }, 'All'),
          h('button', { class: 'chip' + (pmState.filter === 'pinned' ? ' active' : ''), onclick: () => { pmState.filter = 'pinned'; renderProjectManager(); } }, h('span', { html: icon('star', 12) }), ' Pinned')
        )
      ),
      list.length ? h('div', { class: 'pm-grid' }, list.map(p => projectCard(p))) :
        h('div', { class: 'empty-state' },
          h('span', { html: icon('folder', 28) }),
          h('p', {}, pmState.query ? 'No projects match your search.' : 'No projects yet.'),
          !pmState.query ? h('button', { class: 'btn btn-primary', onclick: () => openNewProjectModal() }, 'Create your first project') : null)
    )
  );
}
function projectCard(p) {
  const fileCount = allFiles(p.root).length;
  const linkBadge = p.diskLinked
    ? (p._needsReconnect
        ? h('button', { class: 'pm-reconnect-btn', onclick: async (e) => { e.stopPropagation(); await Disk.reconnect(p); renderProjectManager(); } }, 'Reconnect folder')
        : h('span', { class: 'pm-card-link linked' }, h('span', { html: icon('folderOpen', 11) }), h('span', {}, p.diskName || p.name)))
    : null;
  return h('div', { class: 'pm-card' },
    h('button', { class: 'pm-card-main', onclick: () => openProject(p.id) },
      h('div', { class: 'pm-card-top' },
        h('span', { class: 'pm-card-ic', html: icon(TEMPLATES[p.template]?.glyph || 'file', 20) }),
        h('span', { class: 'pm-card-badge', text: TEMPLATES[p.template]?.name || 'Custom' })
      ),
      h('div', { class: 'pm-card-title', text: p.name }),
      h('div', { class: 'pm-card-meta', text: `${fileCount} file${fileCount === 1 ? '' : 's'} · edited ${relTime(p.modified)}` }),
      linkBadge
    ),
    h('div', { class: 'pm-card-actions' },
      h('button', { class: 'icon-btn', title: p.pinned ? 'Unpin' : 'Pin', html: icon('star', 15), onclick: () => { p.pinned = !p.pinned; saveProjects(); renderProjectManager(); } , style: p.pinned ? 'color:var(--accent)' : ''}),
      h('button', { class: 'icon-btn', title: 'Rename', html: icon('rename', 15), onclick: () => renameProject(p) }),
      Disk.supported && !p.diskLinked ? h('button', { class: 'icon-btn', title: 'Link to a folder on disk', html: icon('folderPlus', 15), onclick: () => linkExistingProject(p) }) : null,
      p.diskLinked && !p._needsReconnect ? h('button', { class: 'icon-btn', title: 'Stop syncing to disk', html: icon('folderOpen', 15), onclick: () => unlinkProject(p) }) : null,
      h('button', { class: 'icon-btn', title: 'Delete', html: icon('trash', 15), onclick: () => deleteProject(p) })
    )
  );
}
async function linkExistingProject(p) {
  const handle = await Disk.pickParentDirectory();
  if (!handle) return;
  try {
    await Disk.createProjectFolder(handle, p);
    saveProjects(); renderProjectManager();
    Toast.success('Folder linked', `“${p.name}” now syncs to “${handle.name}/${p.name}”`);
  } catch (e) { Toast.error('Could not link folder', e.message); }
}
async function unlinkProject(p) {
  await Disk.unlink(p);
  saveProjects(); renderProjectManager();
  Toast.info('Folder unlinked', `“${p.name}” now lives in browser storage only.`);
}
function renameProject(p) {
  promptDialog({ title: 'Rename project', label: 'Project name', value: p.name, confirmText: 'Rename',
    validate: v => !v ? 'Name cannot be empty.' : (state.projects.some(x => x.id !== p.id && x.name.toLowerCase() === v.toLowerCase()) ? 'A project with that name exists.' : '') })
    .then(name => { if (!name) return; p.name = name; p.root.name = name; p.modified = Date.now(); saveProjects(); renderProjectManager(); renderWelcome(); Toast.success('Renamed', name); });
}
async function deleteProject(p) {
  const ok = await confirmDialog({ title: `Delete "${p.name}"?`, message: 'This removes the project and all of its files from this browser.', confirmText: 'Delete' });
  if (!ok) return;
  state.projects = state.projects.filter(x => x.id !== p.id);
  if (state.currentProjectId === p.id) {
    state.currentProjectId = null; state.openTabs = []; state.activeTabId = null; state.view = 'welcome';
  }
  saveProjects(); store.set('currentProjectId', state.currentProjectId);
  renderAll();
  Toast.success('Project deleted', p.name);
}
function openProject(id, switchView = true) {
  const p = state.projects.find(x => x.id === id); if (!p) return;
  state.currentProjectId = id;
  store.set('currentProjectId', id);
  state.openTabs = []; state.activeTabId = null; state.selectedFileId = null; state.selectedNode = null;
  if (switchView) {
    const entry = findEntryHTML(p.root);
    state.view = 'editor';
    if (entry) openFile(entry.id); else renderAll();
  }
  renderAll();
}

/* ==========================================================================
   18. New Project Modal
   ========================================================================== */
function openNewProjectModal() {
  const overlay = h('div', { class: 'modal-overlay' });
  let selected = settings.defaultTemplate || 'static';
  const nameInput = h('input', { class: 'text-input', type: 'text', value: suggestProjectName(), spellcheck: 'false' });
  const err = h('div', { class: 'prompt-error' });
  const close = () => { overlay.classList.add('closing'); setTimeout(() => overlay.remove(), 140); };
  const grid = h('div', { class: 'template-grid' });
  function paintGrid() {
    grid.innerHTML = '';
    Object.entries(TEMPLATES).forEach(([key, t]) => {
      grid.appendChild(h('button', { class: 'template-card' + (selected === key ? ' selected' : ''), onclick: () => { selected = key; paintGrid(); } },
        h('span', { class: 'template-ic', html: icon(t.glyph, 20) }),
        h('strong', {}, t.name), h('span', {}, t.desc)
      ));
    });
  }
  paintGrid();

  // ---- Folder location ----
  let chosenDir = null; // FileSystemDirectoryHandle | null
  const locStatus = h('span', { class: 'loc-status-text' }, Disk.supported ? 'Browser storage only — no folder chosen' : 'Folder linking needs Chrome, Edge, or another Chromium browser');
  const chooseBtn = h('button', { class: 'btn btn-ghost loc-choose-btn', disabled: !Disk.supported },
    h('span', { html: icon('folderOpen', 14) }), ' Choose Folder…');
  chooseBtn.addEventListener('click', async () => {
    const handle = await Disk.pickParentDirectory();
    if (!handle) return;
    chosenDir = handle;
    locStatus.textContent = `Will create “${nameInput.value.trim() || suggestProjectName()}” inside “${handle.name}”`;
    locStatus.classList.add('loc-status-active');
  });
  nameInput.addEventListener('input', () => {
    if (chosenDir) locStatus.textContent = `Will create “${nameInput.value.trim() || suggestProjectName()}” inside “${chosenDir.name}”`;
  });
  const locRow = h('div', { class: 'loc-row' },
    h('span', { class: 'loc-ic', html: icon('folder', 16) }),
    locStatus,
    h('div', { class: 'loc-spacer' }),
    chooseBtn
  );

  const create = async () => {
    const name = nameInput.value.trim();
    if (!name) { err.textContent = 'Name cannot be empty.'; err.classList.add('show'); return; }
    if (state.projects.some(p => p.name.toLowerCase() === name.toLowerCase())) { err.textContent = 'A project with that name already exists.'; err.classList.add('show'); return; }
    if (chosenDir && /[\\/:*?"<>|]/.test(name)) { err.textContent = 'Folder names cannot contain \\ / : * ? " < > |'; err.classList.add('show'); return; }
    const p = makeProject(name, selected);
    state.projects.unshift(p);
    saveProjects();
    close();
    openProject(p.id);
    if (chosenDir) {
      try {
        await Disk.createProjectFolder(chosenDir, p);
        saveProjects();
        renderProjectManager();
        Toast.success('Project created', `“${name}” — linked to “${chosenDir.name}/${name}”`);
      } catch (e) {
        Toast.error('Created in browser only', `Could not create the folder on disk: ${e.message}`);
      }
    } else {
      Toast.success('Project created', name);
    }
  };
  const dlg = h('div', { class: 'modal np-modal', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'modal-head' }, h('h3', {}, 'Create project'), h('button', { class: 'icon-btn', html: icon('x', 16), onclick: close })),
    h('div', { class: 'modal-body' },
      h('label', { class: 'prompt-label' }, 'Project name'),
      nameInput, err,
      h('label', { class: 'prompt-label', style: 'margin-top:14px' }, 'Template'),
      grid,
      h('label', { class: 'prompt-label', style: 'margin-top:14px' }, 'Location'),
      locRow
    ),
    h('div', { class: 'confirm-actions' },
      h('button', { class: 'btn btn-ghost', onclick: close }, 'Cancel'),
      h('button', { class: 'btn btn-primary', onclick: create }, 'Create project')
    )
  );
  overlay.appendChild(dlg);
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
  $('#overlay-root').appendChild(overlay);
  setTimeout(() => { nameInput.focus(); nameInput.select(); }, 30);
}
function suggestProjectName() {
  const base = 'New Project'; const taken = new Set(state.projects.map(p => p.name.toLowerCase()));
  return uniqueName(base, taken);
}

/* ==========================================================================
   19. Command Palette
   ========================================================================== */
function buildCommands() {
  const cmds = [
    { id: 'new-file', label: 'New File', icon: 'filePlus', group: 'File', run: () => { const p = currentProject(); if (p) createEntry(p.root, 'file'); else Toast.warning('No project open', 'Open or create a project first.'); } },
    { id: 'new-folder', label: 'New Folder', icon: 'folderPlus', group: 'File', run: () => { const p = currentProject(); if (p) createEntry(p.root, 'folder'); else Toast.warning('No project open', 'Open or create a project first.'); } },
    { id: 'new-project', label: 'New Project…', icon: 'box', group: 'Project', run: openNewProjectModal },
    { id: 'open-projects', label: 'Open Project Manager', icon: 'folderOpen', group: 'Project', run: () => setView('projects') },
    { id: 'save', label: 'Save File', icon: 'save', group: 'File', run: () => saveActiveFile() },
    { id: 'undo', label: 'Undo', icon: 'undo', group: 'Edit', run: () => historyGo(-1) },
    { id: 'redo', label: 'Redo', icon: 'redo', group: 'Edit', run: () => historyGo(1) },
    { id: 'find', label: 'Find in File', icon: 'search', group: 'Edit', run: openFind },
    { id: 'run', label: 'Run Project', icon: 'play', group: 'Project', run: runProject },
    { id: 'preview', label: 'Toggle Preview', icon: 'eye', group: 'View', run: togglePreview },
    { id: 'toggle-theme', label: 'Toggle Color Theme', icon: 'sun', group: 'View', run: toggleTheme },
    { id: 'settings', label: 'Open Settings', icon: 'sliders', group: 'View', run: () => openSettings() },
    { id: 'shortcuts', label: 'Keyboard Shortcuts Reference', icon: 'keyboard', group: 'Help', run: openShortcuts },
    { id: 'welcome', label: 'Go to Welcome Page', icon: 'home', group: 'View', run: () => setView('welcome') },
    { id: 'toggle-left', label: 'Toggle File Explorer', icon: 'collapse', group: 'View', run: () => toggleSidebar('left') },
    { id: 'toggle-right', label: 'Toggle Properties Panel', icon: 'collapse', group: 'View', run: () => toggleSidebar('right') },
    { id: 'close-tab', label: 'Close Active Tab', icon: 'x', group: 'File', run: () => state.activeTabId && closeTab(state.activeTabId) },
    { id: 'notifications', label: 'Toggle Notifications', icon: 'bell', group: 'View', run: toggleNotifications },
  ];
  return cmds;
}
let paletteState = { items: [], idx: 0 };
function openPalette() {
  const overlay = h('div', { class: 'modal-overlay palette-overlay' });
  const input = h('input', { class: 'palette-input', type: 'text', placeholder: 'Type a command…', spellcheck: 'false' });
  const list = h('div', { class: 'palette-list', role: 'listbox' });
  const close = () => { overlay.classList.add('closing'); setTimeout(() => overlay.remove(), 120); };
  const all = buildCommands();
  function paint(q) {
    const ql = q.trim().toLowerCase();
    let items = ql ? all.filter(c => c.label.toLowerCase().includes(ql) || c.group.toLowerCase().includes(ql)) : all;
    if (!ql && state.commandRecents.length) {
      const recentCmds = state.commandRecents.map(id => all.find(c => c.id === id)).filter(Boolean);
      items = [...recentCmds, ...all.filter(c => !state.commandRecents.includes(c.id))];
    }
    paletteState.items = items; paletteState.idx = 0;
    list.innerHTML = '';
    if (!items.length) { list.appendChild(h('div', { class: 'palette-empty' }, 'No matching commands')); return; }
    items.forEach((c, i) => {
      list.appendChild(h('button', {
        class: 'palette-item' + (i === 0 ? ' active' : ''), role: 'option', 'data-i': i,
        onmouseenter: () => setActive(i),
        onclick: () => choose(c)
      }, h('span', { class: 'palette-ic', html: icon(c.icon, 15) }), h('span', { class: 'palette-label', text: c.label }), h('span', { class: 'palette-group', text: c.group })));
    });
  }
  function setActive(i) { paletteState.idx = i; $$('.palette-item', list).forEach((el, j) => el.classList.toggle('active', j === i)); const el = $$('.palette-item', list)[i]; el && el.scrollIntoView({ block: 'nearest' }); }
  function choose(c) {
    state.commandRecents = [c.id, ...state.commandRecents.filter(x => x !== c.id)].slice(0, 6);
    store.set('commandRecents', state.commandRecents);
    close(); c.run();
  }
  input.addEventListener('input', () => paint(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(paletteState.idx + 1, paletteState.items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(paletteState.idx - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const c = paletteState.items[paletteState.idx]; if (c) choose(c); }
  });
  overlay.appendChild(h('div', { class: 'modal palette-modal', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'palette-head', html: icon('command', 15) }, input),
    list, h('div', { class: 'palette-foot' }, '↑↓ to navigate  ·  Enter to run  ·  Esc to close')
  ));
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
  $('#overlay-root').appendChild(overlay);
  paint('');
  setTimeout(() => input.focus(), 20);
}

/* ==========================================================================
   20. Keyboard Shortcuts Manager
   ========================================================================== */
const SHORTCUTS = [
  { cat: 'General', label: 'Command palette', keys: ['Ctrl', 'Shift', 'P'] },
  { cat: 'General', label: 'Open settings', keys: ['Ctrl', ','] },
  { cat: 'General', label: 'Toggle theme', keys: ['Ctrl', 'K'] },
  { cat: 'General', label: 'Toggle notifications', keys: ['Ctrl', 'Shift', 'N'] },
  { cat: 'File', label: 'New file', keys: ['Ctrl', 'N'] },
  { cat: 'File', label: 'Save file', keys: ['Ctrl', 'S'] },
  { cat: 'File', label: 'Close tab', keys: ['Ctrl', 'W'] },
  { cat: 'File', label: 'Open project manager', keys: ['Ctrl', 'O'] },
  { cat: 'Edit', label: 'Undo', keys: ['Ctrl', 'Z'] },
  { cat: 'Edit', label: 'Redo', keys: ['Ctrl', 'Shift', 'Z'] },
  { cat: 'Edit', label: 'Find in file', keys: ['Ctrl', 'F'] },
  { cat: 'Edit', label: 'Indent selection', keys: ['Tab'] },
  { cat: 'View', label: 'Toggle explorer', keys: ['Ctrl', 'B'] },
  { cat: 'View', label: 'Toggle properties panel', keys: ['Ctrl', 'Shift', 'B'] },
  { cat: 'View', label: 'Toggle preview', keys: ['Ctrl', 'Shift', 'V'] },
  { cat: 'View', label: 'Keyboard shortcuts', keys: ['Ctrl', 'K', 'S'] }
];
const scState = { query: '', cat: 'All' };
function openShortcuts() {
  const overlay = h('div', { class: 'modal-overlay' });
  const close = () => { overlay.classList.add('closing'); setTimeout(() => overlay.remove(), 140); };
  const body = h('div', { class: 'sc-body' });
  const cats = ['All', ...Array.from(new Set(SHORTCUTS.map(s => s.cat)))];
  function paint() {
    body.innerHTML = '';
    body.appendChild(h('div', { class: 'sc-filters' }, cats.map(c => h('button', { class: 'chip' + (scState.cat === c ? ' active' : ''), onclick: () => { scState.cat = c; paint(); } }, c))));
    const rows = SHORTCUTS.filter(s => (scState.cat === 'All' || s.cat === scState.cat) && s.label.toLowerCase().includes(scState.query.toLowerCase()));
    const table = h('div', { class: 'sc-table' },
      h('div', { class: 'sc-row sc-head' }, h('span', {}, 'Command'), h('span', {}, 'Category'), h('span', {}, 'Shortcut'), h('span', {})),
      rows.map(s => h('div', { class: 'sc-row' },
        h('span', {}, s.label), h('span', { class: 'sc-cat' }, s.cat),
        h('span', { class: 'sc-keys' }, s.keys.map(k => h('kbd', {}, k))),
        h('button', { class: 'link-btn small', onclick: () => Toast.info('Remapping unavailable', 'Custom key bindings aren’t supported in this preview.') }, 'Edit')
      ))
    );
    body.appendChild(rows.length ? table : h('div', { class: 'empty-hint' }, 'No shortcuts match your search.'));
  }
  paint();
  const search = h('input', { class: 'text-input', type: 'text', placeholder: 'Search shortcuts…', oninput: (e) => { scState.query = e.target.value; paint(); } });
  overlay.appendChild(h('div', { class: 'modal sc-modal', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'modal-head' }, h('h3', {}, 'Keyboard Shortcuts'), h('button', { class: 'icon-btn', html: icon('x', 16), onclick: close })),
    h('div', { class: 'modal-body' }, search, body)
  ));
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function esc1(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc1); } });
  $('#overlay-root').appendChild(overlay);
}

/* ==========================================================================
   21. Settings Window
   ========================================================================== */
let settingsState = { cat: 'appearance', query: '' };
function openSettings(cat) {
  if (cat) settingsState.cat = cat;
  const overlay = h('div', { class: 'modal-overlay' });
  const close = () => { overlay.classList.add('closing'); setTimeout(() => overlay.remove(), 140); };
  const body = h('div', { class: 'settings-body' });
  const nav = h('div', { class: 'settings-nav' });
  function paintNav() {
    nav.innerHTML = '';
    CATS.forEach(([key, label, ic]) => nav.appendChild(
      h('button', { class: 'settings-nav-item' + (settingsState.cat === key ? ' active' : ''), onclick: () => { settingsState.cat = key; paintNav(); paintBody(); } },
        h('span', { html: icon(ic, 15) }), h('span', {}, label))
    ));
  }
  function fieldRow(s) {
    const val = settings[s.key];
    let ctrl;
    if (s.type === 'toggle') {
      ctrl = h('button', { class: 'switch' + (val ? ' on' : ''), role: 'switch', 'aria-checked': String(!!val), disabled: s.soon,
        onclick: (e) => { settings[s.key] = !settings[s.key]; saveSettings(); e.currentTarget.classList.toggle('on', settings[s.key]); e.currentTarget.setAttribute('aria-checked', String(settings[s.key])); applySettingSideEffects(s.key); } },
        h('span', { class: 'switch-knob' }));
    } else if (s.type === 'select') {
      ctrl = h('select', { class: 'select-input', disabled: s.soon, onchange: (e) => { settings[s.key] = s.num ? Number(e.target.value) : e.target.value; saveSettings(); applySettingSideEffects(s.key); } },
        s.options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(val) }, l)));
    } else if (s.type === 'range') {
      const out = h('span', { class: 'range-val' }, `${val}${s.unit || ''}`);
      ctrl = h('div', { class: 'range-field' },
        h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: val, oninput: (e) => { settings[s.key] = Number(e.target.value); out.textContent = `${settings[s.key]}${s.unit || ''}`; saveSettings(); applySettingSideEffects(s.key); } }),
        out);
    } else if (s.type === 'accent') {
      const isSel = (c1, c2) => settings.accent === c1 && (settings.accent2 || c1) === c2;
      const pick = (c1, c2) => { settings.accent = c1; settings.accent2 = c2; saveSettings(); applyAccent(); paintBody(); };
      ctrl = h('div', { class: 'accent-picker' },
        h('div', { class: 'accent-picker-row' },
          h('span', { class: 'accent-picker-label' }, 'Solid'),
          h('div', { class: 'accent-row' }, SOLID_ACCENTS.map(a => h('button', {
            class: 'accent-swatch' + (isSel(a.c1, a.c1) ? ' selected' : ''), title: a.label,
            style: `background:${a.c1}`, onclick: () => pick(a.c1, a.c1)
          })))
        ),
        h('div', { class: 'accent-picker-row' },
          h('span', { class: 'accent-picker-label' }, 'Gradient'),
          h('div', { class: 'accent-row' }, GRADIENT_ACCENTS.map(a => h('button', {
            class: 'accent-swatch' + (isSel(a.c1, a.c2) ? ' selected' : ''), title: a.label,
            style: `background:linear-gradient(90deg, ${a.c1} 0%, ${a.c2} 100%)`, onclick: () => pick(a.c1, a.c2)
          })))
        ),
        h('button', { class: 'link-btn small accent-reset', onclick: () => { settings.accent = ''; settings.accent2 = ''; saveSettings(); applyAccent(); paintBody(); } }, 'Reset to theme default')
      );
    } else if (s.type === 'themeCards') {
      ctrl = h('div', { class: 'theme-cards' }, [['dark', 'Dark'], ['light', 'Light'], ['system', 'System']].map(([v, label]) =>
        h('button', { class: 'theme-card' + (settings.theme === v ? ' selected' : ''), onclick: () => { settings.theme = v; saveSettings(); applyTheme(); paintBody(); } },
          h('span', { class: 'theme-card-preview theme-card-' + v }), h('span', {}, label))));
    } else if (s.type === 'button') {
      ctrl = h('button', { class: 'btn btn-ghost', onclick: () => Toast.info('You’re up to date', 'XOS Web Studio 1.0.0 is the latest version.') }, s.button);
    } else if (s.type === 'about') {
      return h('div', { class: 'about-block' },
        h('div', { class: 'about-logo', html: icon('logo', 30) }),
        h('h3', {}, 'XOS Web Studio'),
        h('p', {}, 'Version 1.0.0 · Preview build'),
        h('p', { class: 'about-desc' }, 'A self-contained, browser-based IDE shell built with vanilla HTML, CSS and JavaScript — no frameworks, no server.'),
        h('div', { class: 'about-links' },
          h('button', { class: 'link-btn', onclick: () => openShortcuts() }, 'Keyboard shortcuts'),
          h('button', { class: 'link-btn', onclick: () => openPalette() }, 'Command palette'))
      );
    } else {
      ctrl = h('input', { class: 'prop-input', type: 'text', value: val, oninput: (e) => { settings[s.key] = e.target.value; saveSettings(); } });
    }
    return h('div', { class: 'setting-row' + (s.soon ? ' soon' : '') + (s.type === 'accent' || s.type === 'themeCards' ? ' setting-row-wide' : '') },
      h('div', { class: 'setting-info' }, h('div', { class: 'setting-label' }, s.label, s.soon ? h('span', { class: 'soon-badge' }, 'Soon') : null), s.desc ? h('div', { class: 'setting-desc' }, s.desc) : null),
      h('div', { class: 'setting-ctrl' }, ctrl));
  }
  function paintBody() {
    body.innerHTML = '';
    const q = settingsState.query.trim().toLowerCase();
    let rows = SETTINGS.filter(s => s.cat === settingsState.cat);
    if (q) rows = SETTINGS.filter(s => s.label.toLowerCase().includes(q) || (s.desc || '').toLowerCase().includes(q));
    const catLabel = CATS.find(c => c[0] === settingsState.cat)?.[1] || '';
    body.appendChild(h('h2', { class: 'settings-title' }, q ? `Results for “${settingsState.query}”` : catLabel));
    if (!rows.length) { body.appendChild(h('div', { class: 'empty-hint' }, 'No matching settings.')); return; }
    rows.forEach(s => body.appendChild(s.type === 'about' && q ? null : fieldRow(s)));
  }
  paintNav(); paintBody();
  const searchInput = h('input', { class: 'text-input', type: 'text', placeholder: 'Search settings…', oninput: (e) => { settingsState.query = e.target.value; paintBody(); } });
  overlay.appendChild(h('div', { class: 'modal settings-modal', role: 'dialog', 'aria-modal': 'true' },
    h('div', { class: 'modal-head' }, h('h3', {}, 'Settings'), h('button', { class: 'icon-btn', html: icon('x', 16), onclick: close })),
    h('div', { class: 'settings-search' }, h('span', { html: icon('search', 14) }), searchInput),
    h('div', { class: 'settings-main' }, nav, body)
  ));
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function esc1(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc1); } });
  $('#overlay-root').appendChild(overlay);
}
function applySettingSideEffects(key) {
  if (['fontSize', 'fontFamily', 'lineHeight'].includes(key)) applyEditorFont();
  if (['lineNumbers', 'syntaxHighlight'].includes(key)) loadEditorContent();
  if (key === 'leftWidth') document.documentElement.style.setProperty('--left-w', settings.leftWidth + 'px');
  if (key === 'rightWidth') document.documentElement.style.setProperty('--right-w', settings.rightWidth + 'px');
  if (key === 'showToolbar' || key === 'showStatusBar' || key === 'showBreadcrumbs' || key === 'animations' || key === 'density') applyLayoutSettings();
  if (key === 'showBreadcrumbs') renderBreadcrumb();
}
function applyLayoutSettings() {
  document.body.classList.toggle('no-toolbar', settings.showToolbar === false);
  document.body.classList.toggle('no-statusbar', settings.showStatusBar === false);
  document.body.classList.toggle('no-anim', settings.animations === false);
  document.body.classList.remove('density-compact', 'density-comfortable');
  if (settings.density === 'compact') document.body.classList.add('density-compact');
  if (settings.density === 'comfortable') document.body.classList.add('density-comfortable');
}

/* ==========================================================================
   22. Theme / Accent
   ========================================================================== */
const mq = window.matchMedia('(prefers-color-scheme: light)');
function effectiveTheme() { return settings.theme === 'system' ? (mq.matches ? 'light' : 'dark') : (settings.theme || 'dark'); }
function applyTheme() {
  document.documentElement.setAttribute('data-theme', effectiveTheme());
  renderStatusBar();
}
function toggleTheme() {
  settings.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
  saveSettings(); applyTheme();
  Toast.info('Theme changed', settings.theme === 'dark' ? 'Dark mode' : 'Light mode');
}
mq.addEventListener?.('change', () => { if (settings.theme === 'system') applyTheme(); });
/* Keep every XOS page identical: another page (home / designer) changed theme or accent */
window.addEventListener('storage', (e) => {
  if (e.key !== 'xos.settings' || !e.newValue) return;
  try { Object.assign(settings, JSON.parse(e.newValue)); applyTheme(); applyAccent(); } catch { /* ignore */ }
});
function applyAccent() {
  const root = document.documentElement.style;
  const c1 = settings.accent || '';
  if (c1) {
    const c2 = settings.accent2 || c1;
    root.setProperty('--accent', c1);
    root.setProperty('--accent-2', c2);
    root.setProperty('--accent-soft', hexToRgba(c1, .16));
    root.setProperty('--accent-text', pickTextColor(c1));
    root.setProperty('--accent-gradient', `linear-gradient(90deg, ${c1} 0%, ${c2} 100%)`);
  } else {
    ['--accent', '--accent-2', '--accent-soft', '--accent-text', '--accent-gradient'].forEach(p => root.removeProperty(p));
  }
}

/* ==========================================================================
   23. Status bar, menu bar, toolbar
   ========================================================================== */
function renderStatusBar() {
  const bar = $('#statusbar'); if (!bar) return;
  const lang = currentLangKey();
  $('#sb-lang').textContent = LANGS[lang] || 'Plain Text';
  $('#sb-pos').textContent = `Ln ${state.cursor.line}, Col ${state.cursor.col}`;
  $('#sb-indent').textContent = `Spaces: ${settings.tabSize || 4}`;
  $('#sb-encoding').textContent = settings.encoding || 'UTF-8';
  $('#sb-git').textContent = state.git.branch + (state.dirty.size ? ` · ${state.dirty.size} change${state.dirty.size === 1 ? '' : 's'}` : '');
  const bell = $('#sb-bell'); if (bell) bell.innerHTML = icon(settings.notificationsOff ? 'bellOff' : 'bell', 14);
  const themeBtn = $('#sb-theme'); if (themeBtn) themeBtn.innerHTML = icon(effectiveTheme() === 'dark' ? 'moon' : 'sun', 14);
}
function toggleNotifications() {
  settings.notificationsOff = !settings.notificationsOff; saveSettings(); renderStatusBar();
  if (!settings.notificationsOff) Toast.info('Notifications on', '');
}

function toggleSidebar(side) {
  const key = side === 'left' ? 'leftCollapsed' : 'rightCollapsed';
  settings[key] = !settings[key]; saveSettings();
  document.body.classList.toggle(side === 'left' ? 'left-collapsed' : 'right-collapsed', settings[key]);
}

function setView(view) {
  state.view = view;
  renderAll();
}

function runProject() {
  const p = currentProject();
  if (!p) { Toast.warning('No project open', 'Open or create a project to run it.'); return; }
  state.previewLive = true;
  const wasPreview = state.showPreview;
  state.showPreview = true;
  renderPreviewPane();
  refreshPreview();
  Toast.success('Preview running', p.name);
}
function togglePreview() {
  if (!currentProject()) { Toast.warning('No project open', 'Open a project first.'); return; }
  state.showPreview = !state.showPreview;
  renderPreviewPane();
  if (state.showPreview) refreshPreview();
}
function renderPreviewPane() {
  document.body.classList.toggle('preview-open', !!state.showPreview);
  const btn = $('#tb-preview'); if (btn) btn.classList.toggle('active', !!state.showPreview);
}

/* ---------- Menu bar (dropdowns) ---------- */
function menuDefs() {
  return {
    File: [
      { label: 'New File', hint: 'Ctrl+N', run: () => currentProject() ? createEntry(currentProject().root, 'file') : Toast.warning('No project open', 'Open or create a project first.') },
      { label: 'New Project…', run: openNewProjectModal },
      '-',
      { label: 'Open Project Manager', hint: 'Ctrl+O', run: () => setView('projects') },
      '-',
      { label: 'Save', hint: 'Ctrl+S', run: () => saveActiveFile(), disabled: !state.activeTabId },
      { label: 'Close Tab', hint: 'Ctrl+W', run: () => state.activeTabId && closeTab(state.activeTabId), disabled: !state.activeTabId },
    ],
    Edit: [
      { label: 'Undo', hint: 'Ctrl+Z', run: () => historyGo(-1) },
      { label: 'Redo', hint: 'Ctrl+Shift+Z', run: () => historyGo(1) },
      '-',
      { label: 'Find in File', hint: 'Ctrl+F', run: openFind, disabled: !state.activeTabId },
      '-',
      { label: 'Preferences…', hint: 'Ctrl+,', run: () => openSettings('editor') },
    ],
    View: [
      { label: 'Command Palette…', hint: 'Ctrl+Shift+P', run: openPalette },
      '-',
      { label: 'Toggle File Explorer', hint: 'Ctrl+B', run: () => toggleSidebar('left') },
      { label: 'Toggle Properties Panel', hint: 'Ctrl+Shift+B', run: () => toggleSidebar('right') },
      { label: 'Toggle Preview', hint: 'Ctrl+Shift+V', run: togglePreview },
      '-',
      { label: 'Toggle Theme', hint: 'Ctrl+K', run: toggleTheme },
      { label: 'Welcome Page', run: () => setView('welcome') },
    ],
    Insert: [
      { label: 'File…', run: () => currentProject() ? createEntry(currentProject().root, 'file') : Toast.warning('No project open', '') },
      { label: 'Folder…', run: () => currentProject() ? createEntry(currentProject().root, 'folder') : Toast.warning('No project open', '') },
    ],
    Project: [
      { label: 'New Project…', run: openNewProjectModal },
      { label: 'Project Manager', run: () => setView('projects') },
      { label: 'Run', hint: 'F5', run: runProject },
      { label: 'Toggle Preview', run: togglePreview },
    ],
    Window: [
      { label: 'Reset Layout', run: resetLayout },
      { label: 'Toggle Notifications', hint: 'Ctrl+Shift+N', run: toggleNotifications },
    ],
    Help: [
      { label: 'Keyboard Shortcuts', hint: 'Ctrl+K S', run: openShortcuts },
      { label: 'Command Palette', hint: 'Ctrl+Shift+P', run: openPalette },
      { label: 'About XOS Web Studio', run: () => openSettings('about') },
    ]
  };
}
function resetLayout() {
  ['leftWidth', 'rightWidth', 'leftCollapsed', 'rightCollapsed'].forEach(k => delete settings[k]);
  SETTINGS.forEach(s => { if (['leftWidth', 'rightWidth'].includes(s.key)) settings[s.key] = s.def; });
  saveSettings();
  document.documentElement.style.setProperty('--left-w', settings.leftWidth + 'px');
  document.documentElement.style.setProperty('--right-w', settings.rightWidth + 'px');
  document.body.classList.remove('left-collapsed', 'right-collapsed');
  Toast.info('Layout reset', '');
}
function bindMenuBar() {
  const bar = $('#menubar'); if (!bar) return;
  const defs = menuDefs();
  $$('.menu-item', bar).forEach(btn => {
    const name = btn.dataset.menu;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = btn.classList.contains('open');
      closeAllMenus();
      if (isOpen) return;
      btn.classList.add('open');
      const rect = btn.getBoundingClientRect();
      const items = defs[name] || [];
      const menu = h('div', { class: 'dropdown-menu', style: `left:${rect.left}px; top:${rect.bottom}px` },
        items.map(it => it === '-' ? h('div', { class: 'ctx-sep' }) :
          h('button', { class: 'ctx-item', disabled: it.disabled, onclick: () => { closeAllMenus(); it.run && it.run(); } },
            h('span', { class: 'ctx-label', text: it.label }),
            it.hint ? h('span', { class: 'ctx-hint', text: it.hint }) : null)));
      menu.id = 'active-dropdown';
      document.body.appendChild(menu);
    });
    btn.addEventListener('mouseenter', () => { if ($('.menu-item.open', bar) && !btn.classList.contains('open')) btn.click(); });
  });
  document.addEventListener('click', closeAllMenus);
}
function closeAllMenus() { $$('.menu-item.open').forEach(b => b.classList.remove('open')); $('#active-dropdown')?.remove(); }

/* ==========================================================================
   24. Toolbar
   ========================================================================== */
function bindToolbar() {
  const map = {
    'tb-new': () => currentProject() ? createEntry(currentProject().root, 'file') : Toast.warning('No project open', 'Open or create a project first.'),
    'tb-open': () => setView('projects'),
    'tb-save': () => saveActiveFile(),
    'tb-undo': () => historyGo(-1),
    'tb-redo': () => historyGo(1),
    'tb-run': runProject,
    'tb-preview': togglePreview,
    'tb-settings': () => openSettings(),
    'tb-search': openFind,
  };
  Object.entries(map).forEach(([id, fn]) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); });
}

/* ==========================================================================
   25. Resizable sidebars
   ========================================================================== */
function bindSidebarVResizer() {
  const bar = $('#sidebar-vresizer'), group = $('.explorer-group'), side = $('.left-sidebar');
  if (!bar || !group || !side) return;
  const saved = Number(settings.explorerH);
  if (saved) group.style.flex = `0 0 ${saved}px`;
  bar.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startY = e.clientY, startH = group.getBoundingClientRect().height;
    document.body.classList.add('resizing-v');
    const move = (ev) => {
      const max = side.getBoundingClientRect().height - 120;
      const hgt = clamp(startH + (ev.clientY - startY), 90, max);
      group.style.flex = `0 0 ${hgt}px`; settings.explorerH = hgt;
    };
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.classList.remove('resizing-v'); saveSettings(); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  });
}
function bindResizers() {
  const left = $('#left-resizer'), right = $('#right-resizer');
  function startDrag(side, e) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = side === 'left' ? (Number(settings.leftWidth) || 250) : (Number(settings.rightWidth) || 290);
    document.body.classList.add('resizing');
    function move(ev) {
      const dx = ev.clientX - startX;
      const w = side === 'left' ? clamp(startW + dx, 180, 420) : clamp(startW - dx, 240, 460);
      if (side === 'left') { settings.leftWidth = w; document.documentElement.style.setProperty('--left-w', w + 'px'); }
      else { settings.rightWidth = w; document.documentElement.style.setProperty('--right-w', w + 'px'); }
    }
    function up() { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.classList.remove('resizing'); saveSettings(); }
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  }
  left?.addEventListener('mousedown', e => startDrag('left', e));
  right?.addEventListener('mousedown', e => startDrag('right', e));
}

/* ==========================================================================
   26. Global keyboard shortcuts
   ========================================================================== */
function bindGlobalKeys() {
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); openPalette(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveActiveFile(); return; }
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); currentProject() ? createEntry(currentProject().root, 'file') : openNewProjectModal(); return; }
    if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); setView('projects'); return; }
    if (mod && e.key.toLowerCase() === 'b' && e.shiftKey) { e.preventDefault(); toggleSidebar('right'); return; }
    if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleSidebar('left'); return; }
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); toggleTheme(); return; }
    if (mod && e.key === ',') { e.preventDefault(); openSettings(); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'v') { e.preventDefault(); togglePreview(); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); toggleNotifications(); return; }
    if (mod && e.key.toLowerCase() === 'w') { e.preventDefault(); if (state.activeTabId) closeTab(state.activeTabId); return; }
    if (mod && e.key.toLowerCase() === 'f' && document.activeElement === editorEl()) { e.preventDefault(); openFind(); return; }
    if (e.key === 'F5') { e.preventDefault(); runProject(); return; }
    if (e.key === 'Escape') { if (findState.open) closeFind(); closeAllMenus(); return; }
    if (e.key === 'F2' && state.selectedNode) { const { node, parent } = state.selectedNode; if (parent) renameEntry(node, parent); return; }
    if (e.key === 'Delete' && state.selectedNode && document.activeElement?.closest('#explorer-body')) { const { node, parent } = state.selectedNode; if (parent) deleteEntry(node, parent); return; }
  });
}

/* ==========================================================================
   27. Global render orchestration
   ========================================================================== */
function renderAll() {
  renderViews();
  renderTabs();
  renderBreadcrumb();
  renderExplorer();
  renderProperties();
  renderStatusBar();
  renderPreviewPane();
  if (state.view === 'editor') loadEditorContent();
  if (state.view === 'welcome') renderWelcome();
  if (state.view === 'projects') renderProjectManager();
}
function renderViews() {
  $('#welcome-view').classList.toggle('hidden', state.view !== 'welcome');
  $('#projects-view').classList.toggle('hidden', state.view !== 'projects');
  $('#editor-shell').classList.toggle('hidden', state.view !== 'editor');
}

/* ==========================================================================
   28. Boot
   ========================================================================== */
function bindStatic() {
  bindMenuBar();
  bindToolbar();
  bindResizers();
  bindGlobalKeys();
  $('#welcome-tab-btn')?.addEventListener('click', () => setView('welcome'));
  $('#find-input')?.addEventListener('input', (e) => { findState.query = e.target.value; computeMatches(); refreshFindUI(); });
  $('#find-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') findNext(e.shiftKey ? -1 : 1); if (e.key === 'Escape') closeFind(); });
  $('#find-next')?.addEventListener('click', () => findNext(1));
  $('#find-prev')?.addEventListener('click', () => findNext(-1));
  $('#find-close')?.addEventListener('click', closeFind);
  const ed = editorEl();
  if (ed) {
    ed.addEventListener('input', onEditorInput);
    ed.addEventListener('keydown', handleEditorKeydown);
    ed.addEventListener('keyup', updateCursorFromDom);
    ed.addEventListener('click', updateCursorFromDom);
    ed.addEventListener('mouseup', updateCursorFromDom);
    ed.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  }
  $('#sb-theme')?.addEventListener('click', toggleTheme);
  $('#sb-bell')?.addEventListener('click', toggleNotifications);
  $('#sb-lang-wrap')?.addEventListener('click', () => openSettings('editor'));
  $('#left-collapse-btn')?.addEventListener('click', () => toggleSidebar('left'));
  $('#right-collapse-btn')?.addEventListener('click', () => toggleSidebar('right'));
  $('#inspector-collapse-btn')?.addEventListener('click', () => {
    settings.inspectorCollapsed = !settings.inspectorCollapsed; saveSettings();
    document.body.classList.toggle('inspector-collapsed', !!settings.inspectorCollapsed);
  });
  bindSidebarVResizer();
  $('#preview-close')?.addEventListener('click', togglePreview);
  $('#preview-refresh')?.addEventListener('click', refreshPreview);
  $('#preview-live')?.addEventListener('change', (e) => { state.previewLive = e.target.checked; });
  $('#empty-create-file')?.addEventListener('click', () => currentProject() ? createEntry(currentProject().root, 'file') : openNewProjectModal());
}

function init() {
  applyTheme();
  applyAccent();
  applyLayoutSettings();
  document.documentElement.style.setProperty('--left-w', (Number(settings.leftWidth) || 250) + 'px');
  document.documentElement.style.setProperty('--right-w', (Number(settings.rightWidth) || 290) + 'px');
  document.body.classList.toggle('left-collapsed', !!settings.leftCollapsed);
  document.body.classList.toggle('right-collapsed', !!settings.rightCollapsed);
  document.body.classList.toggle('inspector-collapsed', !!settings.inspectorCollapsed);
  bindStatic();

  const lastProjectId = state.currentProjectId && state.projects.find(p => p.id === state.currentProjectId);
  if (lastProjectId && settings.restoreProject !== false) {
    state.currentProjectId = lastProjectId.id;
    state.view = settings.showWelcome === false ? 'editor' : 'welcome';
  } else {
    state.currentProjectId = null;
    state.view = 'welcome';
  }
  renderAll();
  const qs = new URLSearchParams(location.search);     // set by home.html
  if (qs.get('project') && state.projects.some(p => p.id === qs.get('project'))) openProject(qs.get('project'));
  else if (qs.get('view') === 'projects') setView('projects');
  else if (qs.get('new')) setTimeout(openNewProjectModal, 150);

  if (Disk.supported) {
    Disk.reconnectAll(state.projects).then(() => {
      if (state.view === 'projects') renderProjectManager();
    });
  }

  setTimeout(() => Toast.info('Welcome to XOS Web Studio', 'Press Ctrl+Shift+P to open the command palette.'), 500);
}

document.addEventListener('DOMContentLoaded', init);
})();
