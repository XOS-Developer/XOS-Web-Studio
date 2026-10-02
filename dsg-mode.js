/* XOS-Web-Studio - functional layer. Plain JavaScript, no libraries.
   Sections: 1 State | 2 Undo | 3 (removed) | 4 Preview | 5 Model & Selection
            6 Inspector | 7 Components & DnD | 8 Console/Problems | 9 Files & Zip
            10 Toolbar & Menus | 11 Init */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let HTML = 'index.html', CSS = 'css/style.css', JS = 'js/script.js';   // let: the explorer can switch page / rename

/* ---------- 1. Project state ---------- */
const DEFAULTS = {
[HTML]: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Website</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<nav class="nav"><div class="logo">Website</div><div class="menu"><span>Features</span><span>Docs</span><span>Pricing</span></div></nav>
<main class="hero-section">
<h1 class="hero-title">Next-Gen Visual IDE Environment</h1>
<p class="hero-sub">Design and build responsive web applications with pixel perfection.</p>
<button class="button" id="cta">Get Started</button>
</main>
<script src="js/script.js"></script>
</body>
</html>`,
[CSS]: `body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    background-color: #151921;
    color: #ffffff;
}

.nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    height: 42px;
    background-color: #1E242D;
}

.logo { font-weight: 700; }
.menu span { margin-left: 16px; color: #B8C0CC; font-size: 12px; }

.hero-section {
    padding: 50px 32px;
    text-align: center;
}

.hero-title { font-size: 26px; margin: 0 0 10px; }
.hero-sub { color: #B8C0CC; max-width: 400px; margin: 0 auto 24px; line-height: 1.5; }

.button {
    background-color: #5781FF;
    color: #ffffff;
    padding: 10px 22px;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
}
`,
[JS]: `// Runs inside the live preview
var cta = document.getElementById('cta');          // shared by every page, so guard it
if (cta) cta.addEventListener('click', function () {
    console.log('Get Started clicked');
});
console.info('script.js loaded');
`};

let files = {}, assets = {}, current = HTML, mode = 'visual', device = 'desktop';
let selPath = null, scale = 1;
const DEV = { desktop: [1920, 1080], tablet: [768, 1024], mobile: [375, 812] };
const frame = $('#preview');

function makeHero() {                       // generated placeholder for assets/hero.png
    const c = document.createElement('canvas'); c.width = 640; c.height = 360;
    const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 640, 360);
    g.addColorStop(0, '#5781FF'); g.addColorStop(1, '#1E242D');
    x.fillStyle = g; x.fillRect(0, 0, 640, 360);
    return c.toDataURL('image/png');
}
function newProject() {
    HTML = 'index.html'; CSS = 'css/style.css'; JS = 'js/script.js';
    files = { ...DEFAULTS }; assets = { 'hero.png': makeHero() };
    undoStack = []; redoStack = []; lastSnap = snap(); selPath = null; current = HTML;
}

/* ---------- 2. Undo / redo (snapshots of all files) ---------- */
let undoStack = [], redoStack = [], lastSnap = '', typeTimer, renderTimer;
const snap = () => JSON.stringify(files);
function commit() {
    clearTimeout(typeTimer);
    const s = snap(); if (s === lastSnap) return;
    undoStack.push(lastSnap); redoStack = []; lastSnap = s;
    if (undoStack.length > 100) undoStack.shift();
    syncUndoUI(); scheduleAutosave();
}
function restore(s) {
    files = JSON.parse(s); lastSnap = s;
    if (!(HTML in files)) HTML = Object.keys(files).find(k => /\.html?$/i.test(k)) || 'index.html';
    render(); syncUndoUI();
}
function undo() { commit(); if (!undoStack.length) return toast('Nothing to undo'); redoStack.push(lastSnap); restore(undoStack.pop()); toast('Undo'); }
function redo() { if (!redoStack.length) return toast('Nothing to redo'); undoStack.push(lastSnap); restore(redoStack.pop()); toast('Redo'); }
function changed() { commit(); render(); }   // after a visual edit

/* ---------- 4. Live preview ---------- */
const HOOK = `(function(){var p=function(t,a){try{parent.postMessage({xos:t,msg:Array.prototype.map.call(a,function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}};['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){p(k,arguments);o.apply(console,arguments)}});window.addEventListener('error',function(e){p('error',[e.message+' (line '+e.lineno+')'])});})();`;
const editCss = () => { const a = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5781FF';
    return `.xos-sel{outline:2px solid ${a}!important;outline-offset:-2px}.xos-hov{outline:1px dashed ${a}!important;outline-offset:-1px}.xos-drag{opacity:.4!important}.xos-new{animation:xosPop .4s cubic-bezier(.2,.8,.2,1)}@keyframes xosPop{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}`; };
const parse = t => new DOMParser().parseFromString(t, 'text/html');

/* Compose a standalone page: inline CSS/JS/assets. `hooks` adds editor helpers. */
function buildDoc(hooks, page) {
    const d = parse(files[page || HTML]);
    $$('link[rel=stylesheet]', d).forEach(l => {
        const f = files[l.getAttribute('href')];
        if (f != null) { const s = d.createElement('style'); s.textContent = inlineAssets(f); if (hooks) s.setAttribute('data-xos', l.getAttribute('href')); l.replaceWith(s); }
    });
    $$('script[src]', d).forEach(sc => {
        const f = files[sc.getAttribute('src')];
        if (f != null) { const n = d.createElement('script'); n.textContent = f; sc.replaceWith(n); }
    });
    $$('link[rel~=icon]', d).forEach(l => { const a = assets[(l.getAttribute('href') || '').replace(/^assets\//, '')]; if (a) l.setAttribute('href', a); });
    $$('img[src],audio[src],video[src],source[src]', d).forEach(i => {
        const a = assets[(i.getAttribute('src') || '').replace(/^assets\//, '')];
        if (a) i.setAttribute('src', a);
    });
    if (hooks) {
        const s = d.createElement('script'); s.textContent = HOOK;
        const st = d.createElement('style'); st.textContent = editCss();
        d.head.prepend(st); d.head.prepend(s);
    }
    return '<!DOCTYPE html>' + d.documentElement.outerHTML;
}
let rafId = 0;
function render() {                                    // coalesce several requests into one reload per frame
    if (rafId) return;
    rafId = requestAnimationFrame(() => { rafId = 0; doRender(); });
}
function doRender() {
    problems = check(); logs = []; runtimeErrs = 0;
    loadbar.classList.add('on'); frame.classList.add('fading'); frame.srcdoc = buildDoc(true);
}
function refreshCss() {                                // incremental refresh: swap the stylesheet, no iframe reload
    const d = fdoc(), st = d && d.querySelector(`style[data-xos="${CSS}"]`);
    if (!st) return render();
    st.textContent = inlineAssets(files[CSS]); drawOverlay();
}
frame.addEventListener('load', () => {
    bindFrame(); markSel(); fillInspector(); paintLayers(); renderTree(); syncAssets(); paintPages(); paintSite(); fillAction(); animateNew(); loadbar.classList.remove('on'); frame.classList.remove('fading');
    log(problems.length ? 'warn' : 'ok', problems.length ? `Preview running with ${problems.length} problem(s)` : 'Preview running successfully');
});
function fit() {                                      // resize canvas to chosen device
    const vp = $('#canvas-viewport'), [w, h] = DEV[device];
    scale = Math.max(0.1, Math.min(1, (vp.clientWidth - 64) / w, (vp.clientHeight - 64) / h));
    $('#frame-holder').style.cssText = `width:${w * scale}px;height:${h * scale}px`;
    $('#mock-frame').style.cssText = `width:${w}px;height:${h}px;max-width:none;transform:scale(${scale});transform-origin:0 0`;
    $('#viewport-label').textContent = `Viewport: ${w} x ${h}px (${Math.round(scale * 100)}%)`;
    $('#st-size').textContent = `${w}x${h}`; drawOverlay();
}
function setDevice(d) {
    device = d; fit();
    $$('.device-toggle:not(#mode-toggle) .device-btn').forEach((b, i) => b.classList.toggle('active', Object.keys(DEV)[i] === d));
}

/* ---------- 5. HTML model & selection ---------- */
const model = () => parse(files[HTML]);
const saveModel = d => { files[HTML] = '<!DOCTYPE html>\n' + d.documentElement.outerHTML; };
function pathOf(el, root) {
    const p = [];
    while (el && el !== root) { p.unshift([...el.parentNode.children].indexOf(el)); el = el.parentNode; }
    return p;
}
const elByPath = (root, p) => p.reduce((e, i) => e && e.children[i], root);
const fdoc = () => frame.contentDocument;

function bindFrame() {                                 // wire the freshly loaded preview
    const d = fdoc(); if (!d) return;
    const pick = t => (d.body.contains(t) ? t : d.body);
    d.addEventListener('click', e => {
        if (mode !== 'visual') return;
        e.preventDefault(); e.stopPropagation();
        if (suppressClick) { suppressClick = false; return; }
        const p = pathOf(pick(e.target), d.body);
        (e.ctrlKey || e.metaKey || e.shiftKey) ? toggleMulti(p) : select(p);
    }, true);
    d.addEventListener('mouseover', e => {
        if (mode !== 'visual') return;
        $$('.xos-hov', d).forEach(x => x.classList.remove('xos-hov'));
        if (pick(e.target) !== d.body) pick(e.target).classList.add('xos-hov');
    });
    d.addEventListener('mouseout', () => $$('.xos-hov', d).forEach(x => x.classList.remove('xos-hov')));
    d.addEventListener('dragover', e => { e.preventDefault(); showDrop(dropInfo(d, e.clientX, e.clientY, null, true)); });
    d.addEventListener('dragleave', e => { if (!e.relatedTarget) hideDrop(); });
    d.addEventListener('drop', e => {
        e.preventDefault(); hideDrop();
        const t = pick(e.target), a = e.dataTransfer.getData('text/xos-asset'), k = e.dataTransfer.getData('text/xos');
        if (a) (/^(IMG|AUDIO|VIDEO)$/.test(t.tagName) ? setImgSrc(pathOf(t, d.body), a) : insertComp(/^data:audio/.test(assets[a]) ? 'audio' : 'image', t, 'assets/' + a));
        else if (k) insertComp(k, t);
    });
    bindDrag(d); d.defaultView.addEventListener('scroll', drawOverlay, { passive: true });
    d.addEventListener('keydown', onKey);
    d.addEventListener('submit', e => e.preventDefault());
}
function select(path) { selPath = path; multi = []; markSel(); fillInspector(); paintLayers(); revealSel(); }
function selEl() { const d = fdoc(); return d && selPath ? elByPath(d.body, selPath) : null; }
function markSel() {
    const d = fdoc(); if (!d || !d.body) return; fillAction();
    $$('.xos-sel', d).forEach(e => e.classList.remove('xos-sel'));
    const els = allPaths().map(p => elByPath(d.body, p)).filter(Boolean);
    els.forEach(el => el !== d.body && el.classList.add('xos-sel'));
    const el = selEl(); $('#st-sel').textContent = 'Selected: ' + (el ? label(el) + (els.length > 1 ? ` (+${els.length - 1})` : '') : 'none');
    drawOverlay();
}
const label = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
    ([...el.classList].filter(c => !c.startsWith('xos-'))[0] ? '.' + [...el.classList].filter(c => !c.startsWith('xos-'))[0] : '');
function deleteSel() {                                 // deletes every selected element
    const ps = sortedPaths(); if (!ps.length) return;
    const d = model(); ps.reverse().forEach(p => { const el = elByPath(d.body, p); el && el.remove(); });
    saveModel(d); selPath = null; multi = []; changed();
}

/* ---------- 6. Inspector (writes to the element's CSS class rule) ---------- */
const ANIMS = [['None', 'none'], ['Fade in', 'xos-fadeIn .6s ease both'], ['Slide up', 'xos-slideUp .6s ease both'], ['Zoom in', 'xos-zoomIn .5s ease both'], ['Bounce', 'xos-bounce 1s ease infinite'], ['Pulse', 'xos-pulse 1.5s ease infinite'], ['Spin', 'xos-spin 2s linear infinite']];
const INSP = [
    ['General', [['Tag', 'tag'], ['Text', 'text'], ['ID', 'id'], ['Class', 'class']]],
    ['Layout', [['Width', 'width'], ['Height', 'height'], ['Margin', 'margin'], ['Padding', 'padding'],
        ['Display', 'display', ['block', 'inline', 'inline-block', 'flex', 'grid', 'none']]]],
    ['Flexbox', [['Direction', 'flex-direction', ['row', 'column', 'row-reverse', 'column-reverse']],
        ['Justify', 'justify-content', ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']],
        ['Align', 'align-items', ['stretch', 'flex-start', 'center', 'flex-end', 'baseline']],
        ['Wrap', 'flex-wrap', ['nowrap', 'wrap']], ['Gap', 'gap']]],
    ['Grid', [['Columns', 'grid-template-columns'], ['Rows', 'grid-template-rows']]],
    ['Typography', [['Font', 'font-family', ['inherit', 'system-ui, sans-serif', 'Georgia, serif', 'monospace']],
        ['Weight', 'font-weight', ['400', '500', '600', '700']], ['Text Align', 'text-align', ['left', 'center', 'right', 'justify']],
        ['Line Height', 'line-height'], ['Letter Spacing', 'letter-spacing']]],
    ['Size', [['Min Width', 'min-width'], ['Max Width', 'max-width'], ['Min Height', 'min-height'], ['Max Height', 'max-height']]],
    ['Position', [['Position', 'position', ['static', 'relative', 'absolute', 'fixed', 'sticky']], ['Top', 'top'], ['Right', 'right'], ['Bottom', 'bottom'], ['Left', 'left'], ['Z-index', 'z-index']]],
    ['Appearance', [['Background', 'background-color'], ['Bg Image', 'background-image'], ['Text Color', 'color'], ['Font Size', 'font-size'],
        ['Border', 'border'], ['Border Radius', 'border-radius'], ['Box Shadow', 'box-shadow'], ['Text Shadow', 'text-shadow'], ['Opacity', 'opacity']]],
    ['Effects', [['Animation', 'animation', ANIMS], ['Transform', 'transform'], ['Transition', 'transition'], ['Filter', 'filter'],
        ['Overflow', 'overflow', ['visible', 'hidden', 'scroll', 'auto']], ['Cursor', 'cursor', ['auto', 'pointer', 'default', 'move', 'not-allowed']]]]];
$('#inspector-body').innerHTML = INSP.map(([g, rows]) => `<div class="prop-group"><div class="prop-title">${g}</div>` +
    rows.map(([l, k, opts]) => `<div class="prop-row"><span class="prop-label">${l}</span>` +
        (k === 'tag' ? '<span id="i-tag" style="color:var(--accent);font-weight:600">-</span>'
        : opts ? `<select class="prop-select" data-k="${k}">${opts.map(o => Array.isArray(o) ? `<option value="${o[1]}">${o[0]}</option>` : `<option>${o}</option>`).join('')}</select>`
        : `<input type="text" class="prop-input" data-k="${k}" autocomplete="off">`) + '</div>').join('') + '</div>').join('');

const ruleRe = c => new RegExp('(^|\\})(\\s*)\\.' + c.replace(/[^\w-]/g, '') + '\\s*\\{([^}]*)\\}');
const parseDecl = b => b.split(';').map(s => s.trim()).filter(Boolean).map(s => { const i = s.indexOf(':'); return [s.slice(0, i).trim(), s.slice(i + 1).trim()]; });
function getCss(cls, prop) {
    const m = files[CSS].match(ruleRe(cls)); const d = m && parseDecl(m[3]).find(x => x[0] === prop);
    return d ? d[1] : '';
}
function setCss(cls, prop, val) {                      // create or update `.cls { prop: val }`
    const re = ruleRe(cls), m = files[CSS].match(re);
    let decls = (m ? parseDecl(m[3]) : []).filter(d => d[0] !== prop);
    if (val !== '') decls.push([prop, val]);
    const rule = `.${cls} {\n${decls.map(d => `    ${d[0]}: ${d[1]};`).join('\n')}\n}`;
    files[CSS] = m ? files[CSS].replace(re, (x, a, ws) => a + ws + rule) : files[CSS].replace(/\s*$/, '\n\n') + rule + '\n';
}
function uniqueClass(base) {
    let n = 1, c = base;
    while (ruleRe(c).test(files[CSS]) || files[HTML].includes(`"${c}"`)) c = base + '-' + (++n);
    return c;
}
const hex = c => { const m = c.match(/\d+(\.\d+)?/g); if (!m || c === 'rgba(0, 0, 0, 0)') return 'transparent';
    return '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join(''); };
function fillInspector() {
    const el = selEl(), on = !!el;
    $('#i-tag').textContent = el ? label(el) : '-';
    $$('#inspector-body [data-k]').forEach(i => {
        i.disabled = !on || (i.dataset.k === 'text' && el.children.length > 0);
        if (i === document.activeElement) return;
        const k = i.dataset.k; let v = '';
        if (el) {
            const cs = fdoc().defaultView.getComputedStyle(el), cls = el.classList[0] && [...el.classList].find(c => !c.startsWith('xos-'));
            if (k === 'text') v = el.children.length ? '' : el.textContent.trim();
            else if (k === 'id') v = el.id;
            else if (k === 'class') v = [...el.classList].filter(c => !c.startsWith('xos-')).join(' ');
            else v = (cls && getCss(cls, k)) || (/color/.test(k) ? hex(cs.getPropertyValue(k)) : cs.getPropertyValue(k));
        }
        i.value = v;
    });
}
function applyProp(k, val) { applyProps({ [k]: val }); }
let inspTimer;
$('#inspector-body').addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k) return;
    clearTimeout(inspTimer); inspTimer = setTimeout(() => applyProp(k, e.target.value.trim()), 80);
});
const addBtns = $$('.add-btn');                         // existing "+ Add" buttons
addBtns[0].addEventListener('click', () => {
    const v = prompt('CSS property (e.g. box-shadow: 0 2px 8px #000)'); if (!v || !v.includes(':')) return;
    const [p, ...r] = v.split(':'); applyProp(p.trim(), r.join(':').trim());
});
addBtns[1].addEventListener('click', () => {
    const v = prompt('Attribute (e.g. title=Hello)'); if (!v || !v.includes('=') || !selPath) return;
    const d = model(), el = elByPath(d.body, selPath), [n, ...r] = v.split('=');
    try { el.setAttribute(n.trim(), r.join('=').trim()); saveModel(d); changed(); } catch (err) { log('error', err.message); }
});

/* ---------- 7. Components panel & drag/drop ---------- */
const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#1E242D"/><text x="160" y="95" fill="#7F8998" font-size="16" text-anchor="middle">Image</text></svg>');
const COMP = {
    container: { name: 'Container', tag: 'div', css: ['padding:24px', 'margin:16px', 'min-height:60px', 'background-color:#1E242D', 'border-radius:8px'], icon: 'M3 3h18v18H3V3zm2 2v14h14V5H5z' },
    text: { name: 'Text', tag: 'p', text: 'Text', css: ['color:#B8C0CC', 'font-size:16px', 'margin:12px 24px'], icon: 'M5 4v3h5.5v12h3V7H19V4H5z' },
    button: { name: 'Button', tag: 'button', text: 'Button', css: ['background-color:#5781FF', 'color:#ffffff', 'padding:10px 22px', 'border:none', 'border-radius:4px', 'font-weight:600', 'cursor:pointer', 'margin:12px 24px'], icon: 'M3 8h18v8H3z' },
    image: { name: 'Image', tag: 'img', css: ['display:block', 'max-width:100%', 'margin:16px auto', 'border-radius:6px'], icon: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z' }
};
const CONTAINERS = ['DIV', 'SECTION', 'MAIN', 'NAV', 'HEADER', 'FOOTER', 'ARTICLE', 'ASIDE', 'BODY'];
function buildComponentsPanel() {
    const p = document.createElement('div'); p.className = 'comp-panel';
    p.innerHTML = '<div class="panel-header"><span>Components</span></div><div class="comp-grid">' + Object.entries(COMP).map(([k, c]) =>
        `<div class="tree-item" draggable="true" data-comp="${k}" title="Drag onto the canvas, or click to add"><svg class="tree-icon" viewBox="0 0 24 24"><path d="${c.icon || ICON}"/></svg><span>${c.name}</span></div>`).join('') + '</div>';
    $('.explorer-panel').appendChild(p);
    p.addEventListener('dragstart', e => { const k = e.target.dataset.comp; if (k) { e.dataTransfer.setData('text/xos', k); e.dataTransfer.effectAllowed = 'copy'; } });
    p.addEventListener('click', e => { const it = e.target.closest('[data-comp]'); if (it) insertComp(it.dataset.comp, selEl()); });
}
function insertComp(key, target, src) {
    if (key === 'assets') return openAssetLibrary();                     // create element + default CSS class
    const c = COMP[key], d = model(), body = d.body;
    const ref = (target && elByPath(body, pathOf(target, fdoc().body))) || body;
    const el = d.createElement(c.tag), cls = uniqueClass(key === 'text' ? 'text' : key);
    el.className = cls; if (c.text) el.textContent = c.text;
    if (c.html) el.innerHTML = c.html.replace(/\{c\}/g, cls);
    Object.entries(c.attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    if (key === 'image') { el.setAttribute('src', src || 'assets/hero.png'); el.setAttribute('alt', 'Image'); }
    if (key === 'audio') el.setAttribute('src', src || '');
    if (CONTAINERS.includes(ref.tagName)) {
        const s = body.querySelector('script:last-child');
        (ref === body && s && s.parentNode === body) ? body.insertBefore(el, s) : ref.appendChild(el);
    } else ref.after(el);
    el.before(d.createTextNode('\n'));
    selPath = pathOf(el, body); saveModel(d);
    const dec = (n, a) => a.forEach(x => setCss(n, ...x.split(/:(.*)/s).slice(0, 2)));
    dec(cls, c.css); Object.entries(c.sub || {}).forEach(([n, a]) => dec(cls + '-' + n, a));
    if (c.live) ensureLive();
    pendingNew = selPath.slice(); changed(); log('info', `Added <${c.tag} class="${cls}">`);
}

/* ---------- 7b. More components, layers, duplicate / copy / paste ---------- */
const ICON = 'M3 3h18v4H3V3zm0 6h18v12H3V9z';
CONTAINERS.push('FORM');
Object.assign(COMP, {
    heading: { name: 'Heading', tag: 'h2', text: 'Heading', css: ['font-size:32px', 'margin:24px', 'color:#ffffff'] },
    input: { name: 'Input', tag: 'input', attrs: { type: 'text', placeholder: 'Type here...' },
        css: ['display:block', 'width:260px', 'padding:10px 12px', 'margin:12px 24px', 'background-color:#101317', 'color:#ffffff', 'border:1px solid #2B3442', 'border-radius:4px'] },
    card: { name: 'Card', tag: 'div', html: '<h3 class="{c}-title">Card title</h3><p class="{c}-text">Card description goes here.</p>',
        css: ['padding:24px', 'margin:16px', 'background-color:#1E242D', 'border-radius:8px'],
        sub: { title: ['margin:0 0 8px', 'font-size:18px'], text: ['margin:0', 'color:#B8C0CC', 'line-height:1.5'] } },
    section: { name: 'Section', tag: 'section', html: '<h2 class="{c}-title">Section title</h2><p class="{c}-text">Describe this section.</p>',
        css: ['padding:64px 32px', 'text-align:center'],
        sub: { title: ['margin:0 0 12px', 'font-size:28px'], text: ['margin:0 auto', 'max-width:480px', 'color:#B8C0CC'] } },
    header: { name: 'Header', tag: 'header', html: '<h1 class="{c}-title">Welcome</h1><p class="{c}-text">A short introduction to your website.</p>',
        css: ['padding:80px 32px', 'text-align:center', 'background-color:#1E242D'],
        sub: { title: ['margin:0 0 10px', 'font-size:34px'], text: ['margin:0', 'color:#B8C0CC'] } },
    navbar: { name: 'Nav Bar', tag: 'nav', html: '<div class="{c}-brand">Brand</div><div class="{c}-links"><a class="{c}-link" href="#">Home</a><a class="{c}-link" href="#">About</a><a class="{c}-link" href="#">Contact</a></div>',
        css: ['display:flex', 'justify-content:space-between', 'align-items:center', 'padding:0 24px', 'height:56px', 'background-color:#1E242D'],
        sub: { brand: ['font-weight:700'], links: ['display:flex', 'gap:20px'], link: ['color:#B8C0CC', 'text-decoration:none', 'font-size:13px'] } },
    form: { name: 'Form', tag: 'form', html: '<h3 class="{c}-title">Contact us</h3><input class="{c}-input" type="text" placeholder="Your name"><input class="{c}-input" type="email" placeholder="Email"><button class="{c}-btn" type="submit">Send</button>',
        css: ['display:flex', 'flex-direction:column', 'gap:12px', 'max-width:360px', 'margin:24px auto', 'padding:24px', 'background-color:#1E242D', 'border-radius:8px'],
        sub: { title: ['margin:0'], input: ['padding:10px 12px', 'background-color:#101317', 'color:#ffffff', 'border:1px solid #2B3442', 'border-radius:4px'],
            btn: ['padding:10px', 'background-color:#5781FF', 'color:#ffffff', 'border:none', 'border-radius:4px', 'font-weight:600', 'cursor:pointer'] } },
    footer: { name: 'Footer', tag: 'footer', html: '<p class="{c}-text">&copy; 2026 Website. All rights reserved.</p>',
        css: ['padding:24px', 'text-align:center', 'background-color:#1E242D'], sub: { text: ['margin:0', 'color:#7F8998', 'font-size:12px'] } }
});

function place(d, el, ref, after) {                    // into containers, otherwise after `ref`
    const body = d.body, sc = body.querySelector(':scope > script:last-child');
    if (!after && CONTAINERS.includes(ref.tagName)) (ref === body && sc ? body.insertBefore(el, sc) : ref.appendChild(el));
    else ref.after(el);
    el.before(d.createTextNode('\n'));
}
function uniqueCopy(root) {                            // copies get their own classes (+ copied CSS rules)
    const map = {};
    [root, ...root.querySelectorAll('*')].forEach(n => {
        n.removeAttribute('id');
        [...n.classList].forEach(old => {
            if (!map[old]) {
                map[old] = uniqueClass(old.replace(/-\d+$/, ''));
                const m = files[CSS].match(ruleRe(old));
                if (m) parseDecl(m[3]).forEach(([p, v]) => setCss(map[old], p, v));
            }
            n.classList.replace(old, map[old]);
        });
    });
}
let clip = null;
function copySel() {
    const d = model(), el = selPath && selPath.length && elByPath(d.body, selPath);
    if (el) { clip = el.outerHTML; log('info', 'Copied ' + label(el)); }
}
function pasteClip(after) {
    if (!clip) return;
    const d = model(), t = d.createElement('div'); t.innerHTML = clip;
    const el = t.firstElementChild; uniqueCopy(el);
    place(d, el, (selPath && elByPath(d.body, selPath)) || d.body, after);
    selPath = pathOf(el, d.body); saveModel(d); changed();
}
function dupSel() {                                   // duplicates every selected element (last to first keeps paths valid)
    const d = model(); let last = null;
    sortedPaths().reverse().forEach(p => { const el = elByPath(d.body, p); if (!el) return; const c = el.cloneNode(true); uniqueCopy(c); place(d, c, el, true); last = c; });
    if (last) { selPath = pathOf(last, d.body); multi = []; saveModel(d); changed(); toast('Duplicated', 'ok'); }
}
function moveSel(dir) {
    if (!selPath || !selPath.length) return;
    const d = model(), el = elByPath(d.body, selPath);
    const sib = dir < 0 ? el.previousElementSibling : el.nextElementSibling;
    if (!sib || sib.tagName === 'SCRIPT') return;
    dir < 0 ? sib.before(el) : sib.after(el);
    selPath = pathOf(el, d.body); saveModel(d); changed();
}
function buildLayersPanel() {
    const p = document.createElement('div'); p.className = 'layers-panel';
    p.innerHTML = '<div class="panel-header"><span>Layers</span><span class="layer-actions"><b data-a="up" title="Move up">&uarr;</b><b data-a="down" title="Move down">&darr;</b><b data-a="dup" title="Duplicate (Ctrl+D)">&#10697;</b><b data-a="del" title="Delete">&times;</b></span></div><div id="layers-list"></div>';
    $('.explorer-panel').appendChild(p);
    p.addEventListener('click', e => {
        const a = e.target.dataset.a, r = e.target.closest('[data-p]');
        if (a) ({ up: () => moveSel(-1), down: () => moveSel(1), dup: dupSel, del: deleteSel })[a]();
        else if (r) select(r.dataset.p ? r.dataset.p.split(',').map(Number) : []);
    });
}
function paintLayers() {                               // DOM tree of the page, click to select
    const d = fdoc(), list = $('#layers-list'); if (!d || !d.body || !list) return;
    const sp = selPath ? selPath.join(',') : null, ic = `<svg class="tree-icon" viewBox="0 0 24 24"><path d="${ICON}"/></svg>`, rows = [];
    (function walk(el, path) {
        [...el.children].forEach((c, i) => {
            if (['SCRIPT', 'STYLE'].includes(c.tagName)) return;
            const p = [...path, i], txt = c.children.length ? '' : c.textContent.trim().slice(0, 18);
            rows.push(`<div class="tree-item${p.join(',') === sp ? ' selected' : ''}" data-p="${p.join(',')}" style="padding-left:${12 + path.length * 12}px">${ic}<span>${esc(label(c))}${txt ? ' - ' + esc(txt) : ''}</span></div>`);
            walk(c, p);
        });
    })(d.body, []);
    const html = `<div class="tree-item${sp === '' ? ' selected' : ''}" data-p="">${ic}<span>body</span></div>` + rows.join('');
    if (html !== lastLayers) { lastLayers = html; list.innerHTML = html; }   // skip DOM work when nothing changed
}

/* ---------- 8. Problems & Console ---------- */
let logs = [], problems = [], runtimeErrs = 0, bTab = 0;
const bTabs = $$('.bottom-tab').slice(0, 2), box = $('#bottom-content');
const COL = { error: '#E5534B', warn: '#E8B931', ok: '#57AB5A', info: 'var(--text-secondary)', log: 'var(--text-secondary)' };
function log(t, m) { logs.push([t, m]); paintBottom(); if (t === 'error') toast(m, 'error'); }
function paintBottom() {
    bTabs[0].textContent = `Problems (${problems.length})`;
    bTabs[0].classList.toggle('has-err', problems.length > 0); $('.status-bar').classList.toggle('has-err', problems.length > 0);
    bTabs.forEach((t, i) => t.classList.toggle('active', i === bTab));
    box.innerHTML = bTab === 0
        ? (problems.length ? problems.map(p => `<div style="color:#E5534B">&#10006; ${esc(p)}</div>`).join('')
            : '<div style="color:var(--text-muted);font-style:italic">No errors detected</div>')
        : logs.map(([t, m]) => `<div style="color:${COL[t] || COL.log}">&gt; ${esc(m)}</div>`).join('') || '<div style="color:var(--text-muted);font-style:italic">Console is empty</div>';
    box.scrollTop = bTab ? box.scrollHeight : 0;
}
bTabs.forEach((t, i) => t.addEventListener('click', () => { bTab = i; paintBottom(); }));
window.addEventListener('message', e => {              // console output from the preview
    const x = e.data; if (e.source !== frame.contentWindow || !x || !x.xos) return;
    if (x.xos === 'error') { problems.push('Runtime: ' + x.msg); }
    log(x.xos, x.msg);
});
function check() {                                     // lightweight static checks
    const P = [];
    try { new Function(files[JS]); } catch (e) { P.push('script.js: ' + e.message); }
    const css = files[CSS];
    if ((css.match(/\{/g) || []).length !== (css.match(/\}/g) || []).length) P.push('style.css: unbalanced { } braces');
    const h = files[HTML].replace(/<!--[\s\S]*?-->/g, ''), VOID = 'meta link img br hr input source area base col embed param track wbr'.split(' ');
    const open = {}, close = {};
    (h.match(/<\/?[a-zA-Z][\w-]*/g) || []).forEach(t => {
        const n = t.replace(/[</]/g, '').toLowerCase(); if (VOID.includes(n)) return;
        (t[1] === '/' ? close : open)[n] = ((t[1] === '/' ? close : open)[n] || 0) + 1;
    });
    Object.keys(open).forEach(n => { if (open[n] !== (close[n] || 0)) P.push(`index.html: <${n}> opened ${open[n]}x but closed ${close[n] || 0}x`); });
    return P;
}

/* ---------- 9. Files, save/load & ZIP export ---------- */
function openFile(p) {                                 // selecting an .html file switches the page being edited
    current = p;
    if (/\.html?$/i.test(p) && p !== HTML) { HTML = p; selPath = null; multi = []; render(); }
    renderTree();
}
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
const project = () => JSON.stringify({ app: 'XOS-Web-Studio', format: 'xosw', version: 1, files, assets });
let fileHandle = null;                                 // the .xosw on disk (File System Access API) - Save overwrites it
const writeHandle = async (h, blob) => { const w = await h.createWritable(); await w.write(blob); await w.close(); };
async function saveProject(as) {                       // Save = overwrite current file; Save As (as === true) = choose a place
    commit();
    try { localStorage.setItem('xos-project', project()); } catch (e) { /* storage full: the file still saves */ }
    const blob = new Blob([project()], { type: 'application/octet-stream' });
    try {
        if (window.showSaveFilePicker) {
            if (!fileHandle || as === true) {
                fileHandle = await showSaveFilePicker({ suggestedName: projName + '.xosw', types: [{ description: 'XOS project', accept: { 'application/octet-stream': ['.xosw'] } }] });
                projName = fileHandle.name.replace(/\.xosw$/i, ''); treeKey = ''; renderTree();
            }
            await writeHandle(fileHandle, blob); toast('Saved to ' + fileHandle.name, 'ok');
        } else { download(blob, projName + '.xosw'); toast('Downloaded ' + projName + '.xosw (this browser cannot overwrite files)', 'warn'); }
        $('#st-msg').textContent = 'Saved'; log('ok', 'Saved ' + projName + '.xosw'); stSave.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) { if (e.name !== 'AbortError') log('error', 'Save failed: ' + e.message); }
}
async function saveBlobAs(blob, name, desc, mime, ext) {   // "Save as" dialog for exports
    if (!window.showSaveFilePicker) { download(blob, name); return toast('Downloaded ' + name, 'ok'); }
    try { const h = await showSaveFilePicker({ suggestedName: name, types: [{ description: desc, accept: { [mime]: [ext] } }] }); await writeHandle(h, blob); toast('Saved ' + h.name, 'ok'); }
    catch (e) { if (e.name !== 'AbortError') log('error', 'Save failed: ' + e.message); }
}
async function openProject() {
    if (!window.showOpenFilePicker) return pick(false);
    try {
        const [h] = await showOpenFilePicker({ types: [{ description: 'XOS project, website or ZIP', accept: { 'application/octet-stream': ['.xosw'], 'text/html': ['.html', '.htm'], 'application/zip': ['.zip'], 'application/json': ['.json'] } }] });
        const f = await h.getFile(); fileHandle = /\.xosw$/i.test(f.name) ? h : null; await openFiles([f]);
    } catch (e) { if (e.name !== 'AbortError') log('error', 'Open failed: ' + e.message); }
}
function loadProject(text, name) {
    try {
        const p = JSON.parse(text); if (!p.files || !p.files[HTML]) throw new Error('Not an XOS project file');
        HTML = 'index.html'; CSS = 'css/style.css'; JS = 'js/script.js';
        files = { ...DEFAULTS, ...p.files }; assets = p.assets || {}; undoStack = []; redoStack = []; lastSnap = snap(); selPath = null;
        if (name) projName = name.replace(/\.[^.]*$/, ''); render(); log('ok', 'Project loaded');
    } catch (e) { log('error', 'Open failed: ' + e.message); bTab = 1; paintBottom(); }
}
const openDialog = () => openProject();
function crc32(u) { let c = -1; for (const b of u) { c ^= b; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; } return (c ^ -1) >>> 0; }
function makeZip(list) {                               // minimal store-only ZIP writer
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    for (const f of list) {
        const n = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
        const h = new DataView(new ArrayBuffer(30)), c = new DataView(new ArrayBuffer(46));
        [[0, 4, 0x04034b50], [4, 2, 20], [6, 2, 0x800], [12, 2, 0x21], [14, 4, crc], [18, 4, sz], [22, 4, sz], [26, 2, n.length]].forEach(([o, l, v]) => l === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true));
        [[0, 4, 0x02014b50], [4, 2, 20], [6, 2, 20], [8, 2, 0x800], [14, 2, 0x21], [16, 4, crc], [20, 4, sz], [24, 4, sz], [28, 2, n.length], [42, 4, off]].forEach(([o, l, v]) => l === 4 ? c.setUint32(o, v, true) : c.setUint16(o, v, true));
        parts.push(new Uint8Array(h.buffer), n, f.data); cen.push(new Uint8Array(c.buffer), n);
        off += 30 + n.length + sz;
    }
    const e = new DataView(new ArrayBuffer(22)), cs = cen.reduce((a, x) => a + x.length, 0);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, list.length, true); e.setUint16(10, list.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
function exportZip() {
    const enc = new TextEncoder();
    const list = Object.entries(files).filter(([n]) => !n.endsWith('/.keep')).map(([name, t]) => ({ name, data: enc.encode(name === CSS ? t.replace(/url\(\s*(['"]?)assets\//g, 'url($1../assets/') : t) }));
    Object.entries(assets).forEach(([n, u]) => list.push({ name: 'assets/' + n, data: Uint8Array.from(atob(u.split(',')[1]), ch => ch.charCodeAt(0)) }));
    saveBlobAs(makeZip(list), projName + '.zip', 'ZIP archive', 'application/zip', '.zip'); log('ok', 'Exported ' + projName + '.zip');
}
function runPreview() {
    window.open(URL.createObjectURL(new Blob([bundle(HTML)], { type: 'text/html' })), '_blank'); log('info', 'Opened preview in a new tab');
}

/* ---------- 10. Toolbar, menus & shortcuts ---------- */
const ACTIONS = {
    'New Project': () => { autosave(); location.href = 'home.html?new=1'; },   // home asks: Developer or Designer mode
    'Open': openDialog, 'Save': saveProject, 'Undo': undo, 'Redo': redo, 'Run Preview': runPreview
};
$$('.tb-btn').forEach(b => { const a = ACTIONS[b.textContent.trim()]; if (a) b.addEventListener('click', a); });
$$('.device-toggle:not(#mode-toggle) .device-btn').forEach((b, i) => b.addEventListener('click', () => setDevice(Object.keys(DEV)[i])));

const MENUS = {
    File: [['Home Page', () => goHome()], ['New Project', () => ACTIONS['New Project']()], ['Open (.xosw / HTML / ZIP)...', () => openProject()], ['Open Files (HTML + assets)...', () => pick(false)], ['Open Folder...', () => pick(true)],
        ['Save', () => saveProject()], ['Save As...', () => saveProject(true)], ['Save as Standalone HTML', () => saveStandalone()], ['Export Website.zip', () => exportZip()]],
        Edit: [['Undo', undo], ['Redo', redo], ['Duplicate', dupSel], ['Copy', copySel], ['Paste', () => pasteClip()], ['Move Up', () => moveSel(-1)], ['Move Down', () => moveSel(1)], ['Delete Element', deleteSel]],
    Insert: Object.keys(COMP).map(k => [COMP[k].name, () => insertComp(k, selEl())]),
    View: [['Toggle Dark / Light', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')], ['Keyboard Shortcuts', showShortcuts], ['Refresh Preview', render], ['Accent Colors...', () => setTimeout(() => accentPop($('.toolbar .tb-btn:last-child').getBoundingClientRect()), 0)]],
    Project: [['Run Preview', () => runPreview()], ['Add Page...', () => newPage()], ['Site Name & Icon...', () => openSite()], ['Asset Library...', () => openAssetLibrary()], ['Export Website.zip', () => exportZip()]],
    Windows: [['Toggle Project Explorer', () => togglePanel('.explorer-panel')], ['Toggle Inspector', () => togglePanel('.props-panel')], ['Toggle Problems / Console', () => togglePanel('.bottom-panel')],
        ['Show Problems', () => showBottom(0)], ['Show Console', () => showBottom(1)], ['Asset Library', () => openAssetLibrary()], ['Reset Layout', () => resetLayout()]],
    Help: [['Getting Started', () => aboutModal()], ['Keyboard Shortcuts', () => showShortcuts()], ['Home Page', () => goHome()]]
};
let pop;
const closePop = () => { pop && pop.remove(); pop = null; };
$$('.menu-item').forEach(mi => mi.addEventListener('click', e => {
    e.stopPropagation(); const items = MENUS[mi.textContent.trim()]; const same = pop && pop.dataset.m === mi.textContent; closePop();
    if (!items || same) return;
    pop = document.createElement('div'); pop.className = 'menu-pop'; pop.dataset.m = mi.textContent;
    const r = mi.getBoundingClientRect(); pop.style.left = r.left + 'px'; pop.style.top = r.bottom + 2 + 'px';
    items.forEach(([t, fn]) => { const d = document.createElement('div'); d.textContent = t; d.onclick = () => { closePop(); fn(); }; pop.appendChild(d); });
    document.body.appendChild(pop);
}));
document.addEventListener('click', closePop);
function onKey(e) {                                    // shared by the app and the preview frame
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey, typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (mod && k === 's') { e.preventDefault(); saveProject(); }
    else if (typing) return;
    else if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && k === 'y') { e.preventDefault(); redo(); }
    else if (mod && k === 'd') { e.preventDefault(); dupSel(); }
    else if (mod && k === 'c') copySel();
    else if (mod && k === 'v') pasteClip();
    else if (e.key === 'Delete') deleteSel();
    else if (e.key === 'Escape') select(null);
    else if (e.key === '?') showShortcuts();
}
document.addEventListener('keydown', onKey);
window.addEventListener('resize', fit);
new ResizeObserver(fit).observe($('#canvas-viewport'));

/* ---------- 10b. Open HTML / folder / ZIP, standalone save, accents ---------- */
let projName = 'website';
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon', wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', mp4: 'video/mp4', webm: 'video/webm', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf' };
function dataUrl(b, name) {
    let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return `data:${MIME[name.split('.').pop().toLowerCase()] || 'application/octet-stream'};base64,${btoa(s)}`;
}
const inlineAssets = t => t.replace(/url\(\s*(['"]?)assets\/([^)'"]+)\1\s*\)/g, (m, q, n) => { const a = assets[decodeURI(n)]; return a ? `url("${a}")` : m; });

async function readZip(file) {                         // ZIP reader (stored + deflate) via built-in DecompressionStream
    const u = new Uint8Array(await file.arrayBuffer()), v = new DataView(u.buffer), out = [];
    let e = u.length - 22; while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('Not a valid ZIP file');
    let p = v.getUint32(e + 16, true);
    for (let i = 0, n = v.getUint16(e + 10, true); i < n; i++) {
        const method = v.getUint16(p + 10, true), csz = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true),
            xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
        const name = new TextDecoder().decode(u.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
        if (name.endsWith('/')) continue;
        const st = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true), raw = u.subarray(st, st + csz);
        if (method === 0) out.push({ path: name, data: raw });
        else if (method === 8) out.push({ path: name, data: new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()) });
    }
    return out;
}

/* Turn a website (entries = [{path, data}]) into a project: local CSS/JS are merged into
   css/style.css and js/script.js, local images/fonts become assets. */
function importSite(ents, name) {
    const dec = b => new TextDecoder().decode(b), depth = p => p.split('/').length, isIdx = p => /(^|\/)index\.html?$/i.test(p);
    ents = ents.filter(e => !/(^|\/)(__MACOSX|node_modules|\.git)(\/|$)|(^|\/)\.[^/]*$/.test(e.path));
    const htmls = ents.filter(e => /\.html?$/i.test(e.path)).sort((a, b) => depth(a.path) - depth(b.path) || isIdx(b.path) - isIdx(a.path));
    if (!htmls.length) throw new Error('No HTML file found');
    const main = htmls[0], dir = main.path.slice(0, main.path.lastIndexOf('/') + 1);
    const byPath = new Map(ents.filter(e => e.path.startsWith(dir)).map(e => [e.path.slice(dir.length), e]));
    const A = {}, d = parse(dec(main.data));
    const res = (base, rel) => { if (!rel || /^([a-z]+:|\/\/|#)/i.test(rel)) return null; try { return decodeURIComponent(new URL(rel, 'http://x/' + base).pathname.slice(1)); } catch (e) { return null; } };
    const asset = p => { if (!byPath.has(p)) return false; A[p] = A[p] || dataUrl(byPath.get(p).data, p); return true; };
    const fixCss = (t, base) => t.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (m, q, u) => { const p = res(base, u.trim()); return p && asset(p) ? `url(assets/${encodeURI(p)})` : m; });
    let css = '', js = '', cssEl, jsEl;
    $$('link[rel~=stylesheet],style', d).forEach(n => {
        if (n.tagName === 'STYLE') css += fixCss(n.textContent, '') + '\n';
        else { const p = res('', n.getAttribute('href')), e = p && byPath.get(p); if (!e) return; css += fixCss(dec(e.data), p) + '\n'; }
        if (!cssEl) { cssEl = d.createElement('link'); cssEl.setAttribute('rel', 'stylesheet'); cssEl.setAttribute('href', 'css/style.css'); n.replaceWith(cssEl); } else n.remove();
    });
    $$('script', d).forEach(n => {
        const t = (n.getAttribute('type') || '').toLowerCase(), src = n.getAttribute('src');
        if (t && !/javascript/.test(t)) return;          // modules / JSON-LD stay untouched
        let code = n.textContent;
        if (src) { const p = res('', src), e = p && byPath.get(p); if (!e) return; code = dec(e.data); }
        js += code + '\n;\n';
        if (!jsEl) { jsEl = d.createElement('script'); jsEl.setAttribute('src', 'js/script.js'); n.replaceWith(jsEl); } else n.remove();
    });
    if (!cssEl) { cssEl = d.createElement('link'); cssEl.setAttribute('rel', 'stylesheet'); cssEl.setAttribute('href', 'css/style.css'); d.head.appendChild(cssEl); }
    if (!jsEl) { jsEl = d.createElement('script'); jsEl.setAttribute('src', 'js/script.js'); d.body.appendChild(jsEl); }
    $$('img[src]', d).forEach(i => { const p = res('', i.getAttribute('src')); if (p && asset(p)) i.setAttribute('src', 'assets/' + p); });
    files = { [HTML]: '<!DOCTYPE html>\n' + d.documentElement.outerHTML, [CSS]: css, [JS]: js };
    assets = A; undoStack = []; redoStack = []; lastSnap = snap(); selPath = null;
    projName = name.replace(/\.[^.]*$/, '') || 'website'; fileHandle = null;
    render(); log('ok', `Opened ${main.path} (${Object.keys(A).length} assets merged)`);
}
async function openFiles(list) {                       // .xosw | .html | folder | .zip | html + css/images
    const fl = [...list]; if (!fl.length) return;
    const n = fl[0].name.toLowerCase(), rel = fl[0].webkitRelativePath;
    if (fl.length === 1 && /\.(xosw|json)$/.test(n)) return loadProject(await fl[0].text(), fl[0].name);
    if (fl.length === 1 && n.endsWith('.zip')) return importSite(await readZip(fl[0]), fl[0].name);
    const ents = await Promise.all(fl.map(async f => ({ path: f.webkitRelativePath ? f.webkitRelativePath.split('/').slice(1).join('/') : f.name, data: new Uint8Array(await f.arrayBuffer()) })));
    importSite(ents, rel ? rel.split('/')[0] : fl[0].name);
}
function pick(folder) {
    const i = document.createElement('input'); i.type = 'file';
    if (folder) i.webkitdirectory = true; else { i.multiple = true; i.accept = '.xosw,.json,.html,.htm,.zip,.css,.js,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico,.woff,.woff2,.ttf,.otf'; }
    i.onchange = () => openFiles(i.files).catch(e => { log('error', 'Open failed: ' + e.message); bTab = 1; paintBottom(); });
    i.click();
}
function saveStandalone() {                            // one self-contained .html (all pages, CSS, JS and assets inlined)
    saveBlobAs(new Blob([bundle('index.html' in files ? 'index.html' : HTML)], { type: 'text/html' }), projName + '.html', 'HTML page', 'text/html', '.html');
}

/** Solid accents: a single flat color (accent2 === accent). */
const SOLID_ACCENTS = [
  { label: 'Cobalt',  c1: '#1F5CE0' }, { label: 'Violet',  c1: '#7C5CFF' }, { label: 'Indigo',  c1: '#4F6BFF' },
  { label: 'Sky',     c1: '#2F80ED' }, { label: 'Teal',    c1: '#12A594' }, { label: 'Green',   c1: '#2FAE60' },
  { label: 'Olive',   c1: '#7C9A3B' }, { label: 'Amber',   c1: '#F5A524' }, { label: 'Red',     c1: '#E5484D' },
  { label: 'Pink',    c1: '#E93D82' },
];
/** Gradient accents: two-stop linear-gradient(90deg, c1 0%, c2 100%). Required preset is first. */
const GRADIENT_ACCENTS = [
  { label: 'Cobalt Blue', c1: '#1F5CE0', c2: '#1F42E0' }, { label: 'Violet Dusk', c1: '#7C5CFF', c2: '#B24FE0' },
  { label: 'Ocean',       c1: '#2F80ED', c2: '#12A594' }, { label: 'Sunset',      c1: '#F5A524', c2: '#E5484D' },
  { label: 'Berry',       c1: '#E93D82', c2: '#7C5CFF' }, { label: 'Forest',      c1: '#2FAE60', c2: '#12A594' },
  { label: 'Fire',        c1: '#E8703A', c2: '#E5484D' }, { label: 'Aurora',      c1: '#12A594', c2: '#4F6BFF' },
  { label: 'Grape',       c1: '#7C3AED', c2: '#DB2777' }, { label: 'Steel',       c1: '#64748B', c2: '#334155' },
];
const readShared = () => { try { return JSON.parse(localStorage.getItem('xos.settings')) || {}; } catch (e) { return {}; } };
const writeShared = o => { try { localStorage.setItem('xos.settings', JSON.stringify(Object.assign(readShared(), o))); } catch (e) { /* ignore */ } };
const mqLight = window.matchMedia('(prefers-color-scheme: light)');
const themeSetting = () => readShared().theme || 'dark';
function applyTheme() { const t = themeSetting(); document.documentElement.setAttribute('data-theme', t === 'system' ? (mqLight.matches ? 'light' : 'dark') : t); }
function setTheme(t) { writeShared({ theme: t }); applyTheme(); }
function applyAccent(c1, c2, save, quiet) {            // '' = default accent; saved to the shared settings
    const r = document.documentElement.style;
    if (!c1) ['--accent', '--accent2', '--accent-muted', '--accent-bg'].forEach(p => r.removeProperty(p));
    else {
        const n = parseInt(c1.slice(1), 16);
        r.setProperty('--accent', c1); r.setProperty('--accent2', c2);
        r.setProperty('--accent-muted', `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, 0.15)`);
        r.setProperty('--accent-bg', `linear-gradient(90deg, ${c1} 0%, ${c2} 100%)`);
    }
    if (save) writeShared({ accent: c1, accent2: c1 ? c2 : '' });
    if (!quiet && fdoc() && fdoc().body) render();     // refresh selection outline colour
}
function loadAccent() { const s = readShared(); applyTheme(); applyAccent(s.accent || '', s.accent2 || s.accent || '', false, true); }
window.addEventListener('storage', e => { if (e.key === 'xos.settings') { loadAccent(); render(); } });   // home / dev-mode changed it
function accentPop(r) {
    closePop(); pop = document.createElement('div'); pop.className = 'menu-pop accent-pop';
    const sw = (a, g) => `<i class="swatch" title="${a.label}" data-c="${a.c1},${a.c2 || a.c1}" style="background:${g ? `linear-gradient(90deg,${a.c1},${a.c2})` : a.c1}"></i>`;
    pop.innerHTML = `<h4>Theme</h4>${['dark', 'light', 'system'].map(t => `<div data-th="${t}">${t[0].toUpperCase() + t.slice(1)}${themeSetting() === t ? ' \u2713' : ''}</div>`).join('')}<h4>Solid accents</h4><div class="swatches">${SOLID_ACCENTS.map(a => sw(a)).join('')}</div><h4>Gradient accents</h4><div class="swatches">${GRADIENT_ACCENTS.map(a => sw(a, 1)).join('')}</div><div data-reset>Reset to default</div>`;
    pop.style.top = r.bottom + 4 + 'px'; pop.style.left = Math.max(8, r.right - 220) + 'px';
    pop.onclick = e => {
        e.stopPropagation();
        if (e.target.dataset.th) { setTheme(e.target.dataset.th); accentPop(r); } else if (e.target.dataset.c) applyAccent(...e.target.dataset.c.split(','), true);
        else if (e.target.hasAttribute('data-reset')) applyAccent('', '', true);
    };
    document.body.appendChild(pop);
}
$$('.tb-btn').filter(b => !b.textContent.trim())[0].addEventListener('click', e => { e.stopPropagation(); accentPop(e.currentTarget.getBoundingClientRect()); });

/* ---------- 12. Visual builder: overlay, resize handles, drag-to-move, multi-select ---------- */
let multi = [], dragging = false, suppressClick = false, dragSt = null, lastLayers = '';
const holder = $('#frame-holder'), selBox = document.createElement('div'), dropInd = document.createElement('div');
const loadbar = document.createElement('div');
selBox.className = 'sel-box'; dropInd.className = 'drop-ind'; loadbar.className = 'loadbar';
selBox.innerHTML = ['tl', 't', 'tr', 'r', 'br', 'b', 'bl', 'l'].map(c => `<i class="handle ${c}" data-h="${c}"></i>`).join('') + '<i class="rot-line"></i><i class="rot" data-h="rot" title="Rotate (hold Shift for 15\u00B0 steps)"></i>';
holder.append(selBox, dropInd); $('.visual-canvas-area').appendChild(loadbar);
const cmpPath = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i]; return a.length - b.length; };
const allPaths = () => (selPath ? [...multi, selPath] : []);
const sortedPaths = () => allPaths().filter(p => p.length).sort(cmpPath);
function toggleMulti(p) {                              // Ctrl/Shift+Click adds or removes an element
    const k = p.join(','), same = x => x.join(',') === k;
    if (selPath && same(selPath)) selPath = multi.pop() || null;
    else { const i = multi.findIndex(same); if (i >= 0) multi.splice(i, 1); else { if (selPath) multi.push(selPath); selPath = p; } }
    markSel(); fillInspector(); paintLayers();
}
function revealSel() {                                 // keep the selection visible in canvas + layers
    const el = selEl(), d = fdoc(); if (!el || !d) return;
    const r = el.getBoundingClientRect(); if (r.top < 0 || r.bottom > d.defaultView.innerHeight) el.scrollIntoView({ block: 'nearest' });
    const row = $('#layers-list .selected'); if (row) row.scrollIntoView({ block: 'nearest' });
}
const rectOf = el => { const r = el.getBoundingClientRect(); return { l: r.left * scale + scale, t: r.top * scale + scale, w: r.width * scale, h: r.height * scale }; };
function drawOverlay() {
    const el = selEl(), d = fdoc();
    if (!el || !d || el === d.body || multi.length || dragging) { selBox.style.display = 'none'; return; }
    const r = rectOf(el); selBox.style.cssText = `display:block;left:${r.l}px;top:${r.t}px;width:${r.w}px;height:${r.h}px`;
}
function applyProps(obj) {                             // inspector/handles -> CSS rule of every selected element
    const paths = allPaths(); if (!paths.length) return;
    const d = model(); let structural = false, css = false;
    paths.forEach(p => {
        const el = elByPath(d.body, p); if (!el) return;
        Object.entries(obj).forEach(([k, v]) => {
            if (k === 'id') { el.id = v; structural = true; }
            else if (k === 'class') { el.className = v; structural = true; }
            else if (k === 'text') { if (!el.children.length) el.textContent = v; structural = true; }
            else {
                if (!el.classList.length) { el.classList.add(uniqueClass(el.tagName.toLowerCase())); saveModel(d); structural = true; }
                if (k === 'animation') ensureKeyframes(v);
                setCss(el.classList[0], k, v); css = true;
            }
        });
    });
    if (structural) { saveModel(d); changed(); } else if (css) { commit(); refreshCss(); }   // CSS-only edits skip the reload
}
selBox.addEventListener('mousedown', e => {            // resize via the 8 handles
    const hd = e.target.dataset.h, el = selEl(); if (!hd || !el) return;
    e.preventDefault(); e.stopPropagation();
    if (hd === 'rot') return startRotate(e, el);
    const r0 = el.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, st = el.style.cssText; let w = r0.width, h = r0.height;
    const sx = hd.includes('r') || hd.includes('l'), sy = hd.includes('t') || hd.includes('b');
    document.body.classList.add('resizing'); el.style.boxSizing = 'border-box';
    const mv = ev => {
        const dx = (ev.clientX - x0) / scale, dy = (ev.clientY - y0) / scale;
        if (hd.includes('r')) w = Math.max(8, r0.width + dx); if (hd.includes('l')) w = Math.max(8, r0.width - dx);
        if (hd.includes('b')) h = Math.max(8, r0.height + dy); if (hd.includes('t')) h = Math.max(8, r0.height - dy);
        if (sx) el.style.width = w + 'px'; if (sy) el.style.height = h + 'px'; drawOverlay();
    };
    const up = () => {
        document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); document.body.classList.remove('resizing');
        el.style.cssText = st; const o = { 'box-sizing': 'border-box' };
        if (sx) o.width = Math.round(w) + 'px'; if (sy) o.height = Math.round(h) + 'px'; applyProps(o);
    };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
});
function dropInfo(d, x, y, ex, palette) {              // where would a drop land? {t: target element, pos: in|before|after}
    let t = d.elementFromPoint(x, y); if (!t || !d.body.contains(t)) t = d.body;
    while (ex && (t === ex || ex.contains(t))) t = t.parentElement;
    const r = t.getBoundingClientRect(), f = (y - r.top) / (r.height || 1), cont = CONTAINERS.includes(t.tagName);
    const pos = t === d.body ? 'in' : palette ? (cont ? 'in' : 'after') : cont ? (f < .25 ? 'before' : f > .75 ? 'after' : 'in') : (f < .5 ? 'before' : 'after');
    return { t, pos };
}
function showDrop({ t, pos }) {
    const r = rectOf(t); dropInd.className = 'drop-ind ' + (pos === 'in' ? 'in' : 'line');
    dropInd.style.cssText = pos === 'in' ? `display:block;left:${r.l}px;top:${r.t}px;width:${r.w}px;height:${r.h}px`
        : `display:block;left:${r.l}px;top:${(pos === 'after' ? r.t + r.h : r.t) - 1}px;width:${r.w}px;height:3px`;
}
const hideDrop = () => { dropInd.style.display = 'none'; };
function endDrag() { if (dragSt) dragSt.el.classList.remove('xos-drag'); dragSt = null; dragging = false; hideDrop(); drawOverlay(); }
function bindDrag(d) {                                 // press + move on an element reorders / nests it
    d.addEventListener('mousedown', e => {
        if (e.button || e.target === d.body || e.target === d.documentElement) return;
        dragSt = { el: e.target, x: e.clientX, y: e.clientY, on: false, free: freeMove || e.altKey };
    });
    d.addEventListener('mousemove', e => {
        if (!dragSt) return;
        if (!dragSt.on) {
            if (Math.hypot(e.clientX - dragSt.x, e.clientY - dragSt.y) < 6) return;
            dragSt.on = dragging = true; dragSt.el.classList.add('xos-drag'); selBox.style.display = 'none';
            const pp = pathOf(dragSt.el, d.body); if (!allPaths().some(x => x.join(',') === pp.join(','))) select(pp);
        }
        if (dragSt.free) freeMoveTo(dragSt, e); else { dragSt.info = dropInfo(d, e.clientX, e.clientY, dragSt.el); showDrop(dragSt.info); }
    });
    d.addEventListener('mouseup', () => {
        const s = dragSt; if (!s) return;
        if (!s.on) { dragSt = null; return; }
        suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
        endDrag();
        if (s.free && s.fm) { s.el.style.cssText = s.fm.css; applyProps({ position: s.fm.pos === 'static' ? 'relative' : s.fm.pos, left: Math.round(s.fm.nl) + 'px', top: Math.round(s.fm.nt) + 'px' }); }
        else if (s.info) moveTo(s.el, s.info);
    });
}
document.addEventListener('mouseup', () => { if (dragSt && dragSt.on) endDrag(); });   // released outside the canvas
function moveTo(el, { t, pos }) {
    const d = model(), b = fdoc().body, m = elByPath(d.body, pathOf(el, b)), tm = elByPath(d.body, pathOf(t, b)); if (!m || !tm) return;
    const sc = tm === d.body && tm.querySelector(':scope > script:last-child');
    if (pos === 'in') (sc ? d.body.insertBefore(m, sc) : tm.appendChild(m)); else pos === 'before' ? tm.before(m) : tm.after(m);
    selPath = pathOf(m, d.body); multi = []; saveModel(d); changed();
}

/* ---------- 13. Project explorer (files, folders, context menu, drag & drop) ---------- */
const FICON = { dir: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
    file: 'M12 2L2 5l1.8 14.2L12 22l8.2-2.8L22 5l-10-3zm0 17.5l-6.2-2.1-1.3-10.4h15l-1.3 10.4-6.2 2.1z',
    js: 'M3 3h18v18H3V3zm10 13.5c0 .8.6 1.5 1.5 1.5s1.5-.7 1.5-1.5v-4h2v4c0 1.9-1.6 3.5-3.5 3.5S11 18.4 11 16.5v-1h2v1z' };
const fKind = p => /\.html?$/i.test(p) ? 'html' : /\.css$/i.test(p) ? 'css' : /\.js$/i.test(p) ? 'js' : 'file';
const collapsed = new Set(); let treeKey = '';
function renderTree() {                                // rebuilds only when files / selection / folding changed
    const key = projName + '|' + Object.keys(files).sort().join('|') + '#' + current + '#' + HTML + '#' + [...collapsed].join('|');
    if (key === treeKey) return; treeKey = key;
    const root = { dirs: {}, files: [] };
    Object.keys(files).sort().forEach(p => {
        const parts = p.split('/'); let n = root;
        parts.slice(0, -1).forEach((d, i) => { n = n.dirs[d] = n.dirs[d] || { dirs: {}, files: [], path: parts.slice(0, i + 1).join('/') }; });
        if (parts.pop() !== '.keep') n.files.push(p);
    });
    const row = (t, p, name, depth, open) => {
        const k = t === 'dir' ? 'dir' : fKind(p), ic = k === 'dir' ? 'folder' : k === 'js' ? 'js' : k === 'css' ? 'css' : 'html';
        return `<div class="tree-item${t === 'file' && (p === current || p === HTML) ? ' selected' : ''}" draggable="true" data-t="${t}" data-p="${p}" style="padding-left:${12 + depth * 12}px"><svg class="tree-icon icon-${ic}" viewBox="0 0 24 24"><path d="${FICON[k === 'dir' ? 'dir' : k === 'js' ? 'js' : 'file']}"/></svg><span>${t === 'dir' ? (open ? '\u25BE ' : '\u25B8 ') : ''}${esc(name)}</span></div>`;
    };
    const rows = [`<div class="tree-item" data-t="root" data-p=""><svg class="tree-icon icon-folder" viewBox="0 0 24 24"><path d="${FICON.dir}"/></svg><span>${esc(projName)}</span></div>`];
    (function walk(n, depth) {
        Object.keys(n.dirs).sort().forEach(name => { const c = n.dirs[name], open = !collapsed.has(c.path); rows.push(row('dir', c.path, name, depth, open)); if (open) walk(c, depth + 1); });
        n.files.sort().forEach(p => rows.push(row('file', p, p.split('/').pop(), depth)));
    })(root, 1);
    $('.file-tree').innerHTML = rows.join('');
}
function ctx(x, y, items) {
    closePop(); pop = document.createElement('div'); pop.className = 'menu-pop'; pop.style.left = x + 'px'; pop.style.top = y + 'px';
    items.forEach(([t, fn]) => { const d = document.createElement('div'); d.textContent = t; d.onclick = () => { closePop(); fn(); }; pop.appendChild(d); });
    document.body.appendChild(pop);
}
function treeMenu(x, y, t, p) {
    const dir = t === 'dir' ? p : t === 'file' ? p.split('/').slice(0, -1).join('/') : '';
    ctx(x, y, [['New HTML File', () => newFile(dir, 'html')], ['New CSS File', () => newFile(dir, 'css')], ['New JS File', () => newFile(dir, 'js')], ['New Folder', () => newFolder(dir)],
        ...(t === 'root' ? [] : [['Rename', () => renameEntry(p)], ['Duplicate', () => dupEntry(p)], ['Delete', () => deleteEntry(p)]])]);
}
const isDirPath = p => Object.keys(files).some(k => k.startsWith(p + '/'));
function askName(msg, def) {
    const n = (prompt(msg, def) || '').trim(); if (!n) return null;
    if (!/^[\w][\w .()-]*$/.test(n)) { toast('Use letters, numbers, spaces, . _ - ( ) only', 'error'); return null; }
    return n;
}
function touched() { commit(); treeKey = ''; renderTree(); render(); }
function newFile(dir, ext) {
    const base = askName('File name', 'untitled.' + ext); if (!base) return;
    const name = /\.\w+$/.test(base) ? base : base + '.' + ext, p = dir ? dir + '/' + name : name;
    if (p in files) return toast('File already exists', 'error');
    files[p] = ext === 'html' ? `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>Page</title>\n<link rel="stylesheet" href="${CSS}">\n</head>\n<body>\n</body>\n</html>` : '';
    touched(); toast('Created ' + p, 'ok');
}
function newFolder(dir) { const n = askName('Folder name', 'new-folder'); if (!n) return; files[(dir ? dir + '/' : '') + n + '/.keep'] = ''; touched(); }
function moveEntry(old, nw) {                          // rename / move; rewrites references in html, css and js
    if (old === nw) return;
    if (nw.startsWith(old + '/')) return toast('Cannot move a folder into itself', 'error');
    const dir = isDirPath(old), map = {};
    Object.keys(files).forEach(k => { if (k === old) map[k] = nw; else if (dir && k.startsWith(old + '/')) map[k] = nw + k.slice(old.length); });
    if (!Object.keys(map).length) return;
    if (Object.values(map).some(v => v in files)) return toast('A file with that name already exists', 'error');
    const re = new RegExp('(["\'(=\\s])' + old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=["\')?#/\\s])', 'g');
    Object.keys(files).forEach(k => { if (/\.(html?|css|js)$/i.test(k)) files[k] = files[k].replace(re, (m, a) => a + nw); });
    Object.entries(map).forEach(([a, b]) => { files[b] = files[a]; delete files[a]; });
    HTML = map[HTML] || HTML; CSS = map[CSS] || CSS; JS = map[JS] || JS; current = map[current] || current;
    touched();
}
const renameEntry = p => { const n = askName('Rename to', p.split('/').pop()); if (n) moveEntry(p, p.split('/').slice(0, -1).concat(n).join('/')); };
function dupEntry(p) {
    const isD = isDirPath(p), parts = p.split('/'), base = parts.pop(), dot = isD || base.lastIndexOf('.') < 0 ? base.length : base.lastIndexOf('.');
    let cand, i = 1;
    do { cand = [...parts, base.slice(0, dot) + ' copy' + (i > 1 ? ' ' + i : '') + base.slice(dot)].join('/'); i++; } while (cand in files || isDirPath(cand));
    Object.keys(files).forEach(k => { if (k === p) files[cand] = files[k]; else if (isD && k.startsWith(p + '/')) files[cand + k.slice(p.length)] = files[k]; });
    touched(); toast('Duplicated', 'ok');
}
function deleteEntry(p) {
    const keys = Object.keys(files).filter(k => k === p || k.startsWith(p + '/'));
    if (keys.includes(CSS)) return toast('This is the stylesheet the Inspector edits - it cannot be deleted', 'error');
    if (keys.includes(HTML) && !Object.keys(files).some(k => fKind(k) === 'html' && !keys.includes(k))) return toast('A project needs at least one HTML page', 'error');
    if (!confirm('Delete ' + p + '?')) return;
    keys.forEach(k => delete files[k]);
    if (!(HTML in files)) { HTML = Object.keys(files).find(k => fKind(k) === 'html'); selPath = null; multi = []; }
    if (!(current in files)) current = HTML;
    touched(); toast('Deleted ' + p);
}
function bindTree() {                                  // one delegated listener set for the whole tree
    const t = $('.file-tree'), rowOf = e => e.target.closest('.tree-item'), clearHl = () => $$('.drop-hl', t).forEach(x => x.classList.remove('drop-hl'));
    t.addEventListener('click', e => {
        const r = rowOf(e); if (!r) return;
        if (r.dataset.t === 'dir') { const p = r.dataset.p; collapsed.has(p) ? collapsed.delete(p) : collapsed.add(p); renderTree(); }
        else if (r.dataset.t === 'file') openFile(r.dataset.p);
    });
    t.addEventListener('contextmenu', e => { e.preventDefault(); const r = rowOf(e); treeMenu(e.clientX, e.clientY, r ? r.dataset.t : 'root', r ? r.dataset.p : ''); });
    t.addEventListener('dragstart', e => { const r = rowOf(e); if (r && r.dataset.t !== 'root') e.dataTransfer.setData('text/xos-file', r.dataset.p); else e.preventDefault(); });
    t.addEventListener('dragover', e => {
        if (!e.dataTransfer.types.includes('text/xos-file')) return; e.preventDefault(); clearHl();
        const r = rowOf(e); if (r && r.dataset.t !== 'file') r.classList.add('drop-hl');
    });
    t.addEventListener('dragleave', e => { if (!e.relatedTarget || !t.contains(e.relatedTarget)) clearHl(); });
    t.addEventListener('drop', e => {
        const src = e.dataTransfer.getData('text/xos-file'); if (!src) return; e.preventDefault(); clearHl();
        const r = rowOf(e), dir = r ? (r.dataset.t === 'file' ? r.dataset.p.split('/').slice(0, -1).join('/') : r.dataset.p) : '';
        moveEntry(src, (dir ? dir + '/' : '') + src.split('/').pop());
    });
}

/* ---------- 14. Assets manager ---------- */
let assetKey = '';
function buildAssetsPanel() {
    const p = document.createElement('div'); p.className = 'assets-panel';
    p.innerHTML = '<div class="panel-header"><span>Assets</span><span class="layer-actions"><b data-a="add" title="Upload images">+</b></span></div><div id="asset-list" class="asset-grid"></div>';
    $('.layers-panel').before(p);
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = () => { [...inp.files].forEach(addAsset); inp.value = ''; };
    $('[data-a=add]', p).onclick = () => inp.click();
    const list = $('#asset-list', p);
    list.addEventListener('click', e => {
        const t = e.target.closest('.asset'); if (!t) return; const n = t.dataset.n, op = e.target.dataset.op;
        if (op === 'del') delAsset(n); else if (op === 'ren') renAsset(n); else useAsset(n);
    });
    list.addEventListener('dragstart', e => { const t = e.target.closest('.asset'); if (t) e.dataTransfer.setData('text/xos-asset', t.dataset.n); });
    syncAssets();
}
function syncAssets() {                                // repaint thumbnails only when the asset list changed
    const k = Object.keys(assets).join('|'); if (k === assetKey) return; assetKey = k;
    $('#asset-list').innerHTML = Object.entries(assets).map(([n, u]) => `<div class="asset" draggable="true" data-n="${esc(n)}" title="${esc(n)} - drag to canvas, click to apply to selected image">${/^data:audio/.test(u) ? '<div class="asset-ic">&#9835;</div>' : `<img src="${u}" alt="" draggable="false">`}<span>${esc(n)}</span><i><b data-op="ren" title="Rename">&#9998;</b><b data-op="del" title="Delete">&times;</b></i></div>`).join('')
        || '<div class="insp-empty">No assets - click + to upload.</div>';
}
function addAsset(file) {
    if (!/^image\//.test(file.type)) return toast(file.name + ' is not an image', 'error');
    const r = new FileReader();
    r.onload = () => {
        let base = file.name.replace(/[^\w.() -]/g, '_'), n = base, i = 1;
        while (n in assets) n = base.replace(/(\.\w+)?$/, ' ' + (++i) + '$1');
        assets[n] = r.result; syncAssets(); commit(); scheduleAutosave(); toast('Added ' + n, 'ok');
    };
    r.readAsDataURL(file);
}
function setImgSrc(path, n) { const d = model(), el = elByPath(d.body, path); if (!el) return; el.setAttribute('src', 'assets/' + n); saveModel(d); changed(); }
function useAsset(n) { const el = selEl(); if (el && /^(IMG|AUDIO|VIDEO)$/.test(el.tagName)) setImgSrc(selPath, n); else toast('Select an image or audio element on the canvas first', 'warn'); }
function renAsset(old) {
    const n = askName('Rename asset', old); if (!n || n === old) return;
    if (n in assets) return toast('An asset with that name exists', 'error');
    const next = {}; Object.keys(assets).forEach(k => { next[k === old ? n : k] = assets[k]; }); assets = next;
    Object.keys(files).forEach(k => { files[k] = files[k].split('assets/' + old).join('assets/' + n); });
    syncAssets(); changed(); toast('Renamed to ' + n, 'ok');
}
function delAsset(n) {
    const used = Object.values(files).filter(t => t.includes('assets/' + n)).length;
    if (!confirm(used ? `"${n}" is used in ${used} file(s). Delete anyway?` : `Delete "${n}"?`)) return;
    delete assets[n]; syncAssets(); commit(); render(); toast('Deleted ' + n);
}

/* ---------- 15. Professional UX: toasts, undo state, autosave, splitters ---------- */
const toasts = document.createElement('div'); toasts.id = 'toasts'; document.body.appendChild(toasts);
function toast(msg, type = 'info') {
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; toasts.appendChild(t);
    while (toasts.children.length > 4) toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, 2600);
}
function showShortcuts() { return toast('Ctrl+Click multi-select | Drag to move | Ctrl+D duplicate | Ctrl+C / Ctrl+V | Delete | Ctrl+Z / Ctrl+Y | Ctrl+S save | Esc deselect', 'info'); }
const tbBtn = n => $$('.tb-btn').find(b => b.textContent.trim() === n), btnUndo = tbBtn('Undo'), btnRedo = tbBtn('Redo');
function syncUndoUI() { btnUndo.classList.toggle('disabled', !undoStack.length); btnRedo.classList.toggle('disabled', !redoStack.length); }
const stSave = $('#st-save'); let saveTimer;
function scheduleAutosave() { stSave.textContent = 'Saving\u2026'; stSave.classList.add('busy'); clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 1200); }
function autosave() {
    clearTimeout(saveTimer);
    try { localStorage.setItem('xos-project', project()); stSave.textContent = 'Autosaved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + (fileHandle ? ' - Ctrl+S saves ' + fileHandle.name : ''); }
    catch (e) { stSave.textContent = 'Save failed'; }
    stSave.classList.remove('busy');
}
function goHome() { autosave(); location.href = 'home.html'; }
function layersHover() {                               // hover a layer -> highlight it on the canvas
    const l = $('#layers-list'), clear = () => { const d = fdoc(); d && $$('.xos-hov', d).forEach(x => x.classList.remove('xos-hov')); };
    l.addEventListener('mouseover', e => {
        const r = e.target.closest('[data-p]'), d = fdoc(); if (!d || !d.body) return; clear();
        if (r && r.dataset.p) { const el = elByPath(d.body, r.dataset.p.split(',').map(Number)); el && el.classList.add('xos-hov'); }
    });
    l.addEventListener('mouseleave', clear);
}
function bindMisc() {
    $('.title-left').style.cursor = 'pointer'; $('.title-left').title = 'Home'; $('.title-left').addEventListener('click', goHome);
    $('.explorer-panel .panel-header svg').addEventListener('click', e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); treeMenu(r.left, r.bottom + 2, 'root', ''); });
    window.addEventListener('beforeunload', autosave);
}
function initSplitters() {                             // draggable, clamped, remembered
    const wb = $('.workbench'), ex = $('.explorer-panel'), pr = $('.props-panel'), bp = $('.bottom-panel'), ide = $('.ide-container');
    let L = {}; try { L = JSON.parse(localStorage.getItem('xos-layout')) || {}; } catch (e) { /* defaults */ }
    if (L.ex) ex.style.width = L.ex + 'px'; if (L.pr) pr.style.width = L.pr + 'px'; if (L.bp) bp.style.height = L.bp + 'px';
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const mk = (cls, ref, where, fn) => {
        const s = document.createElement('div'); s.className = 'splitter ' + cls; ref[where](s);
        s.addEventListener('mousedown', e => {
            e.preventDefault(); s.classList.add('active'); document.body.classList.add('resizing'); let raf = 0;
            const mv = ev => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; fn(ev); }); };
            const up = () => {
                document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
                s.classList.remove('active'); document.body.classList.remove('resizing');
                try { localStorage.setItem('xos-layout', JSON.stringify({ ex: ex.offsetWidth, pr: pr.offsetWidth, bp: bp.offsetHeight })); } catch (x) { /* ignore */ }
            };
            document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
        });
    };
    mk('v', ex, 'after', ev => { ex.style.width = clamp(ev.clientX - wb.getBoundingClientRect().left, 170, Math.max(170, Math.min(480, wb.clientWidth - pr.offsetWidth - 260))) + 'px'; });
    mk('v', pr, 'before', ev => { pr.style.width = clamp(wb.getBoundingClientRect().right - ev.clientX, 210, Math.max(210, Math.min(520, wb.clientWidth - ex.offsetWidth - 260))) + 'px'; });
    mk('h', bp, 'before', ev => { bp.style.height = clamp(ide.getBoundingClientRect().bottom - ev.clientY - 22, 60, Math.round(innerHeight * .6)) + 'px'; });
}

/* ---------- 16. Advanced: modals, pages, actions, custom JS, library, site settings, windows / help ---------- */
let freeMove = false, pendingNew = null;
const isHtmlF = p => /\.html?$/i.test(p);
function openModal(title, bodyEl, actions, wide) {
    const ov = document.createElement('div'), box = document.createElement('div'), head = document.createElement('div'), foot = document.createElement('div');
    ov.className = 'xmodal-overlay'; box.className = 'xmodal' + (wide ? ' wide' : ''); head.className = 'xmodal-head'; foot.className = 'xmodal-foot';
    head.innerHTML = '<span></span><b title="Close">&times;</b>'; head.firstChild.textContent = title;
    const onEsc = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    const close = () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 180); document.removeEventListener('keydown', onEsc, true); };
    head.lastChild.onclick = close; ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    (actions || []).forEach(([label, fn, primary]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'add-btn' + (primary ? ' solid' : ''); b.textContent = label; b.onclick = () => { if (fn() !== false) close(); }; foot.appendChild(b); });
    box.append(head, bodyEl, foot); ov.appendChild(box); document.body.appendChild(ov); document.addEventListener('keydown', onEsc, true);
    return close;
}
function codeModal(title, value, onSave) {            // advanced editor: line numbers, Tab indent, Ctrl+Enter saves
    const wrap = document.createElement('div'); wrap.className = 'cm-wrap';
    wrap.innerHTML = '<pre class="cm-gutter"></pre><textarea class="cm-text" spellcheck="false" wrap="off"></textarea>';
    const g = wrap.firstChild, t = wrap.lastChild; t.value = value;
    const paint = () => { g.textContent = Array.from({ length: t.value.split('\n').length }, (_, i) => i + 1).join('\n'); g.scrollTop = t.scrollTop; };
    t.addEventListener('input', paint); t.addEventListener('scroll', () => { g.scrollTop = t.scrollTop; });
    t.addEventListener('keydown', e => {
        if (e.key === 'Tab') { e.preventDefault(); t.setRangeText('    ', t.selectionStart, t.selectionEnd, 'end'); paint(); }
        else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (onSave(t.value) !== false) wrap.closest('.xmodal-overlay').querySelector('.xmodal-head b').click(); }
    });
    openModal(title, wrap, [['Cancel', () => {}], ['Save (Ctrl+Enter)', () => onSave(t.value), true]], true);
    paint(); setTimeout(() => t.focus(), 60);
}
/* --- custom JS per element (stored in the project's script file) --- */
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockRe = id => new RegExp('/\\* <xos-custom id="' + rx(id) + '"> \\*/[^]*?/\\* </xos-custom> \\*/\\n?');
const codeRe = id => new RegExp('/\\* <xos-custom id="' + rx(id) + '"> \\*/[^]*?/\\* code \\*/\\n([^]*?)\\n/\\* /code \\*/');
function openCustomJs() {
    const sel = selEl(); if (!sel || sel === fdoc().body) return toast('Select an element first', 'warn');
    const d = model(), m = elByPath(d.body, selPath); if (!m.id) { m.id = 'el-' + Math.random().toString(36).slice(2, 7); saveModel(d); }
    const id = m.id, cur = (files[JS].match(codeRe(id)) || [])[1] || '// "el" is the selected element, e.g.\n// el.addEventListener(\'click\', function () { alert(\'Hello!\'); });\n';
    codeModal('Custom JS for #' + id + '  (variable: el)', cur, code => {
        try { new Function('el', code); } catch (e) { toast('Syntax error: ' + e.message, 'error'); return false; }
        let js = files[JS].replace(blockRe(id), '');
        if (code.trim()) js = js.replace(/\s*$/, '\n\n') + `/* <xos-custom id="${id}"> */\ndocument.addEventListener('DOMContentLoaded', function () {\nvar el = document.getElementById('${id}');\n/* code */\n${code}\n/* /code */\n});\n/* </xos-custom> */\n`;
        files[JS] = js; changed(); toast('Custom JS saved', 'ok');
    });
}
$$('.add-btn')[2].addEventListener('click', openCustomJs);
/* --- button / link actions: URL, another page, HTML file --- */
function buildActionBox() {
    const b = document.createElement('div'); b.className = 'prop-group'; b.id = 'action-box'; b.style.display = 'none';
    b.innerHTML = '<div class="prop-title">Action (Button / Link)</div><div class="prop-row"><span class="prop-label">Opens</span><select class="prop-select" id="act-kind"><option value="none">Nothing</option><option value="url">Link (URL)</option><option value="page">Another page</option><option value="file">HTML file</option></select></div><div class="prop-row"><span class="prop-label">Target</span><input class="prop-input" id="act-to" list="act-list" autocomplete="off"></div><datalist id="act-list"></datalist>';
    $('#inspector-body').before(b);
    let t; const go = () => applyAction($('#act-kind').value, $('#act-to').value.trim());
    $('#act-kind').addEventListener('change', () => { fillActList(); go(); });
    $('#act-to').addEventListener('input', () => { clearTimeout(t); t = setTimeout(go, 250); });
}
function fillActList() {
    const k = $('#act-kind').value, pages = Object.keys(files).filter(isHtmlF);
    $('#act-list').innerHTML = k === 'url' ? '' : pages.map(p => `<option value="${p}">`).join('');
    $('#act-to').placeholder = k === 'url' ? 'https://example.com' : k === 'none' ? '' : 'about.html';
    $('#act-to').disabled = k === 'none';
}
function fillAction() {
    const box = $('#action-box'), el = selEl(); if (!box) return;
    const on = !!el && /^(BUTTON|A)$/.test(el.tagName); box.style.display = on ? '' : 'none';
    if (!on || box.contains(document.activeElement)) return;
    $('#act-kind').value = el.getAttribute('data-act') || 'none'; $('#act-to').value = el.getAttribute('data-to') || ''; fillActList();
}
function applyAction(act, to) {
    if (act !== 'none' && !to) return;                  // wait until a target is typed (keeps the chosen kind)
    const d = model();
    if (act === 'url' && to && !/^(https?:|mailto:|tel:|\/|#)/i.test(to)) to = 'https://' + to;
    allPaths().forEach(p => {
        const el = elByPath(d.body, p); if (!el || !/^(BUTTON|A)$/.test(el.tagName)) return;
        ['data-act', 'data-to'].forEach(a => el.removeAttribute(a));
        if (act === 'none' || !to) { el.removeAttribute('onclick'); if (el.tagName === 'A') ['href', 'target', 'rel'].forEach(a => el.removeAttribute(a)); return; }
        el.setAttribute('data-act', act); el.setAttribute('data-to', to);
        const q = to.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        if (el.tagName === 'A') { el.setAttribute('href', to); if (act === 'page') el.removeAttribute('target'); else { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); } }
        else el.setAttribute('onclick', act === 'page' ? `location.href='${q}'` : `window.open('${q}','_blank','noopener')`);
    });
    saveModel(d); commit(); loadQuiet();
}
const loadQuiet = () => { treeKey = ''; render(); };   // action attributes have no visual change -> normal reload keeps things simple
/* --- pages --- */
function paintPages() {
    const bar = $('#page-bar'), pages = Object.keys(files).filter(isHtmlF).sort((a, b) => a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b));
    const key = pages.join('|') + '#' + HTML; if (bar.dataset.k === key) return; bar.dataset.k = key;
    bar.innerHTML = pages.map(p => `<span class="page-tab${p === HTML ? ' active' : ''}" data-p="${p}" title="${p}">${esc(p.split('/').pop())}</span>`).join('') + '<span class="page-add" title="Add page">+</span>';
}
function bindPages() {
    const bar = $('#page-bar');
    bar.addEventListener('click', e => { if (e.target.classList.contains('page-add')) newPage(); else if (e.target.dataset.p) openFile(e.target.dataset.p); });
    bar.addEventListener('contextmenu', e => { const p = e.target.dataset.p; if (!p) return; e.preventDefault(); ctx(e.clientX, e.clientY, [['Open', () => openFile(p)], ['Rename', () => renameEntry(p)], ['Duplicate', () => dupEntry(p)], ['Delete', () => deleteEntry(p)]]); });
    $('#site-chip').addEventListener('click', openSite);
    const mv = $('#move-mode'); mv.addEventListener('click', () => { freeMove = !freeMove; mv.textContent = 'Move: ' + (freeMove ? 'Free' : 'Flow'); mv.classList.toggle('on', freeMove); toast(freeMove ? 'Free move: drag sets left/top (Alt toggles per drag)' : 'Flow move: drag re-orders / nests elements'); });
}
function newPage() {
    const n = askName('Page name', 'about'); if (!n) return;
    const p = /\.html?$/i.test(n) ? n : n + '.html', title = p.replace(/\.html?$/i, '').replace(/^./, c => c.toUpperCase());
    if (p in files) return toast('That page already exists', 'error');
    files[p] = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${title}</title>\n<link rel="stylesheet" href="${CSS}">\n</head>\n<body>\n<main class="page-main"><h1 class="page-title">${title}</h1><p class="page-text">Start designing this page.</p></main>\n<script src="${JS}"><\/script>\n</body>\n</html>`;
    [['page-main', 'padding:64px 32px', 'text-align:center'], ['page-title', 'font-size:32px', 'margin:0 0 12px'], ['page-text', 'color:#B8C0CC']].forEach(([c, ...ds]) => { if (!ruleRe(c).test(files[CSS])) ds.forEach(x => setCss(c, ...x.split(':'))); });
    commit(); treeKey = ''; openFile(p); toast('Page added: ' + p + ' - link to it with a Button or Link (Action panel)', 'ok');
}
/* --- date / time (live) --- */
const LIVE = '/* <xos-live> */\n(function () {\n  function tick() { var n = new Date();\n    document.querySelectorAll("[data-xos=date]").forEach(function (e) { e.textContent = n.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }); });\n    document.querySelectorAll("[data-xos=time]").forEach(function (e) { e.textContent = n.toLocaleTimeString(); }); }\n  tick(); setInterval(tick, 1000);\n})();\n/* </xos-live> */\n';
function ensureLive() { if (!files[JS].includes('<xos-live>')) files[JS] = files[JS].replace(/\s*$/, '\n\n') + LIVE; }
/* --- animations (keyframes live in the stylesheet) --- */
const KF = { fadeIn: 'from{opacity:0}to{opacity:1}', slideUp: 'from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}', zoomIn: 'from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}',
    bounce: '0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}', pulse: '0%,100%{transform:scale(1)}50%{transform:scale(1.06)}', spin: 'to{transform:rotate(360deg)}' };
function ensureKeyframes(v) { const m = /^xos-(\w+)/.exec(v); if (m && KF[m[1]] && !files[CSS].includes('@keyframes xos-' + m[1])) files[CSS] = files[CSS].replace(/\s*$/, '\n\n') + `@keyframes xos-${m[1]} { ${KF[m[1]]} }\n`; }
function animateNew() {
    if (!pendingNew) return; const d = fdoc(), el = d && elByPath(d.body, pendingNew); pendingNew = null;
    if (el) { el.classList.add('xos-new'); setTimeout(() => el.classList.remove('xos-new'), 700); }
}
/* --- free move + rotate --- */
function freeMoveTo(s, e) {
    if (!s.fm) { const cs = fdoc().defaultView.getComputedStyle(s.el); s.fm = { css: s.el.style.cssText, pos: cs.position, l: parseFloat(cs.left) || 0, t: parseFloat(cs.top) || 0 }; }
    s.fm.nl = s.fm.l + (e.clientX - s.x); s.fm.nt = s.fm.t + (e.clientY - s.y);
    s.el.style.position = s.fm.pos === 'static' ? 'relative' : s.fm.pos; s.el.style.left = s.fm.nl + 'px'; s.el.style.top = s.fm.nt + 'px';
}
function startRotate(e, el) {
    const b = selBox.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2, cls = [...el.classList].find(c => !c.startsWith('xos-'));
    const base = ((cls && getCss(cls, 'transform')) || '').replace(/rotate\([^)]*\)/g, '').trim(); let deg = 0, moved = false;
    document.body.classList.add('resizing');
    const mv = ev => {
        moved = true; deg = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90; if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
        deg = Math.round(deg); el.style.transform = (base + ' rotate(' + deg + 'deg)').trim();
    };
    const up = () => {
        document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); document.body.classList.remove('resizing');
        el.style.transform = ''; if (moved) applyProps({ transform: (base + ' rotate(' + deg + 'deg)').trim() });
    };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
}
/* --- one document for Run Preview / standalone: every page inside, links switch between them --- */
const NAV = '(function(){document.addEventListener("click",function(e){var a=e.target.closest("a[href],[data-to]");if(!a)return;var t=(a.getAttribute("data-to")||a.getAttribute("href")||"").split("#")[0];var p=window.__P&&window.__P[t];if(!p)return;e.preventDefault();e.stopImmediatePropagation();document.open();document.write(p);document.close();},true);})();';
function bundle(entry) {
    const pg = Object.keys(files).filter(isHtmlF);
    if (pg.length < 2) return buildDoc(false, entry);
    const docs = {}; pg.forEach(p => { docs[p] = buildDoc(false, p).replace('</head>', () => '<script>' + NAV + '<\/script></head>'); });
    return docs[entry].replace('</head>', () => '<script>window.__P=' + JSON.stringify(docs).replace(/</g, '\\u003c') + ';<\/script></head>');
}
/* --- site name + tab icon --- */
function paintSite() {
    const h = files[HTML] || '', t = (h.match(/<title>([^<]*)<\/title>/i) || [])[1] || 'Untitled', m = h.match(/<link[^>]*rel="[^"]*icon[^"]*"[^>]*>/i);
    const href = m && (m[0].match(/href="([^"]+)"/i) || [])[1], src = href && (assets[href.replace(/^assets\//, '')] || (/^(https?:|data:)/.test(href) ? href : ''));
    $('#site-name').textContent = t; const im = $('#site-fav'); if (src) { im.src = src; im.style.display = ''; } else im.style.display = 'none';
}
function openSite() {
    const h = files[HTML], title = (h.match(/<title>([^<]*)<\/title>/i) || [])[1] || '', m = h.match(/<link[^>]*rel="[^"]*icon[^"]*"[^>]*href="([^"]+)"/i);
    let fav = m ? m[1].replace(/^assets\//, '') : '';
    const body = document.createElement('div'); body.className = 'site-form';
    body.innerHTML = '<label>Website name (browser tab title)</label><input class="prop-input" id="site-title"><label>Tab icon</label><div class="site-ic"><div class="tab-mock"><img id="tm-ic" alt=""><span id="tm-t"></span></div><select class="prop-select" id="site-pick"></select><button class="add-btn" type="button" id="site-up">Upload image&hellip;</button></div>';
    const T = $('#site-title', body), P = $('#site-pick', body), paint = () => {
        P.innerHTML = '<option value="">No icon</option>' + Object.keys(assets).filter(n => /^data:image/.test(assets[n])).map(n => `<option${n === fav ? ' selected' : ''}>${esc(n)}</option>`).join('');
        const im = $('#tm-ic', body), ok = fav && assets[fav]; im.style.display = ok ? '' : 'none'; if (ok) im.src = assets[fav]; $('#tm-t', body).textContent = T.value || 'Untitled';
    };
    T.value = title; T.oninput = paint; P.onchange = () => { fav = P.value; paint(); };
    $('#site-up', body).onclick = () => {
        const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
        i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { fav = 'favicon-' + f.name.replace(/[^\w.() -]/g, '_'); assets[fav] = r.result; syncAssets(); paint(); }; r.readAsDataURL(f); };
        i.click();
    };
    openModal('Website name & tab icon', body, [['Cancel', () => {}], ['Apply', () => { applySite(T.value.trim(), fav); }, true]]); paint(); setTimeout(() => T.focus(), 60);
}
function applySite(name, fav) {                        // title for this page, icon for every page
    Object.keys(files).filter(isHtmlF).forEach(p => {
        const d = parse(files[p]); if (p === HTML && name) d.title = name;
        $$('link[rel~=icon]', d).forEach(l => l.remove());
        if (fav) { const l = d.createElement('link'); l.setAttribute('rel', 'icon'); l.setAttribute('href', 'assets/' + fav); d.head.appendChild(l); }
        files[p] = '<!DOCTYPE html>\n' + d.documentElement.outerHTML;
    });
    changed(); toast('Website name / icon updated', 'ok');
}
/* --- asset library (pre-made images, icons, audio, backgrounds) --- */
let _lib = null;
function libItems() {
    if (_lib) return _lib;
    const svg = (w, h, b) => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${b}</svg>`)));
    const g = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
    const ic = d => svg(64, 64, `<g fill="none" stroke="#5781FF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${d}</g>`);
    const wav = (notes, dur) => {
        const sr = 22050, n = Math.floor(sr * dur), v = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
        w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
        for (let i = 0; i < n; i++) { const t = i / sr, env = Math.exp(-4 * t / dur); let x = 0; notes.forEach(f => { x += Math.sin(2 * Math.PI * f * t); }); v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x / notes.length * env)) * 20000, true); }
        return dataUrl(new Uint8Array(v.buffer), 'x.wav');
    };
    _lib = [
        { cat: 'Images', name: 'hero-gradient.svg', url: svg(1280, 400, g('a', '#5781FF', '#B24FE0') + '<rect width="1280" height="400" fill="url(#a)"/>') },
        { cat: 'Images', name: 'landscape.svg', url: svg(800, 500, g('b', '#2F80ED', '#12A594') + '<rect width="800" height="500" fill="url(#b)"/><circle cx="620" cy="130" r="50" fill="#F5A524"/><path d="M0 500V340l180-110 170 120 150-90 300 140v100z" fill="#101317" opacity=".55"/>') },
        { cat: 'Images', name: 'avatar.svg', url: svg(200, 200, '<rect width="200" height="200" fill="#1E242D"/><circle cx="100" cy="78" r="36" fill="#5781FF"/><path d="M30 200c0-44 30-70 70-70s70 26 70 70z" fill="#5781FF"/>') },
        { cat: 'Images', name: 'dots-pattern.svg', url: svg(400, 400, '<rect width="400" height="400" fill="#171C23"/>' + Array.from({ length: 100 }, (_, i) => `<circle cx="${20 + (i % 10) * 40}" cy="${20 + Math.floor(i / 10) * 40}" r="4" fill="#5781FF"/>`).join('')) },
        { cat: 'Images', name: 'logo-mark.svg', url: svg(160, 160, g('c', '#5781FF', '#7C5CFF') + '<rect width="160" height="160" rx="32" fill="url(#c)"/><path d="M52 52l56 56M108 52l-56 56" stroke="#fff" stroke-width="14" stroke-linecap="round"/>') },
        { cat: 'Icons', name: 'icon-star.svg', url: ic('<path d="M32 6l7 17 18 2-14 12 5 18-16-10-16 10 5-18L7 25l18-2z"/>') },
        { cat: 'Icons', name: 'icon-heart.svg', url: ic('<path d="M32 56S6 40 6 22a13 13 0 0 1 26-4 13 13 0 0 1 26 4c0 18-26 34-26 34z"/>') },
        { cat: 'Icons', name: 'icon-check.svg', url: ic('<path d="M10 34l14 14 30-32"/>') },
        { cat: 'Icons', name: 'icon-arrow.svg', url: ic('<path d="M8 32h46M36 14l18 18-18 18"/>') },
        { cat: 'Icons', name: 'icon-mail.svg', url: ic('<rect x="6" y="12" width="52" height="40" rx="5"/><path d="M8 16l24 20 24-20"/>') },
        { cat: 'Audio', name: 'chime.wav', url: wav([880, 1320], 1.2) }, { cat: 'Audio', name: 'beep.wav', url: wav([440], .5) },
        { cat: 'Audio', name: 'alert.wav', url: wav([660, 880], .8) }, { cat: 'Audio', name: 'bass.wav', url: wav([110], 1) },
        { cat: 'Backgrounds', name: 'Cobalt glow', css: 'linear-gradient(135deg,#1F5CE0,#7C5CFF)' }, { cat: 'Backgrounds', name: 'Sunset', css: 'linear-gradient(135deg,#F5A524,#E5484D)' },
        { cat: 'Backgrounds', name: 'Ocean', css: 'linear-gradient(135deg,#2F80ED,#12A594)' }, { cat: 'Backgrounds', name: 'Night', css: 'linear-gradient(180deg,#101317,#334155)' }];
    return _lib;
}
function openAssetLibrary() {
    const items = libItems(), cats = ['Images', 'Icons', 'Audio', 'Backgrounds'], body = document.createElement('div'); body.className = 'lib'; let cat = 'Images';
    body.innerHTML = '<div class="lib-tabs">' + cats.map((c, i) => `<span class="lib-tab${i ? '' : ' active'}" data-c="${c}">${c}</span>`).join('') + '</div><div class="lib-grid"></div>';
    const grid = $('.lib-grid', body), paint = () => {
        grid.innerHTML = items.filter(i => i.cat === cat).map(it => `<div class="lib-item" data-n="${esc(it.name)}" title="Click to add"><div class="lib-prev">${it.cat === 'Audio' ? '&#9835;' : it.cat === 'Backgrounds' ? `<i style="background:${it.css}"></i>` : `<img src="${it.url}" alt="">`}</div><span>${esc(it.name)}</span></div>`).join('');
    };
    body.addEventListener('click', e => {
        const tb = e.target.closest('.lib-tab'); if (tb) { cat = tb.dataset.c; $$('.lib-tab', body).forEach(x => x.classList.toggle('active', x === tb)); return paint(); }
        const it = e.target.closest('.lib-item'); if (it) addLib(items.find(x => x.name === it.dataset.n));
    });
    paint(); openModal('Asset library \u2014 click an item to add it', body, [['Close', () => {}]], true);
}
function addLib(it) {
    if (it.cat === 'Backgrounds') { if (!selEl()) return toast('Select an element first', 'warn'); applyProps({ 'background-image': it.css }); return toast('Background applied', 'ok'); }
    if (!(it.name in assets)) { assets[it.name] = it.url; syncAssets(); }
    insertComp(it.cat === 'Audio' ? 'audio' : 'image', selEl(), 'assets/' + it.name); toast('Added ' + it.name, 'ok');
}
/* --- new components --- */
Object.assign(COMP, {
    link: { name: 'Link', tag: 'a', text: 'Link', attrs: { href: '#' }, css: ['color:#5781FF', 'text-decoration:underline', 'margin:12px 24px', 'display:inline-block', 'transition:opacity .2s'] },
    date: { name: 'Date', tag: 'span', text: new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), attrs: { 'data-xos': 'date' }, live: true, css: ['display:inline-block', 'margin:12px 24px', 'color:#B8C0CC', 'font-size:14px'] },
    time: { name: 'Time', tag: 'span', text: new Date().toLocaleTimeString(), attrs: { 'data-xos': 'time' }, live: true, css: ['display:inline-block', 'margin:12px 24px', 'color:#ffffff', 'font-size:22px', 'font-weight:600'] },
    social: { name: 'Social Links', tag: 'div', html: ['Facebook|https://facebook.com', 'X|https://x.com', 'Instagram|https://instagram.com', 'YouTube|https://youtube.com', 'LinkedIn|https://linkedin.com'].map(x => `<a class="{c}-link" href="${x.split('|')[1]}" target="_blank" rel="noopener">${x.split('|')[0]}</a>`).join(''),
        css: ['display:flex', 'gap:10px', 'justify-content:center', 'flex-wrap:wrap', 'margin:16px'],
        sub: { link: ['padding:6px 14px', 'border-radius:999px', 'background-color:#1E242D', 'color:#B8C0CC', 'text-decoration:none', 'font-size:12px', 'transition:background-color .2s,color .2s'] } },
    audio: { name: 'Audio', tag: 'audio', attrs: { controls: '' }, css: ['display:block', 'margin:12px 24px'] },
    assets: { name: 'Assets', tag: 'div', css: [] }
});
MENUS.Insert = Object.keys(COMP).map(k => [COMP[k].name, () => insertComp(k, selEl())]);   // include the new components
/* --- Windows / Help menus --- */
function togglePanel(sel) {
    const el = $(sel), hide = el.classList.toggle('hidden-panel'), sp = sel === '.explorer-panel' ? el.nextElementSibling : el.previousElementSibling;
    if (sp && sp.classList.contains('splitter')) sp.classList.toggle('hidden-panel', hide); setTimeout(fit, 30);
}
function showBottom(i) { $('.bottom-panel').classList.remove('hidden-panel'); const sp = $('.bottom-panel').previousElementSibling; sp && sp.classList.remove('hidden-panel'); bTab = i; paintBottom(); }
function resetLayout() {
    ['.explorer-panel', '.props-panel', '.bottom-panel'].forEach(s => { const e = $(s); e.style.width = e.style.height = ''; e.classList.remove('hidden-panel'); });
    $$('.splitter').forEach(x => x.classList.remove('hidden-panel')); try { localStorage.removeItem('xos-layout'); } catch (e) { /* ignore */ }
    setTimeout(fit, 30); toast('Layout reset', 'ok');
}
function aboutModal() {
    const b = document.createElement('div'); b.className = 'site-form';
    b.innerHTML = '<p><b>XOS-Web-Studio &mdash; Designer Mode</b></p><p>Drag components onto the canvas, click to select (Ctrl+Click for several), drag to move, use the handles to resize and the round handle to rotate.</p><p>Right-click files in the explorer, add pages with the + in the page bar, give buttons and links an Action in the Inspector, and use <i>+ Add Custom JS Code (Advanced)</i> for scripts.</p><p>Save (Ctrl+S) overwrites your .xosw file; Save As chooses a new place.</p>';
    openModal('Getting started', b, [['Close', () => {}]]);
}
/* --- explorer extras: double-click, F2 / Delete --- */
function bindExplorerExtras() {
    const t = $('.file-tree'); t.tabIndex = 0;
    t.addEventListener('dblclick', e => {
        const r = e.target.closest('.tree-item'); if (!r || r.dataset.t !== 'file') return; const p = r.dataset.p;
        if (isHtmlF(p)) openFile(p); else if (/\.(css|js)$/i.test(p)) codeModal(p, files[p], v => { files[p] = v; touched(); toast('Saved ' + p, 'ok'); });
    });
    t.addEventListener('keydown', e => {
        if (e.key !== 'F2' && e.key !== 'Delete') return; e.stopPropagation();
        if (!(current in files)) return; if (e.key === 'F2') renameEntry(current); else deleteEntry(current);
    });
}

/* ---------- 11. Init ---------- */
(function init() {
    newProject(); loadAccent();
    try { const s = localStorage.getItem('xos-project'); if (s) { const p = JSON.parse(s); files = { ...DEFAULTS, ...p.files }; assets = p.assets || assets; lastSnap = snap(); } } catch (e) { /* ignore */ }
    if (new URLSearchParams(location.search).get('new')) { newProject(); history.replaceState(null, '', location.pathname); }   // coming from home.html
    buildComponentsPanel(); buildLayersPanel(); buildAssetsPanel(); bindTree(); layersHover(); initSplitters(); bindMisc(); buildActionBox(); bindExplorerExtras(); bindPages();
    setDevice('desktop'); openFile(HTML); syncUndoUI(); render();
    log('info', 'XOS-Web-Studio ready');
})();
