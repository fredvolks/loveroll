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
    state,isActiveEveningGiftPending:()=>false,
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
   isActiveEveningGiftPending:()=>!!(state.eveningGiftRequest&&
    state.eveningGiftRequest.userId===state.user?.id&&
    state.eveningGiftRequest.sessionId===state.session?.id),
   isActiveEveningRedrawPending:()=>false,render:()=>{},
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
 // A gift may have started while an old overflow or closure dialog was open.
 const gifting=premiumEveningHtml({...ready,rolling:false,showMore:true,
  confirmCancel:true,giftPending:true,category:'SENSUEL'});
 assert.match(gifting,/class="evening-manage" data-action="evening-more"[^>]*disabled/);
 assert.match(gifting,/Don en cours de confirmation…/);
 assert.doesNotMatch(gifting,/class="evening-more-menu"/);
 assert.doesNotMatch(gifting,/class="evening-confirm"/);
 const giftFinished=premiumEveningHtml({...ready,rolling:false,showMore:true,
  confirmCancel:true,giftPending:false,category:'SENSUEL'});
 assert.match(giftFinished,/class="evening-more-menu"/);
 assert.match(giftFinished,/class="evening-confirm"/);

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
   isActiveEveningRedrawPending:()=>false,
   isActiveEveningGiftPending:()=>false,
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
  state,parts:[],render:()=>{},eveningLocalDay:()=> '2026-10-31',
  isActiveEveningRedrawPending:()=>false,
  isActiveEveningGiftPending:()=>false
 });
 await run('evening-more');
 assert.equal(state.eveningMore,true,'Menu returns immediately after settling');
 await run('evening-calendar');
 assert.equal(state.tab,'evening-calendar');
 assert.equal(state.eveningCalendarDate,'2026-10-31');
 // A late menu click cannot remount a gifting session's private turn.
 const giftState={tab:'session',diceStatus:null,eveningMore:false};
 let giftPaints=0;
 const giftingMenu=runInNewContext('(async verb=>{'+source.slice(start,
  source.indexOf("if(verb==='evening-calendar'){",start))+'})',{
  state:giftState,isActiveEveningRedrawPending:()=>false,
  isActiveEveningGiftPending:()=>true,render:()=>{giftPaints++;}
 });
 await giftingMenu('evening-more');
 assert.equal(giftPaints,0);
 assert.equal(giftState.eveningMore,false);
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

