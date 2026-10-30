import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownEveningChallenges,visibleEveningQueue,queuePosition,queueLabel,hasTurnToDraw,eveningRedrawFeedback,isValidEveningRedrawReceipt,isPersistedEveningRedrawReceipt,activeEveningRedrawReplacementId,isSameEveningResponseContext,redrawTimerRecovery} from './evening-private-queue.mjs';
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
 assert.match(app,/state\.selectedEveningChallengeId=activeEveningRedrawReplacementId\(/);
 assert.match(app,/redrawFeedback=receiptValid&&!persistedReceiptValid/);
 assert.doesNotMatch(app,/state\.selectedEveningChallengeId=outcome\?\.replacement_id\|\|null/);
});

test('LR-026: official SQL and UI agree on unique face, card and carried gift',()=>{
 const sql=readFileSync(new URL('./lr026-real-rpc-snapshot.sql',import.meta.url),'utf8');
 const start=sql.indexOf('-- love_respond_and_redraw');
 assert.ok(start>=0);
 const redraw=sql.slice(start);
 assert.match(redraw,/seen\.session_id=v_old\.session_id AND seen\.recipient=v_old\.recipient/);
 assert.match(redraw,/seen\.category=v_old\.category AND seen\.card_id=candidate\.card/);
 assert.match(redraw,/used\.session_id=v_old\.session_id AND used\.recipient=v_old\.recipient/);
 assert.match(redraw,/used\.category=v_old\.category AND used\.face=possible\.face/);
 assert.match(redraw,/coalesce\(v_old\.is_gifted,false\),p_challenge/);
 const client=readFileSync(new URL('./evening-private-queue.mjs',import.meta.url),'utf8');
 const check=client.slice(client.indexOf('export function isPersistedEveningRedrawReceipt('),
  client.indexOf('export function activeEveningRedrawReplacementId('));
 for(const pattern of [
  /replacement\.face!==original\.face/,
  /replacement\.card_id!==original\.card_id/,
  /card\.category===replacement\.category/,
  /card\.face===replacement\.face\|\|card\.card_id===replacement\.card_id/,
  /replacement\.is_gifted===original\.is_gifted/
 ]) assert.match(check,pattern,'UI persisted receipt must enforce the original SQL rule');
});

