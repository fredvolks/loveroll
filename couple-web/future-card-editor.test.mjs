import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initFutureCardEditor} from './future-card-editor.mjs';

class Element {
 constructor(){this.listeners={};this.children=[];this.value='';this.textContent='';
  this.checked=false;this.disabled=false;}
 addEventListener(name,callback){this.listeners[name]=callback;}
 appendChild(node){this.children.push(node);}
 replaceChildren(...items){this.children=items;}
 fire(name){return this.listeners[name]?.();}
}
const create=()=>{
 const ids=['select','new','id','minutes','target','soft','medium','intense',
 'title','description','save','remove','export','feedback'];
 const elements=Object.fromEntries(ids.map(id=>[id,new Element()]));
 const view={confirm:()=>true,addEventListener:()=>{}};
 const doc={getElementById:id=>elements[id.replace('future-card-','')],
  createElement:()=>new Element(),defaultView:view};
 let updates=0;
 const editor=initFutureCardEditor(doc,{onDraftChange:()=>{updates++;}});
 return {elements,editor,updates:()=>updates,view};
};
const values=(e,id='soft-01')=>{
 e.id.value=id;e.title.value='Défi original pour deux';
 e.description.value='Une consigne originale, claire et entièrement détaillée.';
 e.minutes.value='4';e.target.value='both';e.soft.checked=true;
};
test('editor creates, updates, deletes and returns local draft data',()=>{
 const {elements:e,editor,updates}=create();
 assert.ok(editor);assert.equal(e.remove.disabled,true);
 values(e);e.save.fire('click');
 assert.equal(editor.getCards().length,1);assert.equal(updates(),1);
 assert.equal(e.remove.disabled,false);
 e.title.value='Deuxième titre original';
 e.save.fire('click');
 assert.equal(editor.getCards().length,1);
 assert.equal(editor.getCards()[0].title,'Deuxième titre original');
 assert.equal(updates(),2);
 e.remove.fire('click');assert.equal(editor.getCards().length,0);
 assert.equal(updates(),3);
});
test('safe import preserves previous data when duplicate IDs appear',()=>{
 const {elements:e,editor}=create();
 values(e);e.save.fire('click');
 const previous=editor.getCards();
 const repeated=[previous[0],previous[0]];
 assert.equal(editor.load(repeated),false);
 assert.deepEqual(editor.getCards(),previous);
 assert.equal(editor.load([{...previous[0],id:'fresh-01'}]),true);
 assert.deepEqual(editor.getCards().map(x=>x.id),['fresh-01']);
});
test('save errors preserve draft and display validation feedback',()=>{
 const {elements:e,editor}=create();
 values(e);e.save.fire('click');
 e.new.fire('click');values(e,'soft-01');
 e.save.fire('click');
 assert.match(e.feedback.textContent,/identifiant existe déjà/i);
 assert.equal(editor.getCards().length,1);
});
test('editor UI is inside admin, accessible and never calls backend APIs',()=>{
 const html=readFileSync(new URL('./admin.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('./future-card-editor.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./future-card-studio.css',import.meta.url),'utf8');
 for(const id of ['future-card-select','future-card-new','future-card-save',
  'future-card-remove','future-card-export','future-card-description'])
  assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/id="future-card-save" type="button"/);
 assert.match(html,/id="future-card-editor-feedback"/);
 assert.match(css, /future-card-editor/);
 assert.match(css, /min-height:44px/);
 assert.doesNotMatch(js, /\bfetch\s*\(|localStorage|sessionStorage|supabase\.(?:from|rpc)/);
});
