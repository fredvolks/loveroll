import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initFutureCardArchiveStudio} from './future-card-archive-studio.mjs';

class Element{
 constructor(){this.listeners={};this.children=[];this.value='';this.textContent='';
  this.disabled=false;this.files=[];this.size=0;}
 addEventListener(t,callback){this.listeners[t]=callback;}
 appendChild(node){this.children.push(node);return node;}
 replaceChildren(...children){this.children=children;this.value='';}
 fire(t){return this.listeners[t]?.();}
}
const card=(id,title)=>({id,title,
 description:'Une proposition originale et complète pour le couple.',
 levels:['soft'],target:'both',minutes:3});
function setup({cards=[card('soft-1','Défi original')],restore=()=>true,
 hasUnsavedForm=()=>false,clock}={}){
 const ids=['label','save','select','restore','export','file','import','feedback','count'];
 const els=Object.fromEntries(ids.map(id=>[id,new Element()]));
 const view={confirm:()=>true,addEventListener:()=>{}};
 const doc={getElementById:id=>els[id.replace('future-archive-','')],
  createElement:()=>new Element(),defaultView:view};
 const studio=initFutureCardArchiveStudio(doc,{getCards:()=>cards,
  restoreCards:restore,hasUnsavedForm,
  clock:clock||(()=>'2026-10-31T18:00:00.000Z')});
 return {els,studio,view};
}
test('a named version is saved independently of subsequent draft edits',()=>{
 const cards=[card('soft-1','Défi original')];
 const {els,studio}=setup({cards});
 els.label.value='Première version';els.save.fire('click');
 assert.equal(studio.getArchive().revisions.length,1);
 cards[0].title='Défi renouvelé';
 assert.equal(studio.getArchive().revisions[0].cards[0].title,'Défi original');
 assert.equal(studio.hasUnexported(),true);
 assert.equal(els.restore.disabled,false);
 assert.match(els.count.textContent,/1 \/ 24/);
});
test('restore requires a saved version and respects editor cancellation',()=>{
 let called=0;
 const {els,studio}=setup({restore:()=>{called++;return false;}});
 els.restore.fire('click');assert.match(els.feedback.textContent,/Choisir une version/);
 els.label.value='Original';els.save.fire('click');
 els.select.value=studio.getArchive().revisions[0].id;
 els.restore.fire('click');
 assert.equal(called,1);
 assert.match(els.feedback.textContent,/annulée/);
 assert.equal(studio.getArchive().revisions.length,1);
});
test('import rejects corrupt history and never overwrites existing archive',async()=>{
 const {els,studio}=setup();
 els.label.value='Original';els.save.fire('click');
 const before=studio.getArchive();
 els.file.files=[{name:'bad.json',size:8,text:async()=>'{bad'}];
 await els.import.fire('click');
 assert.deepEqual(studio.getArchive(),before);
 assert.match(els.feedback.textContent,/illisible/);
});
test('import stale asynchronous read cannot replace a newer file',async()=>{
 const {els,studio}=setup();
 let finish;
 els.file.files=[{name:'old.json',size:10,text:()=>new Promise(r=>finish=r)}];
 const first=els.import.fire('click');
 const empty={kind:'loveroll-future-deck-history',version:1,revisions:[]};
 els.file.files=[{name:'new.json',size:10,text:async()=>JSON.stringify(empty)}];
 els.file.fire('change');
 assert.equal(els.import.disabled,false);
 await els.import.fire('click');
 finish('{bad');await first;
 assert.deepEqual(studio.getArchive(),empty);
 assert.match(els.feedback.textContent,/importé/);
});
test('restoring an old version passes an independent card copy to the editor',()=>{
 let recovered;
 const {els,studio}=setup({restore:cards=>{recovered=cards;return true;}});
 els.label.value='Avant la modification';els.save.fire('click');
 els.select.value=studio.getArchive().revisions[0].id;
 els.restore.fire('click');
 assert.equal(recovered[0].title,'Défi original');
 recovered[0].title='Autre valeur';
 assert.equal(studio.getArchive().revisions[0].cards[0].title,'Défi original');
 assert.match(els.feedback.textContent,/restaurée/);
});
test('local history import keeps the original snapshot and never overwrites when refused',async()=>{
 const {els,studio,view}=setup();
 els.label.value='En cours';els.save.fire('click');
 const old=studio.getArchive();
 view.confirm=()=>false;
 const payload={kind:'loveroll-future-deck-history',version:1,revisions:[]};
 els.file.files=[{name:'other.json',size:120,text:async()=>JSON.stringify(payload)}];
 await els.import.fire('click');
 assert.deepEqual(studio.getArchive(),old);
 assert.match(els.feedback.textContent,/annulé/);
 view.confirm=()=>true;
 await els.import.fire('click');
 assert.deepEqual(studio.getArchive(),payload);
 assert.equal(studio.hasUnexported(),false);
 assert.match(els.feedback.textContent,/importé/);
});
test('unfinished card form blocks snapshot until its changes are saved',()=>{
 const {els,studio}=setup({hasUnsavedForm:()=>true});
 els.label.value='Ne pas archiver';els.save.fire('click');
 assert.equal(studio.getArchive().revisions.length,0);
 assert.match(els.feedback.textContent,/Enregistre d’abord/);
});

test('Studio history UI supports touch sizes and does not call a backend',()=>{
 const html=readFileSync(new URL('./admin.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('./future-card-archive-studio.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./future-card-studio.css',import.meta.url),'utf8');
 const controller=readFileSync(new URL('./future-card-studio.mjs',import.meta.url),'utf8');
 for(const id of ['future-archive-label','future-archive-save','future-archive-select',
  'future-archive-restore','future-archive-export','future-archive-file',
  'future-archive-import','future-archive-feedback'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/id="future-archive-feedback" role="status"/);
 assert.match(css,/\.future-archive-studio button\{min-height:44px/);
 assert.match(controller,/initFutureCardArchiveStudio/);
 assert.match(controller,/hasUnsavedForm/);
 assert.doesNotMatch(script,/\bfetch\s*\(|supabase\.|localStorage|sessionStorage/);
});