test('LR-026: redraw success requires original decision and replacement in recipient RLS view',()=>{
 const original={id:'clicked-card',recipient:'fred',session_id:'s1',
  couple_id:'duo-1',offered_by:'partner',status:'passed',
  category:'SENSUEL',face:14,card_id:3,is_gifted:false,
  card_title:'Un défi douceur',card_description:'Partagez un moment de tendresse',
  card_timer_minutes:null,created_at:'2026-10-30T12:00:00Z',
  passed_at:'2026-10-30T12:02:00Z',refused_at:null};
 const replacement={id:'new-card',recipient:'fred',session_id:'s1',
  couple_id:'duo-1',offered_by:'partner',status:'proposed',
  category:'SENSUEL',face:53,card_id:8,is_gifted:false,
  card_title:'Une activité nouvelle',card_description:'Choisissez une activité calme',
  card_timer_minutes:5,created_at:'2026-10-30T12:02:00Z',
  passed_at:null,refused_at:null,replaces_challenge_id:'clicked-card'};
 const receipt={original_id:'clicked-card',replacement_id:'new-card',
  action:'pass',excluded:false,already_processed:false,
  replacement_unavailable:false};
 const verify=(rows,reply=receipt,recipient='fred',session='s1')=>
  isPersistedEveningRedrawReceipt(reply,rows,recipient,session);
 assert.equal(verify([original,replacement]),true);
 assert.equal(verify([{...original,card_timer_minutes:3},
  {...replacement,card_timer_minutes:null}]),true,
  'an eligible replacement without a timer must remain supported');
 for(const bad of [null,undefined,'', '    ',false]){
  assert.equal(verify([{...original,card_title:bad},replacement]),false,
   'the first card cannot have an unreadable title');
  assert.equal(verify([original,{...replacement,card_description:bad}]),false,
   'the recipient must actually see meaningful replacement content');
 }
 for(const bad of [undefined,-1,0,2.5,'5',NaN]){
  assert.equal(verify([original,{...replacement,card_timer_minutes:bad}]),false,
   'timer must be absent (null) or a positive whole-minute duration');
 }
 assert.equal(verify([replacement,original]),true,
  'server order must not affect the same physical D6 slot');
 const alreadyPassed={...replacement,status:'passed',
  passed_at:'2026-10-30T12:05:00Z'};
 const alreadyRefused={...replacement,status:'refused',
  refused_at:'2026-10-30T12:05:00Z'};
 assert.equal(verify([original,alreadyPassed]),true,
  'the other device may already have passed the verified replacement');
 assert.equal(verify([original,alreadyRefused]),true,
  'the other device may already have refused the verified replacement');
 assert.equal(verify([original,{...alreadyPassed,passed_at:'2026-10-30T12:01:59Z'}]),
  false,'a second-device pass cannot precede the replacement creation');
 assert.equal(verify([original,{...alreadyRefused,refused_at:'2026-10-30T12:01:59Z'}]),
  false,'a second-device refusal cannot precede the replacement creation');
 assert.equal(verify([original,{...alreadyPassed,passed_at:replacement.created_at}]),true,
  'database transactions may use the same timestamp for creation and decision');
 assert.equal(verify([original,{...alreadyPassed,passed_at:null}]),false);
 assert.equal(verify([original,{...alreadyRefused,refused_at:'broken'}]),false);
 assert.equal(verify([original,{...alreadyPassed,refused_at:'2026-10-30T12:05:00Z'}]),false,
  'both incompatible decision stamps must never be valid');
 assert.equal(verify([original,{...replacement,passed_at:'2026-10-30T12:05:00Z'}]),false);
 assert.equal(verify([original,{...replacement,status:'accepted',
  refused_at:'2026-10-30T12:05:00Z'}]),false);
 assert.equal(verify([original,{...replacement,status:'completed'}]),true);
 assert.equal(verify([original,{...replacement,status:'unknown'}]),false);
 assert.equal(verify([original,replacement,
  {...replacement,id:'duplicate-device-replacement'}]),false,
  'two device replies must never create two direct replacements for the same D6 slot');
 assert.equal(verify([original,replacement,
  {...replacement,id:'another-card',status:'completed',face:62,card_id:11,
   replaces_challenge_id:'another-original'}]),true,
  'a different legitimate D6 slot must not block this replacement');
 assert.equal(verify([original,replacement,
  {...replacement,id:'another-card',face:replacement.face,card_id:11,
   replaces_challenge_id:'another-original'}]),false,
  'the replacement cannot reuse a D100 face anywhere in this category and evening');
 assert.equal(verify([original,replacement,
  {...replacement,id:'another-card',face:62,card_id:replacement.card_id,
   replaces_challenge_id:'another-original'}]),false,
  'the replacement cannot reuse a same-night library card even if face differs');
 assert.equal(verify([original,replacement,
  {...replacement,id:'another-card',face:replacement.face,card_id:replacement.card_id,
   category:'SEXUEL',replaces_challenge_id:'another-original'}]),true,
  'history from another official D100 category must not change eligibility');
 assert.equal(verify([original,replacement],{...receipt,already_processed:true}),true,
  'a second-device replay with unchanged SQL receipt remains valid');
 assert.equal(verify([original]),false,
  'never select or congratulate an invisible replacement');
 assert.equal(verify([replacement]),false,
  'replacement alone cannot prove the original Passer/Refuser decision');
 assert.equal(verify([{...original,status:'accepted'},replacement]),false);
 for(const stamp of ['1','2026-10-30','2026-10-30T12:02:00']){
  assert.equal(verify([{...original,passed_at:stamp},replacement]),false);
 }
 assert.equal(verify([{...original,passed_at:'2026-10-30T08:02:00-04:00'},
  {...replacement,created_at:'2026-10-30T12:02:00.123456+00:00'}]),true);
 assert.equal(verify([{...original,passed_at:original.created_at},replacement]),true,
  'a same-transaction timestamp may match the original creation time');
 assert.equal(verify([{...original,passed_at:'2026-10-30T11:59:59Z'},replacement]),false,
  'Passer cannot happen before the card was drawn');
 assert.equal(verify([original,{...replacement,created_at:'2026-10-30T11:59:59Z'}]),false,
  'a replacement cannot predate the challenge it replaces');
 assert.equal(verify([original,{...replacement,created_at:'2026-10-30T12:01:59Z'}]),false,
  'a replacement cannot predate the committed decision even when after the original');
 for(const badStamp of [null,undefined,'not-a-date','']){
  assert.equal(verify([{...original,passed_at:badStamp},replacement]),false,
   'a Passer without a valid persisted passed_at must not confirm the timer');
  assert.equal(verify([{...original,created_at:badStamp},replacement]),false,
   'an original must carry its actual persisted creation date');
  assert.equal(verify([original,{...replacement,created_at:badStamp}]),false,
   'a replacement cannot claim success without a valid creation date');
 }
 assert.equal(verify([{...original,refused_at:'2026-10-30T12:02:00Z'},replacement]),
  false,'Passer and Refuser timestamps cannot be set together');
 assert.equal(verify([original,{...replacement,replaces_challenge_id:'another-card'}]),false);
 assert.equal(verify([original,{...replacement,category:'SEXUEL'}]),false);
 assert.equal(verify([original,{...replacement,offered_by:'other-giver'}]),false);
 assert.equal(verify([original,{...replacement,couple_id:'other-couple'}]),false);
 assert.equal(verify([original,{...replacement,face:original.face}]),false,
  'replacement must use a different official D100 face');
 assert.equal(verify([original,{...replacement,card_id:original.card_id}]),false,
  'replacement must use a different library card in the same category');
 assert.equal(verify([original,{...replacement,face:101}]),false);
 assert.equal(verify([original,{...replacement,card_id:0}]),false);
 assert.equal(verify([{...original,face:null},replacement]),false);
 assert.equal(verify([{...original,card_id:'3'},replacement]),false);
 assert.equal(verify([original,{...replacement,is_gifted:true}]),false,
  'replacement must keep the same gift transfer state');
 assert.equal(verify([{...original,is_gifted:undefined},replacement]),false,
  'a missing original gifting flag must not masquerade as false');
 assert.equal(verify([{...original,is_gifted:true},
   {...replacement,is_gifted:true}]),true,
  'a legitimate gifted D100 card remains supported');
 assert.equal(verify([original,{...replacement,recipient:'partner'}]),false,
  'never expose cards belonging to the other person');
 assert.equal(verify([original,{...replacement,session_id:'s2'}]),false);
 assert.equal(verify([original,replacement],receipt,'partner'),false);
 assert.equal(verify([original,replacement],receipt,'fred','another-night'),false);
 assert.equal(verify([original,replacement],{...receipt,original_id:'other-card'}),false);
 const refused={...original,status:'refused',passed_at:null,
  refused_at:'2026-10-30T12:02:00Z'};
 const refuseReceipt={...receipt,action:'refuse',excluded:true};
 assert.equal(verify([refused,replacement],refuseReceipt),true);
 assert.equal(verify([{...refused,refused_at:null},replacement],refuseReceipt),false);
 assert.equal(verify([{...refused,passed_at:'2026-10-30T12:02:00Z'},
  replacement],refuseReceipt),false,
  'a Refuser cannot preserve a Passer timestamp');
 assert.equal(verify([original,replacement],refuseReceipt),false);
 const unavailable={...refuseReceipt,replacement_id:null,
  replacement_unavailable:true};
 assert.equal(verify([refused],unavailable),true,
  'a confirmed server exhaustion must not invent a replacement');
 assert.equal(verify([{...refused,refused_at:'2026-10-30T11:59:59Z'}],unavailable),
  false,'refusal cannot be older than the original challenge');
 assert.equal(verify([{...refused,face:0}],unavailable),false,
  'unavailable receipt still needs a valid original D100 face');
 assert.equal(verify([{...refused,card_id:101}],unavailable),false,
  'an exhausted category cannot justify an invalid original card');
 assert.equal(verify([refused],{...unavailable,action:'pass'}),false,
  'the same persisted status cannot confirm a conflicting action');
 assert.equal(verify([refused,replacement],unavailable),false,
  'a server claiming exhausted cards must not conceal a committed replacement');
 assert.equal(verify([{...refused,status:'proposed'}],unavailable),false);
 assert.equal(verify([refused],{...unavailable,already_processed:true,
  replacement_unavailable:undefined}),true,
  'SQL idempotency receipt may omit availability only on replay');
});

