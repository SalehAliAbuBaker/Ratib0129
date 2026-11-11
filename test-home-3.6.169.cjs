'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),src=fs.readFileSync('ratib-home-3.6.169.js','utf8'),css=fs.readFileSync('ratib-home-3.6.169.css','utf8'),fold=fs.readFileSync('ratib-trial-home-sidebar-3.6.143.js','utf8'),head=fs.readFileSync('ratib-home-3.6.167.js','utf8');
new vm.Script(src);assert.equal(require('./package.json').version,'3.6.178');
assert(html.includes('"version":"3.6.178","build":"p17800"'));assert(sw.includes('"version":"3.6.178","build":"p17800"'));
for(const file of ['ratib-home-3.6.169.js','ratib-home-3.6.169.css']){assert(html.includes(file+'?v=3.6.178'));assert(sw.includes(file));}
assert(fold.includes('setFold(true, false);'),'Dashboard must start folded regardless of last saved state');
assert(fold.includes('toggle.addEventListener('),'Dashboard manual reopening must remain active');
assert(head.includes('ar-SA-u-ca-islamic-umalqura-nu-latn')&&head.includes('ar-YE-u-ca-gregory-nu-latn'),'Header dates must use Latin digits');
assert(src.includes("migrateAppearance")&&src.includes("ratibPaletteSettingsCard"),'Appearance must live in established settings card');
assert(css.includes('header.ratib-home-app-header .header-tools{display:none!important}'),'No top icon/gap');
assert(css.includes('.ratib-date-gregorian{font-size:.71rem!important;'),'Gregorian date slightly larger');
assert(html.includes("toLocaleString('ar-EG-u-nu-latn')"),'Local backup timestamps must have Latin digits');
assert(fs.readFileSync('ratib-import-manager.js','utf8').includes("toLocaleDateString('ar-u-nu-latn')"));
const dom=new JSDOM('<div id="pageSettings"><section id="ratibPaletteSettingsCard"><div class="ratib-palette-settings"><div class="ratib-palette-choices">ألوان راتب</div></div></section></div><button id="themeBtn">🎨</button><div id="ratibAppearanceMenu" hidden><button data-ratib-mode="light">فاتح</button><button data-ratib-mode="dark">ليلي</button></div><span id="ratibHomeHijri"></span><span id="ratibHomeGregorian"></span>',{url:'https://ratib.test',runScripts:'outside-only',pretendToBeVisual:true});
dom.window.eval(src);dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
const d=dom.window.document;assert(d.getElementById('themeBtn').hidden,'No header appearance icon');
assert.equal(d.getElementById('ratibAppearanceMenu').parentElement.className,'ratib-palette-settings');
assert(!d.getElementById('ratibAppearanceMenu').hidden,'Appearance controls available in options');
for(const id of ['ratibHomeHijri','ratibHomeGregorian']){const v=d.getElementById(id).textContent;assert(v&&/\d/.test(v),id);assert(!/[٠-٩۰-۹]/.test(v),'Arabic digit found in '+id);}
dom.window.close();console.log('PASS Ratib 3.6.170 collapsed dashboard, inline theme and Latin date digits');
