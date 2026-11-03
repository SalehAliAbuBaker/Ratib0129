'use strict';
const fs=require('node:fs'),cp=require('node:child_process'),{nextVersion}=require('./trial-version-policy.cjs');
const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8'}).trim();
// Earlier trial app/worker versions were ahead of package.json; use the agreed
// previous runtime release when both sources match, otherwise use package.json.
const previousPackage=JSON.parse(git('show','HEAD^:package.json')).version;
const previousHtml=git('show','HEAD^:index.html').match(/const RATIB_RELEASE=\{"version":"([^"]+)"/)?.[1];
const previousSw=git('show','HEAD^:sw.js').match(/const APP_RELEASE=\{"version":"([^"]+)"/)?.[1];
const previous=(previousHtml&&previousHtml===previousSw)?previousHtml:previousPackage;
const current=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const changed=git('diff','--name-only','HEAD^','HEAD').split(/\r?\n/).filter(Boolean);
const runtime=changed.filter(p=>['index.html','trial/index.html','sw.js','package.json','check-trial-version.html'].includes(p)||/^(?:trial\/)?ratib-[^/]+\.(?:js|css)$/.test(p));
if(runtime.length||current!==previous){
 const expected=nextVersion(previous);
 if(current!==expected){console.error('Trial update must increment its release. Previous:',previous,'Next required:',expected,'Actual:',current,'Changed:',runtime);process.exit(1);}
 console.log('PASS trial version',previous,'→',current);
}else console.log('PASS test/document-only commit; release stays',current);