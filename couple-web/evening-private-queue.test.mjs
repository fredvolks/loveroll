import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownEveningChallenges,visibleEveningQueue,queuePosition,queueLabel,hasTurnToDraw,eveningRedrawFeedback,isValidEveningRedrawReceipt,isPersistedEveningRedrawReceipt,isSameEveningResponseContext,redrawTimerRecovery} from './evening-private-queue.mjs';
import {premiumEveningHtml} from './premium-evening.mjs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('./migrations/20261015_evening_private_challenge_queue.sql',import.meta.url),'utf8');
const a={id:'challenge-a',recipient:'fred',session_id:'s1',status:'proposed',created_at:'2026-10-15T19:00:00Z',face:33,category:'SENSUEL',card_title:'Massage 10 minutes',card_description:'Faire un massage',card_timer_minutes:10};
const b={id:'challenge-b',recipient:'partner',session_id:'s1',status:'proposed',created_at:'2026-10-15T19:01:00Z',face:5,category:'SEXUEL',card_title:'Défi privé partenaire'};
const c={id:'challenge-c',recipient:'fred',session_id:'s1',status:'accepted',created_at:'2026-10-15T19:03:00Z',face:7,category:'SENSUEL',card_title:'Défi plus tard'};
test('LR-026: evening feedback shows committed RPC decision, not tapped button',()=>{
 const pass={original_id:'old',replacement_id:'new',action:'pass',
  excluded:false,already_processed:false,replacement_unavailable:false};
 const refused={...pass,action:'refuse',excluded:true,already_processed:true};
 const refusedKept={...refused,excluded:false};
 assert.equal(eveningRedrawFeedback(pass),
  'Défi passé — il pourra revenir plus tard.');
 assert.equal(eveningRedrawFeedback(refused),
  'Ce défi avait déjà reçu une réponse. Défi retiré du lot pour ce cycle.');
 assert.equal(eveningRedrawFeedback(refusedKept),
  'Ce défi avait déjà reçu une réponse. Défi conservé dans la pige.');
 assert.equal(eveningRedrawFeedback({...pass,already_processed:true}),
  'Ce défi avait déjà reçu une réponse. Défi passé — il pourra revenir plus tard.');
 assert.equal(eveningRedrawFeedback({...pass,action:'refuse',excluded:false}),
  'Défi conservé dans la pige.');
 assert.match(eveningRedrawFeedback({...refused,replacement_id:null,replacement_unavailable:true}),
  /avait déjà reçu une réponse.*Aucun autre défi admissible/);
 assert.match(app,/redrawFeedback=receiptValid&&!persistedReceiptValid/);
 assert.doesNotMatch(app,/redrawFeedback=outcome\?\.replacement_unavailable/);
});

test('LR-026: malformed or contradictory RPC receipts never yield false confirmations',()=>{
 const unknown=eveningRedrawFeedback({action:'refuse',already_processed:true});
 for(const result of [null,[],{},true,
  {action:'ban',excluded:true,already_processed:false},
  {action:'pass',excluded:true,already_processed:true},
  {action:'pass',excluded:false,already_processed:'true'},
  {action:'refuse',excluded:'true',already_processed:false},
  {original_id:'old',action:'pass',excluded:false,already_processed:false},
  {replacement_id:'new',action:'pass',excluded:false,already_processed:false},
  {original_id:'old',replacement_id:'old',action:'pass',
   excluded:false,already_processed:false},
  {original_id:'old',replacement_id:1,action:'refuse',
   excluded:true,already_processed:false},
  {original_id:17,replacement_id:'new',action:'pass',
   excluded:false,already_processed:true},
  {original_id:{id:'old'},replacement_id:'new',action:'refuse',
   excluded:true,already_processed:true},
  {original_id:[],replacement_id:'new',action:'pass',
   excluded:false,already_processed:true},
  {original_id:'old',replacement_id:'new',action:'pass',
   excluded:false,already_processed:false,replacement_unavailable:'false'}
 ]) assert.equal(eveningRedrawFeedback(result),unknown,
  'an invalid receipt must not be interpreted as a user choice');
 assert.match(unknown,/Vérifie la liste de tes défis/);
});

