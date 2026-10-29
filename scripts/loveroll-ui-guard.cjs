#!/usr/bin/env node
'use strict';
// LR-AUDIT-GLOBAL: lint NEW design declarations in changed UI sources.
// Existing legacy CSS, game rendering, and the approved token definitions
// are left intact. Browser screenshots and human UX review remain required.
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');

const TOKEN_FILES=new Set([
 'couple-web/ruby-controls.css',
 'couple-web/ruby-surfaces.css',
 'couple-web/premium-theme.css',
 'couple-web/loveroll-ruby-buttons-v182.css'
]);
const CONTROL=/(?:^|[\s.#:[>+~,])(?:button|input|select|textarea|summary|dialog|[\w-]*(?:button|btn|cta|tab|action|switch|field|modal|dialog|nav|control)[\w-]*)(?:\b|[.#:[>+~,])/i;
const COLOR=/#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})\b|\b(?:rgba?|hsla?)\s*\(|\b(?:red|blue|green|yellow|pink|purple|orange|white|black)\b/i;
const DECL=/(?:^|[;{])\s*(background(?:-color|-image)?|color|border(?:-color)?|box-shadow|outline(?:-color)?|fill|stroke|text-shadow)\s*:\s*([^;}]*)/gi;
const ALLOWED=/lr-ui-allow:\s*[\w\s.,/-]{12,}/i;

function additions(diff){
 const found=[];let file='',line=0;
 for(const row of diff.split(/\r?\n/)){
  const change=row.match(/^diff --git a\/(.+) b\/(.+)$/);
  if(change){file=change[2];line=0;continue;}
  const hunk=row.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if(hunk){line=Number(hunk[1]);continue;}
  if(row.startsWith('+++')||row.startsWith('---')||row.startsWith('\\ No newline'))continue;
  if(row.startsWith('+')&&line){found.push({file,line,text:row.slice(1)});line++;continue;}
  if(row.startsWith(' ')&&line)line++;
 }
 return found;
}
function selectorAt(source,line,column=0){
 const lines=source.split(/\r?\n/);
 const prefix=lines.slice(0,line).map((s,i)=>i===line-1?s.slice(0,column):s).join('\n');
 let token='',comment=false,quote='',escape=false;const blocks=[];
 for(let i=0;i<prefix.length;i++){
  const c=prefix[i],next=prefix[i+1];
  if(comment){if(c==='*'&&next==='/'){comment=false;i++;}continue;}
  if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue;}
  if(c==='/'&&next==='*'){comment=true;i++;continue;}
  if(c==='"'||c==="'"){quote=c;continue;}
  if(c==='{'){blocks.push(token.trim());token='';continue;}
  if(c==='}'){blocks.pop();token='';continue;}
  if(c===';'){token='';continue;}
  token+=c;
 }
 return [...blocks].reverse().find(s=>s&&!s.startsWith('@'))||'';
}
function auditPatch(diff,read=path=>fs.readFileSync(path,'utf8')){
 const failures=[],cache=new Map();
 for(const {file,line,text} of additions(diff)){
  if(!file.startsWith('couple-web/'))continue;
  if(/\.(?:js|mjs|html)$/.test(file)){
   const inline=/<(?:button|input|select|textarea)\b[^>]*\bstyle\s*=.*?(?:background|color|border)\s*:/i.test(text);
   const assignment=/\.style\.(?:background|backgroundColor|color|border|borderColor|boxShadow)\s*=\s*['"]\s*(?:#|rgb|hsl)/i.test(text);
   if((inline||assignment)&&!ALLOWED.test(text))
    failures.push(file+':'+line+' — inline control color; use a shared component');
   continue;
  }
  if(!file.endsWith('.css')||TOKEN_FILES.has(file)||ALLOWED.test(text))continue;
  let source=cache.get(file);
  if(!source){try{source=read(file);}catch{continue;}cache.set(file,source);}
  for(const m of text.matchAll(DECL)){
   if(!COLOR.test(m[2]))continue;
   const selector=selectorAt(source,line,m.index+m[0].indexOf(m[1]));
   if(!CONTROL.test(selector)||/\b(?:canvas|love3d|webgl|dice3d)\b/i.test(selector))continue;
   failures.push(file+':'+line+' — literal '+m[1]+' in '+selector.replace(/\s+/g,' ').slice(0,100));
  }
 }
 return [...new Set(failures)];
}
function main(argv=process.argv.slice(2)){
 const ix=argv.indexOf('--base');
 if(ix===-1||!argv[ix+1]){console.error('Usage: node scripts/loveroll-ui-guard.cjs --base <git-ref>');return 2;}
 let diff;
 try{
  diff=execFileSync('git',['diff','--no-ext-diff','--unified=0','--diff-filter=ACMR',argv[ix+1]+'...HEAD','--','couple-web'],{encoding:'utf8',maxBuffer:32*1024*1024});
 }catch(e){console.error('UI guard cannot obtain diff: '+e.message);return 2;}
 const issues=auditPatch(diff);
 if(issues.length){
  console.error('LoveRoll UI guard:\n'+issues.join('\n'));
  console.error('Reuse ruby-controls.css / ruby-surfaces.css / premium-theme.css tokens; explained exceptions: /* lr-ui-allow: <reason at least 12 chars> */');
  return 1;
 }
 console.log('LoveRoll UI guard: no new ad-hoc control colors in changed files.');
 return 0;
}
if(require.main===module)process.exitCode=main();
module.exports={additions,selectorAt,auditPatch,main};
