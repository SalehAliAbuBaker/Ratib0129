'use strict';
const assert=require('node:assert/strict'),{nextVersion}=require('./tools/trial-version-policy.cjs');
assert.equal(nextVersion('3.6.109.03'),'3.6.109.04');assert.equal(nextVersion('3.6.109.04'),'3.6.109.05');assert.equal(nextVersion('3.6.109.99'),'3.6.110.00');assert.throws(()=>nextVersion('3.6.109'));
console.log('PASS sequential trial version policy');