test('LR-026: a response cannot rewrite the original D100 card shown at tap time',()=>{
 const seen={id:'original',recipient:'fred',session_id:'s1',couple_id:'pair',
  offered_by:'partner',category:'SENSUEL',face:17,card_id:8,
  card_title:'Un défi sensible',card_description:'Un moment partagé',
  card_timer_minutes:null,is_gifted:true,
  created_at:'2026-10-30T12:00:00Z',replaces_challenge_id:null,
  status:'accepted',passed_at:null,refused_at:null};
 const stored={...seen,status:'passed',passed_at:'2026-10-30T12:05:00Z'};
 const replacement={...seen,id:'next',face:21,card_id:9,
  card_title:'Une autre idée',card_description:'Un autre moment',
  created_at:'2026-10-30T12:05:00Z',
  status:'proposed',passed_at:null,refused_at:null,
  replaces_challenge_id:'original'};
 const receipt={original_id:'original',replacement_id:'next',action:'pass',
  excluded:false,already_processed:false,replacement_unavailable:false};
 const check=(a=stored,b=replacement,before=seen,reply=receipt)=>
  isPersistedEveningRedrawReceipt(reply,[a,b],'fred','s1',before);
 assert.equal(check(),true,'a legitimate Passer preserves the initial D100 identity');
 assert.equal(check(stored,replacement,seen,{...receipt,already_processed:true}),true,
  'a second-device replay must not invalidate an unchanged original');
 assert.equal(check(stored,replacement,{...seen,status:'proposed'}),true,
  'both original pre-action statuses are legal');
 const refused={...stored,status:'refused',passed_at:null,
  refused_at:'2026-10-30T12:05:00Z'};
 assert.equal(check(refused,replacement,seen,{...receipt,action:'refuse'}),true,
  'Refuser must retain the same original identity');
 for(const key of ['id','session_id','couple_id','offered_by','recipient',
  'category','face','card_id','card_title','card_description',
  'card_timer_minutes','is_gifted','created_at','replaces_challenge_id']){
  const altered={...stored,[key]:key==='face'?18:
   key==='card_id'?10:key==='card_timer_minutes'?5:
   key==='is_gifted'?false:key==='replaces_challenge_id'?'other':
   key==='created_at'?'2026-10-30T12:04:00Z':
   key==='id'?'another-id':'changed'};
  assert.equal(check(altered),false,
   'server unexpectedly modified the original field '+key);
  assert.equal(check(stored,replacement,{...seen,[key]:undefined}),false,
   'missing or changed pre-action field must not be silently accepted: '+key);
 }
 assert.equal(check(stored,replacement,{}),false);
 assert.equal(check(stored,replacement,null),true,
  'the optional snapshot supports earlier independent receipt tests');
 const appBranch=app.slice(app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')"),
  app.indexOf("if(verb==='evening-start')"));
 assert.match(appBranch,/isPersistedEveningRedrawReceipt\(outcome,state\.challenges,state\.user\.id,state\.session\.id,item\)/,
  'the real UI must pass the originally visible card to the persisted check');
});