test('LR-027: the final D100 draw offers a single Start or Resume CTA and keeps all cards accessible',()=>{
 const base={...ready,category:'HASARD',ownChallengeCount:3,
  turn:{...ready.turn,drawsFinished:true,remaining:{a:0,b:0}}};
 for(const [status,label] of [['accepted','Reprendre mon défi'],['proposed','Commencer mon défi']]){
  const id='my-private-card';
  const html=premiumEveningHtml({...base,nextChallenge:{id,status}});
  const actions=html.match(/<div class="evening-roll-actions">([\s\S]*?)<\/div>/)?.[1]||'';
  assert.match(actions,new RegExp('class="evening-primary" data-action="evening-start:'+id+'"'));
  assert.match(actions,new RegExp(label));
  assert.match(actions,/data-action="evening-list"/,'All private cards stay reachable');
  assert.equal((actions.match(/class="evening-primary"/g)||[]).length,1,
   'There is only one primary CTA after the final draw');
  assert.doesNotMatch(actions,/data-action="new-challenge"|data-action="finish-session"/);
  assert.doesNotMatch(html,/data-action="evening-start:another-user"/,
   'The renderer never guesses or fetches another person’s challenge');
 }
 // When the partner still has D100 draws, active personal challenges
 // should remain actionable rather than showing a dead waiting state.
 const partnerTurn=premiumEveningHtml({...base,turn:{
  ...ready.turn,next:'b',drawsFinished:false,remaining:{a:0,b:2}
 },nextChallenge:{id:'resume-now',status:'accepted'}});
 const partnerActions=partnerTurn.match(/<div class="evening-roll-actions">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.match(partnerActions,/data-action="evening-start:resume-now"/);
 assert.match(partnerActions,/Reprendre mon défi/);
 assert.match(partnerActions,/data-action="evening-list"/);
 assert.doesNotMatch(partnerActions,/data-action="new-challenge"/);
 const myTurn=premiumEveningHtml({...base,turn:{
  ...ready.turn,next:'a',drawsFinished:false,remaining:{a:2,b:2}
 },nextChallenge:{id:'resume-now',status:'accepted'}});
 const myActions=myTurn.match(/<div class="evening-roll-actions">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.match(myActions,/data-action="new-challenge"/,
  'On my official D100 turn the draw still has priority');
 assert.doesNotMatch(myActions,/data-action="evening-start:resume-now"/);
 const archived=premiumEveningHtml({...base,nextChallenge:null});
 const archivedActions=archived.match(/<div class="evening-roll-actions">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.match(archivedActions,/class="evening-primary" data-action="evening-list"/);
 assert.equal((archivedActions.match(/data-action="evening-list"/g)||[]).length,1,
  'No duplicate list button when all personal cards are archived');
 const empty=premiumEveningHtml({...base,ownChallengeCount:0,nextChallenge:null});
 assert.match(empty,/Tous les tirages sont terminés/);
 assert.doesNotMatch(empty,/data-action="evening-list"/);
 const finished=premiumEveningHtml({...base,
  turn:{...base.turn,finished:true},nextChallenge:{id:'old',status:'accepted'}});
 assert.match(finished,/data-action="finish-session"/,
  'Official session completion still takes priority over an old card');
 assert.doesNotMatch(finished,/data-action="evening-start:old"/);
 const rolling=premiumEveningHtml({...base,rolling:true,rollingKind:'new-challenge',
  nextChallenge:{id:'old',status:'accepted'}});
 assert.doesNotMatch(rolling,/data-action="evening-start:old"|data-action="evening-list"/,
  'A live 3D die must not be unmounted by the resume shortcut');
});
test('LR-027: live Soirée chooses only this account’s unfinished card for the quick action',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf('function renderSession(){');
 const end=source.indexOf('function eveningCalendarReturn(){',start);
 assert.ok(start>=0&&end>start);
 const code=source.slice(start,end);
 assert.match(code,/const mineCards=session\?visibleEveningQueue\(ownEveningChallenges\(state\.challenges,uid,session\.id\)\)/);
 assert.match(code,/const nextChallenge=mineCards\.find\(card=>card\.status==='accepted'\)\|\|/);
 assert.match(code,/mineCards\.find\(card=>card\.status==='proposed'\)/);
 assert.match(code,/ownChallengeCount:mineCards\.length,nextChallenge/);
 const action=source.slice(source.indexOf("if(verb==='evening-start'){"),
  source.indexOf("if(verb==='surprise-activity'){"));
 // A queued/rolling D100 remains the only active scene. An old tap
 // on "Commencer" cannot trigger a private RPC while it is in motion.
 const {runInNewContext}=await import('node:vm');
 for(const diceStatus of ['pending','rolling','settled']){
  let changed=false;
  const route=runInNewContext('(async verb=>{'+action+'})',{
   state:{diceStatus},parts:['private-card'],
   isEveningCardCompleting:()=>{changed=true;throw Error('start continued');}
  });
  await route('evening-start');
  assert.equal(changed,false,'Start must be blocked during '+diceStatus);
 }
 assert.match(action,/ownEveningChallenges\(state\.challenges,startContext\.userId,startContext\.sessionId\)/,
  'The one-tap start route revalidates the original user and session');
 assert.match(action,/rpc\('answer_challenge',\{p_id:picked\.id,p_status:'accepted'\}\)/,
  'A proposed card must be accepted by the server, not only by local UI');
 assert.match(action,/if\(!isCurrentStart\(\)\)return/,
  'Old account responses cannot start a new login’s timer');
});

test('LR-027: private-card Passer and Refuser remain visible with truthful server availability',()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const controls=source.indexOf('lr-redraw-actions" aria-label="Autres choix pour ce défi"');
 const from=source.lastIndexOf("(['proposed','accepted'].includes(view.status)?",controls);
 const until=source.indexOf('(view&&state.eveningRefusalId===view.id?',controls);
 assert.ok(from>0&&until>from,'The original private-card choice template must exist');
 const expr=source.slice(from,until).trim().replace(/\+\s*$/,'');
 const render=new Function('view','state','button','safe',
  'isActiveEveningRedrawPending','isEveningCardCompleting','giftTransferPending','return '+expr+';');
 const button=(action,label,attr='')=>'<button data-action="'+action+'" '+attr+'>'+label+'</button>';
 const pick=(status,ready,quota=null,gifting=false)=>render({id:'private-card',status},{
  redrawReady:ready,monthlyPassQuota:quota
 },button,x=>String(x),()=>false,()=>false,gifting);
 for(const status of ['proposed','accepted']){
  const offline=pick(status,false);
  assert.match(offline,/data-action="evening-pass:private-card"/);
  assert.match(offline,/data-action="evening-refuse:private-card"/);
  assert.equal((offline.match(/disabled aria-disabled="true"/g)||[]).length,2,
   'Both choices are visible but unclickable before server confirmation');
  assert.match(offline,/repige sera confirmée par le serveur/);
  const ready=pick(status,true,{used:1,limit:3,can_pass:true});
  assert.doesNotMatch(ready,/disabled aria-disabled/);
  assert.match(ready,/Passes ce mois : 1 \/ 3/);
  const gifting=pick(status,true,{used:1,limit:3,can_pass:true},true);
  assert.match(gifting,/data-action="evening-pass:private-card"[^>]*disabled/);
  assert.match(gifting,/data-action="evening-refuse:private-card"[^>]*disabled/);
  const limit=pick(status,true,{used:3,limit:3,can_pass:false});
  assert.match(limit,/data-action="evening-pass:private-card"[^>]*disabled/);
  assert.doesNotMatch(limit,/data-action="evening-refuse:private-card"[^>]*disabled/,
   'Monthly Passer limit never locks the separate Refuser action');
 }
 assert.equal(pick('completed',false),'','Archived cards cannot be redrawn');
});

test('LR-027: delayed personal-card touches cannot interrupt or mutate a rolling D100',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const {runInNewContext}=await import('node:vm');
 const fromOpen=source.indexOf("if(verb==='evening-open'){");
 const untilOpen=source.indexOf("if(verb==='evening-refuse'){",fromOpen);
 const fromDecision=source.indexOf("if(verb==='evening-refuse'){");
 const untilDecision=source.indexOf("if(verb==='evening-start'){",fromDecision);
 assert.ok(fromOpen>=0&&untilOpen>fromOpen&&fromDecision>=0&&untilDecision>fromDecision,
  'Production routes for the queue and private decisions are present');
 const open=source.slice(fromOpen,untilOpen);
 const decide=source.slice(fromDecision,untilDecision);
 for(const diceStatus of ['pending','rolling','settled']){
  let writes=0,renders=0;
  const state={diceStatus,redrawReady:true,eveningRefusalId:null};
  const context={state,rpc:()=>{writes++;throw Error('Stale touch reached RPC');},
   render:()=>{renders++;},isActiveEveningRedrawPending:()=>false,
   isActiveEveningGiftPending:()=>false,
   isEveningCardCompleting:()=>false};
  const openRoute=runInNewContext('(async (verb,parts)=>{'+open+'})',context);
  const decisionRoute=runInNewContext('(async (verb,parts)=>{'+decide+'})',context);
  await openRoute('evening-open',['private-card']);
  for(const verb of ['evening-refuse','evening-pass','evening-refuse-choice']){
   const args=verb==='evening-refuse-choice'?['private-card','yes']:['private-card'];
   await decisionRoute(verb,args);
  }
  assert.equal(writes,0,'No redraw or reply during '+diceStatus);
  assert.equal(renders,0,'The live WebGL scene must not be remounted during '+diceStatus);
  assert.equal(state.eveningRefusalId,null,'A stale refusal must not open a modal');
 }
 // Even without a die animation, a repick already awaiting the server
 // must not reopen another refusal dialog from an older click.
 let renders=0;
 const state={diceStatus:null,redrawReady:true,eveningRefusalId:null};
 const decideDuringRepick=runInNewContext('(async (verb,parts)=>{'+decide+'})',{
  state,isActiveEveningRedrawPending:()=>true,
  isEveningCardCompleting:()=>false,render:()=>{renders++;}
 });
 await decideDuringRepick('evening-refuse',['private-card']);
 assert.equal(state.eveningRefusalId,null);
 assert.equal(renders,0);
});

