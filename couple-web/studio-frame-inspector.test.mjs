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
  this.attrs=new Map();this.handlers={};this.classList=new Classes();this.dataset={};
  this.hidden=false;this.textContent='';
 }
 setAttribute(name,value){this.attrs.set(name,String(value));}
 getAttribute(name){return this.attrs.get(name)||null;}
 addEventListener(name,callback){this.handlers[name]=callback;}
 click(){return this.handlers.click?.({preventDefault(){}});}
 append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
 replaceChildren(...children){this.children=[];this.append(...children);}
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
 for(const id of ['studio-real-status','studio-real-views','studio-real-diagnostics','studio-real-check','studio-real-create',
  'studio-real-delete','studio-real-refresh','studio-real-reconnect','studio-real-reset',
  'studio-real-copy-report',
  'studio-show-seat-A','studio-show-seat-B','studio-real-expand-A','studio-real-expand-B',
  'studio-real-jump-A','studio-real-jump-B',
  'studio-real-frame-A','studio-real-frame-B','studio-real-seat-state-A','studio-real-seat-state-B',
  'studio-real-challenge-cards','studio-real-challenge-list',
  'studio-real-audit','studio-real-audit-list',
  'studio-real-progress','studio-real-progress-count','studio-real-progress-list',
  'studio-real-eclat-progress','studio-real-eclat-count','studio-real-eclat-grid',
  'studio-venice-status','studio-venice-cards',
  'studio-venice-status-button','studio-venice-latest','studio-venice-generate'])make(id);
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
 let simulatedDeletion=false,finishDeletion;
 const calls=[];
 const client={functions:{invoke:async(name,{body})=>{
  calls.push(body.action);
  if(body.action==='delete')return new Promise(resolve=>{
   finishDeletion=()=>{simulatedDeletion=true;resolve({data:{deleted:true}})};
  });
  if(body.action==='create'){simulatedDeletion=false;return {data:{ready:true}};}
  if(body.action==='status'&&simulatedDeletion)return {data:{
   ready:false,state:'missing',seats:[],audit:[
    {action:'delete_completed',created_at:'2026-10-27T23:00:00Z'},
    {action:'<script>bad</script>',created_at:'2026-10-27T22:59:00Z'}
   ]
  }};
  if(body.action==='status')return {data:{ready:true,state:'ready',
   audit:[
    {action:'create_succeeded',created_at:'2026-10-27T22:35:00Z'},
    {action:'login_requested',created_at:'2026-10-27T22:34:00Z'}
   ],
   game:{weekly_face:3,monthly_face:47,personal_faces:{A:2,B:5},session:'open',challenges_total:2,eclat_enabled:false,
     eclat_completed_coffrets:[1,5],
     challenge_preview:[{seat:'B',category:'SENSUEL',face:42,status:'offered',title:'Vraie carte de test',description:'Consigne issue de la base'}]},
   seats:[{seat:'A',user_id:'test-a'},{seat:'B',user_id:'test-b'}]}};
  return {data:{ready:true}};
 }}};
 try{
  const studio=createStudioRealSandbox({client});
  await studio.init();
  const getFrame=s=>nodes.get('studio-real-frame-'+s).querySelector('iframe');
  const a=getFrame('A'),b=getFrame('B');
  assert.ok(a&&b,'two independent official LoveRoll iframes');
  assert.equal(nodes.get('studio-real-copy-report').hidden,false,
   'a ready genuine QA pair exposes the shareable report control');
  assert.match(nodes.get('studio-real-diagnostics').textContent,/D6 Soirée A : 2/);
  assert.match(nodes.get('studio-real-diagnostics').textContent,/D100 Surprise : 47/);
  assert.equal(nodes.get('studio-real-progress-count').textContent,'7/9');
  assert.equal(nodes.get('studio-real-progress-list').children.length,9);
  assert.equal(nodes.get('studio-real-progress-list').children[1].dataset.state,'pending');
  assert.equal(nodes.get('studio-real-progress-list').children[8].dataset.state,'pending');
  assert.equal(nodes.get('studio-real-eclat-count').textContent,'2/12 terminés');
  assert.equal(nodes.get('studio-real-eclat-grid').children.length,12);
  assert.equal(nodes.get('studio-real-eclat-grid').children[0].dataset.state,'verified');
  assert.equal(nodes.get('studio-real-eclat-grid').children[4].dataset.state,'verified');
  assert.equal(nodes.get('studio-real-eclat-grid').children[1].dataset.state,'pending');
  const auditEvents=nodes.get('studio-real-audit-list').children;
  assert.equal(nodes.get('studio-real-audit').hidden,false);
  assert.equal(auditEvents.length,2);
  assert.match(auditEvents[0].children[0].textContent,/Duo de test créé/);
  assert.match(auditEvents[1].children[0].textContent,/Connexion technique demandée/);
  assert.ok(!auditEvents[0].children[0].textContent.includes('token'));
  const officialCards=nodes.get('studio-real-challenge-list').children;
  assert.equal(nodes.get('studio-real-challenge-cards').hidden,false);
  assert.equal(officialCards.length,1,'only actually saved cards are presented');
  assert.match(officialCards[0].children[0].textContent,/Joueur B · SENSUEL · D100 42/);
  assert.equal(officialCards[0].children[1].textContent,'Vraie carte de test');
  assert.equal(officialCards[0].children[2].textContent,'Consigne issue de la base');
  assert.match(a.src,/studio_seat=A/);
  assert.match(b.src,/studio_seat=B/);
  assert.notEqual(a.src,b.src);
  const sent=[];
  a.contentWindow={postMessage:(message,origin)=>sent.push({message,origin})};
  b.contentWindow={postMessage:(message,origin)=>sent.push({message,origin})};
  // The Studio must NEVER claim both real seats authenticated after only A.
  const announce=(source,data,origin=globalThis.location.origin)=>
   windowListeners.message({source,data,origin});
  assert.match(nodes.get('studio-real-status').textContent,/Connexion des joueurs A et B en cours/);
  await announce(a.contentWindow,{type:'loveroll-studio-seat-ready',seat:'A',authenticated:true,user_id:'test-a'});
  assert.equal(nodes.get('studio-real-seat-state-A').dataset.state,'connected');
  assert.equal(nodes.get('studio-real-seat-state-B').dataset.state,'pending');
  assert.match(nodes.get('studio-real-status').textContent,/Joueur A connecté/);
  assert.doesNotMatch(nodes.get('studio-real-status').textContent,/Les deux vrais joueurs A et B/);
  // A message from another iframe/origin can never authenticate B.
  await announce(a.contentWindow,{type:'loveroll-studio-seat-ready',seat:'B',authenticated:true,user_id:'test-b'});
  await announce(b.contentWindow,{type:'loveroll-studio-seat-ready',seat:'B',authenticated:true,user_id:'test-b'},'https://attacker.example');
  assert.equal(nodes.get('studio-real-seat-state-B').dataset.state,'pending');
  await announce(b.contentWindow,{type:'loveroll-studio-seat-ready',seat:'B',authenticated:true,user_id:'test-b'});
  assert.equal(nodes.get('studio-real-seat-state-B').dataset.state,'connected');
  assert.match(nodes.get('studio-real-status').textContent,/Les deux vrais joueurs A et B sont connectés/);
  assert.equal(nodes.get('studio-real-progress-count').textContent,'8/9');
  assert.equal(nodes.get('studio-real-progress-list').children[1].dataset.state,'verified');
  // A successful game mutation only asks the parent to reread actual DB state.
  const beforeUpdate=calls.filter(x=>x==='status').length;
  await announce(a.contentWindow,{type:'loveroll-studio-game-updated',seat:'A'});
  assert.equal(calls.filter(x=>x==='status').length,beforeUpdate+1,
   'a genuine A game event refreshes server read-only diagnostics');
  assert.equal(getFrame('A'),a,'updating diagnostics preserves A game and Auth');
  assert.equal(getFrame('B'),b,'updating diagnostics preserves B game and Auth');
  await announce(a.contentWindow,{type:'loveroll-studio-game-updated',seat:'B'});
  await announce(b.contentWindow,{type:'loveroll-studio-game-updated',seat:'B'},
   'https://attacker.example');
  assert.equal(calls.filter(x=>x==='status').length,beforeUpdate+1,
   'wrong seat and foreign origin must never access server diagnostics');
  nodes.get('studio-real-jump-A').value='session';
  nodes.get('studio-real-jump-A').handlers.change();
  assert.deepEqual(sent[0],{message:{type:'loveroll-studio-navigate',seat:'A',tab:'session'},origin:globalThis.location.origin});
  nodes.get('studio-real-jump-B').value='special';
  nodes.get('studio-real-jump-B').handlers.change();
  assert.equal(sent[1].message.seat,'B');
  assert.equal(sent[1].message.tab,'special');
  // New shortcuts must call the real existing game, never a Studio-made screen.
  for(const [seat,tab] of [['A','journal'],['B','personal-journal'],['A','occasions']]){
   nodes.get('studio-real-jump-'+seat).value=tab;
   nodes.get('studio-real-jump-'+seat).handlers.change();
   const last=sent.at(-1);
   assert.deepEqual(last,{message:{type:'loveroll-studio-navigate',seat,tab},
    origin:globalThis.location.origin});
  }
  nodes.get('studio-real-jump-A').value='delete';
  nodes.get('studio-real-jump-A').handlers.change();
  assert.equal(sent.length,5,'navigation must allow only official harmless tab routes');
  // Read-only Venice requests must be correlated to the exact genuine A
  // iframe, never expose a JWT and never accept a stale preview response.
  assert.equal(nodes.get('studio-venice-latest').disabled,false);
  const beforeVenice=sent.length;
  await nodes.get('studio-venice-latest').click();
  const veniceRequest=sent.at(-1);
  assert.equal(sent.length,beforeVenice+1);
  assert.equal(veniceRequest.message.action,'get_latest_preview');
  assert.match(veniceRequest.message.request_id,
   /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  await nodes.get('studio-venice-latest').click();
  assert.equal(sent.length,beforeVenice+1,'no duplicate Venice request while pending');
  const forged={type:'loveroll-studio-venice-result',seat:'A',
   action:'get_latest_preview',request_id:'00000000-0000-4000-8000-000000000001',
   data:{ok:true,result:{preview:{cards:[{title:'FAKE'}]}}}};
  await announce(a.contentWindow,forged);
  assert.equal(nodes.get('studio-venice-cards').children.length,0,
   'late or forged request ID cannot replace existing draft cards');
  await announce(a.contentWindow,{...forged,request_id:veniceRequest.message.request_id,
   data:{ok:true,result:{preview:{cards:[{style:'soft',timer_minutes:3,
    title:'<script>Do not render HTML</script>',text_short:'Official draft only',
    text_detailed:'Private draft content'}]}}}});
  assert.equal(nodes.get('studio-venice-cards').children.length,1);
  assert.equal(nodes.get('studio-venice-cards').children[0].children[0].textContent,
   '<script>Do not render HTML</script>');
  assert.match(nodes.get('studio-venice-status').textContent,/Derniers brouillons lus/);
  assert.equal(calls.includes('venice_preview_authorize'),false,
   'reading Venice drafts must never spend credits');
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
  nodes.get('studio-real-check').click();
  await wait();
  assert.equal(getFrame('A'),a,'read-only check must not reload authenticated seat A');
  assert.equal(getFrame('B'),b,'read-only check must not reload authenticated seat B');
  nodes.get('studio-real-refresh').click();
  await wait();
  assert.equal(getFrame('A'),a,'resume keeps the same signed-in official A game and timer');
  assert.equal(getFrame('B'),b,'resume keeps the partner game and private Auth session');
  assert.equal(nodes.get('studio-real-seat-state-A').dataset.state,'connected');
  assert.equal(nodes.get('studio-real-seat-state-B').dataset.state,'connected');
  for(const s of ['A','B']){
   assert.equal(nodes.get('studio-real-frame-'+s).children.length,2,
    'the permanent header and full-screen control must survive refresh');
  }
  // Explicit repair is different: it remounts actual client windows
  // without touching the official server accounts or rolls.
  nodes.get('studio-real-reconnect').click();
  await wait();
  assert.notEqual(getFrame('A'),a,'explicit reconnection remounts A only on request');
  assert.notEqual(getFrame('B'),b,'explicit reconnection remounts B only on request');
  assert.equal(nodes.get('studio-real-seat-state-A').dataset.state,'pending');
  assert.equal(nodes.get('studio-real-seat-state-B').dataset.state,'pending');
  assert.ok(calls.filter(x=>x==='status').length>=2);
  assert.ok(!calls.includes('create')&&!calls.includes('delete'),
   'visual inspection and refresh must not alter live Supabase test accounts');
  // Replacement is destructive: old A/B must stay absent while DB delete
  // resolves, then ONLY fresh official frames may be mounted for a new pair.
  const previousA=getFrame('A'),previousB=getFrame('B');
  const resetting=nodes.get('studio-real-reset').click();
  assert.equal(getFrame('A'),null,'old A removed before replacement starts');
  assert.equal(getFrame('B'),null,'old B removed before replacement starts');
  await studio.refresh();
  assert.equal(getFrame('A'),null,'stale status cannot remount A during reset');
  assert.equal(getFrame('B'),null,'stale status cannot remount B during reset');
  finishDeletion();
  await resetting;
  assert.equal(calls.filter(x=>x==='create').length,1,'new A/B truly provisioned');
  assert.equal(calls.filter(x=>x==='delete').length,1,'old A/B truly deleted');
  assert.ok(getFrame('A')&&getFrame('A')!==previousA,
   'replacement remounts new official player A');
  assert.ok(getFrame('B')&&getFrame('B')!==previousB,
   'replacement remounts new official player B');
  assert.equal(nodes.get('studio-real-progress-count').textContent,'7/9',
   'the new test follows fresh server evidence, not a simulated dice reset');
  // Platform-owner signout must terminate both sessions in this browser tab,
  // even when the technical couple remains ready in Supabase.
  const createdBeforeSignout=calls.filter(x=>x==='create').length;
  const deletedBeforeSignout=calls.filter(x=>x==='delete').length;
  studio.deactivate();
  assert.equal(getFrame('A'),null,'logout destroys live Auth seat A, not merely hiding it');
  assert.equal(getFrame('B'),null,'logout destroys live Auth seat B, not merely hiding it');
  await studio.refresh();
  assert.equal(getFrame('A'),null,'a stale status cannot remount A behind the login gate');
  assert.equal(getFrame('B'),null,'a stale status cannot remount B behind the login gate');
  assert.equal(calls.filter(x=>x==='create').length,createdBeforeSignout);
  assert.equal(calls.filter(x=>x==='delete').length,deletedBeforeSignout,
   'logout does not delete genuine test accounts or saved games');
  await studio.init();
  assert.ok(getFrame('A')&&getFrame('B'),
   're-authenticating the true platform owner remounts saved A/B games');
  const deleting=nodes.get('studio-real-delete').click();
  assert.ok(calls.includes('delete'),'the actual deletion request was issued');
  assert.equal(getFrame('A'),null,'A removed immediately when deletion starts');
  assert.equal(getFrame('B'),null,'B removed immediately when deletion starts');
  await studio.refresh();
  assert.equal(getFrame('A'),null,
   'a stale official status may not remount A while delete is pending');
  assert.equal(getFrame('B'),null,
   'a stale official status may not remount B while delete is pending');
  finishDeletion();
  await deleting;
  assert.equal(getFrame('A'),null,'deleted sandbox never displays a stale logged-in seat');
  assert.equal(getFrame('B'),null,'deleted sandbox closes the partner game too');
  assert.equal(nodes.get('studio-real-progress-count').textContent,'0/9',
   'deleted technical pair never retains completed QA milestones');
  assert.equal(nodes.get('studio-real-eclat-count').textContent,'0/12 terminés',
   'deleted pair does not claim any Éclat completions');
  assert.equal(nodes.get('studio-real-audit').hidden,false,
   'private audit persists after the synthetic duo is deleted');
  assert.equal(nodes.get('studio-real-audit-list').children[0].children[0].textContent,
   'Suppression du duo terminée');
  assert.match(nodes.get('studio-real-status').textContent,/Journal de sécurité à jour/);
  assert.equal(nodes.get('studio-real-audit-list').children[1].children[0].textContent,
   'Opération technique','unexpected event label is not injected as HTML');
 }finally{
  for(const [key,value] of Object.entries(original)){
   if(value===undefined)delete globalThis[key];
   else globalThis[key]=value;
  }
 }
});
