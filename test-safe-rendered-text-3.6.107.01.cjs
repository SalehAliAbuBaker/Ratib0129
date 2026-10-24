'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');
const first = html.indexOf('function escapeRegExp(value)');
const escStart = html.indexOf('function esc(s)');
const last = html.indexOf('function tafqit(', escStart);
assert(first >= 0 && escStart > first && last > escStart, 'Rendering helpers not found');
const source = html.slice(first, html.indexOf('\n', first)) + '\n' + html.slice(escStart, last) + '\n({esc,highlightText})';
const { esc, highlightText } = vm.runInNewContext(source);
const original = 'حساب O\'Brien & Sons <Branch> "A&B"';
assert.equal(esc(original), 'حساب O&#39;Brien &amp; Sons &lt;Branch&gt; &quot;A&amp;B&quot;');
for (const query of ["'", '&', '<', '>', '"', "O'B", 'A&B', '<Branch>', 'حساب']) {
  const markup = highlightText(original, query);
  const document = new JSDOM('<!doctype html><div id="result"></div>').window.document;
  const node = document.getElementById('result');
  node.innerHTML = markup;
  assert.equal(node.textContent, original, 'No text may change on query ' + query);
  assert(node.querySelectorAll('span.highlight-match').length > 0, 'Matches missing: ' + query);
  assert.equal(node.querySelectorAll('script,img,svg,iframe').length, 0);
}
const payload = '<img src=x onerror=alert(1)> & سلام';
for (const query of ['img', '&', '<', 'onerror', 'سلام']) {
  const node = new JSDOM('<!doctype html><div id="result"></div>').window.document.getElementById('result');
  node.innerHTML = highlightText(payload, query);
  assert.equal(node.textContent, payload, 'HTML code must remain literal data');
  assert.equal(node.querySelectorAll('img,script,svg,iframe').length, 0, 'No injected DOM elements');
}
assert.equal(highlightText(original, 'غير موجود'), esc(original));
assert.equal(highlightText(original, ''), esc(original));
assert.equal(highlightText(null, null), '');
const sw = fs.readFileSync('sw.js','utf8');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.version, '3.6.107.01');
assert(html.includes('const RATIB_RELEASE={"version":"3.6.107.01"'));
assert(sw.includes('v202-trial-safe-text-3.6.107.01'));
assert(html.includes('ratib-statement-marks-3.6.106.05.js?v=3.6.107.01'));
assert(sw.includes('"./ratib-statement-marks-3.6.106.05.js"'));
for (const inline of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(Boolean)) new Function(inline);
new Function(sw);
console.log('PASS 3.6.107.01: apostrophes/entities, safe search highlighting, Unicode, no injected markup, preserved script assets');