test('LR-027: one pending repick blocks starting another private card',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const from=source.indexOf("if(verb==='evening-start'){");
 const until=source.indexOf("if(verb==='surprise-activity'){",from);
 assert.ok(from>0&&until>from,'Use the production Start action');
 const {runInNewContext}=await import('node:vm');
 let called=0;
 const route=runInNewContext('(async (verb,parts)=>{'+source.slice(from,until)+'})',{
  state:{diceStatus:null,redrawBusyContext:{challengeId:'card-already-passing'}},
  isActiveEveningGiftPending:()=>false,
  isActiveEveningRedrawPending:()=>true,
  isEveningCardCompleting:()=>false,
  unlockLoveRollSounds:()=>{called++;},
  rpc:()=>{called++;throw Error('Must not accept another card while redrawing');}
 });
 await route('evening-start',['another-personal-card']);
 assert.equal(called,0,
  'A repick on one card must settle before another card can be started');
});

test('LR-027: terminal session actions wait for an in-flight Passer or Refuser',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const {runInNewContext}=await import('node:vm');
 const routes=[
  ["evening-close-request","evening-close-confirm"],
  ["evening-close-confirm","evening-challenge"],
  ["finish-session","cancel-session"],
  ["cancel-session","dismiss-cancel"],
  ["confirm-cancel","advent-open"]
 ];
 for(const [verb,nextVerb] of routes){
  const start=source.indexOf("if(verb==='"+verb+"'){");
  const end=nextVerb==='evening-challenge'
   ?source.indexOf("if(verb==='evening-challenge'||verb==='evening-list'){",start)
   :source.indexOf("if(verb==='"+nextVerb+"'){",start);
  assert.ok(start>0&&end>start,'Real production route '+verb);
  const code=source.slice(start,end);
  assert.match(code,/isActiveEveningRedrawPending\(\)\|\|isActiveEveningGiftPending\(\)/,
   'Session transition must block pending redraws and gifts');
  for(const diceStatus of [null,'rolling']){
   const state={diceStatus,session:{id:'night-one',started_at:'2026-10-31T19:00:00Z'},
    user:{id:'alice'},coupleId:'couple-one',tab:'session',
    confirmCancel:false,eveningMore:true,showEveningChallenges:true};
   let writes=0,renders=0,closures=0;
   const run=runInNewContext('(async verb=>{'+code+'})',{
    state,isActiveEveningRedrawPending:()=>true,
    render:()=>{renders++;},rpc:()=>{writes++;throw Error('Terminal RPC during redraw');},
    eveningClosureGate:{begin:()=>{closures++;throw Error('Closure during redraw');}}
   });
   await run(verb);
   assert.equal(writes,0,verb+' must not write while a redraw is pending');
   assert.equal(closures,0,verb+' must not acquire closure lock');
   assert.equal(renders,0,verb+' must preserve the in-flight view');
   assert.equal(state.confirmCancel,false);
   assert.equal(state.tab,'session');
  }
 }
 // The restriction must not permanently disable normal closure dialogs.
 for(const [verb,nextVerb] of [['evening-close-request','evening-close-confirm'],
  ['cancel-session','dismiss-cancel']]){
  const start=source.indexOf("if(verb==='"+verb+"'){");
  const end=source.indexOf("if(verb==='"+nextVerb+"'){",start);
  const state={diceStatus:null,session:{id:'night-one'},
   confirmCancel:false,eveningMore:true};
  let renders=0;
  const run=runInNewContext('(async verb=>{'+source.slice(start,end)+'})',{
   state,isActiveEveningRedrawPending:()=>false,
   isActiveEveningGiftPending:()=>false,render:()=>{renders++;}
  });
  await run(verb);
  assert.equal(state.confirmCancel,true,'The normal closure request stays available');
  assert.equal(renders,1);
 }
});