test('LR-026: client receipt rules track the two official PostgreSQL return shapes',()=>{
 const sql=readFileSync(new URL('./lr026-real-rpc-snapshot.sql',import.meta.url),'utf8');
 const start=sql.indexOf('-- love_respond_and_redraw');
 assert(start>0,'official Refuser/Passer RPC snapshot must be present');
 const redraw=sql.slice(start);
 const replayStart=redraw.indexOf('IF FOUND THEN');
 const replayEnd=redraw.indexOf('END IF;',replayStart);
 assert(replayStart>=0&&replayEnd>replayStart,
  'idempotent response branch must remain identifiable');
 const idempotent=redraw.slice(replayStart,replayEnd);
 assert.match(idempotent,/'already_processed',true/);
 assert.match(idempotent,/'replacement_id',v_prior\.replacement_id/);
 assert.doesNotMatch(idempotent,/replacement_unavailable/,
  'production SQL replay deliberately omits availability');
 const firstReceiptStart=redraw.lastIndexOf('RETURN jsonb_build_object(');
 assert(firstReceiptStart>replayEnd,
  'first decision must have its own receipt after idempotency check');
 const firstReceipt=redraw.slice(firstReceiptStart);
 assert.match(firstReceipt,/'replacement_unavailable',v_new_id IS NULL/);
 assert.match(firstReceipt,/'already_processed',false/);
 const first={original_id:'old',replacement_id:'new',
  action:'refuse',excluded:false,already_processed:false,
  replacement_unavailable:false};
 assert.equal(isValidEveningRedrawReceipt(first,'old'),true);
 assert.equal(isValidEveningRedrawReceipt({...first,replacement_unavailable:undefined},
  'old'),false,'first SQL receipt cannot omit availability');
 const replay={original_id:'old',replacement_id:'new',
  action:'refuse',excluded:false,already_processed:true};
 assert.equal(isValidEveningRedrawReceipt(replay,'old'),true,
  'SQL idempotent branch must remain valid without that property');
});

test('LR-026: first redraw requires explicit replacement availability before UI or timer success',()=>{
 const valid={original_id:'clicked-card',replacement_id:'replacement-card',
  action:'pass',excluded:false,already_processed:false,
  replacement_unavailable:false};
 // An incomplete first response may report a valid new UUID but is not
 // proof of a committed redraw: only the SQL replay may omit the flag.
 const partial={...valid};
 delete partial.replacement_unavailable;
 assert.equal(isValidEveningRedrawReceipt(valid,'clicked-card'),true);
 assert.equal(isValidEveningRedrawReceipt(partial,'clicked-card'),false);
 assert.match(eveningRedrawFeedback(partial,'clicked-card'),
  /Vérifie la liste de tes défis/);
 assert.equal(isValidEveningRedrawReceipt({...partial,already_processed:true},
  'clicked-card'),true,
  'production SQL omits replacement_unavailable only on idempotent replay');
 assert.equal(isValidEveningRedrawReceipt({...valid,replacement_unavailable:null},
  'clicked-card'),false);
 assert.equal(isValidEveningRedrawReceipt({...valid,replacement_unavailable:'false'},
  'clicked-card'),false);
 const unavailable={...valid,action:'refuse',replacement_id:null,
  replacement_unavailable:true};
 assert.equal(isValidEveningRedrawReceipt(unavailable,'clicked-card'),true);
 delete unavailable.replacement_unavailable;
 assert.equal(isValidEveningRedrawReceipt(unavailable,'clicked-card'),false,
  'missing flag and no replacement cannot be a valid first decision');
 // Never show a successful toast or stop a live timer from a partial receipt.
 const uncertain=eveningRedrawFeedback(partial,'clicked-card');
 assert.doesNotMatch(uncertain,/Défi passé|Défi retiré|Défi conservé/);
});

