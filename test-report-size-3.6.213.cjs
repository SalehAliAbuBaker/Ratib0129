'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<html><head></head><body><div id="mainWrap"><div id="dashboardHomeContent"><div class="main-menu-grid ratib-home-main-grid"><button class="main-menu-btn"><span class="main-menu-icon"><svg></svg></span><span>الرئيسية</span></button></div></div><div id="pageReports"><div id="ratibReportMenu" class="ratib-report-menu"><div class="acc-accordion-header main-menu-btn ratib-report-tile"><span class="main-menu-icon ratib-report-icon"><svg></svg></span><span class="ratib-report-label">ميزان المراجعة</span></div></div></div></div></body></html>');
const w=dom.window,d=w.document;
d.head.appendChild(d.createElement('style')).textContent='.acc-accordion-header{display:flex;flex-wrap:wrap;flex-direction:row}.acc-accordion-header>span:first-child{flex:1 1 170px}';
// Include the heading typography that previously overrode the smaller tile label.
for(const name of ['ratib-interface-font-3.6.148.css','ratib-home-uniform-3.6.196.css','ratib-report-menu-3.6.176.css']){
 const css=fs.readFileSync(name,'utf8');
 // jsdom does not parse cascade layers; the field-only layer is irrelevant here.
 d.head.appendChild(d.createElement('style')).textContent=css.replace(/@layer ratib-official-field-type\s*\{[\s\S]*?\n\}\n/,'');
}
const tile=w.getComputedStyle(d.querySelector('.ratib-report-tile'));
assert.equal(tile.flexFlow,'column nowrap');
assert.equal(w.getComputedStyle(d.querySelector('.ratib-report-label')).fontSize,w.getComputedStyle(d.querySelector('#dashboardHomeContent button>span:last-child')).fontSize);
const css=fs.readFileSync('ratib-report-menu-3.6.176.css','utf8');
assert.match(css,/#mainWrap #pageReports #ratibReportMenu > \.ratib-report-tile \.ratib-report-label\{[^}]*font:700 \.78rem/,'tile label must outrank the three-ID heading typography');
for(const [home,report,properties] of [['.main-menu-btn','#ratibReportMenu>.ratib-report-tile',['height','minHeight','maxHeight','padding','gap','borderRadius']],['.main-menu-icon','.ratib-report-icon',['width','height']],['.main-menu-icon svg','.ratib-report-icon svg',['width','height']]]){const a=w.getComputedStyle(d.querySelector(home)),b=w.getComputedStyle(d.querySelector(report));for(const property of properties)assert.equal(b[property],a[property],property);}
assert.equal(w.getComputedStyle(d.getElementById('ratibReportMenu')).gridTemplateColumns,w.getComputedStyle(d.querySelector('.ratib-home-main-grid')).gridTemplateColumns);
dom.window.close();console.log('PASS report buttons match home tile height, padding, spacing, corners, icon size and three-column grid');