test('LR-027: private queue and native Back preserve a rolling D100 or pending repick',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const {runInNewContext}=await import('node:vm');
 const actionRoutes=[
  {start:"if(verb==='evening-challenge'||verb==='evening-list'){",
   end:"if(verb==='favorite-remove'){",
   verbs:['evening-challenge','evening-list','evening-close']},
  {start:"if(verb==='evening-favorite'){",
   end:"if(verb==='evening-open'){",verbs:['evening-favorite']},
  {start:"if(verb==='evening-open'){",
   end:"if(verb==='evening-refuse'){",verbs:['evening-open']},
  {start:"if(verb==='evening-refuse-cancel'){",
   end:"if(verb==='evening-pass'||verb==='evening-refuse-choice'){",
   verbs:['evening-refuse-cancel']}
 ];
 for(const route of actionRoutes){
  const start=source.indexOf(route.start);
  const end=source.indexOf(route.end,start);
  assert.ok(start>0&&end>start,'Real queue route '+route.start);
  const snippet=source.slice(start,end);
  const guarded=runInNewContext('(async (verb,parts)=>{'+snippet+'})',{
   state:{diceStatus:'rolling',tab:'session',eveningRefusalId:'card'},
   isActiveEveningRedrawPending:()=>false,
   render:()=>{throw Error('Must not remount D100')},
   root:{querySelector:()=>{throw Error('Must not replace focus')}}
  });
  for(const verb of route.verbs)await guarded(verb,['card']);
  const pending=runInNewContext('(async (verb,parts)=>{'+snippet+'})',{
   state:{diceStatus:null,tab:'session',eveningRefusalId:'card'},
   isActiveEveningGiftPending:()=>false,
   isActiveEveningRedrawPending:()=>true,
   render:()=>{throw Error('Must not repaint before repick confirmation')}
  });
  for(const verb of route.verbs)await pending(verb,['card']);
 }
 const from=source.indexOf('function backFromLoveRoll(){');
 const until=source.indexOf('window.loveRollHandleBack=backFromLoveRoll;',from);
 assert.ok(from>0&&until>from,'Real native Back handler');
 for(const reason of ['rolling','redraw']){
  const state={tab:'session',diceStatus:reason==='rolling'?'rolling':null,
   eveningRefusalId:'card',showEveningChallenges:true};
  let renders=0;
  const back=runInNewContext(source.slice(from,until)+'\nbackFromLoveRoll',{
   state,isActiveEveningRedrawPending:()=>reason==='redraw',
   document:{querySelector:()=>null},root:{_settingsMenuBack:()=>false},
   render:()=>{renders++;}
  });
  assert.equal(back(),true,'System Back is consumed safely');
  assert.equal(renders,0,'Pending card and 3D result must stay mounted');
  assert.equal(state.eveningRefusalId,'card');
  assert.equal(state.showEveningChallenges,true);
 }
 // No pending server decision: native Back must still dismiss the refusal.
 const state={tab:'session',diceStatus:null,eveningRefusalId:'card',
  showEveningChallenges:true};
 let renders=0;
 const back=runInNewContext(source.slice(from,until)+'\nbackFromLoveRoll',{
  state,isActiveEveningRedrawPending:()=>false,
  document:{querySelector:()=>null},root:{_settingsMenuBack:()=>false},
  render:()=>{renders++;}
 });
 assert.equal(back(),true);
 assert.equal(state.eveningRefusalId,null);
 assert.equal(renders,1);
});

test('LR-027: pending repick protects tab, calendar and next D100 from stale events',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const {runInNewContext}=await import('node:vm');
 const branches=[
  {verb:'evening-more',start:"if(verb==='evening-more'){",
   end:"if(verb==='evening-calendar'){"},
  {verb:'evening-calendar',start:"if(verb==='evening-calendar'){",
   end:"if(verb==='evening-month-prev'||verb==='evening-month-next'){"},
  {verb:'tab',start:"if(verb==='tab'){",
   end:"if(['review-save','evening-close-confirm'"},
  {verb:'new-challenge',start:"if(verb==='new-challenge'){",
   end:"if(verb==='answer'){"}
 ];
 for(const {verb,start,end} of branches){
  const from=source.indexOf(start),until=source.indexOf(end,from);
  assert.ok(from>0&&until>from,'Use production route for '+verb);
  const snippet=source.slice(from,until);
  assert.match(snippet,/isActiveEveningRedrawPending\(\)/);
  const state={tab:'session',diceStatus:null,session:{id:'night-one'},
   eveningMore:false,confirmCancel:false,category:'SENSUEL'};
  let renders=0,mutations=0;
  const run=runInNewContext('(async (verb,parts)=>{'+snippet+'})',{
   state,isActiveEveningRedrawPending:()=>true,
   render:()=>{renders++;},rpc:()=>{mutations++;throw Error('Unexpected server RPC')},
   animateRoll:()=>{mutations++;throw Error('Unexpected dice animation')},
   eveningLocalDay:()=>{throw Error('Stale event changed date')}
  });
  await run(verb,verb==='tab'?['home']:[]);
  assert.equal(renders,0,verb+' must keep the in-flight recipient view');
  assert.equal(mutations,0,verb+' must not send a D100/RPC');
  assert.equal(state.tab,'session');
  assert.equal(state.eveningMore,false);
  assert.equal(state.confirmCancel,false);
 }
 // Neither the calendar nor the overflow menu is permanently disabled.
 const from=source.indexOf("if(verb==='evening-more'){");
 const until=source.indexOf("if(verb==='evening-calendar'){",from);
 const state={tab:'session',diceStatus:null,eveningMore:false};
 let renders=0;
 const openMenu=runInNewContext('(async verb=>{'+source.slice(from,until)+'})',{
  state,isActiveEveningRedrawPending:()=>false,
  isActiveEveningGiftPending:()=>false,render:()=>{renders++;}
 });
 await openMenu('evening-more');
 assert.equal(state.eveningMore,true);
 assert.equal(renders,1);
 // Android Back must also consume a pending redraw even without an open card.
 const backStart=source.indexOf('function backFromLoveRoll(){');
 const backEnd=source.indexOf('window.loveRollHandleBack=backFromLoveRoll;',backStart);
 assert.ok(backStart>0&&backEnd>backStart);
 const backState={tab:'session',diceStatus:null,showEveningChallenges:false,
  eveningRefusalId:null};
 const back=runInNewContext(source.slice(backStart,backEnd)+'\nbackFromLoveRoll',{
  state:backState,isActiveEveningRedrawPending:()=>true,
  document:{querySelector:()=>null},root:{_settingsMenuBack:()=>false},
  render:()=>{throw Error('Back must not navigate during a repick')}
 });
 assert.equal(back(),true);
 assert.equal(backState.tab,'session');
});