test('LR-026: valid receipt allows a warning when the category has no replacement',()=>{
 const warning=eveningRedrawFeedback({
  original_id:'old',replacement_id:null,
  action:'refuse',excluded:false,already_processed:false,
  replacement_unavailable:true
 });
 assert.match(warning,/Aucun autre défi admissible/);
 assert.doesNotMatch(warning,/Vérifie la liste de tes défis/);
 const invalid=eveningRedrawFeedback({
  original_id:'old',replacement_id:null,
  action:'refuse',excluded:false,already_processed:false,
  replacement_unavailable:false
 });
 assert.match(invalid,/Vérifie la liste de tes défis/);
});
test('LR-026: idempotent replay without available card accepts the real SQL receipt shape',()=>{
 // Snapshot RPC replay sends original_id/action/excluded/replacement_id/
 // already_processed but omits replacement_unavailable entirely.
 const original={original_id:'clicked-card',replacement_id:null,
  action:'refuse',excluded:true,already_processed:false,
  replacement_unavailable:true};
 const replay={original_id:'clicked-card',replacement_id:null,
  action:'refuse',excluded:true,already_processed:true};
 assert.equal(isValidEveningRedrawReceipt(original,'clicked-card'),true);
 assert.equal(isValidEveningRedrawReceipt(replay,'clicked-card'),true);
 assert.match(eveningRedrawFeedback(replay,'clicked-card'),
  /avait déjà reçu une réponse.*Aucun autre défi admissible/);
 assert.equal(isValidEveningRedrawReceipt(replay,'other-card'),false,
  'replay must still match the original challenge');
 assert.equal(isValidEveningRedrawReceipt({...replay,already_processed:false},'clicked-card'),false);
 assert.equal(isValidEveningRedrawReceipt({...replay,replacement_unavailable:false},'clicked-card'),false);
 assert.equal(isValidEveningRedrawReceipt({...replay,replacement_id:undefined},'clicked-card'),false);
 assert.equal(isValidEveningRedrawReceipt({...replay,replacement_id:'new-card'},'clicked-card'),true,
  'a successful replay with a real replacement stays valid');
 assert.equal(isValidEveningRedrawReceipt({...original,replacement_id:undefined},'clicked-card'),false);
});

test('LR-026: ambiguous or missing receipts never congratulate a stale device',()=>{
 const ambiguous=[
  {original_id:'old',replacement_id:'',action:'pass',
   excluded:false,already_processed:true},
  {original_id:1,replacement_id:'new',action:'refuse',
   excluded:true,already_processed:true},
  {original_id:'  ',replacement_id:'new',action:'pass',
   excluded:false,already_processed:true},
  {original_id:'old',replacement_id:'old',action:'refuse',
   excluded:true,already_processed:true}
 ];
 for(const receipt of ambiguous){
  assert.match(eveningRedrawFeedback(receipt),/Vérifie la liste de tes défis/);
 }
});

