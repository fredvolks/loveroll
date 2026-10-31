import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml,updateEveningCategoryUi} from './premium-evening.mjs';
import {eveningPlayInfoHtml,calculateEveningD100StageSize} from './evening-d100-template.mjs';
const ready={session:{id:'s',paired_turns:true,self_draws:true},members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Émilie'}],me:'a',status:{both_ready:true},turn:{ready:true,next:'a',remaining:{a:2,b:3}}};
test('No category is preselected; an eligible player can press roll to receive guidance',()=>{
 const html=premiumEveningHtml(ready);
 assert.equal((html.match(/aria-pressed="false"/g)||[]).length,3);
 assert.doesNotMatch(html,/aria-pressed="true"/);
 assert.doesNotMatch(html,/data-action="new-challenge"[^>]*disabled/);
 for(const [blocked,label] of [
  [{...ready,turn:{...ready.turn,next:'b'}},'En attente du tour de ton partenaire'],
  [{...ready,rolling:true},'Brassage en cours…'],
  [{...ready,status:{both_ready:false}},'Lance ton D6 pour continuer']
 ]){
  const view=premiumEveningHtml(blocked);
  assert.doesNotMatch(view,/data-action="new-challenge"/,'A waiting state must never be a fake button');
  assert.match(view,new RegExp('class="evening-primary-status" role="status">'+label));
 }
});
test('D100 locks every category during a live roll and restores choices after it settles',()=>{
 const idle=premiumEveningHtml({...ready,category:'SENSUEL',rolling:false});
 const pending=premiumEveningHtml({...ready,category:'SENSUEL',
  rolling:true,rollingKind:'new-challenge'});
 for(const type of ['SENSUEL','HASARD','SEXUEL']){
  assert.match(idle,new RegExp('data-action="category:'+type+'"[^>]*'));
  assert.match(pending,new RegExp('data-action="category:'+type+'"[^>]*disabled'),
   'Even the selected category must be locked during the official D100 draw');
 }
 assert.doesNotMatch(idle,/data-action="category:SENSUEL"[^>]*disabled/);
 assert.doesNotMatch(pending,/data-action="new-challenge"/,
  'A pending draw must never offer a duplicate official roll');
 assert.match(pending,/Brassage en cours/);
 assert.match(pending,/<div class="evening-play-state">🎲 Brassage en cours…<\/div>/,
  'A running D100 must not falsely announce that the partner now owns the turn');
 assert.doesNotMatch(pending,/<div class="evening-play-state">Au tour de /);
 assert.match(idle,/<div class="evening-play-state">♥ C’est ton tour !<\/div>/);
 assert.match(idle,/data-action="new-challenge"/);
});
test('A server-complete turn cannot expose finish while its official die still spins',()=>{
 const complete={...ready,category:'SENSUEL',turn:{
  ...ready.turn,finished:true,drawsFinished:true,remaining:{a:0,b:0}
 }};
 const settled=premiumEveningHtml({...complete,rolling:false});
 assert.match(settled,/data-action="finish-session"/);
 const pending=premiumEveningHtml({...complete,rolling:true,rollingKind:'new-challenge'});
 assert.doesNotMatch(pending,/data-action="finish-session"/,
  'No live finish action until the server-confirmed face has settled');
 assert.doesNotMatch(pending,/data-action="new-challenge"/);
 assert.match(pending,/<div class="evening-play-state">🎲 Brassage en cours…<\/div>/);
 assert.match(pending,/class="evening-primary-status" role="status">Brassage en cours…<\/p>/);
 const allDrawn=premiumEveningHtml({...complete,turn:{...complete.turn,
  finished:false},rolling:true,rollingKind:'new-challenge'});
 assert.doesNotMatch(allDrawn,/data-action="finish-session"|data-action="new-challenge"/);
 assert.match(allDrawn,/Brassage en cours/);
});

test('Challenge-list navigation cannot interrupt an official D100 animation',()=>{
 const waiting=premiumEveningHtml({...ready,rolling:true,rollingKind:'new-challenge',
  ownChallengeCount:2,category:'SENSUEL'});
 assert.doesNotMatch(waiting,/class="evening-queue-open-btn"/,
  'The secondary challenge drawer must not remount the rolling D100');
 assert.doesNotMatch(waiting,/data-action="evening-list"/);
 assert.match(waiting,/Brassage en cours/);
 const after=premiumEveningHtml({...ready,rolling:false,ownChallengeCount:2,
  category:'SENSUEL'});
 assert.match(after,/class="evening-queue-open-btn" data-action="evening-list"/,
  'The challenge list returns immediately when the rolling state clears');
});


test('Stale Soirée actions cannot interrupt official dice state',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const routes=[
  ["evening-close-request","if(verb==='evening-close-request'){","if(verb==='evening-close-confirm'){",null],
  ["evening-close-confirm","if(verb==='evening-close-confirm'){","if(verb==='evening-challenge'||verb==='evening-list'){","close_love_evening_preserve"],
  ["evening-list","if(verb==='evening-challenge'||verb==='evening-list'){","if(verb==='evening-close'){",null],
  ["give-challenge","if(verb==='give-challenge'){","if(verb==='new-challenge'){","give_love_challenge"],
  ["finish-session","if(verb==='finish-session'){","if(verb==='cancel-session'){","finish_couple_session"]
 ];
 for(const [verb,begin,end,forbiddenRpc] of routes){
  const from=source.indexOf(begin),to=source.indexOf(end,from+begin.length);
  assert.ok(from>0&&to>from,'Production route must exist: '+verb);
  const block=source.slice(from,to);
  for(const status of ['pending','rolling','settled']){
   const calls=[];
   const state={
    diceStatus:status,rollAnimationKind:'new-challenge',session:{id:'night-a'},
    user:{id:'alice'},showEveningChallenges:false,confirmCancel:false,tab:'session'
   };
   const run=runInNewContext('(async verb=>{'+block+'})',{
    state,
    render:()=>calls.push('render'),
    rpc:(...args)=>{calls.push(args[0]);return Promise.resolve();},
    refreshAndShow:()=>{calls.push('refresh');return Promise.resolve();},
    clearEveningSelection:()=>calls.push('bookmark-clear'),
    safeEveningBookmarkStorage:()=>null
   });
   await run(verb);
   assert.equal(calls.length,0,verb+' must have no side effects at '+status);
   assert.equal(state.showEveningChallenges,false);
   assert.equal(state.confirmCancel,false);
   assert.equal(state.tab,'session');
   if(forbiddenRpc)assert.ok(!calls.includes(forbiddenRpc));
  }
 }
});


