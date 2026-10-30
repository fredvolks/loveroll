import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {ownEveningChallenges,visibleEveningQueue,queuePosition,queueLabel,hasTurnToDraw,eveningRedrawFeedback,isValidEveningRedrawReceipt,isPersistedEveningRedrawReceipt,activeEveningRedrawReplacementId,snapshotEveningCardBeforeRedraw,EVENING_REDRAW_IMMUTABLE_FIELDS,ownsEveningTimerRecord,ownedSavedEveningTimerSnapshot,isSameEveningResponseContext,isEveningRedrawBusyForCurrentView,ownsEveningRedrawRequest,redrawTimerRecovery,mayApplyScopedEveningRefresh} from './evening-private-queue.mjs';
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
 for(const invalid of ['2026-02-30T12:00:00Z','2026-11-31T12:00:00Z',
  '2026-10-30T24:00:00Z','2026-10-30T24:00:00+00:00']){
  assert.equal(verify([{...original,passed_at:invalid},replacement]),false,
   'a normalized but impossible calendar date cannot be a committed stamp');
  assert.equal(verify([{...original,created_at:invalid},replacement]),false,
   'a fake creation date must never pass PostgreSQL timestamp validation');
 }
 assert.equal(verify([
  {...original,created_at:'2024-02-29T12:00:00Z',
   passed_at:'2024-02-29T12:01:00Z'},
  {...replacement,created_at:'2024-02-29T12:01:00.123456+00:00'}
 ]),true,'a real leap day and microsecond offset remain acceptable');
 assert.equal(verify([{...original,passed_at:'2026-10-30T23:59:59-04:00'},
  {...replacement,created_at:'2026-10-31T04:00:00+00:00'}]),true,
  'legitimate cross-midnight timezone offsets must not be rejected');
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

