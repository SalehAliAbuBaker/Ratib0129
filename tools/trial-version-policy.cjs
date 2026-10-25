'use strict';
function parse(v){const m=String(v).match(/^(\d+)\.(\d+)\.(\d+)\.(\d{2})$/);if(!m)throw Error('Invalid four-part trial version: '+v);return m.slice(1).map(Number);}
function nextVersion(previous){const [a,b,c,d]=parse(previous);return d<99?[a,b,c,String(d+1).padStart(2,'0')].join('.'):[a,b,c+1,'00'].join('.');}
module.exports={parse,nextVersion};