test('LR-026: receipt validator binds server decision to original clicked challenge',()=>{
 const pass={original_id:'clicked-card',replacement_id:'next-card',
  action:'pass',excluded:false,already_processed:false,
  replacement_unavailable:false};
 assert.equal(isValidEveningRedrawReceipt(pass,'clicked-card'),true);
 assert.equal(isValidEveningRedrawReceipt({...pass,already_processed:true},'clicked-card'),true);
 assert.equal(isValidEveningRedrawReceipt(pass,'different-card'),false);
 assert.match(eveningRedrawFeedback(pass,'different-card'),/Vérifie la liste de tes défis/);
 assert.equal(eveningRedrawFeedback(pass,'clicked-card'),
  'Défi passé — il pourra revenir plus tard.');
 assert.equal(isValidEveningRedrawReceipt({...pass,replacement_id:'clicked-card'},'clicked-card'),false);
 assert.equal(isValidEveningRedrawReceipt({...pass,replacement_id:'  '},'clicked-card'),false);
 assert.equal(isValidEveningRedrawReceipt({...pass,replacement_id:null,
  replacement_unavailable:false},'clicked-card'),false);
 assert.equal(isValidEveningRedrawReceipt({...pass,replacement_unavailable:true},'clicked-card'),false,
  'a nonempty replacement contradicts the unavailable flag');
 const unavailable={...pass,replacement_id:null,
  action:'refuse',replacement_unavailable:true};
 assert.equal(isValidEveningRedrawReceipt(unavailable,'clicked-card'),true);
 assert.equal(isValidEveningRedrawReceipt({...unavailable,replacement_id:'next-card'},'clicked-card'),false);
 assert.equal(isValidEveningRedrawReceipt({...pass,action:'pass',excluded:true},'clicked-card'),false);
 assert.equal(isValidEveningRedrawReceipt({...pass,already_processed:'false'},'clicked-card'),false);
});

test('LR-026: app checks original ID before selecting and confirming a new D100 challenge',()=>{
 assert.match(app,/const receiptValid=isValidEveningRedrawReceipt\(outcome,challengeId\)/);
 assert.match(app,/state\.selectedEveningChallengeId=receiptValid\?outcome\.replacement_id:null/);
 assert.match(app,/redrawFeedback=receiptValid&&!persistedReceiptValid/);
 assert.doesNotMatch(app,/state\.selectedEveningChallengeId=outcome\?\.replacement_id\|\|null/);
});

test('LR-026: redraw success requires original decision and replacement in recipient RLS view',()=>{
 const original={id:'clicked-card',recipient:'fred',session_id:'s1',
  couple_id:'duo-1',offered_by:'partner',status:'passed',
  category:'SENSUEL'};
 const replacement={id:'new-card',recipient:'fred',session_id:'s1',
  couple_id:'duo-1',offered_by:'partner',status:'proposed',
  category:'SENSUEL',replaces_challenge_id:'clicked-card'};
 const receipt={original_id:'clicked-card',replacement_id:'new-card',
  action:'pass',excluded:false,already_processed:false,
  replacement_unavailable:false};
 const verify=(rows,reply=receipt,recipient='fred',session='s1')=>
  isPersistedEveningRedrawReceipt(reply,rows,recipient,session);
 assert.equal(verify([original,replacement]),true);
 assert.equal(verify([replacement,original]),true,
  'server order must not affect the same physical D6 slot');
 assert.equal(verify([original,replacement,
  {...replacement,id:'duplicate-device-replacement'}]),false,
  'two device replies must never create two direct replacements for the same D6 slot');
 assert.equal(verify([original,replacement,
  {...replacement,id:'another-card',status:'completed',
   replaces_challenge_id:'another-original'}]),true,
  'a different legitimate D6 slot must not block this replacement');
 assert.equal(verify([original,replacement],{...receipt,already_processed:true}),true,
  'a second-device replay with unchanged SQL receipt remains valid');
 assert.equal(verify([original]),false,
  'never select or congratulate an invisible replacement');
 assert.equal(verify([replacement]),false,
  'replacement alone cannot prove the original Passer/Refuser decision');
 assert.equal(verify([{...original,status:'accepted'},replacement]),false);
 assert.equal(verify([original,{...replacement,replaces_challenge_id:'another-card'}]),false);
 assert.equal(verify([original,{...replacement,category:'SEXUEL'}]),false);
 assert.equal(verify([original,{...replacement,offered_by:'other-giver'}]),false);
 assert.equal(verify([original,{...replacement,couple_id:'other-couple'}]),false);
 assert.equal(verify([original,{...replacement,recipient:'partner'}]),false,
  'never expose cards belonging to the other person');
 assert.equal(verify([original,{...replacement,session_id:'s2'}]),false);
 assert.equal(verify([original,replacement],receipt,'partner'),false);
 assert.equal(verify([original,replacement],receipt,'fred','another-night'),false);
 assert.equal(verify([original,replacement],{...receipt,original_id:'other-card'}),false);
 const refused={...original,status:'refused'};
 const refuseReceipt={...receipt,action:'refuse',excluded:true};
 assert.equal(verify([refused,replacement],refuseReceipt),true);
 assert.equal(verify([original,replacement],refuseReceipt),false);
 const unavailable={...refuseReceipt,replacement_id:null,
  replacement_unavailable:true};
 assert.equal(verify([refused],unavailable),true,
  'a confirmed server exhaustion must not invent a replacement');
 assert.equal(verify([refused,replacement],unavailable),false,
  'a server claiming exhausted cards must not conceal a committed replacement');
 assert.equal(verify([{...refused,status:'proposed'}],unavailable),false);
 assert.equal(verify([refused],{...unavailable,already_processed:true,
  replacement_unavailable:undefined}),true,
  'SQL idempotency receipt may omit availability only on replay');
});