test('LR-026: late second-device redraw never focuses consumed or foreign replacement',()=>{
 const receipt={original_id:'original',replacement_id:'new-card',
  action:'refuse',excluded:false,already_processed:false,
  replacement_unavailable:false};
 const card={id:'new-card',recipient:'fred',session_id:'s1',
  couple_id:'duo',offered_by:'partner',category:'SENSUEL',
  replaces_challenge_id:'original',status:'proposed'};
 const choose=(rows,answer=receipt,who='fred',night='s1')=>
  activeEveningRedrawReplacementId(rows,answer,who,night);
 assert.equal(choose([card]),'new-card');
 assert.equal(choose([{...card,status:'accepted'}]),'new-card');
 assert.equal(choose([{...card,status:'completed'}]),'new-card',
  'completed card remains visible in history and the D6 queue');
 for(const status of ['passed','refused','unknown',null,undefined]){
  assert.equal(choose([{...card,status}]),null,
   'another device must not focus an already consumed replacement');
 }
 assert.equal(choose([card],{...receipt,replacement_id:null}),null,
  'an exhausted category leaves the player in their list');
 assert.equal(choose([{...card,recipient:'partner'}]),null);
 assert.equal(choose([{...card,session_id:'s2'}]),null);
 assert.equal(choose([card],receipt,'partner'),null);
 assert.equal(choose([card],receipt,'fred','another-night'),null);
 assert.equal(choose([],receipt),null);
 assert.equal(choose([],null),null);
});