test('LR-027: active server repick is explained and temporarily locks conflicting gameplay',()=>{
 const state={...ready,category:'SENSUEL',ownChallengeCount:2,
  nextChallenge:{id:'private-a',status:'accepted'},giftCount:0,
  turn:{...ready.turn,ready:true,next:'a',drawsFinished:false,remaining:{a:2,b:2}}};
 const waiting=premiumEveningHtml({...state,redrawPending:true});
 assert.match(waiting,/Repige en cours de confirmation…/);
 assert.match(waiting,/class="evening-primary-status" role="status"/);
 assert.doesNotMatch(waiting,/data-action="new-challenge"/,
  'Do not show an apparently usable D100 while a server repick is pending');
 assert.doesNotMatch(waiting,/data-action="evening-start:private-a"/,
  'Do not show a start button blocked by the in-flight RLS refresh');
 assert.doesNotMatch(waiting,/data-action="evening-list"/,
  'Do not remount the private challenge queue during a repick');
 assert.match(waiting,/data-action="category:SENSUEL"[^>]*disabled/);
 assert.match(waiting,/data-action="my-d6"[^>]*disabled/);
 assert.match(waiting,/data-action="give-challenge"[^>]*disabled/);
 assert.match(waiting,/class="evening-manage"[^>]*disabled/);
 const restored=premiumEveningHtml({...state,redrawPending:false});
 assert.match(restored,/data-action="new-challenge"/);
 assert.match(restored,/data-action="evening-list"/);
 assert.doesNotMatch(restored,/Repige en cours de confirmation…/);
 const otherTurn=premiumEveningHtml({...state,redrawPending:false,
  turn:{...state.turn,next:'b'}});
 assert.match(otherTurn,/data-action="evening-start:private-a"/,
  'A completed repick restores personal challenge actions on the partner’s turn');
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const renderSession=source.slice(source.indexOf('function renderSession(){'),
  source.indexOf('function eveningCalendarReturn(){'));
 assert.match(renderSession,/redrawPending:isActiveEveningRedrawPending\(\)/,
  'The rendered state must come from the current authenticated session');
});

test('LR-027: personal completion and overlay buttons wait for a private server repick',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const {runInNewContext}=await import('node:vm');
 const from=source.indexOf("if(verb==='answer'){");
 const until=source.indexOf("if(verb==='finish-session'){",from);
 assert.ok(from>0&&until>from,'Official completion route is present');
 const route=source.slice(from,until);
 assert.match(route,/isActiveEveningRedrawPending\(\)\|\|isActiveEveningGiftPending\(\)/);
 let writes=0,renders=0;
 const run=runInNewContext('(async (verb,parts)=>{'+route+'})',{
  state:{user:{id:'alice'},session:{id:'night-one'},challenges:[]},
  isActiveEveningRedrawPending:()=>true,
  isEveningCardCompleting:()=>false,
  rpc:()=>{writes++;throw Error('Completion must not race repick')},
  render:()=>{renders++;}
 });
 await run('answer',['private-a','completed']);
 assert.equal(writes,0,'No competing answer_challenge RPC');
 assert.equal(renders,0,'No stale repaint while RLS refresh is pending');
 const personalOverlay=source.slice(source.indexOf('const selected=mineCards.find('),
  source.indexOf('frame(premiumEveningHtml({'));
 assert.match(personalOverlay,/button\('evening-start:'\+view\.id,[\s\S]*?isActiveEveningRedrawPending\(\)/,
  'The private Start control must expose its pending/disabled state');
 assert.match(personalOverlay,/button\('answer:'\+view\.id\+':completed',[\s\S]*?isActiveEveningRedrawPending\(\)/,
  'The private Complete control must expose its pending/disabled state');
 assert.match(personalOverlay,/button\('evening-favorite:'\+view\.id,[\s\S]*?isActiveEveningRedrawPending\(\)/,
  'Favorites must not repaint the view during a pending repick');
 assert.match(personalOverlay,/Confirmation en cours/);
});

test('LR-027: delayed D6, category, gift and resume touches cannot race a private repick',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const {runInNewContext}=await import('node:vm');
 const routes=[
  {verb:'my-d6',start:"if(verb==='my-d6'){",end:"if(verb==='category'){"},
  {verb:'category',start:"if(verb==='category'){",end:"if(verb==='session-length'){"},
  {verb:'give-challenge',start:"if(verb==='give-challenge'){",end:"if(verb==='new-challenge'){"},
  {verb:'resume-evening',start:"if(verb==='resume-evening'){",end:"if(verb==='tab'){"}
 ];
 for(const {verb,start,end} of routes){
  const from=source.indexOf(start),until=source.indexOf(end,from);
  assert.ok(from>0&&until>from,'Use the real '+verb+' action');
  const code=source.slice(from,until);
  assert.match(code,/isActiveEveningRedrawPending\(\)/,verb+' needs an in-flight repick guard');
  let sideEffects=0;
  const state={tab:'session',diceStatus:null,session:{id:'night-1'},
   category:null,user:{id:'alice'}};
  const route=runInNewContext('(async (verb,parts)=>{'+code+'})',{
   state,isActiveEveningGiftPending:()=>false,isActiveEveningRedrawPending:()=>true,
   eveningCategoryConfirmInFlight:false,
   rpc:()=>{sideEffects++;throw Error('Unexpected RPC')},
   animateRoll:()=>{sideEffects++;throw Error('Unexpected D6')},
   updateEveningCategoryUi:()=>{sideEffects++;throw Error('Unexpected selection')},
   refreshShared:()=>{sideEffects++;throw Error('Unexpected RLS reload')},
   premiumConfirm:()=>{sideEffects++;throw Error('Unexpected confirmation')},
   render:()=>{sideEffects++;throw Error('Unexpected repaint')}
  });
  await route(verb,verb==='category'?['SENSUEL']:[]);
  assert.equal(sideEffects,0,verb+' must not have any side effects');
  assert.equal(state.tab,'session');
  assert.equal(state.category,null);
 }
});
test('LR-027: a gift confirmation that resolves after a repick starts never sends an RPC',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const from=source.indexOf("if(verb==='give-challenge'){");
 const until=source.indexOf("if(verb==='new-challenge'){",from);
 assert.ok(from>0&&until>from);
 const {runInNewContext}=await import('node:vm');
 const code=source.slice(from,until);
 assert.match(code,/const ownsGift=\(\)=>!state\.diceStatus&&!isActiveEveningRedrawPending\(\)/,
  'The confirmation must recheck the repick guard, not just its initial click');
 let resolveConfirmation,pending=false,writes=0;
 const state={tab:'session',diceStatus:null,user:{id:'alice'},coupleId:'couple-1',
  session:{id:'night-1',paired_turns:true,self_draws:true},
  rollStatus:{both_ready:true},eveningBoard:{ready:true,remaining:{alice:2}},
  gifts:[],members:[],personal:[],challenges:[]};
 const confirmation=new Promise(resolve=>{resolveConfirmation=resolve;});
 const route=runInNewContext('(async verb=>{'+code+'})',{
  state,authFeedbackGeneration:1,
  isActiveEveningGiftPending:()=>!!(state.eveningGiftRequest&&
   state.eveningGiftRequest.userId===state.user?.id&&
   state.eveningGiftRequest.sessionId===state.session?.id),
  isActiveEveningRedrawPending:()=>pending,
  other:()=>({name:'Émilie'}),month:()=> '2026-10',
  premiumConfirm:()=>confirmation,render:()=>{},
  rpc:()=>{writes++;throw Error('Gift must not race repick')},
  refreshAndShow:()=>{writes++;throw Error('Stale refresh forbidden')},
  notify:()=>{writes++;throw Error('Stale toast forbidden')}
 });
 const task=route('give-challenge');
 pending=true;resolveConfirmation(true);
 await task;
 assert.equal(writes,0);
 assert.equal(state.tab,'session');
 // When no repick is running, gifting must remain usable and confirm once.
 pending=false;
 let sent=0,refreshed=0,toasted=0;
 const normal=runInNewContext('(async verb=>{'+code+'})',{
  state,authFeedbackGeneration:1,
  isActiveEveningGiftPending:()=>!!(state.eveningGiftRequest&&
   state.eveningGiftRequest.userId===state.user?.id&&
   state.eveningGiftRequest.sessionId===state.session?.id),
  isActiveEveningRedrawPending:()=>pending,
  other:()=>({name:'Émilie'}),month:()=> '2026-10',
  premiumConfirm:async()=>true,render:()=>{},
  rpc:async(name,args)=>{
   assert.equal(name,'give_love_challenge');
   assert.equal(args.p_session,'night-1');
   sent++;
  },
  refreshAndShow:async()=>{refreshed++;},
  notify:()=>{toasted++;}
 });
 await normal('give-challenge');
 assert.equal(sent,1,'The valid gift is submitted exactly once');
 assert.equal(refreshed,1,'The evening updates after an authorized gift');
 assert.equal(toasted,1,'Only a confirmed gift displays feedback');
});

