'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {additions,selectorAt,auditPatch}=require('./loveroll-ui-guard.cjs');
function patch(file,content){
 const lines=content.split('\n');
 return ['diff --git a/'+file+' b/'+file,'--- /dev/null','+++ b/'+file,'@@ -0,0 +1,'+lines.length+' @@',...lines.map(line=>'+'+line)].join('\n')+'\n';
}
test('blocks one-off mobile and desktop CTA colors',()=>{
 const f='couple-web/another-page.css';
 const s='@media(min-width:768px){\n.custom-cta {\nbackground:#af002a;\n}\n}';
 const issues=auditPatch(patch(f,s),()=>s);
 assert.equal(issues.length,1);assert.match(issues[0],/custom-cta/);
});
test('accepts approved token use in a control',()=>{
 const f='couple-web/another-page.css';
 const s='.custom-cta{background:var(--lr-control-glass);color:var(--lr-control-ink)}';
 assert.deepEqual(auditPatch(patch(f,s),()=>s),[]);
});
test('keeps decorations and official WebGL material out of control linting',()=>{
 const f='couple-web/dice-stages.css';
 const s='.love3d-stage{background:#880019;}\n.rose-petal{color:rgb(255,0,0)}';
 assert.deepEqual(auditPatch(patch(f,s),()=>s),[]);
});
test('permits literal approved themes but flags new legacy control override',()=>{
 const s='.lr-ruby-control{background:linear-gradient(#ad0000,#400000)}';
 assert.deepEqual(auditPatch(patch('couple-web/ruby-controls.css',s),()=>s),[]);
 assert.equal(auditPatch(patch('couple-web/new-overrides.css',s),()=>s).length,1);
});
test('detects line numbers and nested multiline selectors',()=>{
 const f='couple-web/new-overrides.css';
 const s='.unrelated{color:#fff}\n.custom-button,\n.other-cta{\n color:#f8e9ef;\n}';
 const diff=['diff --git a/'+f+' b/'+f,'--- a/'+f,'+++ b/'+f,'@@ -2,0 +2,4 @@','+.custom-button,','+.other-cta{','+ color:#f8e9ef;','+}'].join('\n');
 assert.deepEqual(additions(diff).map(x=>x.line),[2,3,4,5]);
 assert.match(selectorAt(s,4,3),/custom-button/);
 assert.equal(auditPatch(diff,()=>s).length,1);
});
test('prevents ad-hoc inline buttons with a documented exception path',()=>{
 const f='couple-web/new-ui.mjs';
 const s='<button style="background:#aa0055">Jouer</button>';
 assert.equal(auditPatch(patch(f,s)).length,1);
 assert.deepEqual(auditPatch(patch(f,s+' // lr-ui-allow: native platform controlled color')),[]);
});