test('LR-026: UI waits for persisted redraw before stopping a live timer or confirming success',()=>{
 const start=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const end=app.indexOf("if(verb==='evening-start')",start);
 const code=app.slice(start,end);
 const refresh=code.indexOf('await refreshShared(responseContext);');
 const storedCheck=code.indexOf('const persistedReceiptValid=');
 const stop=code.indexOf('if(persistedReceiptValid&&challengeTimer.id===challengeId)');
 const select=code.indexOf('state.selectedEveningChallengeId=activeEveningRedrawReplacementId(');
 assert.ok(refresh>=0&&storedCheck>refresh&&select>storedCheck&&stop>select,
  'timer must stop only after the refreshed RLS rows confirm the decision');
 assert.match(code,/if\(!persistedReceiptValid&&sameAfterRefresh\)/);
 assert.match(code,/if\(sameAfterRefresh&&!persistedReceiptValid\)\{[\s\S]*?state\.selectedEveningChallengeId=null/,
  'a malformed receipt must clear unrelated auto-selected cards');
 assert.doesNotMatch(code,/if\(receiptValid&&sameAfterRefresh&&!persistedReceiptValid\)/,
  'clearing an unrelated card must not depend on receipt validity');
 assert.match(code,/receiptValid&&!persistedReceiptValid/);
 assert.match(code,/state\.selectedEveningChallengeId=null/);
 assert.match(code,/redrawFeedback=receiptValid&&!persistedReceiptValid/);
 const early=code.slice(0,refresh);
 assert.doesNotMatch(early,/challengeTimer\.running=false;challengeTimer\.deadline=0/,
  'a valid but incomplete RPC response is not grounds for resetting the timer');
});

test('LR-026: no intermediate redraw render can flash an unrelated new card',()=>{
 const begin=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const end=app.indexOf("if(verb==='evening-start')",begin);
 const branch=app.slice(begin,end);
 const refresh=branch.indexOf('await refreshShared(responseContext);');
 const finallyBlock=branch.indexOf('}finally{');
 assert.ok(refresh>=0&&finallyBlock>refresh);
 assert.doesNotMatch(branch.slice(0,finallyBlock),/await refreshAndShow\(\)/,
  'refresh must never render a temporary wrong D100 selection');
 assert.match(branch.slice(0,finallyBlock),
  /state\.selectedEveningChallengeId=activeEveningRedrawReplacementId\(/);
 assert.match(branch.slice(finallyBlock),/state\.redrawBusy=false;[\s\S]*?render\(\);/,
  'one final render shows the verified replacement or the recipient list');
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
 assert.match(branch,/if\(sameContext\)\{\s+if\(receiptValid\)state\.eveningRefusalId=null;[\s\S]*?state\.selectedEveningChallengeId=null/);
 assert.match(branch,/await refreshShared\(responseContext\);[\s\S]*?const persistedReceiptValid=[\s\S]*?if\(isSameEveningResponseContext\(state,responseContext\)\)\s+redrawFeedback=receiptValid&&!persistedReceiptValid/);
 assert.doesNotMatch(branch,/if\(state\.session\?\.id===sessionId\)/,
  'checking only the session leaves another account/tab exposed');
});

test('LR-026: scoped refresh refuses stale account writes at every awaited stage',()=>{
 const start=app.indexOf('async function refreshShared(expectedContext=null){');
 const end=app.indexOf('const liveSync=createCoupleLiveSync(',start);
 assert.ok(start>=0&&end>start,'scoped refresher must remain available');
 const body=app.slice(start,end);
 assert.match(body,/const current=\(\)=>!expectedContext\|\|\(state\.coupleId===c&&/);
 assert.match(body,/isSameEveningResponseContext\(state,expectedContext\)/);
 assert.match(body,/if\(!current\(\)\)return;/);
 for(const pattern of [
  /\]\);\s+if\(!current\(\)\)return;\s+state\.cycleStatus=/,
  /const available=await rpc\('love_redraw_capabilities',[\s\S]*?if\(!current\(\)\)return;\s+state\.redrawReady=/,
  /const list=await rpc\('my_love_cycle_exclusions',[\s\S]*?if\(!current\(\)\)return;/,
  /const links=await rpc\('love_evening_replacement_links',[\s\S]*?if\(!current\(\)\)return;/,
  /const \[places,bookings\]=await Promise\.all\([\s\S]*?if\(!current\(\)\)return;/,
  /const \[personal,challenges,status,board\]=await Promise\.all\([\s\S]*?if\(!current\(\)\)return;/,
  /const totals=await rpc\('my_love_evening_card_totals',[\s\S]*?if\(!current\(\)\)return;/,
  /const invite=await rpc\('love_evening_invite_status',[\s\S]*?if\(!current\(\)\)return;/
 ])assert.match(body,pattern,'stale response must not write into a switched user account');
 assert.match(body,/if\(!expectedContext\)\{\s+try\{await refreshEclatStatus\(\)/,
  'ordinary refresh still updates Eclat, scoped D100 refresh does not');
 assert.match(app,/await refreshShared\(responseContext\);/,
  'the real D100 button must use the guarded refresh');
 assert.match(app,/async function refreshAndShow\(\)\{await refreshShared\(\);render\(\);\}/,
  'unscoped refresh should preserve normal screens');
});

test('LR-026: stale account or tab cannot refresh after an in-flight redraw RPC',()=>{
 const start=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const end=app.indexOf("if(verb==='evening-start')",start);
 const branch=app.slice(start,end);
 const response=branch.indexOf("const outcome=await rpc('love_respond_and_redraw'");
 const context=branch.indexOf('const sameContext=isSameEveningResponseContext(state,responseContext)');
 const reject=branch.indexOf('if(!sameContext)return;');
 const refresh=branch.indexOf('await refreshShared(responseContext);');
 const done=branch.indexOf('}finally{');
 assert.ok(response>=0&&context>response&&reject>context&&refresh>reject&&done>refresh,
  'stale RPC must return before it can refresh any other account or evening');
 assert.doesNotMatch(branch.slice(reject,refresh),/render\(\)|saveChallengeTimer\(\)/,
  'a stale response must not modify the new account timer or render state');
 assert.match(branch.slice(done),/state\.redrawBusy=false;[\s\S]*?render\(\)/,
  'finally still releases the pending button lock when returning early');
});

test('LR-026: obsolete RPC errors do not escape into another account or tab',()=>{
 const start=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const end=app.indexOf("if(verb==='evening-start')",start);
 const action=app.slice(start,end);
 const failed=action.slice(action.indexOf('}catch(error){'),action.indexOf('}finally{'));
 const stale=failed.indexOf('if(!isSameEveningResponseContext(state,responseContext))return;');
 const timer=failed.indexOf('if(challengeTimer.id===challengeId&&challengeTimer.decisionPending)');
 const rethrow=failed.indexOf('throw error;');
 assert.ok(stale>=0&&timer>stale&&rethrow>timer,
  'obsolete errors must return before timer mutation and before being thrown');
 assert.doesNotMatch(failed.slice(0,stale),/saveChallengeTimer\(\)|render\(\)|throw error;/,
  'stale RPC error cannot mutate or notify a switched account');
 assert.match(action.slice(action.indexOf('}finally{')),
  /state\.redrawBusy=false;[\s\S]*?render\(\)/,
  'even a stale failure must release the pending action lock');
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
 assert.match(code,/if\(!isSameEveningResponseContext\(state,responseContext\)\)return;[\s\S]*?if\(challengeTimer\.id===challengeId&&challengeTimer\.decisionPending\)/);
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