test('LR-026: UI waits for persisted redraw before stopping a live timer or confirming success',()=>{
 const start=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const end=app.indexOf("if(verb==='evening-start')",start);
 const code=app.slice(start,end);
 const refresh=code.indexOf('await refreshAndShow();');
 const storedCheck=code.indexOf('const persistedReceiptValid=');
 const stop=code.indexOf('if(persistedReceiptValid&&challengeTimer.id===challengeId)');
 assert.ok(refresh>=0&&storedCheck>refresh&&stop>storedCheck,
  'timer must stop only after the refreshed RLS rows confirm the decision');
 assert.match(code,/if\(!persistedReceiptValid&&sameAfterRefresh\)/);
 assert.match(code,/receiptValid&&!persistedReceiptValid/);
 assert.match(code,/state\.selectedEveningChallengeId=null/);
 assert.match(code,/redrawFeedback=receiptValid&&!persistedReceiptValid/);
 const early=code.slice(0,refresh);
 assert.doesNotMatch(early,/challengeTimer\.running=false;challengeTimer\.deadline=0/,
  'a valid but incomplete RPC response is not grounds for resetting the timer');
});

test('LR-026: delayed redraw updates only the initiating authenticated evening and tab',()=>{
 const request={userId:'partner',sessionId:'evening-1',tab:'session'};
 const active={user:{id:'partner'},session:{id:'evening-1'},tab:'session'};
 assert.equal(isSameEveningResponseContext(active,request),true);
 assert.equal(isSameEveningResponseContext({...active,user:{id:'fred'}},request),false,
  'switching accounts must not select a stale partner card');
 assert.equal(isSameEveningResponseContext({...active,session:{id:'evening-2'}},request),false,
  'starting a new evening must not select a card from an old evening');
 assert.equal(isSameEveningResponseContext({...active,session:null},request),false);
 assert.equal(isSameEveningResponseContext({...active,tab:'settings'},request),false,
  'leaving the Soirée tab must suppress stale modal navigation');
 assert.equal(isSameEveningResponseContext(active,{...request,sessionId:''}),false);
 assert.equal(isSameEveningResponseContext(active,{...request,userId:''}),false);
 assert.equal(isSameEveningResponseContext(active,{...request,tab:''}),false);
 assert.equal(isSameEveningResponseContext(active,null),false);
 assert.equal(isSameEveningResponseContext(null,request),false);
});
test('LR-026: async D100 action checks same initiating context before selection and after refresh',()=>{
 assert.match(app,/const responseContext=\{sessionId:state\.session\.id,userId:state\.user\?\.id,tab:state\.tab\}/);
 const start=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const end=app.indexOf("if(verb==='evening-start')",start);
 assert.ok(start>=0&&end>start);
 const branch=app.slice(start,end);
 assert.ok((branch.match(/isSameEveningResponseContext\(state,responseContext\)/g)||[]).length>=2,
  'must guard both UI navigation and notifications; additional timer/error checks are required');
 assert.match(branch,/const sameContext=isSameEveningResponseContext\(state,responseContext\)/);
 assert.match(branch,/if\(sameContext\)\{\s+if\(receiptValid\)state\.eveningRefusalId=null;[\s\S]*?state\.selectedEveningChallengeId=receiptValid\?outcome\.replacement_id:null/);
 assert.match(branch,/await refreshAndShow\(\);[\s\S]*?const persistedReceiptValid=[\s\S]*?if\(isSameEveningResponseContext\(state,responseContext\)\)\s+redrawFeedback=receiptValid&&!persistedReceiptValid/);
 assert.doesNotMatch(branch,/if\(state\.session\?\.id===sessionId\)/,
  'checking only the session leaves another account/tab exposed');
});

test('LR-026: uncertain redraw never completes a live accepted timer without server proof',()=>{
 const due=Date.parse('2026-10-30T12:00:00Z');
 for(const status of [undefined,null,'proposed','pending','invalid']){
  assert.equal(redrawTimerRecovery(status,due,due+1000),'retain');
 }
 assert.equal(redrawTimerRecovery('accepted',due,due-1),'retain');
 assert.equal(redrawTimerRecovery('accepted',due,due),'expire');
 assert.equal(redrawTimerRecovery('accepted',due,due+1000),'expire');
 assert.equal(redrawTimerRecovery('accepted',0,due+1000),'retain');
 assert.equal(redrawTimerRecovery('accepted',Infinity,due+1000),'retain');
 assert.equal(redrawTimerRecovery('accepted',due,NaN),'retain');
 for(const status of ['passed','refused','completed']){
  assert.equal(redrawTimerRecovery(status,0,due),'stop');
 }
});

test('LR-026: redraw timer only stops on valid receipt or independently refreshed terminal status',()=>{
 const start=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const end=app.indexOf("if(verb==='evening-start')",start);
 assert.ok(start>=0&&end>start);
 const code=app.slice(start,end);
 assert.match(code,/if\(persistedReceiptValid&&challengeTimer\.id===challengeId\)/);
 assert.match(code,/const recovery=redrawTimerRecovery\(stored\?\.status,challengeTimer\.deadline,Date\.now\(\)\)/);
 assert.match(code,/if\(recovery==='stop'\)/);
 assert.match(code,/if\(recovery==='expire'\)/);
 assert.match(code,/if\(recovery==='stop'&&state\.eveningRefusalId===challengeId\)/);
 assert.match(code,/if\(challengeTimer\.id===challengeId&&challengeTimer\.decisionPending\)/);
 assert.match(code,/if\(receiptValid\)state\.eveningRefusalId=null/);
 assert.match(code,/if\(isSameEveningResponseContext\(state,responseContext\)&&\s+challengeTimer\.id===challengeId&&challengeTimer\.decisionPending\)/);
 assert.match(code,/else saveChallengeTimer\(\)/);
 assert.doesNotMatch(code,/if\(challengeTimer\.id===challengeId\)\{\s+challengeTimer\.running=false/,
  'timer must not stop unconditionally before receipt validation');
});

test('Each user sees ONLY their own challenge cards, sorted chronologically',()=>{
 assert.deepEqual(ownEveningChallenges([c,b,a],'fred','s1').map(x=>x.id),['challenge-a','challenge-c']);
 assert.deepEqual(ownEveningChallenges([c,b,a],'partner','s1').map(x=>x.id),['challenge-b']);
 assert.deepEqual(ownEveningChallenges([a,b,c],'fred','not-s1'),[]);
 assert.equal(queuePosition([a,c],'challenge-c'),1);
 assert.equal(queueLabel('accepted'),'En cours');
});
test('Alternation is based on DRAWN challenges rather than COMPLETED challenges',()=>{
 const base={ready:true,next:'fred',drawsFinished:false,remaining:{fred:2,partner:5}};
 assert.equal(hasTurnToDraw(base,'fred'),true);
 assert.equal(hasTurnToDraw(base,'partner'),false);
 assert.equal(hasTurnToDraw({...base,remaining:{fred:0,partner:5}},'fred'),false);
 assert.equal(hasTurnToDraw({...base,drawsFinished:true},'fred'),false);
 assert.match(migration,/status<>'passed'/);
 assert.doesNotMatch(migration,/All couples share ONE active challenge/);
 assert.match(migration,/my_love_evening_board/);
 assert.match(migration,/recipient=\(select auth\.uid\(\)\)/);
});
test('Soirée has an independent draw button and a persistent personal list',()=>{
 const rows=premiumEveningHtml({session:{id:'s1'},members:[{user_id:'fred',name:'Fred'},{user_id:'partner',name:'Partenaire'}],me:'fred',rolls:[{user_id:'fred',face:2},{user_id:'partner',face:5}],
 status:{my_rolled:true,partner_rolled:true,both_ready:true},
 turn:{ready:true,next:'fred',remaining:{fred:1,partner:5},completed:{fred:0,partner:0},drawn:{fred:1,partner:0},targets:{fred:2,partner:5}},
 ownChallengeCount:1,category:'SENSUEL'});
 assert.match(rows,/data-action="new-challenge"/);
 assert.match(rows,/data-action="evening-list"/);
 assert.match(rows,/Voir mes défis \(1\)/);
 assert.doesNotMatch(rows,/Voir notre défi/);
});
test('Automatic after-roll modal, personal privacy, timer and navigation implemented',()=>{
 assert.match(app,/state\.selectedEveningChallengeId=drawn\.id/);
 assert.match(app,/state\.showEveningChallenges=true/);
 assert.match(app,/ownEveningChallenges\(state\.challenges,uid,session\.id\)/);
 assert.match(app,/evening-open:/);
 assert.match(app,/evening-list/);
 assert.match(app,/Précédent/);
 assert.match(app,/Suivant/);
 assert.match(app,/timerWidget\(view,resolvedCard\(view\)\.minutes\)/);
 assert.match(app,/saveChallengeTimer\(\)/);
 assert.match(app,/answer_challenge.*accepted/);
});
test('No other partner personal challenge contents are exposed by the database',()=>{
 assert.match(migration,/drop policy if exists challenges_read/);
 assert.match(migration,/create policy challenges_read/);
 assert.match(migration,/security definer set search_path=''/);
 assert.match(migration,/jsonb_build_object\(/);
 assert.doesNotMatch(migration,/status='completed';\s*select count\(\*\) into second_done/);
});

test('Active evening is covered by a real Chromium click test, not just the locked weekly page',()=>{
 const smoke=readFileSync(new URL('./boot-smoke.cjs',import.meta.url),'utf8');
 assert.match(smoke,/paired-active/);
 assert.match(smoke,/SOIREE_ACTIVE_ACCESS_OK/);
 assert.match(smoke,/evening-premium-view/);
 assert.match(smoke,/selectTab\(page,'special'\)/);
 assert.match(smoke,/selectTab\(page,'session'\)/);
 assert.match(smoke,/await target\.click\(\)/);
});

test('Only completed challenge cards are greyed but stay clickable for history',()=>{
 const queueCss=readFileSync(new URL('./evening-private-queue.css',import.meta.url),'utf8');
 assert.match(app,/card\.status==='completed'\?' is-completed':''/);
 assert.match(app,/card\.status==='completed'\?'✓ ':''/);
 assert.match(queueCss,/button\.evening-queue-item\.is-completed/);
 assert.match(queueCss,/background:linear-gradient\(120deg,#39323b,#211e28\)!important/);
 assert.doesNotMatch(app,/data-action="evening-open:.*disabled/);
 assert.match(queueCss,/\.evening-queue-item\.is-completed:focus-visible/);
});

test('LR-015 queue labels an explicitly refused card without exposing partner data',()=>{
 assert.equal(queueLabel('refused'),'Refusé');
 assert.equal(queueLabel('passed'),'Passé');
 assert.equal(queueLabel('completed'),'Terminé');
});

test('LR-015: active cards expose three explicit refusal choices and one atomic replacement',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.equal(queueLabel('refused'),'Refusé');
 assert.match(app,/evening-refuse-choice:/);
 assert.match(app,/Oui, retirer du lot/);
 assert.match(app,/Non, le garder dans le lot/);
 assert.match(app,/rpc\('love_respond_and_redraw'/);
 assert.match(app,/challengeTimer\.decisionPending=true/);
 assert.match(app,/challengeTimer\.autoCompletePending=false/);
});

test('LR-015 replacement occupies one visible D6 slot while history remains immutable',()=>{
 const original={...a,id:'past-refusal',status:'refused'};
 const passed={...c,id:'past-pass',status:'passed'};
 const replacement={...a,id:'replacement',status:'proposed',created_at:'2026-10-15T19:10:00Z'};
 const all=ownEveningChallenges([original,passed,replacement,b],'fred','s1');
 assert.equal(all.length,3,'history retains every occurrence');
 assert.deepEqual(visibleEveningQueue(all).map(row=>row.id),['replacement']);
 assert.deepEqual(visibleEveningQueue([{...a,status:'completed'},replacement]).map(row=>row.id),['challenge-a','replacement']);
 assert.match(readFileSync(new URL('./app.js',import.meta.url),'utf8'),
  /const mineCards=session\?visibleEveningQueue\(ownEveningChallenges\(state\.challenges,uid,session\.id\)\):\[\];/);
});

test('LR-015 replacements preserve their original D6 slot through repeated refusal',()=>{
 const first={...a,id:'slot-1',status:'refused',created_at:'2026-10-15T19:00:00Z'};
 const other={...a,id:'slot-2',status:'completed',card_id:2,created_at:'2026-10-15T19:01:00Z'};
 const earlierReplacement={...a,id:'slot-1b',status:'refused',replaces_challenge_id:'slot-1',created_at:'2026-10-15T19:02:00Z'};
 const latest={...a,id:'slot-1c',status:'proposed',replaces_challenge_id:'slot-1b',created_at:'2026-10-15T19:03:00Z'};
 const full=ownEveningChallenges([other,latest,first,earlierReplacement],'fred','s1');
 assert.deepEqual(visibleEveningQueue(full).map(x=>x.id),['slot-1c','slot-2']);
 assert.equal(full.length,4,'all historical occurrences retained');
});

test('LR-016 quota UX states used/limit, explains next month, never disables unlimited refusal',()=>{
 const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(source,/Limite atteinte : /);
 assert.match(source,/Passes ce mois : /);
 assert.match(source,/state\.monthlyPassQuota\?\.used/);
 assert.match(source,/state\.monthlyPassQuota\?\.limit/);
 assert.match(source,/Tu pourras passer à nouveau le 1er du mois prochain, ou choisir Refuser/);
 assert.match(source,/Refuser reste permis, sans limite/);
 assert.match(source,/state\.redrawBusy\|\|state\.monthlyPassQuota\?\.can_pass===false\?'disabled'/);
 assert.match(source,/state\.redrawBusy\?'disabled'/);
});

test('LR-015 keeps old queue CSS disabled and loads targeted mobile decision styling',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('./evening-editorial.css',import.meta.url),'utf8');
 assert.ok(!html.includes('evening-private-queue.css'),'The deprecated queue stylesheet must stay disabled');
 assert.ok(html.includes('evening-editorial.css?v='),'The approved stylesheet must actually be loaded');
 assert.ok(css.includes('#app .lr-redraw-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));'));
 assert.ok(css.includes('#app .lr-redraw-actions>small{grid-column:1/-1;display:block'));
 assert.ok(css.includes('@media(max-width:360px)'));
 assert.ok(css.includes('#app .lr-refusal-dialog{position:relative;display:block'));
});