test('LR-026: snapshot and persisted validation share the exact 14-field immutable contract',()=>{
 assert.ok(Object.isFrozen(EVENING_REDRAW_IMMUTABLE_FIELDS));
 assert.deepEqual([...EVENING_REDRAW_IMMUTABLE_FIELDS],[
  'id','session_id','couple_id','offered_by','recipient','category',
  'face','card_id','card_title','card_description','card_timer_minutes',
  'is_gifted','created_at','replaces_challenge_id'
 ]);
 const helper=readFileSync(new URL('./evening-private-queue.mjs',import.meta.url),'utf8');
 const captured=helper.slice(helper.indexOf('export function snapshotEveningCardBeforeRedraw'),
  helper.indexOf('export function isPersistedEveningRedrawReceipt'));
 const checked=helper.slice(helper.indexOf('export function isPersistedEveningRedrawReceipt'),
  helper.indexOf('export function activeEveningRedrawReplacementId'));
 assert.match(captured,/EVENING_REDRAW_IMMUTABLE_FIELDS\.every\(/);
 assert.match(captured,/EVENING_REDRAW_IMMUTABLE_FIELDS\.map\(/);
 assert.match(checked,/EVENING_REDRAW_IMMUTABLE_FIELDS\.every\(/);
 assert.doesNotMatch(checked,/const immutableKeys=/,
  'do not copy the field contract a second time');
});

test('LR-026: tap-time D100 snapshot survives in-place mutation during pending RPC',()=>{
 const item={id:'card1',recipient:'fred',session_id:'night1',
  couple_id:'duo1',offered_by:'partner',category:'SENSUEL',
  face:18,card_id:11,card_title:'Massage',
  card_description:'Prendre du temps ensemble',card_timer_minutes:null,
  is_gifted:false,created_at:'2026-10-30T12:00:00Z',
  replaces_challenge_id:null,status:'accepted'};
 const before=snapshotEveningCardBeforeRedraw(item);
 assert.ok(Object.isFrozen(before),'captured card must never be mutable');
 assert.notStrictEqual(before,item,
  'holding the same JS object across an await is not a real snapshot');
 item.face=33;
 item.card_title='Contenu modifié pendant le réseau';
 item.created_at='2026-10-30T12:01:00Z';
 item.is_gifted=true;
 assert.equal(before.face,18);
 assert.equal(before.card_title,'Massage');
 assert.equal(before.created_at,'2026-10-30T12:00:00Z');
 assert.equal(before.is_gifted,false);
 const committed={...item,status:'passed',passed_at:'2026-10-30T12:02:00Z',
  refused_at:null};
 const replacement={...committed,id:'next',face:55,card_id:12,
  card_title:'Carte de remplacement',created_at:'2026-10-30T12:02:00Z',
  replaces_challenge_id:'card1',status:'proposed',
  passed_at:null,refused_at:null};
 const receipt={original_id:'card1',replacement_id:'next',
  action:'pass',excluded:false,already_processed:false,
  replacement_unavailable:false};
 assert.equal(isPersistedEveningRedrawReceipt(
  receipt,[committed,replacement],'fred','night1',before),false,
  'in-place changes must not defeat immutable field comparisons');
 assert.equal(snapshotEveningCardBeforeRedraw(null),null);
 assert.equal(snapshotEveningCardBeforeRedraw([]),null);
 const truncated={...item};
 delete truncated.replaces_challenge_id;
 assert.equal(snapshotEveningCardBeforeRedraw(truncated),null);
 const start=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const end=app.indexOf("if(verb==='evening-start')",start);
 const branch=app.slice(start,end);
 const capture=branch.indexOf('const originalSnapshot=snapshotEveningCardBeforeRedraw(item);');
 const rpc=branch.indexOf("const outcome=await rpc('love_respond_and_redraw'");
 assert.ok(capture>=0&&rpc>capture,'must freeze card before first network await');
 assert.match(branch,/if\(!originalSnapshot\)throw Error\(/);
 assert.match(branch,/isPersistedEveningRedrawReceipt\(outcome,state\.challenges,state\.user\.id,state\.session\.id,originalSnapshot\)/);
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
 for(const key of EVENING_REDRAW_IMMUTABLE_FIELDS){
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
 assert.match(appBranch,/isPersistedEveningRedrawReceipt\(outcome,state\.challenges,state\.user\.id,state\.session\.id,originalSnapshot\)/,
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
 const stop=code.indexOf('if(persistedReceiptValid&&ownsVisibleEveningTimer(challengeId,responseContext.userId,responseContext.sessionId))');
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
 assert.match(app,/const responseContext=\{sessionId:state\.session\.id,userId:state\.user\?\.id,tab:state\.tab,challengeId\}/);
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

test('LR-026: pending redraw tokens distinguish two requests even on the same evening',()=>{
 const original={userId:'A',sessionId:'evening-1',tab:'session'};
 const view={user:{id:'A'},session:{id:'evening-1'},tab:'session',
  redrawBusy:true,redrawBusyContext:original};
 assert.equal(isEveningRedrawBusyForCurrentView(view),true);
 assert.equal(ownsEveningRedrawRequest(view,original),true);
 assert.equal(ownsEveningRedrawRequest(view,{...original}),false,
  'two distinct concurrent requests on the same evening cannot share a lock');
 const otherAccount={...view,user:{id:'B'}};
 assert.equal(isEveningRedrawBusyForCurrentView(otherAccount),false);
 assert.equal(ownsEveningRedrawRequest(otherAccount,original),false);
 assert.equal(isEveningRedrawBusyForCurrentView({...view,session:{id:'evening-2'}}),false);
 assert.equal(isEveningRedrawBusyForCurrentView({...view,tab:'settings'}),false);
 assert.equal(isEveningRedrawBusyForCurrentView({...view,redrawBusy:false}),false);
 assert.equal(isEveningRedrawBusyForCurrentView({...view,redrawBusyContext:null}),false);
 const second={userId:'B',sessionId:'evening-2',tab:'session'};
 const switched={...otherAccount,session:{id:'evening-2'},
  redrawBusyContext:second};
 assert.equal(isEveningRedrawBusyForCurrentView(switched),true);
 assert.equal(ownsEveningRedrawRequest(switched,second),true);
 assert.equal(ownsEveningRedrawRequest(switched,original),false,
  'an old network response cannot release or mutate the new request');
});

test('LR-026: pending redraw belongs to its initiating account and cannot unlock another action',()=>{
 const start=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const end=app.indexOf("if(verb==='evening-start')",start);
 const action=app.slice(start,end);
 const helper=app.slice(app.indexOf('function isActiveEveningRedrawPending(){'),
  app.indexOf('async function refreshShared(expectedContext=null){'));
 assert.match(helper,/return isEveningRedrawBusyForCurrentView\(state\)/);

 assert.match(action,/if\(isActiveEveningRedrawPending\(\)\)return;/);
 assert.match(action,/state\.redrawBusyContext=responseContext;\s+state\.redrawBusy=true;/);
 assert.match(action,/if\(!sameContext\|\|!ownsEveningRedrawRequest\(state,responseContext\)\)return;/,
  'old account response must not refresh the new owner');
 assert.match(action,/const sameAfterRefresh=isSameEveningResponseContext\(state,responseContext\)&&\s+ownsEveningRedrawRequest\(state,responseContext\)/);
 assert.match(action,/if\(state\.redrawBusyContext===responseContext\)\{[\s\S]*?state\.redrawBusyContext=null;\s+state\.redrawBusy=false;\s+render\(\)/,
  'only the current ticket may unlock its controls');
 assert.match(app,/state\.redrawBusyContext===expectedContext/,
  'stale asynchronous refresh must also check the owner ticket');
 assert.match(app,/if\(!isActiveEveningRedrawPending\(\)\)\{state\.eveningRefusalId=null;render\(\)/,
  'a stale lock must not prevent canceling on a different account');
 assert.doesNotMatch(action,/if\(state\.redrawBusy\)return;/,
  'global pending flag would block a different account');
});

test('LR-026: stale account or tab cannot refresh after an in-flight redraw RPC',()=>{
 const start=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const end=app.indexOf("if(verb==='evening-start')",start);
 const branch=app.slice(start,end);
 const response=branch.indexOf("const outcome=await rpc('love_respond_and_redraw'");
 const context=branch.indexOf('const sameContext=isSameEveningResponseContext(state,responseContext)');
 const reject=branch.indexOf('if(!sameContext||!ownsEveningRedrawRequest(state,responseContext))return;');
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
 const stale=failed.indexOf('if(!isSameEveningResponseContext(state,responseContext)||');
 const timer=failed.indexOf('if(ownsVisibleEveningTimer(challengeId,responseContext.userId,responseContext.sessionId)&&challengeTimer.decisionPending)');
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

test('LR-026: stored D100 timer identity blocks cross-account restore without losing legacy clocks',()=>{
 const cardId='challenge-1',userId='fred',sessionId='soir-1';
 const legacy={durationMs:240000,remainingMs:185000,deadline:12345678,
  running:true,notified:false,autoCompletePending:false};
 assert.equal(ownedSavedEveningTimerSnapshot(legacy,cardId,userId,sessionId),legacy,
  'old clocks use the account+card key and must remain recoverable');
 const current={...legacy,cardId,ownerUserId:userId,ownerSessionId:sessionId};
 assert.equal(ownedSavedEveningTimerSnapshot(current,cardId,userId,sessionId),current);
 assert.equal(ownedSavedEveningTimerSnapshot(current,cardId,'partner',sessionId),null);
 assert.equal(ownedSavedEveningTimerSnapshot(current,cardId,userId,'soir-2'),null);
 assert.equal(ownedSavedEveningTimerSnapshot(current,'different',userId,sessionId),null);
 for(const broken of [
  {...legacy,cardId},{...legacy,ownerUserId:userId},
  {...legacy,cardId,ownerUserId:userId},
  {...current,ownerSessionId:null},
  {...current,ownerUserId:undefined},
  {...current,cardId:''},
  {...current,durationMs:0},
  {...current,durationMs:Infinity},
  {...current,durationMs:'240000'},
  [],null
 ])assert.equal(ownedSavedEveningTimerSnapshot(broken,cardId,userId,sessionId),null);
 assert.equal(ownedSavedEveningTimerSnapshot(current,cardId,'',sessionId),null);
 assert.equal(ownedSavedEveningTimerSnapshot(current,cardId,userId,''),null);
});

test('LR-026: real timer storage isolates two accounts switching on the same D100 card ID',()=>{
 const source=app.slice(app.indexOf('function readSavedChallengeTimer('),
  app.indexOf('function showTimerFinished(){'));
 const memory=new Map();
 const storage={getItem:key=>memory.get(key)??null,
  setItem:(key,value)=>{memory.set(key,value);}};
 const state={user:{id:'fred'},session:{id:'night-fred'},
  redrawBusy:false,redrawBusyContext:null};
 const clock={id:null,ownerUserId:null,ownerSessionId:null,durationMs:0,
  remainingMs:0,deadline:0,running:false,notified:false,
  autoCompletePending:false,decisionPending:false};
 const runtime=Function('state','challengeTimer','localStorage','sessionStorage',
  'ownedSavedEveningTimerSnapshot','ownsEveningTimerRecord',
  source+';return {activeTimer,saveChallengeTimer,readSavedChallengeTimer};')(
   state,clock,storage,storage,ownedSavedEveningTimerSnapshot,ownsEveningTimerRecord);
 const card={id:'same-card'};
 runtime.activeTimer(card,4);
 assert.equal(clock.remainingMs,240000);
 clock.remainingMs=160000;
 runtime.saveChallengeTimer();
 const fredKey='loveroll-challenge-clock:fred:same-card';
 assert.equal(JSON.parse(memory.get(fredKey)).remainingMs,160000);
 assert.equal(JSON.parse(memory.get(fredKey)).ownerSessionId,'night-fred');
 state.user={id:'partner'};state.session={id:'night-partner'};
 runtime.activeTimer(card,4);
 assert.equal(clock.ownerUserId,'partner');
 assert.equal(clock.ownerSessionId,'night-partner');
 assert.equal(clock.remainingMs,240000,
  'switching users cannot inherit the previous account countdown');
 clock.remainingMs=110000;
 runtime.saveChallengeTimer();
 const partnerKey='loveroll-challenge-clock:partner:same-card';
 assert.equal(JSON.parse(memory.get(partnerKey)).remainingMs,110000);
 assert.equal(JSON.parse(memory.get(fredKey)).remainingMs,160000);
 state.user={id:'fred'};state.session={id:'night-fred'};
 runtime.activeTimer(card,4);
 assert.equal(clock.remainingMs,160000,
  'returning to the original user restores their own countdown');
 state.user={id:'partner'};state.session={id:'night-other'};
 runtime.activeTimer(card,4);
 assert.equal(clock.remainingMs,240000,
  'same account and challenge must not reuse a clock from a foreign evening');
 // A clock saved by the old build (without tagged owner fields) is accepted.
 state.user={id:'fred'};state.session={id:'night-fred'};
 memory.set('loveroll-challenge-clock:fred:legacy',
  JSON.stringify({durationMs:240000,remainingMs:90000,
   deadline:0,running:false,notified:false,autoCompletePending:false}));
 runtime.activeTimer({id:'legacy'},4);
 assert.equal(clock.remainingMs,90000);
 runtime.saveChallengeTimer();
 const migrated=JSON.parse(memory.get('loveroll-challenge-clock:fred:legacy'));
 assert.equal(migrated.cardId,'legacy');
 assert.equal(migrated.ownerUserId,'fred');
 assert.equal(migrated.ownerSessionId,'night-fred');
});

test('LR-026: timer restoration and expiry scanner reject mismatched stored owners',()=>{
 const saved=app.slice(app.indexOf('function saveChallengeTimer(){'),
  app.indexOf('function showTimerFinished(){'));
 assert.match(saved,/cardId:challengeTimer\.id,ownerUserId:challengeTimer\.ownerUserId,/);
 assert.match(saved,/ownerSessionId:challengeTimer\.ownerSessionId,/);
 assert.match(saved,/const stored=ownedSavedEveningTimerSnapshot\(\s+readSavedChallengeTimer\(/);
 assert.match(saved,/challenge\.id,state\.user\.id,state\.session\?\.id\)/);
 const scan=app.slice(app.indexOf('async function reconcileSavedEveningTimers(){'),
  app.indexOf('function endSignal(){'));
 assert.match(scan,/const saved=ownedSavedEveningTimerSnapshot\(readSavedChallengeTimer\(key\),\s+item\.id,state\.user\.id,state\.session\.id\);/);
 assert.match(scan,/if\(!saved\)continue;/);
 assert.match(scan,/const expired=\{\.\.\.saved,cardId:item\.id,ownerUserId:userId,/);
 assert.match(scan,/ownerSessionId:sessionId,running:false/);
 assert.match(scan,/ownerUserId:state\.user\.id,ownerSessionId:state\.session\.id,/);
});

test('LR-026: Commencer ignores a stale RPC or refresh after switching accounts',async()=>{
 const begin=app.indexOf("if(verb==='evening-start')");
 const finish=app.indexOf("if(verb==='surprise-activity')",begin);
 const code=app.slice(begin,finish);
 assert.ok(begin>=0&&finish>begin);
 const factory=Function('state','challengeTimer','ownEveningChallenges',
  'isSameEveningResponseContext','rpc','refreshShared','activeTimer',
  'resolvedCard','saveChallengeTimer','updateChallengeClock','render',
  'notify','unlockLoveRollSounds',
  'return async function(verb,parts){'+code+'}');
 const gate=()=>{let resolve,reject;
  const promise=new Promise((ok,fail)=>{resolve=ok;reject=fail;});
  return {promise,resolve,reject};
 };
 const card={id:'start-a',recipient:'fred',session_id:'night-a',status:'proposed'};
 const state={user:{id:'fred'},session:{id:'night-a'},tab:'session',
  challenges:[card],showEveningChallenges:false,selectedEveningChallengeId:null};
 const clock={mode:'vibrate',remainingMs:0,running:false};
 const rpcPending=gate(),callbacks={rpc:0,refresh:0,timer:0,render:0,notify:0};
 const start=factory(state,clock,ownEveningChallenges,isSameEveningResponseContext,
  async()=>{callbacks.rpc++;await rpcPending.promise;},
  async()=>{callbacks.refresh++;},
  ()=>{callbacks.timer++;},()=>({minutes:2}),()=>{},()=>{},
  ()=>{callbacks.render++;},()=>{callbacks.notify++;},()=>{});
 const first=start('evening-start',['start-a']);
 assert.equal(callbacks.rpc,1);
 // A stale A response must NOT refresh, start a countdown or select A in B.
 state.user={id:'partner'};state.session={id:'night-b'};
 state.challenges=[{id:'start-b',recipient:'partner',session_id:'night-b',
  status:'accepted'}];
 rpcPending.resolve();await first;
 assert.equal(callbacks.refresh,0);
 assert.equal(callbacks.timer,0);
 assert.equal(callbacks.render,0);
 assert.equal(callbacks.notify,0);
 assert.equal(state.selectedEveningChallengeId,null);
 assert.equal(state.eveningStartContext,null);

 // Even after a successful RPC, a suspended refresh may outlive the view.
 state.user={id:'fred'};state.session={id:'night-a'};
 state.challenges=[{...card,status:'accepted'}];
 const refreshPending=gate();
 const refreshCallbacks={refresh:0,timer:0,render:0};
 const delayed=factory(state,clock,ownEveningChallenges,isSameEveningResponseContext,
  async()=>{throw Error('accepted card should skip RPC');},
  async()=>{refreshCallbacks.refresh++;await refreshPending.promise;},
  ()=>{refreshCallbacks.timer++;},()=>({minutes:2}),()=>{},()=>{},
  ()=>{refreshCallbacks.render++;},()=>{},()=>{});
 const second=delayed('evening-start',['start-a']);
 assert.equal(refreshCallbacks.refresh,1);
 state.user={id:'partner'};state.session={id:'night-b'};
 refreshPending.resolve();await second;
 assert.equal(refreshCallbacks.timer,0);
 assert.equal(refreshCallbacks.render,0);
 assert.equal(state.selectedEveningChallengeId,null);
 assert.equal(state.eveningStartContext,null);
});

test('LR-026: direct timer play needs authoritative accepted RLS row, not just a successful RPC',async()=>{
 const begin=app.indexOf("if(verb==='timer-toggle')");
 const end=app.indexOf("if(verb==='give-challenge')",begin);
 const branch=app.slice(begin,end);
 assert.ok(begin>=0&&end>begin);
 const make=Function('state','challengeTimer','ownsVisibleEveningTimer',
  'isSameEveningResponseContext','timedEveningItem','rpc','query',
  'updateChallengeClock','saveChallengeTimer','notify','unlockLoveRollSounds',
  'return async function(verb){'+branch+'}');
 const card={id:'card-1',status:'proposed',recipient:'fred',session_id:'night-1'};
 const state={user:{id:'fred'},session:{id:'night-1'},tab:'session'};
 const clock={id:'card-1',ownerUserId:'fred',ownerSessionId:'night-1',
  mode:'vibrate',running:false,remainingMs:180000,deadline:0,
  notified:false,autoCompletePending:false};
 const owns=(cardId,userId,sessionId)=>ownsEveningTimerRecord(clock,cardId,userId,sessionId)&&
  state.user?.id===userId&&state.session?.id===sessionId;
 let writes=0,rpcs=0,reads=0,seen=[],rows=[{...card}];
 const play=make(state,clock,owns,isSameEveningResponseContext,
  ()=>card,async()=>{rpcs++;},async(table,options)=>{
   reads++;assert.equal(table,'couple_challenges');
   assert.deepEqual(options.eq,{id:'card-1',session_id:'night-1',recipient:'fred'});
   return rows;
  },()=>{},()=>{writes++;},message=>seen.push(message),()=>true);
 await assert.rejects(play('timer-toggle'),/pas confirmé/);
 assert.equal(rpcs,1);
 assert.equal(reads,1);
 assert.equal(writes,0);
 assert.equal(clock.running,false);
 assert.equal(state.timerStartContext,null);
 rows=[{...card,status:'passed'}];
 await assert.rejects(play('timer-toggle'),/pas confirmé/);
 assert.equal(clock.running,false,'a card passed on another device cannot start');
 rows=[{...card,status:'accepted'}];
 await play('timer-toggle');
 assert.equal(clock.running,true);
 assert.equal(writes,1);
 assert.ok(clock.deadline>Date.now());
 assert.equal(state.timerStartContext,null);
 assert.equal(seen.length,0);
});

test('LR-026: late timer-play RPC cannot start or notify another account',async()=>{
 const begin=app.indexOf("if(verb==='timer-toggle')");
 const end=app.indexOf("if(verb==='give-challenge')",begin);
 const make=Function('state','challengeTimer','ownsVisibleEveningTimer',
  'isSameEveningResponseContext','timedEveningItem','rpc','query',
  'updateChallengeClock','saveChallengeTimer','notify','unlockLoveRollSounds',
  'return async function(verb){'+app.slice(begin,end)+'}');
 const state={user:{id:'fred'},session:{id:'night-a'},tab:'session'};
 const clock={id:'same',ownerUserId:'fred',ownerSessionId:'night-a',
  mode:'vibrate',remainingMs:150000,running:false,deadline:0,
  autoCompletePending:false,notified:false};
 const owns=(cardId,userId,sessionId)=>ownsEveningTimerRecord(clock,cardId,userId,sessionId)&&
  state.user?.id===userId&&state.session?.id===sessionId;
 const card={id:'same',status:'proposed',session_id:'night-a',recipient:'fred'};
 let resolveRpc,calls=0,queries=0,writes=0,notifies=0;
 const pending=new Promise(done=>{resolveRpc=done;});
 const play=make(state,clock,owns,isSameEveningResponseContext,
  ()=>card,async()=>{calls++;await pending;},
  async()=>{queries++;return [{...card,status:'accepted'}];},
  ()=>{},()=>{writes++;},()=>{notifies++;},()=>true);
 const first=play('timer-toggle');
 await play('timer-toggle');
 assert.equal(calls,1,'second tap cannot issue a duplicate acceptance RPC');
 state.user={id:'partner'};state.session={id:'night-b'};
 clock.ownerUserId='partner';clock.ownerSessionId='night-b';
 resolveRpc();await first;
 assert.equal(queries,0,'old user cannot query a newly signed-in account');
 assert.equal(writes,0);assert.equal(notifies,0);
 assert.equal(clock.running,false);
 assert.equal(state.timerStartContext,null);
});

test('LR-026: pending timer-play RLS read cannot start a switched-account clock',async()=>{
 const begin=app.indexOf("if(verb==='timer-toggle')");
 const end=app.indexOf("if(verb==='give-challenge')",begin);
 const make=Function('state','challengeTimer','ownsVisibleEveningTimer',
  'isSameEveningResponseContext','timedEveningItem','rpc','query',
  'updateChallengeClock','saveChallengeTimer','notify','unlockLoveRollSounds',
  'return async function(verb){'+app.slice(begin,end)+'}');
 const state={user:{id:'fred'},session:{id:'night-a'},tab:'session'};
 const clock={id:'card',ownerUserId:'fred',ownerSessionId:'night-a',
  mode:'vibrate',running:false,remainingMs:60000,autoCompletePending:false};
 const owns=(id,u,s)=>ownsEveningTimerRecord(clock,id,u,s)&&
  state.user?.id===u&&state.session?.id===s;
 const card={id:'card',status:'accepted'};
 let queryDone,reads=0,writes=0,notices=0;
 const pending=new Promise(done=>{queryDone=done});
 const play=make(state,clock,owns,isSameEveningResponseContext,
  ()=>card,async()=>{throw Error('already accepted');},
  async()=>{reads++;await pending;return [{...card,status:'accepted'}];},
  ()=>{},()=>{writes++;},()=>{notices++;},()=>true);
 const running=play('timer-toggle');
 assert.equal(reads,1);
 state.user={id:'partner'};state.session={id:'night-b'};
 clock.ownerUserId='partner';clock.ownerSessionId='night-b';
 queryDone();await running;
 assert.equal(clock.running,false);
 assert.equal(writes,0);assert.equal(notices,0);
 assert.equal(state.timerStartContext,null);
});

test('LR-026: Commencer and timer-play cannot concurrently accept the same challenge',async()=>{
 const begin=app.indexOf("if(verb==='evening-start')");
 const end=app.indexOf("if(verb==='surprise-activity')",begin);
 const startFactory=Function('state','challengeTimer','ownEveningChallenges',
  'isSameEveningResponseContext','rpc','refreshShared','activeTimer',
  'resolvedCard','saveChallengeTimer','updateChallengeClock','render',
  'notify','unlockLoveRollSounds',
  'return async function(verb,parts){'+app.slice(begin,end)+'}');
 const playBegin=app.indexOf("if(verb==='timer-toggle')");
 const playEnd=app.indexOf("if(verb==='give-challenge')",playBegin);
 const playFactory=Function('state','challengeTimer','ownsVisibleEveningTimer',
  'isSameEveningResponseContext','timedEveningItem','rpc','query',
  'updateChallengeClock','saveChallengeTimer','notify','unlockLoveRollSounds',
  'return async function(verb){'+app.slice(playBegin,playEnd)+'}');
 const state={user:{id:'fred'},session:{id:'night'},tab:'session',
  challenges:[{id:'card',recipient:'fred',session_id:'night',status:'proposed'}]};
 const clock={id:'card',ownerUserId:'fred',ownerSessionId:'night',
  mode:'vibrate',running:false,remainingMs:120000,autoCompletePending:false};
 const owns=(id,userId,sessionId)=>ownsEveningTimerRecord(clock,id,userId,sessionId)&&
  state.user?.id===userId&&state.session?.id===sessionId;
 let rpcCalls=0;
 let finish;
 const pending=new Promise(resolve=>{finish=resolve;});
 const rpc=async()=>{rpcCalls++;await pending;};
 const start=startFactory(state,clock,ownEveningChallenges,isSameEveningResponseContext,
  rpc,async()=>{state.challenges=[{...state.challenges[0],status:'accepted'}];},
  ()=>{},()=>({minutes:2}),()=>{},()=>{},()=>{},()=>{},()=>{});
 const play=playFactory(state,clock,owns,isSameEveningResponseContext,
  ()=>state.challenges[0],rpc,async()=>[{...state.challenges[0],status:'accepted'}],
  ()=>{},()=>{},()=>{},()=>true);
 const first=start('evening-start',['card']);
 await play('timer-toggle');
 assert.equal(rpcCalls,1,'timer play cannot duplicate a pending Commencer RPC');
 finish();await first;
 assert.equal(state.eveningStartContext,null);
 // In the opposite direction, pending timer-play owns the same acceptance.
 state.challenges=[{...state.challenges[0],status:'proposed'}];
 clock.running=false;clock.remainingMs=120000;
 let finishAgain;const secondPending=new Promise(resolve=>{finishAgain=resolve;});
 const rpcSecond=async()=>{rpcCalls++;await secondPending;};
 const secondPlay=playFactory(state,clock,owns,isSameEveningResponseContext,
  ()=>state.challenges[0],rpcSecond,async()=>[{...state.challenges[0],status:'accepted'}],
  ()=>{},()=>{},()=>{},()=>true);
 const secondStart=startFactory(state,clock,ownEveningChallenges,isSameEveningResponseContext,
  rpcSecond,async()=>{},()=>{},()=>({minutes:2}),()=>{},()=>{},()=>{},()=>{},()=>{});
 const second=secondPlay('timer-toggle');
 await secondStart('evening-start',['card']);
 assert.equal(rpcCalls,2,'Commencer cannot duplicate a pending timer-play RPC');
 finishAgain();await second;
 assert.equal(state.timerStartContext,null);
});

test('LR-026: Commencer never starts a clock on an unconfirmed proposed row',async()=>{
 const code=app.slice(app.indexOf("if(verb==='evening-start')"),
  app.indexOf("if(verb==='surprise-activity')"));
 const make=Function('state','challengeTimer','ownEveningChallenges',
  'isSameEveningResponseContext','rpc','refreshShared','activeTimer',
  'resolvedCard','saveChallengeTimer','updateChallengeClock','render',
  'notify','unlockLoveRollSounds',
  'return async function(verb,parts){'+code+'}');
 const original={id:'still-proposed',recipient:'fred',
  session_id:'night',status:'proposed'};
 const state={user:{id:'fred'},session:{id:'night'},tab:'session',
  challenges:[original],showEveningChallenges:false,
  selectedEveningChallengeId:null};
 const clock={mode:'vibrate',remainingMs:180000,running:false};
 let rpcCalls=0,refreshes=0,timers=0,renders=0,feedback=[];
 const start=make(state,clock,ownEveningChallenges,isSameEveningResponseContext,
  async()=>{rpcCalls++;},async()=>{refreshes++;},
  ()=>{timers++;},()=>({minutes:3}),()=>{},()=>{},
  ()=>{renders++;},message=>feedback.push(message),()=>{});
 await start('evening-start',['still-proposed']);
 assert.equal(rpcCalls,1);
 assert.equal(refreshes,1);
 assert.equal(timers,0,'HTTP success alone cannot start an uncommitted timer');
 assert.equal(clock.running,false);
 assert.equal(state.selectedEveningChallengeId,null);
 assert.equal(state.showEveningChallenges,true);
 assert.equal(renders,1);
 assert.match(feedback[0],/pas encore confirmé/);
 assert.equal(state.eveningStartContext,null);
});

test('LR-026: Commencer starts only after verified recipient refresh and prevents double taps',async()=>{
 const code=app.slice(app.indexOf("if(verb==='evening-start')"),
  app.indexOf("if(verb==='surprise-activity')"));
 const make=Function('state','challengeTimer','ownEveningChallenges',
  'isSameEveningResponseContext','rpc','refreshShared','activeTimer',
  'resolvedCard','saveChallengeTimer','updateChallengeClock','render',
  'notify','unlockLoveRollSounds',
  'return async function(verb,parts){'+code+'}');
 const card={id:'active-card',recipient:'fred',session_id:'my-night',status:'proposed'};
 const state={user:{id:'fred'},session:{id:'my-night'},tab:'session',
  challenges:[card],showEveningChallenges:false,selectedEveningChallengeId:null};
 const clock={mode:'vibrate',remainingMs:0,running:false};
 let resolveRpc;const waitRpc=new Promise(ok=>{resolveRpc=ok;});
 let calls=0,refreshes=0,rendered=0,timerStarts=0,notices=0;
 const start=make(state,clock,ownEveningChallenges,isSameEveningResponseContext,
  async()=>{calls++;await waitRpc;},
  async context=>{
   assert.equal(state.eveningStartContext,context,
    'scoped refresh must use the initiating request token');
   refreshes++;state.challenges=[{...card,status:'accepted'}];
  },
  ()=>{timerStarts++;clock.remainingMs=120000;},
  ()=>({minutes:2}),()=>{},()=>{},
  ()=>{rendered++;},()=>{notices++;},()=>{});
 const first=start('evening-start',['active-card']);
 await start('evening-start',['active-card']);
 assert.equal(calls,1,'double taps must not launch duplicate acceptance RPCs');
 resolveRpc();await first;
 assert.equal(refreshes,1);
 assert.equal(timerStarts,1);
 assert.equal(rendered,1);
 assert.equal(notices,0);
 assert.equal(state.selectedEveningChallengeId,'active-card');
 assert.equal(state.showEveningChallenges,true);
 assert.equal(clock.running,true);
 assert.equal(state.eveningStartContext,null);
 // Another device may finish this card while the local refresh is in flight.
 const terminal={...card,status:'passed'};
 state.challenges=[terminal];
 clock.running=false;timerStarts=0;rendered=0;notices=0;
 const finished=make(state,clock,ownEveningChallenges,isSameEveningResponseContext,
  async()=>{throw Error('passed cards should not be accepted');},
  async()=>{},()=>{timerStarts++;},()=>({minutes:2}),()=>{},()=>{},
  ()=>{rendered++;},()=>{notices++;},()=>{});
 await assert.rejects(finished('evening-start',['active-card']),/ne peut pas être commencé/);
 state.challenges=[{...card,status:'accepted'}];
 const remoteFinished=make(state,clock,ownEveningChallenges,isSameEveningResponseContext,
  async()=>{throw Error('no RPC needed');},
  async()=>{state.challenges=[terminal];},
  ()=>{timerStarts++;},()=>({minutes:2}),()=>{},()=>{},
  ()=>{rendered++;},()=>{notices++;},()=>{});
 await remoteFinished('evening-start',['active-card']);
 assert.equal(timerStarts,0,'terminal cards cannot restart timers');
 assert.equal(rendered,1);
 assert.equal(notices,1);
 assert.equal(state.selectedEveningChallengeId,null);
});

test('LR-026: a D100 timer belongs to one challenge, user and evening even when IDs are reused',()=>{
 const clock={id:'same-id',ownerUserId:'fred',ownerSessionId:'evening-1',
  decisionPending:true,running:true};
 assert.equal(ownsEveningTimerRecord(clock,'same-id','fred','evening-1'),true);
 assert.equal(ownsEveningTimerRecord(clock,'same-id','other','evening-1'),false);
 assert.equal(ownsEveningTimerRecord(clock,'same-id','fred','evening-2'),false);
 assert.equal(ownsEveningTimerRecord(clock,'different','fred','evening-1'),false);
 assert.equal(ownsEveningTimerRecord(null,'same-id','fred','evening-1'),false);
 assert.equal(ownsEveningTimerRecord(clock,'','fred','evening-1'),false);
 // Old request may clear its abandoned pending flag, but must NEVER clear
 // the new account's timer after a card with a colliding ID is mounted.
 const newOwner={...clock,ownerUserId:'partner',ownerSessionId:'evening-2'};
 assert.equal(ownsEveningTimerRecord(newOwner,'same-id','fred','evening-1'),false);
 assert.equal(ownsEveningTimerRecord(newOwner,'same-id','partner','evening-2'),true);
 const source=app.slice(app.indexOf('function saveChallengeTimer(){'),
  app.indexOf('function showTimerFinished(){'));
 assert.match(source,/loveroll-challenge-clock:'\+challengeTimer\.ownerUserId/);
 assert.doesNotMatch(source,/loveroll-challenge-clock:'\+state\.user\.id\+':'\+challengeTimer\.id/);
 assert.match(source,/challengeTimer\.ownerUserId!==state\.user\.id/);
 assert.match(source,/challengeTimer\.ownerSessionId!==state\.session\?\.id/);
 assert.match(source,/function ownsVisibleEveningTimer\(cardId,userId,sessionId\)\{\s+return ownsEveningTimerRecord\(challengeTimer,cardId,userId,sessionId\)&&/);
});

test('LR-026: stale redraw, auto-completion and timer controls respect timer ownership',()=>{
 const action=app.slice(app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')"),
  app.indexOf("if(verb==='evening-start')"));
 const guard='ownsVisibleEveningTimer(challengeId,responseContext.userId,responseContext.sessionId)';
 assert.ok(action.split(guard).length>=4,
  'RPC resolution, failure and reconciliation must check the owning timer');
 assert.match(action,/ownsEveningTimerRecord\(challengeTimer,challengeId,responseContext\.userId,responseContext\.sessionId\)&&\s+challengeTimer\.decisionPending/);
 assert.match(action,/if\(state\.redrawBusyContext===responseContext\)\{/);
 const completion=app.slice(app.indexOf('async function retryExpiredTimedEvening(){'),
  app.indexOf('function endSignal',app.indexOf('async function retryExpiredTimedEvening(){')));
 assert.match(completion,/if\(ownsVisibleEveningTimer\(id,userId,sessionId\)\)/);
 assert.match(completion,/if\(ownsVisibleEveningTimer\(item\.id,userId,sessionId\)\)/);
 assert.match(completion,/if\(state\.user\?\.id===userId&&state\.session\?\.id===sessionId&&\s+!document\.hidden\)notify/);
 const controls=app.slice(app.indexOf("if(verb==='timer-reset')"),
  app.indexOf("if(verb==='give-challenge')"));
 assert.match(controls,/if\(!ownsVisibleEveningTimer\(challengeTimer\.id,state\.user\?\.id,state\.session\?\.id\)\)/);
 assert.match(controls,/const ownsClock=\(\)=>ownsVisibleEveningTimer\(timerChallengeId,timerUserId,timerSessionId\)&&/);
 assert.match(controls,/await rpc\('answer_challenge',[\s\S]*?if\(!ownsStart\(\)\)return;/);
 assert.match(controls,/if\(!ownsStart\(\)\)return;\s+challengeTimer\.deadline=Date\.now\(\)/);
});

test('LR-026: redraw timer only stops on valid receipt or independently refreshed terminal status',()=>{
 const start=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const end=app.indexOf("if(verb==='evening-start')",start);
 assert.ok(start>=0&&end>start);
 const code=app.slice(start,end);
 assert.match(code,/if\(persistedReceiptValid&&ownsVisibleEveningTimer\(challengeId,responseContext\.userId,responseContext\.sessionId\)\)/);
 assert.match(code,/const recovery=redrawTimerRecovery\(stored\?\.status,challengeTimer\.deadline,Date\.now\(\)\)/);
 assert.match(code,/if\(recovery==='stop'\)/);
 assert.match(code,/if\(recovery==='expire'\)/);
 assert.match(code,/if\(recovery==='stop'&&state\.eveningRefusalId===challengeId\)/);
 assert.match(code,/if\(ownsVisibleEveningTimer\(challengeId,responseContext\.userId,responseContext\.sessionId\)&&challengeTimer\.decisionPending\)/);
 assert.match(code,/if\(receiptValid\)state\.eveningRefusalId=null/);
 assert.match(code,/if\(!isSameEveningResponseContext\(state,responseContext\)\|\|[\s\S]*?!ownsEveningRedrawRequest\(state,responseContext\)\)return;[\s\S]*?if\(ownsVisibleEveningTimer\(challengeId,responseContext\.userId,responseContext\.sessionId\)&&challengeTimer\.decisionPending\)/);
 assert.match(code,/else saveChallengeTimer\(\)/);
 assert.doesNotMatch(code,/if\(ownsVisibleEveningTimer\(challengeId,responseContext\.userId,responseContext\.sessionId\)\)\{\s+challengeTimer\.running=false/,
  'timer must not stop unconditionally before receipt validation');
});

test('LR-026: legacy answer path ignores late responses and never stops a foreign timer',()=>{
 const begin=app.indexOf("if(verb==='answer'){");
 const end=app.indexOf("if(verb==='finish-session')",begin);
 assert.ok(begin>0&&end>begin,'legacy response code exists');
 const handler=app.slice(begin,end);
 assert.match(handler,/const answerContext=\{userId:state\.user\.id,sessionId:eveningId,tab:state\.tab\}/);
 assert.match(handler,/if\(isSameEveningResponseContext\(state,state\.legacyAnswerContext\)\)return;/,
  'duplicate taps on the same account and evening must not send overlapping answers');
 assert.match(handler,/const ownsAnswer=\(\)=>isSameEveningResponseContext\(state,answerContext\)&&/);
 assert.match(handler,/state\.legacyAnswerContext===answerContext/);
 assert.match(handler,/const quota=await rpc\('my_love_monthly_pass_quota'[\s\S]*?if\(!ownsAnswer\(\)\)return;[\s\S]*?state\.monthlyPassQuota=quota/,
  'a late quota lookup cannot overwrite the next account quota');
 assert.match(handler,/await rpc\('answer_challenge'[\s\S]*?if\(!ownsAnswer\(\)\)return;/,
  'the response must still own its account and evening after the RPC');
 assert.match(handler,/ownsVisibleEveningTimer\(parts\[0\],answerContext\.userId,answerContext\.sessionId\)/,
  'the old request may stop only its original timer');
 assert.doesNotMatch(handler,/if\(challengeTimer\.id===parts\[0\]&&/,
  'card ID alone is not proof of timer ownership');
 assert.match(handler,/const board=await rpc\('my_love_evening_board'[\s\S]*?if\(!ownsAnswer\(\)\)return;/);
 assert.match(handler,/await rpc\('finish_couple_session'[\s\S]*?if\(!ownsAnswer\(\)\)return;/);
 assert.match(handler,/const alreadyClosed=\(await query\('couple_sessions'[\s\S]*?if\(!ownsAnswer\(\)\)return;/);
 assert.match(handler,/finally\{[\s\S]*?if\(state\.legacyAnswerContext===answerContext\)state\.legacyAnswerContext=null/,
  'the old promise must not unlock a newer response');
 const origin={user:{id:'A'},session:{id:'night-1'},tab:'session'};
 const context={userId:'A',sessionId:'night-1',tab:'session'};
 assert.equal(isSameEveningResponseContext(origin,context),true);
 assert.equal(isSameEveningResponseContext({...origin,user:{id:'B'}},context),false);
 assert.equal(isSameEveningResponseContext({...origin,session:{id:'night-2'}},context),false);
 assert.equal(isSameEveningResponseContext({...origin,tab:'home'},context),false);
});

test('LR-026: scoped refresh rejects a newer night BEFORE committing state',()=>{
 const request={userId:'fred',sessionId:'night-1',tab:'session'};
 const open={id:'night-1',finished_at:null};
 const ended={id:'night-1',finished_at:'2026-10-30T20:00:00Z'};
 const next={id:'night-2',finished_at:null};
 assert.equal(mayApplyScopedEveningRefresh([open],request,false),true);
 assert.equal(mayApplyScopedEveningRefresh([ended],request,true),true,
  'a completed response may refresh its own confirmed finished night');
 assert.equal(mayApplyScopedEveningRefresh([ended],request,false),false,
  'ordinary D100/start must not silently close its night');
 assert.equal(mayApplyScopedEveningRefresh([ended,next],request,true),false,
  'another device creating a new night cannot replace this response state');
 assert.equal(mayApplyScopedEveningRefresh([next],request,true),false);
 assert.equal(mayApplyScopedEveningRefresh([],request,true),false,
  'an absent session is not proof of its closure');
 assert.equal(mayApplyScopedEveningRefresh([open,next],request,true),false,
  'multiple active nights fail closed instead of using first match');
 assert.equal(mayApplyScopedEveningRefresh(null,request,true),false);
 assert.equal(mayApplyScopedEveningRefresh([next],null,false),true,
  'the ordinary, unscoped live refresh remains backwards-compatible');
 const begin=app.indexOf('async function refreshShared(expectedContext=null){');
 const end=app.indexOf('const liveSync=createCoupleLiveSync',begin);
 assert.ok(begin>0&&end>begin);
 const refresh=app.slice(begin,end);
 const guard=refresh.indexOf('if(!mayApplyScopedEveningRefresh(sessions,expectedContext,');
 const firstWrite=refresh.indexOf('state.cycleStatus=cycleInfo;');
 assert.ok(guard>0&&firstWrite>guard,
  'the session preflight must execute before ANY shared state write');
 assert.match(refresh,/state\.legacyAnswerContext===expectedContext\|\|\s*state\.timerCompletionContext===expectedContext\)\)return;/);
 assert.match(refresh,/state\.timerCompletionContext===expectedContext/);
});

test('LR-026: live refresh implementation aborts stale server evening without writing state',async()=>{
 const start=app.indexOf('async function refreshShared(expectedContext=null){');
 const end=app.indexOf('const liveSync=createCoupleLiveSync',start);
 assert.ok(start>0&&end>start);
 const source=app.slice(start,end);
 const request={userId:'fred',sessionId:'original',tab:'session'};
 for(const sessions of [
  [{id:'original',finished_at:'2026-10-30T20:00:00Z'},{id:'new',finished_at:null}],
  [{id:'new',finished_at:null}],
  [{id:'original',finished_at:null},{id:'new',finished_at:null}],
  []
 ]){
  const state={user:{id:'fred'},coupleId:'couple-1',session:{id:'original'},
   tab:'session',legacyAnswerContext:request,
   cycleStatus:'unchanged',monthlyPassQuota:'unchanged',
   challenges:[{id:'existing'}]};
  let readCount=0;
  const query=async table=>{readCount++;return table==='couple_sessions'?sessions:[];};
  const rpc=async()=>{readCount++;return null;};
  const scoped=runInNewContext(source+'; refreshShared;',{
   state,query,rpc,month:()=>'2026-10',
   isSameEveningResponseContext,mayApplyScopedEveningRefresh
  });
  await scoped(request);
  assert.ok(readCount>=17,'the integration scenario reached the server preflight');
  assert.equal(state.cycleStatus,'unchanged');
  assert.equal(state.monthlyPassQuota,'unchanged');
  assert.equal(state.session.id,'original');
  assert.deepEqual(state.challenges,[{id:'existing'}]);
 }
});

test('LR-026: scoped timer refresh rejects a different couple before any RPC',async()=>{
 const start=app.indexOf('async function refreshShared(expectedContext=null){');
 const end=app.indexOf('const liveSync=createCoupleLiveSync',start);
 assert.ok(start>0&&end>start);
 const original={userId:'fred',sessionId:'s1',coupleId:'couple-1',
  tab:'session',challengeId:'c1'};
 const state={user:{id:'fred'},session:{id:'s1'},tab:'session',
  coupleId:'couple-2',timerCompletionContext:original,
  legacyAnswerContext:null,cycleStatus:'unchanged'};
 let networkCalls=0;
 const refresh=runInNewContext(app.slice(start,end)+'; refreshShared;',{
  state,query:async()=>{networkCalls++;return [];},
  rpc:async()=>{networkCalls++;return [];},
  isSameEveningResponseContext,mayApplyScopedEveningRefresh,
  month:()=>'2026-10',console
 });
 const result=await refresh(original);
 assert.equal(result,undefined);
 assert.equal(networkCalls,0,'foreign-couple request must fail before querying RLS');
 assert.equal(state.cycleStatus,'unchanged');
 assert.equal(state.session.id,'s1');
});

test('LR-026: full scoped refresh accepts timer closure but rejects another night',async()=>{
 const start=app.indexOf('async function refreshShared(expectedContext=null){');
 const end=app.indexOf('const liveSync=createCoupleLiveSync',start);
 assert.ok(start>0&&end>start);
 const code=app.slice(start,end)+'; refreshShared;';
 const context={userId:'fred',sessionId:'s1',coupleId:'couple-1',
  tab:'session',challengeId:'card-1'};
 for(const scenario of ['closed','new-evening','missing-proof']){
  const state={user:{id:'fred'},coupleId:'couple-1',tab:'session',
   session:{id:'s1'},legacyAnswerContext:null,timerCompletionContext:context,
   cycleStatus:'unchanged',monthlyPassQuota:'unchanged'};
  const sessions=scenario==='new-evening'?[
   {id:'s1',finished_at:'2026-10-30T20:00:00Z'},
   {id:'s2',finished_at:null}
  ]:scenario==='closed'?[
   {id:'s1',finished_at:'2026-10-30T20:00:00Z'}
  ]:[];
  const refresh=runInNewContext(code,{
   state,query:async table=>table==='couple_sessions'?sessions:[],
   rpc:async name=>name==='love_redraw_capabilities'?false:
    name==='love_cycle_status'?{pending:false}:[],
   isSameEveningResponseContext,mayApplyScopedEveningRefresh,
   ownEveningChallenges,month:()=>'2026-10',week:()=>'2026-W44',console
  });
  const returned=await refresh(context);
  if(scenario==='closed'){
   assert.equal(returned,true);
   assert.equal(state.session,null);
   assert.ok(state.cycleStatus?.pending===false);
  }else{
   assert.equal(returned,undefined,'unrelated or unconfirmed evening must abort');
   assert.equal(state.session.id,'s1');
   assert.equal(state.cycleStatus,'unchanged');
   assert.equal(state.monthlyPassQuota,'unchanged');
  }
 }
});

test('LR-026: legacy response refresh remains scoped across a night closure',()=>{
 const start=app.indexOf('async function refreshShared(expectedContext=null){');
 const end=app.indexOf('const liveSync=createCoupleLiveSync',start);
 assert.ok(start>=0&&end>start);
 const refresh=app.slice(start,end);
 const legacyStart=app.indexOf("if(verb==='answer'){");
 const legacyEnd=app.indexOf("if(verb==='finish-session')",legacyStart);
 const legacy=app.slice(legacyStart,legacyEnd);
 assert.match(refresh,/let legacyClosedDuringRefresh=false;/);
 assert.match(refresh,/state\.user\?\.id===expectedContext\.userId&&state\.tab===expectedContext\.tab/);
 assert.match(refresh,/state\.legacyAnswerContext===expectedContext/);
 assert.match(refresh,/legacyClosedDuringRefresh&&state\.session===null/);
 assert.match(refresh,/legacyClosedDuringRefresh=!!\(expectedContext&&/);
 assert.match(refresh,/state\.session\?\.id===expectedContext\.sessionId&&refreshedSession===null/);
 assert.match(refresh,/sessions\.some\(s=>s\.id===expectedContext\.sessionId&&s\.finished_at\)/);
 assert.match(legacy,/await refreshShared\(answerContext\)/);
 assert.doesNotMatch(legacy,/await refreshAndShow\(\)/,
  'a late unscoped refresh must never mix the next account into this response');
 assert.match(legacy,/state\.legacyAnswerContext!==answerContext\|\|/);
 assert.match(legacy,/state\.session===null&&state\.sessions\?\.some\(s=>/);
 assert.match(legacy,/state\.legacyAnswerContext=null;/);
 assert.match(legacy,/if\(sameView&&sameEvening\)render\(\);/,
  'manual D100 must repaint only after clearing its owner lock');
});

test('LR-026: start, timer and redraw taps are serialized per recipient card',()=>{
 const passStart=app.indexOf("if(verb==='evening-pass'||verb==='evening-refuse-choice')");
 const passEnd=app.indexOf("if(verb==='evening-start')",passStart);
 const startEnd=app.indexOf("if(verb==='surprise-activity')",passEnd);
 const toggleStart=app.indexOf("if(verb==='timer-toggle')");
 const toggleEnd=app.indexOf("if(verb==='give-challenge')",toggleStart);
 assert.ok(passStart>0&&passEnd>passStart&&startEnd>passEnd&&toggleStart>0&&toggleEnd>toggleStart);
 const passCode=app.slice(passStart,passEnd);
 const startCode=app.slice(passEnd,startEnd);
 const toggleCode=app.slice(toggleStart,toggleEnd);
 // An acceptance started from either button must be settled before changing
 // the same server challenge with the opposite action.
 assert.match(passCode,/state\.eveningStartContext\?\.challengeId===challengeId&&\s+isSameEveningResponseContext\(state,state\.eveningStartContext\)/);
 assert.match(passCode,/state\.timerStartContext\?\.challengeId===challengeId&&\s+isSameEveningResponseContext\(state,state\.timerStartContext\)/);
 assert.match(startCode,/isActiveEveningRedrawPending\(\)&&\s+state\.redrawBusyContext\?\.challengeId===parts\[0\]/);
 assert.match(toggleCode,/isActiveEveningRedrawPending\(\)&&\s+state\.redrawBusyContext\?\.challengeId===timerChallengeId/);
 // This must be per-card, per-session and per-account: unrelated cards
 // remain eligible and the later view must not inherit an old lock.
 const request={userId:'A',sessionId:'s1',tab:'session',challengeId:'c1'};
 const view={user:{id:'A'},session:{id:'s1'},tab:'session'};
 assert.equal(request.challengeId==='c1'&&isSameEveningResponseContext(view,request),true);
 assert.equal(request.challengeId==='c2'&&isSameEveningResponseContext(view,request),false);
 assert.equal(isSameEveningResponseContext({...view,user:{id:'B'}},request),false);
 assert.equal(isSameEveningResponseContext({...view,session:{id:'s2'}},request),false);
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
 assert.match(source,/isActiveEveningRedrawPending\(\)\|\|state\.monthlyPassQuota\?\.can_pass===false\?'disabled'/);
 assert.match(source,/isActiveEveningRedrawPending\(\)\?'disabled'/);
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

test('LR-026: unscoped refresh never commits an old account or couple after first network batch',async()=>{
 const start=app.indexOf('async function refreshShared(expectedContext=null){');
 const end=app.indexOf('const liveSync=createCoupleLiveSync',start);
 assert.ok(start>0&&end>start);
 for(const moved of ['account','couple']){
  const state={user:{id:'alice'},coupleId:'couple-A',tab:'session',
   session:{id:'session-A'},cycleStatus:'previous',
   monthlyPassQuota:'previous',challenges:[{id:'keep-private'}]};
  let initialReads=0,additionalCalls=0;
  const refresh=runInNewContext(app.slice(start,end)+'; refreshShared;',{
   state,
   query:async name=>{
    initialReads++;
    if(name==='couple_sessions'){
     if(moved==='account')state.user={id:'bob'};
     else state.coupleId='couple-B';
     return [{id:'session-A',finished_at:null}];
    }
    return [];
   },
   rpc:async name=>{
    if(name==='love_redraw_capabilities')additionalCalls++;
    if(name==='love_cycle_status')return {pending:false};
    return [];
   },
   isSameEveningResponseContext,mayApplyScopedEveningRefresh,
   ownEveningChallenges,month:()=>'2026-10',week:()=>'2026-W44',
   console
  });
  const result=await refresh();
  assert.equal(result,undefined,
   moved+' switching during an unscoped fetch must discard its results');
  assert.ok(initialReads>=8,'the initial private query batch really started');
  assert.equal(additionalCalls,0,'no further private RPC on the replacement account');
  assert.equal(state.cycleStatus,'previous','old couple status must remain untouched');
  assert.equal(state.monthlyPassQuota,'previous');
  assert.deepEqual(state.challenges,[{id:'keep-private'}]);
  assert.equal(state.session.id,'session-A');
 }
});

test('LR-026: unscoped refresh survives a harmless tab change on the same account',async()=>{
 const start=app.indexOf('async function refreshShared(expectedContext=null){');
 const end=app.indexOf('const liveSync=createCoupleLiveSync',start);
 assert.ok(start>0&&end>start);
 const state={user:{id:'alice'},coupleId:'couple-A',tab:'session',
  session:{id:'session-A'},challenges:[],reviewModalSessionId:null,
  reviewDismissedSessionId:null,eveningCalendarMonth:'2026-10'};
 const refresh=runInNewContext(app.slice(start,end)+'; refreshShared;',{
  state,
  query:async name=>{
   if(name==='couple_sessions'){
    state.tab='settings';
    return [{id:'session-A',finished_at:null}];
   }
   return [];
  },
  rpc:async name=>{
   if(name==='love_redraw_capabilities')return false;
   if(name==='love_cycle_status')return {pending:false};
   return [];
  },
  isSameEveningResponseContext,mayApplyScopedEveningRefresh,
  ownEveningChallenges,refreshEclatStatus:async()=>{},
  month:()=>'2026-10',week:()=>'2026-W44',console
 });
 const result=await refresh();
 assert.equal(result,true,'tab navigation should not cancel an account-owned refresh');
 assert.equal(state.tab,'settings');
 assert.equal(state.session.id,'session-A');
});