test("Delayed gift approval cannot change another player's evening",async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const from=source.indexOf("if(verb==='give-challenge'){");
 const to=source.indexOf("if(verb==='new-challenge'){",from);
 assert.ok(from>0&&to>from);
 const giftCode=source.slice(from,to);
 const deferred=()=>{
  let resolve;
  const promise=new Promise(ok=>{resolve=ok;});
  return {promise,resolve};
 };
 function fixture(){
  const confirmation=deferred(),server=deferred(),serverStarted=deferred();
  const state={
   user:{id:'alice'},coupleId:'couple-one',tab:'session',diceStatus:null,
   session:{id:'night-one',paired_turns:true,self_draws:true},
   rollStatus:{both_ready:true},eveningBoard:{ready:true,remaining:{alice:2}},gifts:[]
  };
  const calls={writes:[],refresh:0,notifications:0};
  const scope={
   state,authFeedbackGeneration:3,month:()=> '2026-10',
   other:()=>({name:'Partenaire'}),
   premiumConfirm:()=>confirmation.promise,
   rpc:(name,args)=>{calls.writes.push({name,args});serverStarted.resolve();return server.promise;},
   refreshAndShow:async()=>{calls.refresh++;},
   notify:()=>{calls.notifications++;}
  };
  const act=runInNewContext('(async verb=>{'+giftCode+'})',scope);
  return {state,scope,calls,confirmation,server,serverStarted,act};
 }
 for(const change of [
  h=>{h.state.user={id:'bob'};},
  h=>{h.state.coupleId='other-couple';},
  h=>{h.state.session={id:'other-night'};},
  h=>{h.state.diceStatus='pending';},
  h=>{h.scope.authFeedbackGeneration++;},
  h=>{h.state.tab='home';}
 ]){
  const h=fixture();
  const work=h.act('give-challenge');
  change(h);
  h.confirmation.resolve(true);await work;
  assert.equal(h.calls.writes.length,0,'Stale approval must not send a gift RPC');
  assert.equal(h.calls.refresh,0);
  assert.equal(h.calls.notifications,0);
 }
 const accepted=fixture();
 const success=accepted.act('give-challenge');
 accepted.confirmation.resolve(true);
 await accepted.serverStarted.promise;
 assert.equal(accepted.calls.writes.length,1);
 assert.equal(accepted.calls.writes[0].name,'give_love_challenge');
 assert.equal(accepted.calls.writes[0].args.p_session,'night-one');
 accepted.server.resolve(null);await success;
 assert.equal(accepted.calls.refresh,1);
 assert.equal(accepted.calls.notifications,1);
 const changedDuringRpc=fixture();
 const delayed=changedDuringRpc.act('give-challenge');
 changedDuringRpc.confirmation.resolve(true);
 await changedDuringRpc.serverStarted.promise;
 changedDuringRpc.state.user={id:'bob'};
 changedDuringRpc.server.resolve(null);await delayed;
 assert.equal(changedDuringRpc.calls.writes.length,1);
 assert.equal(changedDuringRpc.calls.refresh,0,
  "The former user\'s gift receipt cannot replace a new account view");
 assert.equal(changedDuringRpc.calls.notifications,0);
});


