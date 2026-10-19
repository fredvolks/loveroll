'use strict';
// Fail closed: syntax-check EVERY JS file shipped by the Pages artifact,
// including modules added later. Don't trust an outdated hard-coded list.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname), files=[];
function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.name==='node_modules'||entry.name==='.git')continue;
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())walk(full);
  else if(/\.(js|mjs|cjs)$/i.test(entry.name))files.push(full);
 }
}
walk(root);
if(!files.length)throw Error('Aucun fichier JavaScript à vérifier');
const failures=[];
for(const file of files){
 const p=cp.spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 if(p.status!==0)failures.push({file:path.relative(root,file),message:(p.stderr||p.stdout||'').slice(0,1700)});
}
console.log('JS SYNTAX CHECK',files.length,'files; failed',failures.length);
for(const f of failures)console.error(f.file+'\n'+f.message);
if(failures.length)process.exitCode=1;