test('LR-027: repick starting during category confirmation cancels the stale D100',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf("if(verb==='new-challenge'){");
 const end=source.indexOf("if(verb==='answer'){",start);
 assert.ok(start>0&&end>start);
 const code=source.slice(start,end);
 assert.match(code,/const ownsDraw=\(\)=>ownsEveningCategoryDraw\(state,drawOwner,authFeedbackGeneration\)&&\s*!isActiveEveningRedrawPending\(\)/);
 const {runInNewContext}=await import('node:vm');
 const createRun=(state,settings)=>runInNewContext(
  '(()=>{let eveningCategoryConfirmInFlight=false;return async verb=>{'+code+'}})()',{
   state,authFeedbackGeneration:1,EVENING_CATEGORIES:['SENSUEL','SEXUEL'],
   isActiveEveningRedrawPending:()=>settings.pending,
   isActiveEveningGiftPending:()=>settings.giftPending===true,
   ownsEveningCategoryDraw:()=>true,categoryConfirmEnabled:()=>true,
   askEveningCategoryConfirmation:settings.confirm,
   animateRoll:settings.roll,localStorage:{},
   sessionStorage:{removeItem:()=>{}},
   render:settings.render
  });
 const state=()=>({user:{id:'alice'},coupleId:'duo',session:{id:'night'},
  tab:'session',category:'SENSUEL',couple:{},profile:{}});
 let release,pending=false,rolls=0,renders=0;
 const confirmation=new Promise(resolve=>{release=resolve;});
 const stale=createRun(state(),{
  get pending(){return pending;},confirm:()=>confirmation,
  roll:()=>{rolls++;throw Error('Stale official D100 must not roll')},
  render:()=>{renders++;}
 });
 const task=stale('new-challenge');
 pending=true;release({confirmed:true,neverShow:false});
 await task;
 assert.equal(rolls,0);
 assert.equal(renders,0);
 // Confirmation remains useful when no private repick takes ownership.
 const allowedState=state();
 const allowed=createRun(allowedState,{
  pending:false,confirm:async()=>({confirmed:true,neverShow:false}),
  roll:async()=>{rolls++;return {id:'card-a',recipient:'partner'};},
  render:()=>{renders++;}
 });
 await allowed('new-challenge');
 assert.equal(rolls,1,'One confirmed D100 still runs normally');
 assert.equal(renders,1);
 assert.equal(allowedState.category,null,'Category resets after official draw');
});