test('Soirée management and calendar cannot interrupt an official D100 animation',async()=>{
 const during=premiumEveningHtml({...ready,rolling:true,rollingKind:'new-challenge',
  showMore:true,category:'SENSUEL'});
 assert.match(during,/class="evening-manage" data-action="evening-more"[^>]*disabled/);
 assert.doesNotMatch(during,/class="evening-more-menu"/);
 const idle=premiumEveningHtml({...ready,rolling:false,showMore:true,category:'SENSUEL'});
 assert.match(idle,/class="evening-manage" data-action="evening-more"/);
 assert.doesNotMatch(idle,/class="evening-manage"[^>]*disabled/);
 assert.match(idle,/class="evening-more-menu"/);

 const {runInNewContext}=await import('node:vm');
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf("if(verb==='evening-more'){");
 const end=source.indexOf("if(verb==='evening-month-prev'",start);
 assert.ok(start>0&&end>start,'Real production menu/calendar route');
 const route=source.slice(start,end);
 for(const status of ['pending','rolling','settled']){
  const events=[];
  const state={tab:'session',diceStatus:status,eveningMore:false,
   confirmCancel:false,session:{started_at:'2026-10-31T19:00:00Z'}};
  const run=runInNewContext('(async verb=>{'+route+'})',{
   state,parts:[],render:()=>events.push('render'),
   eveningLocalDay:()=>{events.push('date');return '2026-10-31';}
  });
  await run('evening-more');
  await run('evening-calendar');
  assert.equal(events.length,0,'No screen change or date refresh while '+status);
  assert.equal(state.eveningMore,false);
  assert.equal(state.tab,'session');
 }
 const state={tab:'session',diceStatus:null,eveningMore:false,
  confirmCancel:false,session:{started_at:'2026-10-31T19:00:00Z'}};
 const run=runInNewContext('(async verb=>{'+route+'})',{
  state,parts:[],render:()=>{},eveningLocalDay:()=> '2026-10-31'
 });
 await run('evening-more');
 assert.equal(state.eveningMore,true,'Menu returns immediately after settling');
 await run('evening-calendar');
 assert.equal(state.tab,'evening-calendar');
 assert.equal(state.eveningCalendarDate,'2026-10-31');
});

