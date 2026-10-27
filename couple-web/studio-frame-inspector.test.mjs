// Isolated Super Admin WRAPPER test. No mock dice/cards are shipped in LoveRoll.
// The official game's two iframe URLs are checked, but real Supabase gameplay
// still needs a separate authenticated A/B end-to-end acceptance test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioRealSandbox} from './studio-real-sandbox.mjs';

class Classes {
 constructor(){this.names=new Set();}
 add(n){this.names.add(n);}
 remove(n){this.names.delete(n);}
 contains(n){return this.names.has(n);}
 toggle(n,value){
  if(value===undefined)value=!this.contains(n);
  value?this.add(n):this.remove(n);return value;
 }
}
class Element {
 constructor(tag='div',id=''){
  this.tagName=tag.toUpperCase();this.id=id;this.children=[];this.parent=null;
  this.attrs=new Map();this.handlers={};this.classList=new Classes();
  this.hidden=false;this.textContent='';
 }
 setAttribute(name,value){this.attrs.set(name,String(value));}
 getAttribute(name){return this.attrs.get(name)||null;}
 addEventListener(name,callback){this.handlers[name]=callback;}
 click(){return this.handlers.click?.({preventDefault(){}});}
 append(child){child.parent=this;this.children.push(child);}
 querySelector(tag){return this.children.find(node=>node.tagName===tag.toUpperCase())||null;}
 remove(){
  if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);
  this.parent=null;
 }
 focus(){this.focused=true;}
}
const wait=()=>new Promise(resolve=>setImmediate(resolve));

test('Studio A/B fullscreen and refresh keep genuine iframe identities isolated',async()=>{
 const original={document:globalThis.document,window:globalThis.window,
  location:globalThis.location,sessionStorage:globalThis.sessionStorage,
  confirm:globalThis.confirm};
 const nodes=new Map();
 const make=id=>{const node=new Element('div',id);nodes.set(id,node);return node;};
 for(const id of ['studio-real-status','studio-real-views','studio-real-create',
  'studio-real-delete','studio-real-refresh','studio-real-reset',
  'studio-show-seat-A','studio-show-seat-B','studio-real-expand-A','studio-real-expand-B',
  'studio-real-frame-A','studio-real-frame-B'])make(id);
 for(const s of ['A','B']){
  const title=new Element('div');title.classList.add('studio-real-frame-label');
  nodes.get('studio-real-frame-'+s).append(title);
 }
 const html={classList:new Classes()};
 const windowListeners={};
 globalThis.document={
  documentElement:html,
  getElementById:id=>nodes.get(id)||null,
  createElement:tag=>new Element(tag)
 };
 globalThis.window={addEventListener:(name,handler)=>windowListeners[name]=handler};
 globalThis.location={origin:'https://fredvolks.github.io',href:'https://fredvolks.github.io/loveroll/admin.html'};
 globalThis.sessionStorage={removeItem(){}};
 globalThis.confirm=()=>true;
 const calls=[];
 const client={functions:{invoke:async(name,{body})=>{
  calls.push(body.action);
  if(body.action==='status')return {data:{ready:true,state:'ready',
   seats:[{seat:'A',user_id:'test-a'},{seat:'B',user_id:'test-b'}]}};
  return {data:{ready:true}};
 }}};
 try{
  const studio=createStudioRealSandbox({client});
  await studio.init();
  const getFrame=s=>nodes.get('studio-real-frame-'+s).querySelector('iframe');
  const a=getFrame('A'),b=getFrame('B');
  assert.ok(a&&b,'two independent official LoveRoll iframes');
  assert.match(a.src,/studio_seat=A/);
  assert.match(b.src,/studio_seat=B/);
  assert.notEqual(a.src,b.src);
  nodes.get('studio-real-expand-A').click();
  assert.equal(html.classList.contains('studio-real-fullscreen'),true);
  assert.equal(nodes.get('studio-real-frame-A').classList.contains('studio-real-maximized'),true);
  assert.equal(getFrame('A'),a,'enlargement keeps same signed-in game iframe');
  assert.equal(getFrame('B'),b,'other signed-in iframe remains mounted');
  nodes.get('studio-real-expand-B').click();
  assert.equal(nodes.get('studio-real-frame-A').classList.contains('studio-real-maximized'),false);
  assert.equal(nodes.get('studio-real-frame-B').classList.contains('studio-real-maximized'),true);
  assert.equal(getFrame('B'),b);
  let prevented=false;
  windowListeners.keydown({key:'Escape',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(html.classList.contains('studio-real-fullscreen'),false);
  nodes.get('studio-real-refresh').click();
  await wait();
  assert.notEqual(getFrame('A'),a,'refresh reloads the official frame');
  assert.notEqual(getFrame('B'),b,'refresh reloads the partner frame');
  for(const s of ['A','B']){
   assert.equal(nodes.get('studio-real-frame-'+s).children.length,2,
    'the permanent header and full-screen control must survive refresh');
  }
  assert.ok(calls.filter(x=>x==='status').length>=2);
  assert.ok(!calls.includes('create')&&!calls.includes('delete'),
   'visual inspection and refresh must not alter live Supabase test accounts');
 }finally{
  for(const [key,value] of Object.entries(original)){
   if(value===undefined)delete globalThis[key];
   else globalThis[key]=value;
  }
 }
});