test('LR-027: Resume Soirée ignores stale identity, tab, superseding read and repick',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=source.indexOf("if(verb==='resume-evening'){");
 const end=source.indexOf("if(verb==='tab'){",start);
 assert.ok(start>0&&end>start);
 const code=source.slice(start,end);
 const {runInNewContext}=await import('node:vm');
 for(const stale of ['account','tab','new-refresh','repick','dice']){
  const state={user:{id:'alice'},coupleId:'duo',tab:'home',session:null,
   weekly:null,unscopedSharedRefreshRequest:null,diceStatus:null,
   showEveningChallenges:false};
  let finish,renderCount=0,notifications=0,pending=false;
  const request={};
  const resume=runInNewContext('(async verb=>{'+code+'})',{
   state,authFeedbackGeneration:1,
   isActiveEveningRedrawPending:()=>pending,
   isActiveEveningGiftPending:()=>false,
   isSharedCoupleReady:()=>true,
   refreshShared:()=>{
    state.unscopedSharedRefreshRequest=request;
    return new Promise(resolve=>{finish=resolve;});
   },
   playableSessionForWeekly:()=>null,
   render:()=>{renderCount++;},
   notify:()=>{notifications++;}
  });
  const operation=resume('resume-evening');
  if(stale==='account')state.user={id:'bob'};
  if(stale==='tab')state.tab='special';
  if(stale==='new-refresh')state.unscopedSharedRefreshRequest={};
  if(stale==='repick')pending=true;
  if(stale==='dice')state.diceStatus='pending';
  finish();await operation;
  assert.equal(renderCount,0,'Do not repaint after '+stale);
  assert.equal(notifications,0,'No outdated feedback after '+stale);
 }
 // The ordinary resume still reports a session that actually expired.
 const state={user:{id:'alice'},coupleId:'duo',tab:'home',session:null,
  weekly:null,diceStatus:null,unscopedSharedRefreshRequest:null};
 let rendered=0,feedback=0;
 const resume=runInNewContext('(async verb=>{'+code+'})',{
  state,authFeedbackGeneration:1,
  isActiveEveningRedrawPending:()=>false,
  isActiveEveningGiftPending:()=>false,
  isSharedCoupleReady:()=>true,
  refreshShared:async()=>{state.unscopedSharedRefreshRequest={};},
  playableSessionForWeekly:()=>null,
  render:()=>{rendered++;},notify:()=>{feedback++;}
 });
 await resume('resume-evening');
 assert.equal(state.tab,'home');
 assert.equal(rendered,1);
 assert.equal(feedback,1);
});

test('LR-027: duplicate Give taps cannot open a second dialog or write two gifts',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const from=source.indexOf("if(verb==='give-challenge'){");
 const until=source.indexOf("if(verb==='new-challenge'){",from);
 assert.ok(from>0&&until>from);
 const code=source.slice(from,until);
 const {runInNewContext}=await import('node:vm');
 const state={tab:'session',diceStatus:null,user:{id:'alice'},coupleId:'couple',
  session:{id:'night',paired_turns:true,self_draws:true},
  rollStatus:{both_ready:true},eveningBoard:{ready:true,remaining:{alice:2}},
  gifts:[],members:[],personal:[],challenges:[],eveningGiftRequest:null};
 let confirmResolve,rpcResolve,dialogs=0,writes=0,paints=0,refreshes=0,notices=0;
 const dialog=new Promise(resolve=>{confirmResolve=resolve;});
 const rpcPending=new Promise(resolve=>{rpcResolve=resolve;});
 const run=runInNewContext('(async verb=>{'+code+'})',{
  state,authFeedbackGeneration:1,
  isActiveEveningGiftPending:()=>!!(state.eveningGiftRequest&&
   state.eveningGiftRequest.userId===state.user?.id&&
   state.eveningGiftRequest.sessionId===state.session?.id),
  isActiveEveningRedrawPending:()=>false,
  other:()=>({name:'Partenaire'}),month:()=> '2026-10',
  premiumConfirm:()=>{dialogs++;return dialog;},
  rpc:async name=>{
   assert.equal(name,'give_love_challenge');writes++;
   return rpcPending;
  },
  refreshAndShow:async()=>{refreshes++;},
  notify:()=>{notices++;},
  render:()=>{paints++;}
 });
 const first=run('give-challenge');
 assert.equal(dialogs,1);
 assert.equal(state.eveningGiftRequest?.userId,'alice');
 await run('give-challenge');
 assert.equal(dialogs,1,'Duplicate tap never opens a second modal');
 confirmResolve(true);
 // The confirm promise, action handler and server spy each take microtasks;
 // wait one actual event-loop turn rather than relying on their internal order.
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(writes,1,'First confirmed gift starts exactly one RPC');
 await run('give-challenge');
 assert.equal(writes,1,'Duplicate tap during RPC never sends a second gift');
 rpcResolve();await first;
 assert.equal(state.eveningGiftRequest,null,'Gift lock clears after completion');
 assert.equal(writes,1);
 assert.equal(refreshes,1);
 assert.equal(notices,1);
 assert.ok(paints>=2,'Busy indicator is shown and reset');
 const busy=premiumEveningHtml({...ready,giftPending:true,giftCount:0});
 assert.match(busy,/Don en cours…/);
 assert.match(busy,/Don en cours de confirmation…/);
 assert.match(busy,/data-action="give-challenge"[^>]*disabled/);
 assert.match(busy,/data-action="my-d6"[^>]*disabled/);
 assert.match(busy,/data-action="category:SENSUEL"[^>]*disabled/);
 assert.doesNotMatch(busy,/data-action="new-challenge"/);
 const free=premiumEveningHtml({...ready,giftPending:false,giftCount:0});
 assert.doesNotMatch(free,/Don en cours…/);
 assert.match(free,/data-action="new-challenge"/);
});