test('Information uses the actual configured preference and preserves calendar and closure',()=>{
 const info=eveningPlayInfoHtml(74);
 assert.match(info,/74 % pour la catégorie choisie et 26 % pour l’autre/);
 assert.match(info,/à parts égales/);assert.match(info,/3 dons par personne et par mois/);
 assert.match(info,/data-action="evening-calendar"/);assert.match(info,/data-action="evening-close-request"/);
 assert.doesNotMatch(info,/88 %/);
});


test('The D100 information button also exists on desktop, without rolling the die',()=>{
 const source=readFileSync(new URL('./evening-d100-template.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./evening-d100-template.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(source,/function installDesktopEveningInfo\(view\)/);
 assert.match(source,/root\.classList\.toggle\('has-evening-d100-desktop-info',desktop\)/);
 assert.match(source,/if\(!enabled\)\{if\(desktop\)installDesktopEveningInfo\(view\);return false;\}/);
 assert.match(source,/if\(!hero\|\|hero\.querySelector\('\.home-odds-info'\)\)return;/);
 assert.match(source,/aria-controls','evening-play-info'/);
 assert.match(source,/dialog\.addEventListener\('close'/);
 // Escape must respect ANY active native dialog, including Surprise, not only D100.
 assert.match(app,/!document\.querySelector\('\.lr-dialog-overlay,dialog\[open\]'\)/);
 assert.doesNotMatch(app,/!document\.querySelector\('dialog#evening-play-info\[open\]'\)/);
 assert.match(app,/const gameInfo=document\.querySelector\('dialog#evening-play-info\[open\]'\)/);
 assert.match(app,/if\(gameInfo\)\{gameInfo\.close\(\);return true;\}/);
 assert.match(css,/@media \(min-width:1200px\) and \(pointer:fine\)/);
 assert.match(css,/\.evening-step\.two \.evening-die-row>\.home-odds-info/);
 assert.doesNotMatch(source.slice(source.indexOf('function installDesktopEveningInfo'),source.indexOf('let observer;')),/rollTo\(|give_love_challenge|Math\.random/);
});

test('Live D100 matches Surprise on iPad without changing the small-phone clamp',()=>{
 const at=(viewportWidth,viewportHeight,heroWidth,heroHeight)=>
  calculateEveningD100StageSize({viewportWidth,viewportHeight,heroWidth,heroHeight});
 assert.equal(at(393,852,393,480),322,'Android phone remains at 82vw / 41dvh');
 assert.equal(at(320,568,320,100),136,'Short phones retain the self-shrinking stage guard');
 assert.equal(at(768,1024,650,550),440,'Portrait iPad uses the Surprise 440px cap');
 assert.equal(at(1180,820,660,276),352,'Playable landscape iPad uses the 43dvh cap even with a short theater');
 assert.equal(at(1024,768,640,490),330,'Landscape iPad uses the Surprise 43dvh cap');
 assert.equal(at(1024,600,620,200),258,'Landscape tablet never shrinks to the grid-row height');
});


function categoryOddsFixture(){
 const doc={createElement:tag=>({
  tag,className:'',children:[],_text:'',
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');},
  set textContent(value){this._text=String(value);this.children=[];},
  appendChild(child){this.children.push(child);},
  setAttribute(name,value){this[name]=value;}
 })};
 const options={};
 const buttons=['SENSUEL','HASARD','SEXUEL'].map(type=>{
  const option={odds:null,
   querySelector:()=>option.odds,
   appendChild(node){option.odds=node;node.remove=()=>{option.odds=null;};}
  };
  options[type]=option;
  const attrs={};
  return {dataset:{action:'category:'+type},ownerDocument:doc,disabled:false,attrs,
   classList:{toggle(){}},closest:()=>option,setAttribute:(key,val)=>{attrs[key]=val;}};
 });
 const roll={disabled:true};
 const group={querySelectorAll:()=>buttons,classList:{remove(){}},
  querySelector:()=>null,closest:()=>({querySelector:()=>roll})};
 return {root:{querySelector:()=>group},options,buttons,roll};
}

test('Live D100 odds show random category as 50/50 and preserve readable spacing',()=>{
 const f=categoryOddsFixture();
 assert.equal(updateEveningCategoryUi(f.root,'HASARD',74),true);
 assert.equal(f.options.HASARD.odds?.textContent,'50 % Sensuel · 50 % Sexuel');
 assert.equal(f.options.HASARD.odds?.['aria-live'],'polite');
 assert.equal(f.roll.disabled,false);
 assert.equal(f.buttons[1].attrs['aria-pressed'],'true');

 assert.equal(updateEveningCategoryUi(f.root,'SENSUEL',74),true);
 assert.equal(f.options.HASARD.odds,null);
 assert.equal(f.options.SENSUEL.odds?.textContent,'74 % de chances d’avoir cette catégorie');
 assert.equal(f.buttons[0].attrs['aria-pressed'],'true');
 assert.equal(f.buttons[1].attrs['aria-pressed'],'false');

 assert.equal(updateEveningCategoryUi(f.root,'SEXUEL',61),true);
 assert.equal(f.options.SENSUEL.odds,null);
 assert.equal(f.options.SEXUEL.odds?.textContent,'61 % de chances d’avoir cette catégorie');
 assert.equal(updateEveningCategoryUi(f.root,'SEXUEL',61),true);
 assert.equal(f.options.SEXUEL.odds?.textContent,'61 % de chances d’avoir cette catégorie');
});

test('Server-rendered D100 category labels survive the next responsive refresh',()=>{
 const base={...ready,categoryOdds:74};
 const random=premiumEveningHtml({...base,category:'HASARD'});
 assert.match(random,/data-action="category:HASARD"[^>]*aria-pressed="true"/);
 assert.match(random,/<small class="evening-choice-odds" aria-live="polite">50 % Sensuel · 50 % Sexuel<\/small>/);
 assert.doesNotMatch(random,/chancesd’avoir/);
 for(const category of ['SENSUEL','SEXUEL']){
  const html=premiumEveningHtml({...base,category});
  assert.match(html,/74 % de chances <span>d’avoir cette catégorie<\/span>/);
  assert.doesNotMatch(html,/chancesd’avoir/);
 }
 const none=premiumEveningHtml({...base,category:null});
 assert.doesNotMatch(none,/class="evening-choice-odds"/);
});


test('D100 odds never print an invalid percentage across live and fresh views',()=>{
 for(const [raw,expected] of [[Infinity,88],[NaN,88],[135,100],[-15,0]]){
  const html=premiumEveningHtml({...ready,category:'SEXUEL',categoryOdds:raw});
  assert.match(html,new RegExp('>'+expected+' % de chances <span>d’avoir cette catégorie'));
  assert.doesNotMatch(html,/Infinity|NaN|135 %|-15 %/);

  const live=categoryOddsFixture();
  assert.equal(updateEveningCategoryUi(live.root,'SEXUEL',raw),true);
  assert.equal(live.options.SEXUEL.odds?.textContent,
   expected+' % de chances d’avoir cette catégorie');
 }
 const random=premiumEveningHtml({...ready,category:'HASARD',categoryOdds:Infinity});
 assert.match(random,/50 % Sensuel · 50 % Sexuel/);
 assert.doesNotMatch(random,/Infinity|NaN/);
});

test('Disabled D100 category is never selected by a stale touch or late event',()=>{
 const f=categoryOddsFixture();
 f.buttons[1].disabled=true; // e.g. server forbids a category during a turn switch
 assert.equal(updateEveningCategoryUi(f.root,'HASARD',74),false);
 assert.equal(f.options.HASARD.odds,null);
 assert.equal(f.roll.disabled,true);
 assert.equal(f.buttons[1].attrs['aria-pressed'],undefined);
 // A different enabled choice is still valid; only the disabled target is refused.
 assert.equal(updateEveningCategoryUi(f.root,'SENSUEL',74),true);
 assert.equal(f.options.SENSUEL.odds?.textContent,'74 % de chances d’avoir cette catégorie');
 assert.equal(f.roll.disabled,false);
 const all=categoryOddsFixture();
 all.buttons.forEach(button=>button.disabled=true);
 assert.equal(updateEveningCategoryUi(all.root,'SEXUEL'),false);
 assert.equal(all.roll.disabled,true);
});