test('LR-027: cancelled gift unlocks and an old login cannot clear a newer gift',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const from=source.indexOf("if(verb==='give-challenge'){");
 const until=source.indexOf("if(verb==='new-challenge'){",from);
 const {runInNewContext}=await import('node:vm');
 const code=source.slice(from,until);
 const state={tab:'session',diceStatus:null,user:{id:'alice'},coupleId:'duo',
  session:{id:'night',paired_turns:true,self_draws:true},
  rollStatus:{both_ready:true},eveningBoard:{ready:true,remaining:{alice:2,bob:2}},
  gifts:[],members:[],personal:[],challenges:[],eveningGiftRequest:null};
 let releaseFirst,dialogCount=0,rpcCalls=0;
 const firstDialog=new Promise(resolve=>{releaseFirst=resolve;});
 const run=runInNewContext('(async verb=>{'+code+'})',{
  state,authFeedbackGeneration:1,
  isActiveEveningGiftPending:()=>!!(state.eveningGiftRequest&&
   state.eveningGiftRequest.userId===state.user?.id&&
   state.eveningGiftRequest.sessionId===state.session?.id),
  isActiveEveningRedrawPending:()=>false,
  other:()=>({name:'Partenaire'}),month:()=> '2026-10',
  premiumConfirm:()=>++dialogCount===1?firstDialog:Promise.resolve(false),
  rpc:()=>{rpcCalls++;throw Error('Cancelled gifts must not write');},
  refreshAndShow:()=>{throw Error('Cancelled gift must not refresh');},
  notify:()=>{throw Error('Cancelled gift must not toast');},
  render:()=>{}
 });
 const stale=run('give-challenge');
 assert.equal(state.eveningGiftRequest?.userId,'alice');
 state.user={id:'bob'};
 const next=run('give-challenge');
 assert.equal(dialogCount,2,'A different user is not blocked by the old lock');
 assert.equal(state.eveningGiftRequest?.userId,'bob');
 releaseFirst(true);
 await Promise.all([stale,next]);
 assert.equal(rpcCalls,0);
 assert.equal(state.eveningGiftRequest,null,
  'The old request never clears the newer user’s gift lock');
 await run('give-challenge');
 assert.equal(dialogCount,3,'The cancelled request releases its owner lock');
});

test('LR-027: a pending gift prevents thirteen conflicting Soirée actions',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const {runInNewContext}=await import('node:vm');
 const protectedActions=[
  'evening-close-request','evening-close-confirm','evening-refuse',
  'evening-refuse-cancel','evening-pass','evening-start','answer',
  'finish-session','cancel-session','confirm-cancel','evening-calendar',
  'tab','resume-evening'
 ];
 for(const verb of protectedActions){
  const marker=verb==='evening-pass'?
   "if(verb==='evening-pass'||verb==='evening-refuse-choice'){":
   "if(verb==='"+verb+"'){";
  const from=source.indexOf(marker);
  const until=verb==='tab'?
   source.indexOf("\n if(['review-save'",from):
   source.indexOf("\n if(verb===",from+marker.length);
  assert.ok(from>0&&until>from,verb+' must exist in production');
  const snippet=source.slice(from,until);
  assert.match(snippet,/isActiveEveningGiftPending\(\)/,verb+' must check active gift');
  let renders=0,writes=0;
  const state={tab:'session',diceStatus:null,
   user:{id:'alice'},session:{id:'night'},eveningRefusalId:'card'};
  const forbidden=()=>{writes++;throw Error('Stale '+verb+' crossed pending gift')};
  const action=runInNewContext('(async (verb,parts)=>{'+snippet+'})',{
   state,isActiveEveningGiftPending:()=>true,
   isActiveEveningRedrawPending:()=>false,
   isEveningCardCompleting:forbidden,
   render:()=>{renders++;throw Error('Unexpected repaint')},
   rpc:forbidden,root:{querySelector:forbidden},
   ownEveningChallenges:forbidden
  });
  await action(verb,['card']);
  assert.equal(writes,0,'No server or state mutation during gift: '+verb);
  assert.equal(renders,0,'No screen repaint during gift: '+verb);
  assert.equal(state.tab,'session');
 }
});

test('LR-027: gift completion restores cancellation and calendar navigation',async()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const {runInNewContext}=await import('node:vm');
 for(const {verb,ending} of [
  {verb:'cancel-session',ending:"if(verb==='dismiss-cancel'){"},
  {verb:'evening-refuse-cancel',ending:"if(verb==='evening-pass'||verb==='evening-refuse-choice'){"},
  {verb:'evening-calendar',ending:"if(verb==='evening-month-prev'||verb==='evening-month-next'){"}
 ]){
  const marker="if(verb==='"+verb+"'){";
  const from=source.indexOf(marker);
  const until=source.indexOf(ending,from);
  assert.ok(from>0&&until>from);
  const state={tab:'session',diceStatus:null,session:null,
   confirmCancel:false,eveningRefusalId:'card',eveningMore:false};
  let paints=0,focus=0;
  const run=runInNewContext('(async (verb,parts)=>{'+source.slice(from,until)+'})',{
   state,isActiveEveningGiftPending:()=>false,
   isActiveEveningRedrawPending:()=>false,
   render:()=>{paints++;},
   root:{querySelector:()=>({focus:()=>{focus++;}})},
   eveningLocalDay:()=>null
  });
  await run(verb,[]);
  assert.equal(paints,1,'Control reactivates after gift: '+verb);
  if(verb==='cancel-session')assert.equal(state.confirmCancel,true);
  if(verb==='evening-refuse-cancel'){
   assert.equal(state.eveningRefusalId,null);
   assert.equal(focus,1);
  }
  if(verb==='evening-calendar')assert.equal(state.tab,'evening-calendar');
 }
});
