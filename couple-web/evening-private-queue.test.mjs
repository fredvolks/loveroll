import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {ownEveningChallenges,visibleEveningQueue,queuePosition,queueLabel,hasTurnToDraw,eveningRedrawFeedback,isValidEveningRedrawReceipt,isPersistedEveningRedrawReceipt,activeEveningRedrawReplacementId,snapshotEveningCardBeforeRedraw,EVENING_REDRAW_IMMUTABLE_FIELDS,ownsEveningTimerRecord,ownedSavedEveningTimerSnapshot,isSameEveningResponseContext,isEveningRedrawBusyForCurrentView,ownsEveningRedrawRequest,redrawTimerRecovery,mayApplyScopedEveningRefresh,ownsCoupleAsyncRead,hasPendingEclatNote} from './evening-private-queue.mjs';
import {premiumEveningHtml} from './premium-evening.mjs';
import {validChallengeTimerMinutes} from './evening-challenges.mjs';
import {previewEclatStatus} from './account-preview-mode.mjs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 // Isolated handler tests evaluate the REAL production action guards.
 const actionGuardPrelude=[
  app.slice(app.indexOf('function ownsTimerCompletionSession(context){'),
   app.indexOf('function ownsTimerCompletionRefresh(context){')),
  app.slice(app.indexOf('function isEveningCardCompleting(cardId){'),
   app.indexOf('function protectEveningTimerPresentation(presentation){')),
  app.slice(app.indexOf('function isActiveEveningRedrawPending(){'),
   app.indexOf('async function refreshShared(expectedContext=null){')),
  isEveningRedrawBusyForCurrentView.toString(),
  // Dynamic handler fixtures must include the production timer validator,
  // just like the real app's module import.
  validChallengeTimerMinutes.toString()
 ].join('\n');

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
 assert.match(body,/const current=\(\)=>state\.coupleId===c&&state\.user\?\.id===requestUserId&&/);
 assert.match(body,/state\.unscopedSharedRefreshRequest===unscopedRequest/);
 assert.match(body,/isSameEveningResponseContext\(state,expectedContext\)/);
 assert.match(body,/if\(!current\(\)\)return;/);
 for(const pattern of [
  /\]\);\s+if\(!current\(\)\)return;[\s\S]*?if\(!mayApplyScopedEveningRefresh\([\s\S]*?\)\)return;\s+state\.cycleStatus=/,
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
  'return async function(verb,parts){'+actionGuardPrelude+code+'}');
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
  'return async function(verb){'+actionGuardPrelude+branch+'}');
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
  'return async function(verb){'+actionGuardPrelude+app.slice(begin,end)+'}');
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
  'return async function(verb){'+actionGuardPrelude+app.slice(begin,end)+'}');
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
  'return async function(verb,parts){'+actionGuardPrelude+app.slice(begin,end)+'}');
 const playBegin=app.indexOf("if(verb==='timer-toggle')");
 const playEnd=app.indexOf("if(verb==='give-challenge')",playBegin);
 const playFactory=Function('state','challengeTimer','ownsVisibleEveningTimer',
  'isSameEveningResponseContext','timedEveningItem','rpc','query',
  'updateChallengeClock','saveChallengeTimer','notify','unlockLoveRollSounds',
  'return async function(verb){'+actionGuardPrelude+app.slice(playBegin,playEnd)+'}');
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
  'return async function(verb,parts){'+actionGuardPrelude+code+'}');
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
  'return async function(verb,parts){'+actionGuardPrelude+code+'}');
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
 assert.match(completion,/if\(ownsTimerCompletionSession\(context\)&&\s*ownsVisibleEveningTimer\(id,userId,sessionId\)\)/);
 assert.match(completion,/if\(ownsTimerCompletionSession\(context\)&&\s*ownsVisibleEveningTimer\(item\.id,userId,sessionId\)\)/);
 assert.match(completion,/if\(ownsTimerCompletionRefresh\(context\)&&\s*!document\.hidden\)notify/);
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
 assert.match(handler,/const answerContext=\{userId:state\.user\.id,coupleId:state\.coupleId,sessionId:eveningId,\s*tab:state\.tab,challengeId:parts\[0\]\}/);
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
 assert.match(handler,/finally\{[\s\S]*?if\(state\.legacyAnswerContext===answerContext\)\{[\s\S]*?state\.legacyAnswerContext=null;/,
  'the old promise must not unlock a newer response');
 assert.match(handler,/const sameView=state\.user\?\.id===answerContext\.userId&&[\s\S]*?state\.coupleId===answerContext\.coupleId&&state\.tab===answerContext\.tab;/,
  'no stale answer may repaint a different user or couple');
 assert.match(handler,/const sameEvening=state\.session\?\.id===answerContext\.sessionId\|\|[\s\S]*?if\(sameView&&sameEvening\)render\(\);/,
  'a released answer may repaint only its own evening');
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
   state,authFeedbackGeneration:1,query,rpc,month:()=>'2026-10',
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
  state,authFeedbackGeneration:1,query:async()=>{networkCalls++;return [];},
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
   state,authFeedbackGeneration:1,query:async table=>table==='couple_sessions'?sessions:[],
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
 assert.match(source,/isActiveEveningRedrawPending\(\)\|\|isEveningCardCompleting\(view\.id\)\|\|state\.monthlyPassQuota\?\.can_pass===false\?'disabled'/);
 assert.match(source,/isActiveEveningRedrawPending\(\)\|\|isEveningCardCompleting\(view\.id\)\?'disabled'/);
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
   state,authFeedbackGeneration:1,
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
  state,authFeedbackGeneration:1,
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

test('LR-026: later unscoped refresh wins when older same-account network finishes last',async()=>{
 const begin=app.indexOf('async function refreshShared(expectedContext=null){');
 const end=app.indexOf('const liveSync=createCoupleLiveSync',begin);
 assert.ok(begin>0&&end>begin);
 let releaseOld;
 const firstPending=new Promise(resolve=>{releaseOld=resolve;});
 const state={user:{id:'alice'},coupleId:'couple-A',tab:'session',
  session:{id:'session-A'},eveningCalendarMonth:'2026-10',
  cycleStatus:'initial',challenges:[{id:'original'}],
  reviewModalSessionId:null,reviewDismissedSessionId:null};
 let sessionReads=0,cycleReads=0;
 const requestContext={
  state,authFeedbackGeneration:1,
  query:async name=>{
   if(name==='couple_sessions'){
    sessionReads++;
    if(sessionReads===1)await firstPending;
    return [{id:'session-A',finished_at:null}];
   }
   return [];
  },
  rpc:async name=>{
   if(name==='love_cycle_status')return {generation:++cycleReads,pending:false};
   if(name==='love_redraw_capabilities')return false;
   return [];
  },
  isSameEveningResponseContext,mayApplyScopedEveningRefresh,
  ownEveningChallenges,refreshEclatStatus:async()=>{},
  month:()=>'2026-10',week:()=>'2026-W44',console
 };
 const runtime={...requestContext};
 const refresh=runInNewContext(app.slice(begin,end)+'; refreshShared;',runtime);
 const older=refresh();
 const newer=refresh();
 assert.equal(await newer,true);
 assert.equal(state.cycleStatus.generation,2);
 releaseOld();
 const stale=await older;
 assert.equal(stale,undefined,'the earlier unscoped response must not commit');
 assert.equal(state.cycleStatus.generation,2,
  'older data cannot overwrite the newest same-account refreshed state');
});

test('LR-026: scoped D100 refresh supersedes older ordinary background request',async()=>{
 const begin=app.indexOf('async function refreshShared(expectedContext=null){');
 const end=app.indexOf('const liveSync=createCoupleLiveSync',begin);
 assert.ok(begin>0&&end>begin);
 let releaseOld;
 const pending=new Promise(resolve=>{releaseOld=resolve;});
 const action={userId:'alice',sessionId:'session-A',
  coupleId:'couple-A',tab:'session',challengeId:'card-A'};
 const state={user:{id:'alice'},coupleId:'couple-A',tab:'session',
  session:{id:'session-A'},legacyAnswerContext:action,
  cycleStatus:'initial',challenges:[],
  reviewModalSessionId:null,reviewDismissedSessionId:null};
 let sessionReads=0,cycleReads=0;
 const refresh=runInNewContext(app.slice(begin,end)+'; refreshShared;',{
  state,authFeedbackGeneration:1,
  query:async name=>{
   if(name==='couple_sessions'){
    sessionReads++;
    if(sessionReads===1)await pending;
    return [{id:'session-A',finished_at:null}];
   }
   return [];
  },
  rpc:async name=>{
   if(name==='love_cycle_status')return {generation:++cycleReads,pending:false};
   if(name==='love_redraw_capabilities')return false;
   return [];
  },
  isSameEveningResponseContext,mayApplyScopedEveningRefresh,
  ownEveningChallenges,month:()=>'2026-10',week:()=>'2026-W44',
  refreshEclatStatus:async()=>{},console
 });
 const background=refresh();
 const scoped=refresh(action);
 assert.equal(await scoped,true,'the owned D100 refresh must complete');
 assert.equal(state.cycleStatus.generation,2);
 releaseOld();
 assert.equal(await background,undefined,
  'outdated background reads must yield to a later owned D100 request');
 assert.equal(state.cycleStatus.generation,2);
});

test('LR-026: background couple reads require BOTH original user and couple',()=>{
 const a={userId:'alice',coupleId:'couple-1'};
 assert.equal(ownsCoupleAsyncRead({user:{id:'alice'},coupleId:'couple-1'},a),true);
 assert.equal(ownsCoupleAsyncRead({user:{id:'bob'},coupleId:'couple-1'},a),false,
  'partners using the same device must not share a stale response');
 assert.equal(ownsCoupleAsyncRead({user:{id:'alice'},coupleId:'couple-2'},a),false);
 assert.equal(ownsCoupleAsyncRead({user:null,coupleId:'couple-1'},a),false);
 for(const owner of [null,{}, {userId:'',coupleId:'couple-1'},
  {userId:'alice',coupleId:''}])
  assert.equal(ownsCoupleAsyncRead({user:{id:'alice'},coupleId:'couple-1'},owner),false);
});

function eclatReadFixture(state,{rpc=async()=>null,loadEclatHistory=async()=>[]}={}){
 const begin=app.indexOf('let latestEclatHistoryRead=null,latestEclatStatusRead=null;');
 const end=app.indexOf('function renderEclat(){',begin);
 assert.ok(begin>=0&&end>begin,'production Éclat read implementation must be tested');
 return runInNewContext('let latestEclatAudioOwner=null;\n'+app.slice(begin,end)+
  ';({refreshEclatHistory,refreshEclatStatus})',{
   state,authFeedbackGeneration:1,rpc,loadEclatHistory,ownsCoupleAsyncRead,client:{},
   eclatNoteDrafts:new Map(),eclatAudio:{stop:()=>{}},
   isSharedCoupleReady:(couple,members)=>!!couple&&members?.length===2,console
  });
}

test('LR-026: an Éclat history result from a signed-out partner cannot cross into new account',async()=>{
 const state={user:{id:'alice'},coupleId:'same-duo',members:[1,2],
  eclat:{access:true,active:true},
  eclatHistory:[{id:'previous'}],eclatHistoryCouple:'same-duo',
  eclatHistoryUserId:'alice',eclatGalleryScroll:2};
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const {refreshEclatHistory}=eclatReadFixture(state,{loadEclatHistory:()=>pending});
 const old=refreshEclatHistory();
 state.user={id:'bob'};
 release([{id:'alice-private'}]);
 await old;
 assert.deepEqual(state.eclatHistory,[{id:'previous'}],
  'old account response cannot write after login change');
 const newFixture=eclatReadFixture(state,{loadEclatHistory:async()=>[{id:'bob-only'}]});
 await newFixture.refreshEclatHistory();
 assert.equal(state.eclatHistoryUserId,'bob');
 assert.equal(state.eclatGalleryScroll,0);
 assert.deepEqual(Array.from(state.eclatHistory,r=>r.id),['bob-only']);
});

test('LR-026: newer Éclat history refresh wins an older delayed response',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',members:[1,2],
  eclat:{access:true,active:true},
  eclatHistory:[],eclatHistoryCouple:'duo',eclatHistoryUserId:'alice'};
 let release,reads=0;
 const pending=new Promise(resolve=>{release=resolve;});
 const {refreshEclatHistory}=eclatReadFixture(state,{
  loadEclatHistory:()=>++reads===1?pending:Promise.resolve([{id:'newest'}])
 });
 const old=refreshEclatHistory();
 await refreshEclatHistory();
 release([{id:'outdated'}]);await old;
 assert.deepEqual(Array.from(state.eclatHistory,r=>r.id),['newest']);
});

test('LR-026: delayed Éclat status cannot replace a different account or render its poll',async()=>{
 const state={user:{id:'alice'},coupleId:'shared',members:[1,2],
  tab:'eclat',eclat:{id:'old'},eclatHistory:[],eclatHistoryCouple:'shared',
  eclatHistoryUserId:'alice'};
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const {refreshEclatStatus}=eclatReadFixture(state,{rpc:()=>pending});
 const call=refreshEclatStatus();
 state.user={id:'bob'};
 release({id:'alice-session'});
 assert.equal(await call,null);
 assert.equal(state.eclat.id,'old');
 const start=app.indexOf('let latestEclatHistoryRead=null,latestEclatStatusRead=null;');
 const end=app.indexOf('function renderEclat(){',start);
 const pollBegin=app.indexOf("setInterval(async()=>{\n if(document.hidden||state.tab!=='eclat'");
 const pollEnd=app.indexOf('},4500);',pollBegin);
 assert.ok(pollBegin>0&&pollEnd>pollBegin);
 let tick,renderCount=0,releasePoll;
 const pollPending=new Promise(resolve=>{releasePoll=resolve;});
 runInNewContext('let latestEclatAudioOwner=null;\n'+app.slice(start,end)+'let latestEclatPollPending=null;\n'+app.slice(pollBegin,pollEnd+8),{
  state,authFeedbackGeneration:1,ownsCoupleAsyncRead,console,
  eclatNoteDrafts:new Map(),eclatAudio:{stop:()=>{}},
  isSharedCoupleReady:(c,m)=>!!c&&m?.length===2,
  rpc:()=>pollPending,loadEclatHistory:async()=>[],
  document:{hidden:false},setInterval:fn=>{tick=fn;},
  render:()=>{renderCount++;}
 });
 const ticking=tick();
 state.user={id:'carol'};
 releasePoll({id:'bob-session'});
 await ticking;
 assert.equal(state.eclat.id,'old');
 assert.equal(renderCount,0,'old poll must not repaint the new account');
});

test('LR-026: mutating Éclat responses belong to the initiating account, view and request',()=>{
 const start=app.indexOf('let latestEclatHistoryRead=null,latestEclatStatusRead=null;');
 const end=app.indexOf('function renderEclat(){',start);
 assert.ok(start>=0&&end>start);
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  members:[{id:'alice'},{id:'bob'}],eclat:{id:'before'}};
 const scope=runInNewContext('let latestEclatAudioOwner=null;\n'+app.slice(start,end)+
  ';({beginEclatAction,ownsEclatAction,applyEclatActionResult})',{
   state,authFeedbackGeneration:1,ownsCoupleAsyncRead,console,
   eclatNoteDrafts:new Map(),eclatAudio:{stop:()=>{}},
   isSharedCoupleReady:(couple,members)=>!!couple&&members?.length===2,
   rpc:async()=>null,loadEclatHistory:async()=>[]
  });
 const old=scope.beginEclatAction();
 assert.equal(scope.ownsEclatAction(old),true);
 const newer=scope.beginEclatAction();
 assert.equal(scope.ownsEclatAction(old),false,
  'a second tap supersedes the previous pending action');
 assert.equal(scope.applyEclatActionResult({id:'old-result'},old),false);
 state.tab='home';
 assert.equal(scope.applyEclatActionResult({id:'different-tab'},newer),false);
 state.tab='eclat';state.user={id:'bob'};
 assert.equal(scope.applyEclatActionResult({id:'alice-private'},newer),false);
 state.user={id:'alice'};state.coupleId='another-duo';
 assert.equal(scope.applyEclatActionResult({id:'old-duo'},newer),false);
 assert.equal(state.eclat.id,'before');
 state.coupleId='duo';
 const latest=scope.beginEclatAction();
 assert.equal(scope.applyEclatActionResult({id:'valid'},latest),true);
 assert.equal(state.eclat.id,'valid');
});

test('LR-026: every Éclat mutation checks ownership before applying its response',()=>{
 for(const [action,rpcName] of [
  ['start','love_eclat_start'],['choose','love_eclat_choose'],
  ['next','love_eclat_next'],['end','love_eclat_end']
 ]){
  const from=app.indexOf("if(kind==='"+action+"'){",app.indexOf("if(verb==='eclat'){"));
  assert.ok(from>0,'Éclat action '+action+' must remain present');
  const until=app.indexOf("if(kind==='",from+15);
  const branch=app.slice(from,until<0?from+1200:until);
  assert.match(branch,/beginEclatAction\(\)/,
   action+' must snapshot the user before the RPC');
  assert.ok(branch.includes("runEclatMutation(owner,'"+rpcName+"'"),
   action+' must still invoke the official SQL RPC through its owner guard');
  assert.match(branch,/if\(!result\.applied\|\|!applyEclatActionResult\(result\.value,owner\)\)return;/,
   action+' may apply only the owner-validated server receipt');
 }
 const exitStart=app.indexOf("if(kind==='end'){",app.indexOf("if(verb==='eclat'){"));
 const exitEnd=app.indexOf("throw Error('Commande Éclat inconnue')",exitStart);
 assert.ok(exitStart>0&&exitEnd>exitStart,'the real Quitter guard must exist');
 const exitBranch=app.slice(exitStart,exitEnd);
 assert.match(exitBranch,/!yes\|\|!ownsEclatAction\(owner\)\|\|!canPlayEclat\(\)/,
  'an old account or revoked entitlement must never send a Quitter mutation');
 assert.match(exitBranch,/session_id\?\?null\)\!\=\=confirmation\.sessionId/,
  'a confirmation from a replaced coffret cannot end the new session');
 assert.match(exitBranch,/chapter_index\?\?null\)\!\=\=confirmation\.chapterIndex/,
  'an old chapter confirmation cannot end the next chapter');
});

function eclatMusicFixture(state,audio,notify=()=>{},render=()=>{},masked=false){
 const parent=app.indexOf("if(verb==='eclat'){");
 const start=app.indexOf("if(kind==='music'){",parent);
 const end=app.indexOf("if(kind==='resume'){",start);
 assert.ok(parent>0&&start>parent&&end>start,
  'production Éclat music handler must be present');
 const runtime={
  state,authFeedbackGeneration:1,eclatAudio:audio,
  document:{documentElement:{classList:{contains:()=>masked}}},
  eclatStage:()=>({mood:'romantique'}),
  ownsCoupleAsyncRead,previewEclatStatus,
  isSharedCoupleReady:(couple,members)=>!!couple&&Array.isArray(members)&&members.length===2,
  notify,render
 };
 const music=runInNewContext(
  app.slice(app.indexOf('function canPlayEclat(){'),
   app.indexOf('function beginEclatAction(){'))+
  'let latestEclatAudioOwner=null; async function runMusic(kind){'+
  app.slice(start,end)+
  '} ({runMusic,owner:()=>latestEclatAudioOwner});',runtime);
 return {...music,setAuthGeneration:value=>{runtime.authFeedbackGeneration=value;}};
}

test('LR-026: asynchronous Éclat audio cannot resume after changing account',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,coffret_id:1,chapter_number:1,variant_number:1},
  members:[{id:'alice'},{id:'bob'}],eclatMusic:false};
 let release,stops=0,notifications=0,paints=0;
 const audio={start:()=>new Promise(resolve=>{release=resolve;}),
  stop:()=>{stops++;}};
 const music=eclatMusicFixture(state,audio,()=>notifications++,()=>paints++);
 const pending=music.runMusic('music');
 state.user={id:'bob'};
 release(true);
 await pending;
 assert.equal(stops,1,'stale audio must stop after account change');
 assert.equal(state.eclatMusic,false,'new account must not inherit playback');
 assert.equal(notifications,0,'no stale audio error toast');
 assert.equal(paints,0,'no stale audio screen render');
});

test('LR-026: Éclat audio permission cannot resume after reauthentication of the same user',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,coffret_id:1,chapter_number:1,variant_number:1},
  members:[{id:'alice'},{id:'bob'}],eclatMusic:false};
 let finishStart,stops=0,notifications=0,paints=0;
 const audio={start:()=>new Promise(resolve=>{finishStart=resolve;}),
  stop:()=>{stops++;}};
 const music=eclatMusicFixture(state,audio,()=>notifications++,()=>paints++);
 const pending=music.runMusic('music');
 music.setAuthGeneration(2);
 finishStart(true);
 await pending;
 assert.equal(stops,1,'a previous login must not resume audio on the new login');
 assert.equal(state.eclatMusic,false);
 assert.equal(notifications,0);
 assert.equal(paints,0);
});

test('LR-026: Éclat audio can start after reauthentication without accepting an older result',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,coffret_id:1,chapter_number:1,variant_number:1},
  members:[{id:'alice'},{id:'bob'}],eclatMusic:false};
 const starts=[];
 const audio={start:()=>new Promise(resolve=>starts.push(resolve)),stop:()=>{}};
 let paints=0;
 const music=eclatMusicFixture(state,audio,()=>{},()=>paints++);
 const previous=music.runMusic('music');
 music.setAuthGeneration(2);
 const newest=music.runMusic('music');
 starts[1](true);await newest;
 starts[0](false);await previous;
 assert.equal(state.eclatMusic,true,'latest login is still allowed to play');
 assert.equal(paints,1,'old permission cannot render new UI');
});

test('LR-026: later Éclat audio tap wins while earlier permission is pending',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,coffret_id:1,chapter_number:1,variant_number:1},
  members:[{id:'alice'},{id:'bob'}],eclatMusic:false};
 const starts=[];
 const audio={start:()=>new Promise(resolve=>starts.push(resolve)),stop:()=>{}};
 let paints=0;
 const music=eclatMusicFixture(state,audio,()=>{},()=>paints++);
 const first=music.runMusic('music'),second=music.runMusic('music');
 assert.equal(starts.length,2);
 starts[1](true);await second;
 starts[0](false);await first;
 assert.equal(state.eclatMusic,true,
  'outdated audio permission must not turn off a newer successful start');
 assert.equal(paints,1);
});


test('LR-026: pending Éclat audio is cancelled if couple membership is revoked',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,coffret_id:1,chapter_number:1,variant_number:1},
  members:[{id:'alice'},{id:'bob'}],eclatMusic:false};
 let finishStart,stops=0,paints=0;
 const audio={start:()=>new Promise(resolve=>{finishStart=resolve;}),
  stop:()=>{stops++;}};
 const music=eclatMusicFixture(state,audio,()=>{},()=>paints++);
 const old=music.runMusic('music');
 state.members=[{id:'alice'}];
 finishStart(true);
 await old;
 assert.equal(stops,1,'an outdated audio session must stop');
 assert.equal(state.eclatMusic,false);
 assert.equal(paints,0);
});

test('LR-026: signing out and masking privacy invalidate Éclat audio',()=>{
 const signout=app.indexOf("if(event==='SIGNED_OUT')");
 assert.ok(signout>=0);
 assert.match(app.slice(signout,signout+440),/adoptAuthenticatedIdentity\(null\)/);
 const identityReset=app.slice(app.indexOf('function adoptAuthenticatedIdentity(nextUser){'),
  app.indexOf('function adoptAuthenticatedIdentity(nextUser){')+4000);
 assert.match(identityReset,/latestEclatAudioOwner=null;eclatAudio\.stop\(\);state\.eclatMusic=false/);
 const privacy=app.slice(app.indexOf("document.addEventListener('loveroll:privacy-mask'"),
  app.indexOf('function pendingReferralCode()'));
 assert.match(privacy,/latestEclatAudioOwner=null;[\s\S]*eclatAudio\.stop\(\)/);
});

test('LR-026: a masked Éclat audio tap never repaints protected content',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,coffret_id:1,chapter_number:1,variant_number:1},
  members:[{id:'alice'},{id:'bob'}],eclatMusic:false};
 let stops=0,starts=0,paints=0,notifications=0;
 const music=eclatMusicFixture(state,{
  start:async()=>{starts++;return true;},stop:()=>{stops++;}
 },()=>notifications++,()=>paints++,true);
 await music.runMusic('music');
 assert.equal(starts,0,'privacy overlay cannot start soundtrack');
 assert.equal(stops,1,'existing music must stop');
 assert.equal(paints,0,'privacy overlay must not rerender card content');
 assert.equal(notifications,0);
 assert.equal(state.eclatMusic,false);
});

// Exercise the production Auth/RLS rejection boundary alongside note helpers.
// Both VM fixtures must see the same handler as the actual LoveRoll app.
const privateEclatDenialStart=app.indexOf('function applyEclatStatus(value){');
const privateEclatDenialEnd=app.indexOf('// Supabase may serialize the same status fields',privateEclatDenialStart);
assert.ok(privateEclatDenialStart>0&&privateEclatDenialEnd>privateEclatDenialStart);
const privateEclatDenialSource='let latestEclatHistoryRead=null,latestEclatAudioOwner=null;\n'+
 app.slice(privateEclatDenialStart,privateEclatDenialEnd);

// The live UI now announces the first save immediately. These older privacy
// tests assert that no *additional* feedback leaks after the owner changes.
const initialEclatSaveFeedback=['Enregistrement…','Enregistrement en cours…'];
function privateEclatSaveFixture(state,saveEclatNote){
 if(!state.members)state.members=[{id:'alice'},{id:'bob'}];
 const start=app.indexOf('const eclatNoteDrafts=new Map();');
 const end=app.indexOf('// Every Éclat response is tied',start);
 assert.ok(start>=0&&end>start,'real Éclat private-note helpers must be available');
 const labels=[];
 const scope=runInNewContext(app.slice(start,end)+'\n'+privateEclatDenialSource+
  ';({saveCurrentEclatNote,drafts:eclatNoteDrafts,setAuthGeneration:value=>{authFeedbackGeneration=value;}})',{
   state,authFeedbackGeneration:1,saveEclatNote,ownsCoupleAsyncRead,
   isSharedCoupleReady:(couple,members)=>!!couple&&Array.isArray(members)&&members.length===2,
   console,client:{},eclatAudio:{stop:()=>{}},render:()=>{},
   eclatNoteKey:(status,userId)=>status?.active&&status.session_id&&userId?
    [userId,status.session_id,status.chapter_index].join(':'):null,
   root:{querySelector:()=>({set textContent(value){labels.push(value);}})}
  });
 const draft={note:'Private',clue:'Indice',moment_done:false,
  loading:false,error:false,saving:false,saved:false,generation:1};
 scope.drafts.set('alice:session-1:1',draft);
 return {...scope,draft,labels};
}

test('LR-026: private Éclat note save ignores a late response after account switch',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 const {saveCurrentEclatNote,draft,labels}=privateEclatSaveFixture(state,()=>pending);
 const saving=saveCurrentEclatNote(true);
 state.user={id:'bob'};
 release();
 assert.equal(await saving,null);
 assert.equal(draft.moment_done,false,
  'a private save from Alice cannot mark Bob current moment as finished');
 assert.equal(draft.saved,false);
 assert.equal(draft.saving,false);
 assert.deepEqual(labels,initialEclatSaveFeedback);
});

test('LR-026: old Éclat chapter response cannot mark a new chapter saved',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 const {saveCurrentEclatNote,draft}=privateEclatSaveFixture(state,()=>pending);
 const saving=saveCurrentEclatNote(true);
 state.eclat={...state.eclat,chapter_index:2};
 release();
 assert.equal(await saving,null);
 assert.equal(draft.moment_done,false);
 assert.equal(draft.saved,false);
});

test('LR-026: stale Éclat save error never changes a new account error label',async()=>{
 let rejectSave;const pending=new Promise((_,reject)=>{rejectSave=reject;});
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 const {saveCurrentEclatNote,labels}=privateEclatSaveFixture(state,()=>pending);
 const saving=saveCurrentEclatNote(true);
 state.user={id:'bob'};
 rejectSave(new Error('Network failed'));
 assert.equal(await saving,null);
 assert.deepEqual(labels,initialEclatSaveFeedback,'stale failure cannot overwrite Bob error message');
});

test('LR-026: current Éclat note saves preserve normal success and visible failures',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 let captured;
 const valid=privateEclatSaveFixture(state,async(_client,status,userId,snapshot)=>{
  captured={status,userId,snapshot};
 });
 assert.equal(await valid.saveCurrentEclatNote(true),'alice:session-1:1');
 assert.equal(valid.draft.moment_done,true);
 assert.equal(valid.draft.saved,true);
 assert.equal(captured.userId,'alice');
 assert.equal(captured.status.chapter_index,1);
 assert.equal(captured.snapshot.moment_done,true);
 const failed=privateEclatSaveFixture(state,async()=>{throw Error('Server failed');});
 await assert.rejects(failed.saveCurrentEclatNote(),/Server failed/);
 assert.equal(failed.labels.filter(label=>label.startsWith('Non enregistré.')).length,1,
  'only one real error is reported, distinct from progress and button labels');
 assert.equal(failed.labels.at(-1),'Enregistrer ma note',
  'a network failure restores the save control');
 assert.equal(failed.draft.saving,false);
});

test('LR-026: a private note superseded during Choose forbids the following RPC',()=>{
 const action=app.slice(app.indexOf("if(kind==='choose'){",app.indexOf("if(verb==='eclat'){")),
  app.indexOf("if(kind==='next'){",app.indexOf("if(verb==='eclat'){")));
 assert.match(action,/const saved=await saveCurrentEclatNote\(\)/);
 assert.match(action,/if\(!saved\)return;/);
 const noteFlow=app.slice(app.indexOf("if(kind.startsWith('note-')){",app.indexOf("if(verb==='eclat'){")),
  app.indexOf("if(kind==='back'){",app.indexOf("if(verb==='eclat'){")));
 assert.match(noteFlow,/if\(!savedKey\|\|state\.tab!=='eclat'/);
});

function privateEclatReadFixture(state,loadEclatNote){
 if(!state.members)state.members=[{id:'alice'},{id:'bob'}];
 const start=app.indexOf('const eclatNoteDrafts=new Map();');
 const end=app.indexOf('// Every Éclat response is tied',start);
 assert.ok(start>0&&end>start);
 let paints=0;
 const scope=runInNewContext(app.slice(start,end)+'\n'+privateEclatDenialSource+
  ';({eclatNoteState,drafts:eclatNoteDrafts,setAuthGeneration:value=>{authFeedbackGeneration=value;}})',{
  state,authFeedbackGeneration:1,loadEclatNote,ownsCoupleAsyncRead,
  isSharedCoupleReady:(couple,members)=>!!couple&&Array.isArray(members)&&members.length===2,
  console,client:{},eclatAudio:{stop:()=>{}},
  eclatNoteKey:(status,userId)=>status?.active&&status.session_id&&userId?
   [userId,status.session_id,status.chapter_index].join(':'):null,
  render:()=>paints++
 });
 return {...scope,paintCount:()=>paints};
}
const settlePrivateNoteRead=async()=>{
 for(let i=0;i<6;i++)await Promise.resolve();
};

test('LR-026: older Éclat note load cannot overwrite a new retry draft',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1},eclatBrowse:false};
 let releaseOld,reads=0;
 const pending=new Promise(resolve=>{releaseOld=resolve;});
 const f=privateEclatReadFixture(state,()=>++reads===1?pending:
  Promise.resolve({note:'Réponse récente',clue:'Indice actuel',moment_done:false}));
 const old=f.eclatNoteState();
 f.drafts.delete('alice:session-1:1');
 const latest=f.eclatNoteState();
 await settlePrivateNoteRead();
 assert.equal(latest.note,'Réponse récente');
 releaseOld({note:'Ancienne réponse',clue:'Ancien indice',moment_done:true});
 await settlePrivateNoteRead();
 assert.equal(latest.note,'Réponse récente');
 assert.equal(latest.moment_done,false);
 assert.equal(old.note,'','previous draft is no longer used');
 assert.equal(f.paintCount(),1,'stale fetch must not trigger a second repaint');
});

test('LR-026: old Éclat note load failure cannot repaint a different signed-in user',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1},eclatBrowse:false};
 let rejectOld;
 const pending=new Promise((_,reject)=>{rejectOld=reject;});
 const f=privateEclatReadFixture(state,()=>pending);
 const old=f.eclatNoteState();
 state.user={id:'bob'};
 rejectOld(Error('Private read failed'));
 await settlePrivateNoteRead();
 assert.equal(old.error,undefined,'stale read failure must not flag another account view');
 assert.equal(f.paintCount(),0,'old session cannot repaint Bob’s Éclat page');
});

test('LR-026: editing private note during save cannot advance Éclat on old snapshot',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 let releaseSave,submitted;
 const pending=new Promise(resolve=>{releaseSave=resolve;});
 const f=privateEclatSaveFixture(state,async(_client,status,userId,snapshot)=>{
  submitted={status,userId,snapshot};
  await pending;
 });
 const inFlight=f.saveCurrentEclatNote(true);
 // The client keeps editing after the save started. The SQL upsert may
 // succeed, but only the earlier note was stored on the server.
 f.draft.note='Modifications plus récentes';
 f.draft.saved=false;
 releaseSave();
 assert.equal(await inFlight,null,
  'the old save is not proof that the new text has been persisted');
 assert.equal(f.draft.note,'Modifications plus récentes');
 assert.equal(f.draft.saved,false);
 assert.equal(f.draft.saving,false);
 assert.equal(submitted.snapshot.note,'Private',
  'the backend receives only the frozen tap-time snapshot');
 // A subsequent explicit save of the newer text can confirm the note.
 const second=await f.saveCurrentEclatNote(true);
 assert.equal(second,'alice:session-1:1');
 assert.equal(f.draft.saved,true);
 assert.equal(submitted.snapshot.note,'Modifications plus récentes');
});

test('LR-026: edited clue during pending save remains unsaved until retry',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const f=privateEclatSaveFixture(state,()=>pending);
 const saving=f.saveCurrentEclatNote(true);
 f.draft.clue='Indice modifié pendant la sauvegarde';
 f.draft.saved=false;
 release();
 assert.equal(await saving,null);
 assert.equal(f.draft.saved,false);
 assert.equal(f.draft.clue,'Indice modifié pendant la sauvegarde');
 assert.equal(f.draft.saving,false);
});

test('LR-026: pending Éclat private notes include blank deletions but exclude other chapters/accounts',()=>{
 const drafts=new Map([
  ['alice:session-1:1',{note:'',clue:'',dirty:true,saved:false}],
  ['alice:session-1:2',{note:'Previous chapter',dirty:true,saved:false}],
  ['bob:session-1:1',{note:'Different account',dirty:true,saved:false}]
 ]);
 assert.equal(hasPendingEclatNote(drafts,'alice:session-1:1','eclat'),true,
  'deleting every character is still a modification to persist');
 assert.equal(hasPendingEclatNote(drafts,'alice:session-1:1','home'),false,
  'an invisible Éclat note cannot block an unrelated settings/home action');
 assert.equal(hasPendingEclatNote(drafts,'alice:session-1:3','eclat'),false);
 drafts.get('alice:session-1:1').dirty=false;
 assert.equal(hasPendingEclatNote(drafts,'alice:session-1:1','eclat'),false,
  'an old dirty chapter or another account must not block this clean step');
 drafts.get('alice:session-1:1').saving=true;
 assert.equal(hasPendingEclatNote(drafts,'alice:session-1:1','eclat'),true,
  'in-progress server saves are not yet acknowledged');
 drafts.get('alice:session-1:1').saving=false;
 for(const invalid of [null,'',{},[]])
  assert.equal(hasPendingEclatNote(drafts,invalid,'eclat'),false);
});

test('LR-026: private Éclat input and save lifecycle track blank deletion and completion',()=>{
 assert.match(app,/hasPendingEclatNote\(eclatNoteDrafts,eclatNoteKey\(state\.eclat,state\.user\?\.id\),state\.tab\)/);
 const privateInput=app.slice(app.indexOf('function bindEclatPrivateNoteFields(){'),
  app.indexOf('function bindActions(){'));
 assert.match(privateInput,/draft\[property\]=field\.value;draft\.saved=false;draft\.dirty=true/,
  'valid private text inputs must still mark the scoped draft dirty');
 assert.match(privateInput,/property!=='note'&&property!=='clue'/,
  'arbitrary data attributes must never write unexpected draft properties');
 assert.match(privateInput,/eclatNoteKey\(state\.eclat,state\.user\?\.id\)!==key/,
  'input ownership must be scoped to the original Éclat chapter');
 assert.match(app,/const draft=\{note:'',clue:'',moment_done:false,loading:true,dirty:false,\s*generation:authFeedbackGeneration\}/);
 assert.match(app,/eclatNoteDrafts\.get\(key\)\?\.generation!==authFeedbackGeneration/);
 assert.match(app,/if\(snapshot\.moment_done!==draft\.moment_done\)draft\.dirty=true/);
 assert.match(app,/draft\.dirty=!draft\.saved/);
});

test('LR-026: successful blank private note deletion clears dirty state after server acknowledgement',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 const fixture=privateEclatSaveFixture(state,async()=>{});
 fixture.draft.note='';fixture.draft.clue='';fixture.draft.dirty=true;
 assert.equal(hasPendingEclatNote(fixture.drafts,'alice:session-1:1','eclat'),true);
 assert.equal(await fixture.saveCurrentEclatNote(),'alice:session-1:1');
 assert.equal(fixture.draft.saved,true);
 assert.equal(fixture.draft.dirty,false);
 assert.equal(hasPendingEclatNote(fixture.drafts,'alice:session-1:1','eclat'),false);
});

test('LR-026: failed empty-text moment completion remains pending after network error',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 const fixture=privateEclatSaveFixture(state,async()=>{throw Error('Offline');});
 fixture.draft.note='';fixture.draft.clue='';fixture.draft.dirty=false;
 await assert.rejects(fixture.saveCurrentEclatNote(true),/Offline/);
 assert.equal(fixture.draft.moment_done,false);
 assert.equal(fixture.draft.dirty,true);
 assert.equal(hasPendingEclatNote(fixture.drafts,'alice:session-1:1','eclat'),true);
});

test('LR-026: retry does not discard a private note while save pending',async()=>{
 const begin=app.indexOf("if(kind==='note-retry'){",app.indexOf("if(verb==='eclat'){"));
 const end=app.indexOf('const savedKey=await saveCurrentEclatNote',begin);
 assert.ok(begin>0&&end>begin);
 const action=runInNewContext(
  '(async (kind,key,drafts,render)=>{const eclatNoteDrafts=drafts;'+
   app.slice(begin,end)+'})',{});
 const busy=new Map([['alice:s1:1',{saving:true,note:'En attente'}]]);
 let renders=0;
 await assert.rejects(action('note-retry','alice:s1:1',busy,()=>renders++),
  /Enregistrement en cours/);
 assert.equal(busy.get('alice:s1:1').note,'En attente',
  'the in-flight draft must remain intact');
 assert.equal(renders,0);
 busy.get('alice:s1:1').saving=false;
 await action('note-retry','alice:s1:1',busy,()=>renders++);
 assert.equal(busy.has('alice:s1:1'),false,'retry can reload after save settles');
 assert.equal(renders,1);
});

function privateAuthBoundaryFixture(state,getUser){
 const start=app.indexOf('let latestAuthReloadRequest=null,authFeedbackGeneration=0;');
 const end=app.indexOf('function authMessage(',start);
 assert.ok(start>0&&end>start,'production identity boundary must be available');
 const drafts=new Map([['alice:session:1',{note:'PRIVATE'}]]);
 const channel={id:'previous-private-couple'};
 const timer={id:'alice-card',ownerUserId:'alice',ownerSessionId:'alice-session',
  durationMs:120000,remainingMs:55000,deadline:123456,running:true,
  notified:false,autoCompletePending:true,decisionPending:false,mode:'vibrate'};
 const calls={audioStops:0,channelRemovals:0,paints:0,reloads:0,timers:0,savedTimers:[]};
 state.channel=channel;
 const scope=runInNewContext(
  'const eclatNoteDrafts=drafts,challengeTimer=timer;let latestEclatAudioOwner=null;'+
  'let latestEclatHistoryRead=null,latestEclatStatusRead=null,latestEclatActionRequest=null;'+
  'let realtimeReconnectTimer=null,notificationFeedback=null,worldGpsDraft=null,worldFx=null,worldFxFailed=null;'+
  'let timerCompletionInFlight=null,timerCompletionRetryAt=0;'+
  'let savedTimerScanOwner=null,savedTimerScanAfter=0,savedTimerSyncInFlight=null;'+
  'let inviteAcceptanceBusy=false,inviteAcceptanceRequest=null;'+app.slice(start,end)+
  ';({adoptAuthenticatedIdentity,refreshVerifiedIdentity,readRequest:()=>latestAuthReloadRequest})',{
   state,drafts,timer,client:{auth:{getUser},removeChannel:async()=>{calls.channelRemovals++;}},
   eclatAudio:{stop:()=>calls.audioStops++},
   saveChallengeTimer:()=>calls.savedTimers.push({...timer}),
   clearTimeout:()=>{},setTimeout:()=>calls.timers++,
   reload:async()=>calls.reloads++,render:()=>calls.paints++,
   fail:()=>{},verifiedLoveEmail:()=>true
  });
 return {...scope,calls,drafts,channel,timer};
}

test('LR-026: an auth identity switch closes the old couple channel and clears private Éclat memory',async()=>{
 const state={user:{id:'alice'},coupleId:'couple-alice',profile:{display_name:'Alice'},
  couple:{id:'couple-alice'},members:[{user_id:'alice'}],tab:'eclat',
  eclatMembershipScope:JSON.stringify(['couple-alice','alice','bob']),
  eclat:{active:true},eclatHistory:[{id:'private'}],
  eclatMusic:true,customCards:[{title:'private'}],
  challenges:[{id:'private'}],personalJournal:[{id:'private'}],testModeEligible:true};
 const f=privateAuthBoundaryFixture(state,async()=>({data:{user:state.user}}));
 assert.equal(f.adoptAuthenticatedIdentity({id:'bob'}),true);
 await Promise.resolve();
 assert.equal(state.user.id,'bob');
 assert.equal(state.coupleId,null);
 assert.equal(state.profile,null);
 assert.equal(state.members.length,0);
 assert.equal(state.eclatMembershipScope,null,
  'a new account must never reuse its previous duet membership identity');
 assert.equal(state.eclat,null);
 assert.equal(state.eclatHistory.length,0);
 assert.equal(state.eclatMusic,false);
 assert.equal(state.customCards.length,0);
 assert.equal(state.challenges.length,0);
 assert.equal(state.personalJournal.length,0);
 assert.equal(state.channel,null);
 assert.equal(state.testModeEligible,false);
 assert.equal(f.drafts.size,0);
 assert.equal(f.calls.audioStops,1);
 assert.equal(f.calls.channelRemovals,1);
});

test('LR-026: late getUser result cannot restore a previous authenticated account',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},coupleId:'couple-alice',tab:'eclat'};
 const f=privateAuthBoundaryFixture(state,()=>pending);
 const checking=f.refreshVerifiedIdentity();
 f.adoptAuthenticatedIdentity({id:'bob'});
 release({data:{user:{id:'alice'}}});
 assert.equal(await checking,null);
 assert.equal(state.user.id,'bob');
 assert.equal(state.coupleId,null);
 assert.equal(f.calls.reloads,0);
});

test('LR-026: authoritative getUser account change clears the old screen and schedules its own reload',async()=>{
 const state={user:{id:'alice'},coupleId:'couple-alice',tab:'eclat'};
 const f=privateAuthBoundaryFixture(state,async()=>({data:{user:{id:'bob'}}}));
 assert.equal(await f.refreshVerifiedIdentity(),null);
 assert.equal(state.user.id,'bob');
 assert.equal(state.coupleId,null);
 assert.equal(f.calls.paints,1);
 assert.equal(f.calls.timers,1);
});

test('LR-026: stale login reload cannot apply an obsolete test-mode permission',async()=>{
 const first=app.indexOf('async function reload(){');
 const end=app.indexOf('// A redraw started under another account',first);
 assert.ok(first>0&&end>first);
 const state={user:{id:'alice'},coupleId:'couple-alice',testModeEligible:false};
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 let paints=0;
 const f=runInNewContext('let latestAuthReloadRequest=null,authFeedbackGeneration=0;'+app.slice(first,end)+
  ';({reload})',{
   state,document:{hidden:false},
   challengeTimer:{running:false},hasUnsavedForm:()=>false,
   root:{querySelector:()=>null},window:{},
   refreshVerifiedIdentity:async()=>true,
   rpc:()=>pending,render:()=>paints++,
   console:{warn:()=>{}}
  });
 const loading=f.reload();
 // The old RPC succeeds only after the user signs in to a different account.
 state.user={id:'bob'};
 release(true);
 await loading;
 assert.equal(state.user.id,'bob');
 assert.equal(state.testModeEligible,false);
 assert.equal(paints,0);
});

test('LR-026: obsolete couple Realtime callbacks do not reach the new account',async()=>{
 const start=app.indexOf('function subscribe(){');
 const end=app.indexOf('function heroDice(',start);
 assert.ok(start>0&&end>start);
 const callbacks=[];
 let statusCallback,probes=0,reloads=0;
 const state={user:{id:'alice'},coupleId:'duo-alice',members:[{user_id:'alice'}],channel:null};
 const channel={
  on(_event,filter,callback){callbacks.push({filter,callback});return this;},
  subscribe(callback){statusCallback=callback;return this;}
 };
 const f=runInNewContext(app.slice(start,end)+';({subscribe})',{
  state,client:{channel:()=>channel,removeChannel:()=>Promise.resolve()},
  liveSync:{request:()=>probes++},
  reload:async()=>reloads++,notify:()=>{},fail:()=>{},
  console:{warn:()=>{}}
 });
 f.subscribe();
 statusCallback('SUBSCRIBED');
 assert.equal(probes,1,'the current subscriber still refreshes its own data');
 state.user={id:'bob'};state.coupleId='duo-bob';state.channel=null;
 statusCallback('SUBSCRIBED');
 const member=callbacks.find(e=>e.filter.table==='couple_members');
 await member.callback();
 assert.equal(probes,1,'the previous channel cannot refresh a replacement user');
 assert.equal(reloads,0,'old membership notifications cannot reload another account');
});

test('LR-026: revoked getUser session removes previous private screen immediately',async()=>{
 const state={user:{id:'alice'},coupleId:'couple-alice',profile:{display_name:'Private'},
  tab:'eclat',eclat:{active:true},eclatHistory:[{id:'private'}],
  customCards:[{title:'private'}],emailVerificationPending:true};
 const f=privateAuthBoundaryFixture(state,async()=>({error:{message:'Invalid JWT'},data:null}));
 assert.equal(await f.refreshVerifiedIdentity(),false);
 assert.equal(state.user,null);
 assert.equal(state.coupleId,null);
 assert.equal(state.profile,null);
 assert.equal(state.eclat,null);
 assert.equal(state.eclatHistory.length,0);
 assert.equal(state.customCards.length,0);
 assert.equal(state.channel,null);
 assert.equal(state.emailVerificationPending,false);
 assert.equal(f.calls.paints,1,'a revoked session must repaint the login instead of leaving private content on screen');
 assert.equal(f.calls.channelRemovals,1);
});

test('LR-026: absent authoritative getUser identity also removes old couple view',async()=>{
 const state={user:{id:'alice'},coupleId:'couple-alice',
  profile:{display_name:'Private'},tab:'eclat'};
 const f=privateAuthBoundaryFixture(state,async()=>({data:{user:null},error:null}));
 assert.equal(await f.refreshVerifiedIdentity(),false);
 assert.equal(state.user,null);
 assert.equal(state.profile,null);
 assert.equal(f.calls.paints,1);
});

test('LR-026: old getUser rejection after account switch cannot log out or repaint the new user',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},coupleId:'couple-alice',
  profile:{display_name:'Alice'},tab:'eclat'};
 const f=privateAuthBoundaryFixture(state,()=>pending);
 const checking=f.refreshVerifiedIdentity();
 f.adoptAuthenticatedIdentity({id:'bob'});
 release({error:{message:'Expired Alice token'}});
 assert.equal(await checking,null);
 assert.equal(state.user.id,'bob');
 assert.equal(f.calls.paints,0);
});

test('LR-026: obsolete account reload failure is suppressed after sign-in to another account',async()=>{
 const first=app.indexOf('async function reload(){');
 const end=app.indexOf('// A redraw started under another account',first);
 assert.ok(first>=0&&end>first);
 const state={user:{id:'alice'},coupleId:'couple-alice',testModeEligible:false};
 let rejectProfiles,queries=0;
 const profiles=new Promise((_,reject)=>{rejectProfiles=reject;});
 const f=runInNewContext('let latestAuthReloadRequest=null,authFeedbackGeneration=0;'+app.slice(first,end)+
  ';({reload})',{
   state,document:{hidden:false},challengeTimer:{running:false},
   hasUnsavedForm:()=>false,root:{querySelector:()=>null},window:{},
   refreshVerifiedIdentity:async()=>true,rpc:async()=>true,
   previewMode:()=> 'real',query:()=>{queries++;return profiles;},
   console:{warn:()=>{}}
  });
 const loading=f.reload();
 for(let i=0;i<8&&queries===0;i++)await Promise.resolve();
 assert.equal(queries,4,'the old account has started its four profile reads');
 state.user={id:'bob'};
 rejectProfiles(Error('Stale Alice network failure'));
 await assert.doesNotReject(loading);
 assert.equal(state.user.id,'bob');
 assert.equal(state.testModeEligible,true,
  'the last completed permission belongs to the old request but the rejected profile read must not apply data');
});

test('LR-026: active account reload failure still reports its own network error',async()=>{
 const first=app.indexOf('async function reload(){');
 const end=app.indexOf('// A redraw started under another account',first);
 const state={user:{id:'alice'},coupleId:'couple-alice',testModeEligible:false};
 const f=runInNewContext('let latestAuthReloadRequest=null,authFeedbackGeneration=0;'+app.slice(first,end)+
  ';({reload})',{
   state,document:{hidden:false},challengeTimer:{running:false},
   hasUnsavedForm:()=>false,root:{querySelector:()=>null},window:{},
   refreshVerifiedIdentity:async()=>true,rpc:async()=>true,
   previewMode:()=> 'real',
   query:async()=>{throw Error('Active Alice network failure');},
   console:{warn:()=>{}}
  });
 await assert.rejects(f.reload(),/Active Alice network failure/);
});

function pendingAuthReloadFixture(state,rpc,query,overrides={}){
 const first=app.indexOf('async function reload(){');
 const end=app.indexOf('// A redraw started under another account',first);
 assert.ok(first>=0&&end>first);
 const calls={render:0,warnings:0};
 const f=runInNewContext('let latestAuthReloadRequest=null,authFeedbackGeneration=0;'+app.slice(first,end)+
  ';({reload,bumpAuthGeneration:()=>authFeedbackGeneration++})',{
   state,document:{hidden:false,documentElement:{lang:'fr'}},
   sessionStorage:{},client:{},challengeTimer:{running:false},hasUnsavedForm:()=>false,
   root:{querySelector:()=>null},window:{},
   refreshVerifiedIdentity:async()=>true,
   previewMode:()=> 'real',rpc,query,
   safeNativePushToken:()=>null,currentPushDevice:async()=>null,
   localeOrDefault:()=> 'fr',acceptEclatMembership:members=>{state.members=members;},
   pendingInviteReference:()=>null,
   pendingReferralCode:()=>null,render:()=>calls.render++,
   console:{warn:()=>calls.warnings++},...overrides
  });
 return {...f,calls};
}

test('LR-026: same-user reauthentication discards an obsolete private reload',async()=>{
 const state={user:{id:'alice'},coupleId:'duo-alice',testModeEligible:false};
 let finish,queries=0,started=0;
 const permission=new Promise(resolve=>{finish=resolve;});
 const f=pendingAuthReloadFixture(state,()=>{
  started++;return permission;
 },()=>{
  queries++;return Promise.resolve([]);
 });
 const old=f.reload();
 // Verify the old RPC really started before the identity changes.
 for(let i=0;i<8&&started===0;i++)await Promise.resolve();
 assert.equal(started,1,'obsolete permission request must be in flight');
 f.bumpAuthGeneration(); // new login has same user ID
 finish(true);
 await assert.doesNotReject(old);
 assert.equal(state.testModeEligible,false,
  'old session must never overwrite new session permissions');
 assert.equal(queries,0,'old session must not issue private profile reads');
 assert.equal(f.calls.render,0);
});

test('LR-026: stale same-user reload failure never surfaces after new login',async()=>{
 const state={user:{id:'alice'},coupleId:'duo-alice',testModeEligible:false};
 let reject,started=0;
 const permission=new Promise((_,fail)=>{reject=fail;});
 const f=pendingAuthReloadFixture(state,()=>{
  started++;return permission;
 },()=>Promise.resolve([]));
 const old=f.reload();
 for(let i=0;i<8&&started===0;i++)await Promise.resolve();
 assert.equal(started,1,'network failure must belong to a started RPC');
 f.bumpAuthGeneration();
 reject(Error('Network failure from obsolete session'));
 await assert.doesNotReject(old);
 assert.equal(state.testModeEligible,false);
 assert.equal(f.calls.render,0);
});

test('LR-026: simultaneous refreshes of the same account ignore the older test-mode response',async()=>{
 const state={user:{id:'alice'},coupleId:'duo-alice',testModeEligible:false};
 let firstResolve,reads=0;
 const firstPermission=new Promise(resolve=>{firstResolve=resolve;});
 const f=pendingAuthReloadFixture(state,async name=>{
  if(name!=='love_test_mode_allowed')throw Error('Unexpected RPC '+name);
  return ++reads===1?firstPermission:true;
 },async()=>{throw Error('Latest profile read deliberately failed');});
 const previous=f.reload();
 for(let i=0;i<12&&reads===0;i++)await Promise.resolve();
 assert.equal(reads,1,'the older permission RPC must be in flight before the newer reload');
 const latest=f.reload();
 await assert.rejects(latest,/Latest profile read deliberately failed/);
 assert.equal(state.testModeEligible,true);
 firstResolve(false);
 await assert.doesNotReject(previous);
 assert.equal(state.testModeEligible,true,
  'the previous request must not override a newer verified permission');
 assert.equal(f.calls.render,0);
});

test('LR-026: rejected referral from an earlier login cannot continue an obsolete couple reload',async()=>{
 const state={user:{id:'alice'},coupleId:null,profile:null,
  tab:'home',testModeEligible:false};
 let rejectClaim,notifyClaim,cardQueries=0;
 const claimReached=new Promise(resolve=>{notifyClaim=resolve;});
 const pendingClaim=new Promise((_,reject)=>{rejectClaim=reject;});
 const rpc=async name=>{
  if(name==='love_test_mode_allowed')return true;
  if(name==='love_my_referral')return null;
  if(name==='love_referral_claim'){notifyClaim();return pendingClaim;}
  throw Error('Unexpected RPC '+name);
 };
 const query=async table=>{
  if(table==='couple_profiles')return [{id:'alice',preferred_locale:'fr',display_name:'Alice'}];
  if(table==='love_wellbeing'||table==='love_personal_intimacy'||table==='love_push_preferences')return [];
  if(table==='couple_members')return [{user_id:'alice',couple_id:'duo-alice',joined_at:'2026-01-01'}];
  if(table==='couples')return [{id:'duo-alice',owner_user_id:'alice'}];
  if(table==='couple_invitations')return [];
  cardQueries++;
  return [];
 };
 const f=pendingAuthReloadFixture(state,rpc,query,{
  pendingReferralCode:()=> 'personal-code',
  isSharedCoupleReady:()=>false
 });
 const loading=f.reload();
 await claimReached;
 state.user={id:'bob'};state.coupleId='duo-bob';
 rejectClaim(Error('Alice referral request failed'));
 await assert.doesNotReject(loading);
 assert.equal(state.user.id,'bob');
 assert.equal(state.coupleId,'duo-bob');
 assert.equal(cardQueries,0,
  'the old reload must never fetch private cards for the replacement account');
 assert.equal(f.calls.render,0);
 assert.equal(f.calls.warnings,0,'obsolete errors must not toast or log a referral warning');
});

function invitationAcceptanceFixture(state,rpc){
 const start=app.indexOf('async function autoAcceptPendingInvite(){');
 const end=app.indexOf('function verificationPendingHtml(',start);
 assert.ok(start>0&&end>start);
 let pending={kind:'id',value:'invitation-alice'},clears=0;
 const context=runInNewContext(
  'let inviteAcceptanceBusy=false,inviteAcceptanceRequest=null,authFeedbackGeneration=0;'+
  'let inviteAcceptanceBusyState=()=>inviteAcceptanceBusy;'+app.slice(start,end)+
  ';({autoAcceptPendingInvite,busy:inviteAcceptanceBusyState,bumpAuthGeneration:()=>authFeedbackGeneration++})',{
   state,sessionStorage:{},
   pendingInviteReference:()=>pending,
   verifiedLoveEmail:()=>true,rpc,
   hashToken:async value=>'hash-'+value,
   finishInviteReference:()=>{clears++;pending=null;},
   invitationAuthMessage:()=> 'Invitation refusée'
  });
 return {...context,clears:()=>clears,setInvite:value=>{pending=value;}};
}

test('LR-026: accepted invitation updates only its originating signed-in user',async()=>{
 const state={user:{id:'alice'},inviteAccepted:true,
  profile:{birthday_md:'06-22'},passwordRecovery:false,tab:'settings'};
 const f=invitationAcceptanceFixture(state,async()=>({status:'accepted'}));
 await f.autoAcceptPendingInvite();
 assert.equal(f.clears(),1);
 assert.equal(state.inviteWelcome,true);
 assert.equal(state.tab,'home');
 assert.equal(f.busy(),false);
});

test('LR-026: late accepted invitation cannot switch another account tab or clear its invitation',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},inviteAccepted:true,
  profile:{birthday_md:'06-22'},passwordRecovery:false,tab:'settings'};
 const f=invitationAcceptanceFixture(state,()=>pending);
 const accepting=f.autoAcceptPendingInvite();
 state.user={id:'bob'};state.tab='eclat';state.inviteWelcome=false;
 release({status:'accepted'});
 await accepting;
 assert.equal(state.tab,'eclat');
 assert.equal(state.inviteWelcome,false);
 assert.equal(f.clears(),0);
 assert.equal(f.busy(),false);
});

test('LR-026: a same-account relogin cannot clear a newer invitation or change the tab',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},inviteAccepted:true,
  profile:{birthday_md:'06-22'},passwordRecovery:false,tab:'settings'};
 const f=invitationAcceptanceFixture(state,()=>pending);
 const accepting=f.autoAcceptPendingInvite();
 f.bumpAuthGeneration(); // Same user ID, but a different auth session
 state.tab='eclat';
 release({status:'accepted'});
 await accepting;
 assert.equal(state.tab,'eclat');
 assert.equal(state.inviteWelcome,undefined);
 assert.equal(f.clears(),0);
 assert.equal(f.busy(),false);
 assert.equal(state.inviteAttemptKey,null,'obsolete attempt must allow a retry');
 // The current session may safely accept the same invitation on a fresh try.
 await f.autoAcceptPendingInvite();
 assert.equal(f.clears(),1);
 assert.equal(state.tab,'home');
 assert.equal(state.inviteWelcome,true);
});

test('LR-026: same-user new login can retry acceptance before old RPC settles',async()=>{
 let releaseOld,releaseNew;
 const oldPending=new Promise(resolve=>{releaseOld=resolve;});
 const newPending=new Promise(resolve=>{releaseNew=resolve;});
 const state={user:{id:'alice'},inviteAccepted:true,
  profile:{birthday_md:'06-22'},passwordRecovery:false,tab:'settings'};
 const calls=[];
 const f=invitationAcceptanceFixture(state,(name,args)=>{
  calls.push({name,args});
  return calls.length===1?oldPending:newPending;
 });
 const old=f.autoAcceptPendingInvite();
 assert.equal(calls.length,1);
 f.bumpAuthGeneration(); // same user ID, but fresh sign-in
 const current=f.autoAcceptPendingInvite();
 assert.equal(calls.length,2,'new auth generation must not wait for old RPC');
 assert.equal(f.busy(),true);
 releaseOld({status:'accepted'});
 await old;
 assert.equal(state.inviteWelcome,undefined,'old response must not switch new session');
 assert.equal(f.clears(),0,'old response must not remove pending invite');
 assert.equal(f.busy(),true,'old completion must not unlock current request');
 await f.autoAcceptPendingInvite();
 assert.equal(calls.length,2,'double taps in current session remain blocked');
 releaseNew({status:'accepted'});
 await current;
 assert.equal(f.clears(),1);
 assert.equal(f.busy(),false);
 assert.equal(state.tab,'home');
 assert.equal(state.inviteWelcome,true);
});

test('LR-026: stale same-user invitation rejection cannot interrupt current retry',async()=>{
 let rejectOld,releaseNew;
 const oldPending=new Promise((_,reject)=>{rejectOld=reject;});
 const newPending=new Promise(resolve=>{releaseNew=resolve;});
 const state={user:{id:'alice'},inviteAccepted:true,
  profile:{birthday_md:'06-22'},passwordRecovery:false,tab:'settings'};
 let calls=0;
 const f=invitationAcceptanceFixture(state,()=>{
  calls++;
  return calls===1?oldPending:newPending;
 });
 const old=f.autoAcceptPendingInvite();
 f.bumpAuthGeneration();
 const current=f.autoAcceptPendingInvite();
 assert.equal(calls,2);
 rejectOld(Error('Expired prior-session invitation'));
 await old;
 assert.equal(state.inviteError,null,'stale failures must not show on the new login');
 assert.equal(f.busy(),true);
 releaseNew({status:'accepted'});
 await current;
 assert.equal(f.clears(),1);
 assert.equal(state.inviteError,null);
});

test('LR-026: a changed invitation reference must not be cleared by the old acceptance',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},inviteAccepted:true,
  profile:{birthday_md:'06-22'},passwordRecovery:false,tab:'settings'};
 const f=invitationAcceptanceFixture(state,()=>pending);
 const accepting=f.autoAcceptPendingInvite();
 f.setInvite({kind:'id',value:'invitation-new'});
 release({status:'accepted'});
 await accepting;
 assert.equal(f.clears(),0);
 assert.equal(state.inviteWelcome,undefined);
});

test('LR-026: rejected invitation from a former account cannot display errors on the new account',async()=>{
 let reject;
 const pending=new Promise((_,fail)=>{reject=fail;});
 const state={user:{id:'alice'},inviteAccepted:true,
  profile:{birthday_md:'06-22'},passwordRecovery:false,tab:'settings'};
 const f=invitationAcceptanceFixture(state,()=>pending);
 const accepting=f.autoAcceptPendingInvite();
 state.user={id:'bob'};state.inviteError=null;
 reject(Error('Alice invitation expired'));
 await accepting;
 assert.equal(state.inviteError,null);
 assert.equal(f.clears(),0);
 assert.equal(f.busy(),false);
});

function signupLookupFixture(state,rpc){
 const start=app.indexOf('async function resolveVerifiedSignup(');
 const end=app.indexOf('async function autoAcceptPendingInvite(',start);
 assert.ok(start>0&&end>start);
 const stored=[];
 const f=runInNewContext('let authFeedbackGeneration=0;\n'+app.slice(start,end)+
  ';({resolveVerifiedSignup,bumpAuthGeneration:()=>authFeedbackGeneration++})',{
  state,rpc,rememberVerifiedInvitation:id=>stored.push(id)
 });
 return {...f,stored};
}

test('LR-026: a stale server-discovered invitation cannot overwrite the next account',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'}};
 const f=signupLookupFixture(state,()=>pending);
 const lookup=f.resolveVerifiedSignup(false);
 state.user={id:'bob'};
 release({status:'invitation',invitation_id:'alice-private-invitation'});
 const result=await lookup;
 assert.equal(result.status,'account_changed');
 assert.equal(f.stored.length,0);
});

test('LR-026: same-user relogin cannot cache an invitation from the previous session',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'}};
 const f=signupLookupFixture(state,()=>pending);
 const lookup=f.resolveVerifiedSignup(false);
 f.bumpAuthGeneration(); // SIGNED_OUT + SIGNED_IN reused the same account ID
 release({status:'invitation',invitation_id:'stale-invitation'});
 assert.equal((await lookup).status,'account_changed');
 assert.deepEqual(f.stored,[],'never write a stale private invitation into the current session');
});

test('LR-026: a superseded reload cannot cache an outdated invitation for the same user',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'}};
 const f=signupLookupFixture(state,()=>pending);
 const lookup=f.resolveVerifiedSignup(false,()=>false);
 release({status:'invitation',invitation_id:'older-invitation'});
 assert.equal((await lookup).status,'account_changed');
 assert.equal(f.stored.length,0);
});

test('LR-026: current signup invitation still records the verified server reference',async()=>{
 const state={user:{id:'alice'}};
 const f=signupLookupFixture(state,async()=>({status:'invitation',invitation_id:'valid-id'}));
 const result=await f.resolveVerifiedSignup(false,()=>true);
 assert.equal(result.status,'invitation');
 assert.equal(f.stored.length,1);
 assert.equal(f.stored[0],'valid-id');
});

test('LR-026: signup actions do not create a couple after an account_changed result',()=>{
 assert.match(app,/const resolution=await resolveVerifiedSignup\(false,current\)/);
 assert.match(app,/const result=await resolveVerifiedSignup\(true\);[\s\S]{0,140}result\?\.status==='account_changed'/);
 const prepare=app.slice(app.indexOf("if(verb==='prepare-cards'){"),app.indexOf("if(verb==='create-couple'){"));
 const create=app.slice(app.indexOf("if(verb==='create-couple'){"),app.indexOf("if(verb==='invite'){"));
 assert.match(prepare,/if\(decision\?\.status==='account_changed'\)return;/);
 assert.match(create,/if\(decision\?\.status==='account_changed'\)return;/);
});

function ownedProfileSaveFixture(state,rpc){
 const start=app.indexOf('let currentProfileSave=null;');
 const end=app.indexOf('function authMessage(',start);
 assert.ok(start>0&&end>start);
 // In the actual module, the auth generation is declared above this slice.
 return runInNewContext('let authFeedbackGeneration=0;\n'+app.slice(start,end)+
  ';({saveProfileForCurrentAccount,getCurrent:()=>currentProfileSave})',{state,rpc});
}

test('LR-026: profile save stops before gender write after account switch',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'}},writes=[];
 const f=ownedProfileSaveFixture(state,(method,args)=>{
  writes.push({method,args});return pending;
 });
 const saving=f.saveProfileForCurrentAccount('Alice','03-02','her','soft');
 assert.equal(writes.length,1);
 state.user={id:'bob'};
 release();
 assert.equal(await saving,false);
 assert.equal(writes.length,1,'Bob must not receive Alice gender or play-style RPCs');
 assert.equal(f.getCurrent(),null);
});

test('LR-026: old profile network failure cannot surface on replacement login',async()=>{
 let reject;
 const pending=new Promise((_,fail)=>{reject=fail;});
 const state={user:{id:'alice'}},writes=[];
 const f=ownedProfileSaveFixture(state,method=>{writes.push(method);return pending;});
 const saving=f.saveProfileForCurrentAccount('Alice','03-02','her','soft');
 state.user={id:'bob'};
 reject(Error('Alice connection lost'));
 assert.equal(await saving,false);
 assert.equal(writes.length,1);
});

test('LR-026: a second profile save cannot overlap the same account writes',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'}},writes=[];
 const f=ownedProfileSaveFixture(state,method=>{
  writes.push(method);return writes.length===1?pending:Promise.resolve();
 });
 const first=f.saveProfileForCurrentAccount('Alice','03-02','her','soft');
 await assert.rejects(f.saveProfileForCurrentAccount('A','03-02','her','soft'),/déjà en cours/);
 release();
 assert.equal(await first,true);
 assert.equal(writes.join(','),'complete_love_registration,save_my_gender,save_my_play_style');
 assert.equal(f.getCurrent(),null);
});

test('LR-026: a failed current-account profile write preserves the error and stops next RPC',async()=>{
 const state={user:{id:'alice'}},writes=[];
 const f=ownedProfileSaveFixture(state,method=>{
  writes.push(method);
  if(method==='save_my_gender')throw Error('Supabase gender write failed');
 });
 await assert.rejects(f.saveProfileForCurrentAccount('Alice','03-02','her','soft'),
  /Supabase gender write failed/);
 assert.equal(writes.join(','),'complete_love_registration,save_my_gender');
 assert.equal(f.getCurrent(),null);
});

test('LR-026: registration and profile actions use the same identity-owned save',()=>{
 const register=app.slice(app.indexOf("if(verb==='complete-registration'){"),
  app.indexOf("if(verb==='profile'){"));
 const profile=app.slice(app.indexOf("if(verb==='profile'){"),
  app.indexOf("if(verb==='prepare-cards'){"));
 for(const body of [register,profile]){
  assert.match(body,/const profileOwnerId=state\.user\?\.id/);
  assert.match(body,/await saveProfileForCurrentAccount\(name,birthday,gender,playStyle\)/);
  assert.match(body,/state\.user\?\.id!==profileOwnerId\)return/);
  assert.doesNotMatch(body,/await rpc\('save_my_gender'/);
 }
 assert.match(profile,/if\(state\.user\?\.id===profileOwnerId\)[\s\S]*?notify\('Votre profil/);
});

function ownedSignoutFixture(state,{disablePush=async()=>{},removeChannel=async()=>{},
 signOut=async()=>({error:null}),token=null}={}){
 const start=app.indexOf('let currentSignoutRequest=null;');
 const end=app.indexOf('function authMessage(',start);
 assert.ok(start>0&&end>start,'real sign-out helper must be available');
 const calls={push:[],channels:[],signouts:0,clears:0,paints:0,routes:0};
 const scope=runInNewContext('let authFeedbackGeneration=0,currentSignoutRequest=null;'+
  app.slice(start+'let currentSignoutRequest=null;'.length,end)+
  ';({signOutCurrentAccount,signoutRequest:()=>currentSignoutRequest,bumpAuthGeneration:()=>authFeedbackGeneration++})',{
  state,client:{auth:{signOut:async()=>{
   calls.signouts++;return signOut();
  }},removeChannel:async channel=>{
   calls.channels.push(channel);return removeChannel(channel);
  }},
  safeNativePushToken:()=>token,
  disablePush:async(_client,userId)=>{calls.push.push(userId);return disablePush(userId);},
  adoptAuthenticatedIdentity:next=>{
   calls.clears++;state.user=next;state.coupleId=null;
  },
  keepAuthModeInUrl:()=>calls.routes++,
  render:()=>calls.paints++,
  console:{warn:()=>{}}
 });
 return {...scope,calls};
}

test('LR-026: logout that waits for FCM must not sign out a new account',async()=>{
 let release;
 const pushPending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},coupleId:'alice-duo',channel:{id:'alice-channel'}};
 const f=ownedSignoutFixture(state,{token:'push-key',disablePush:()=>pushPending});
 const first=f.signOutCurrentAccount();
 assert.equal(f.calls.push[0],'alice');
 state.user={id:'bob'};state.coupleId='bob-duo';
 release();
 assert.equal(await first,false);
 assert.equal(f.calls.signouts,0);
 assert.equal(f.calls.channels.length,0);
 assert.equal(f.calls.clears,0);
 assert.equal(state.user.id,'bob');
});

test('LR-026: FCM-delayed logout cannot sign out a fresh same-user session',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},coupleId:'alice-duo',channel:{id:'old'}};
 const f=ownedSignoutFixture(state,{token:'push-key',disablePush:()=>pending});
 const signingOut=f.signOutCurrentAccount();
 assert.equal(f.calls.push.length,1);
 f.bumpAuthGeneration(); // Same account ID, but a new login
 state.channel={id:'new-session'};
 release();
 assert.equal(await signingOut,false);
 assert.equal(f.calls.signouts,0,'old cleanup must not revoke fresh login');
 assert.equal(f.calls.channels.length,0);
 assert.equal(f.calls.clears,0);
 assert.equal(state.channel.id,'new-session');
});

test('LR-026: stale signout response cannot clear a fresh same-user session',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},coupleId:'current-duo'};
 const f=ownedSignoutFixture(state,{signOut:()=>pending});
 const signingOut=f.signOutCurrentAccount();
 assert.equal(f.calls.signouts,1);
 f.bumpAuthGeneration(); // New login happened before old response arrived
 release({error:null});
 assert.equal(await signingOut,false);
 assert.equal(f.calls.clears,0);
 assert.equal(f.calls.paints,0);
 assert.equal(state.user.id,'alice');
 assert.equal(state.coupleId,'current-duo');
});

test('LR-026: fresh same-user logout is not held hostage by the previous cleanup',async()=>{
 let releaseOld,cleanups=0;
 const firstPush=new Promise(resolve=>{releaseOld=resolve;});
 const state={user:{id:'alice'},coupleId:'alice-duo'};
 const f=ownedSignoutFixture(state,{token:'push-key',disablePush:()=>{
  cleanups++;
  return cleanups===1?firstPush:Promise.resolve();
 }});
 const old=f.signOutCurrentAccount();
 f.bumpAuthGeneration();
 const next=f.signOutCurrentAccount();
 assert.equal(await next,true,'new session can sign out before old FCM reply');
 assert.equal(f.calls.signouts,1);
 releaseOld();
 assert.equal(await old,false);
 assert.equal(f.calls.clears,1,'old completion must not clear the fresh logout');
});

test('LR-026: logout waiting for old Realtime channel must not revoke replacement login',async()=>{
 let release;
 const closing=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},coupleId:'alice-duo',channel:{id:'old'}};
 const f=ownedSignoutFixture(state,{removeChannel:()=>closing});
 const first=f.signOutCurrentAccount();
 assert.equal(f.calls.channels.length,1);
 state.user={id:'bob'};state.coupleId='bob-duo';state.channel={id:'new'};
 release();
 assert.equal(await first,false);
 assert.equal(f.calls.signouts,0);
 assert.equal(f.calls.clears,0);
 assert.equal(state.channel.id,'new');
});

test('LR-026: normal logout cleans up once and returns to anonymous view',async()=>{
 const channel={id:'alice'};
 const state={user:{id:'alice'},coupleId:'alice-duo',channel,
  showAuth:true,passwordRecovery:true,installAfterSignup:true,installModalOpen:true};
 const f=ownedSignoutFixture(state);
 assert.equal(await f.signOutCurrentAccount(),true);
 assert.equal(state.user,null);
 assert.equal(state.channel,null);
 assert.equal(state.showAuth,false);
 assert.equal(state.passwordRecovery,false);
 assert.equal(state.installAfterSignup,false);
 assert.equal(f.calls.signouts,1);
 assert.equal(f.calls.channels[0],channel);
 assert.equal(f.calls.clears,1);
 assert.equal(f.calls.paints,1);
 assert.equal(f.calls.routes,1);
});

test('LR-026: logout cannot be launched twice for the same account',async()=>{
 let release;
 const closing=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},channel:{id:'old'}};
 const f=ownedSignoutFixture(state,{removeChannel:()=>closing});
 const first=f.signOutCurrentAccount();
 const second=f.signOutCurrentAccount();
 assert.equal(await second,false);
 assert.equal(f.calls.channels.length,1);
 release();
 assert.equal(await first,true);
 assert.equal(f.calls.signouts,1);
});

test('LR-026: late failed signout from old account must not show an error to new login',async()=>{
 let reject;
 const pending=new Promise((_,bad)=>{reject=bad;});
 const state={user:{id:'alice'},coupleId:'old-duo'};
 const f=ownedSignoutFixture(state,{signOut:()=>pending});
 const first=f.signOutCurrentAccount();
 assert.equal(f.calls.signouts,1);
 state.user={id:'bob'};state.coupleId='new-duo';
 reject(Error('Old signout network failed'));
 assert.equal(await first,false);
 assert.equal(state.user.id,'bob');
 assert.equal(f.calls.clears,0);
});

test('LR-026: old Realtime channel close error cannot fail replacement account logout',async()=>{
 let reject;
 const pending=new Promise((_,bad)=>{reject=bad;});
 const state={user:{id:'alice'},channel:{id:'old'}};
 const f=ownedSignoutFixture(state,{removeChannel:()=>pending});
 const first=f.signOutCurrentAccount();
 state.user={id:'bob'};state.channel={id:'new'};
 reject(Error('Old channel cannot close'));
 assert.equal(await first,false);
 assert.equal(f.calls.signouts,0);
 assert.equal(f.calls.clears,0);
});

test('LR-026: current logout error must still be reported to the same user',async()=>{
 const state={user:{id:'alice'},coupleId:'old-duo'};
 const f=ownedSignoutFixture(state,{signOut:async()=>({error:Error('Supabase blocked signout')})});
 await assert.rejects(f.signOutCurrentAccount(),/Supabase blocked signout/);
 assert.equal(state.user.id,'alice');
 assert.equal(f.calls.clears,0);
});

test('LR-026: late successful signout cannot wipe the newly signed-in account',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},coupleId:'old-duo',channel:null};
 const f=ownedSignoutFixture(state,{signOut:()=>pending});
 const signingOut=f.signOutCurrentAccount();
 state.user={id:'bob'};state.coupleId='new-duo';
 release({error:null});
 assert.equal(await signingOut,false);
 assert.equal(state.user.id,'bob');
 assert.equal(state.coupleId,'new-duo');
 assert.equal(f.calls.clears,0);
 assert.equal(f.calls.paints,0);
});

test('LR-026: push notification cleanup failure does not prevent current owner signout',async()=>{
 const state={user:{id:'alice'},coupleId:'old-duo'};
 const f=ownedSignoutFixture(state,{
  token:'token-alice',
  disablePush:async()=>{throw Error('FCM offline');}
 });
 assert.equal(await f.signOutCurrentAccount(),true);
 assert.equal(f.calls.push[0],'alice');
 assert.equal(f.calls.signouts,1);
 assert.equal(state.user,null);
});

test('LR-026: active Realtime channel cleanup failures remain visible to its owner',async()=>{
 const state={user:{id:'alice'},channel:{id:'old'}};
 const f=ownedSignoutFixture(state,{
  removeChannel:async()=>{throw Error('Realtime cleanup failed');}
 });
 await assert.rejects(f.signOutCurrentAccount(),/Realtime cleanup failed/);
 assert.equal(state.user.id,'alice');
 assert.equal(f.calls.signouts,0);
 assert.equal(f.calls.clears,0);
});

test('LR-026: explicit signout and Supabase signed-out event both use the safe state reset',()=>{
 const start=app.indexOf("if(verb==='signout'){");
 const end=app.indexOf("if(verb==='complete-registration'){",start);
 assert.ok(start>0&&end>start);
 assert.match(app.slice(start,end),/await signOutCurrentAccount\(\)/);
 const auth=app.slice(app.indexOf("client.auth.onAuthStateChange("),
  app.indexOf('// Version probe bypasses WebView'));
 assert.match(auth,/if\(event==='SIGNED_OUT'\)/);
 assert.match(auth,/adoptAuthenticatedIdentity\(null\)/);
 assert.match(auth,/state\.showAuth=false;state\.passwordRecovery=false/);
});

function ownedRecoveryFixture(state,updateUser){
 const first=app.indexOf('let currentRecoveryPasswordRequest=null;');
 const last=app.indexOf('function authMessage(',first);
 assert.ok(first>=0&&last>first,'production account-owned password recovery helper is present');
 const calls=[];
 const f=runInNewContext('let authFeedbackGeneration=0;\n'+app.slice(first,last)+
  ';({updateRecoveryPasswordForCurrentAccount,currentRequest:()=>currentRecoveryPasswordRequest,bumpAuthGeneration:()=>authFeedbackGeneration++})',{
   state,client:{auth:{updateUser:async args=>{calls.push(args);return updateUser(args);}}}
  });
 return {...f,calls};
}

test('LR-026: password recovery success belongs to the active account',async()=>{
 const state={user:{id:'alice'},passwordRecovery:true};
 const f=ownedRecoveryFixture(state,async()=>({error:null}));
 assert.equal(await f.updateRecoveryPasswordForCurrentAccount('Password2!'),true);
 assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].password,'Password2!');
 assert.equal(f.currentRequest(),null);
});

test('LR-026: password recovery cannot complete from an older same-user session',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},passwordRecovery:true};
 const f=ownedRecoveryFixture(state,()=>pending);
 const update=f.updateRecoveryPasswordForCurrentAccount('Password2!');
 f.bumpAuthGeneration();
 release({error:null});
 assert.equal(await update,false);
 assert.equal(f.calls.length,1);
 assert.equal(f.currentRequest(),null);
 assert.equal(state.passwordRecovery,true);
 assert.equal(await f.updateRecoveryPasswordForCurrentAccount('Password2!'),true);
 assert.equal(f.calls.length,2);
});

test('LR-026: old password recovery failure is hidden after same-user relogin',async()=>{
 let reject;
 const pending=new Promise((_,rejectFn)=>{reject=rejectFn;});
 const state={user:{id:'alice'},passwordRecovery:true};
 const f=ownedRecoveryFixture(state,()=>pending);
 const update=f.updateRecoveryPasswordForCurrentAccount('Password2!');
 f.bumpAuthGeneration();
 reject(Error('Previous login recovery failed'));
 assert.equal(await update,false);
 assert.equal(f.currentRequest(),null);
});

test('LR-026: new same-user recovery can run while old password RPC is pending',async()=>{
 let releaseOld,releaseNew;
 const pendingOld=new Promise(resolve=>{releaseOld=resolve;});
 const pendingNew=new Promise(resolve=>{releaseNew=resolve;});
 const state={user:{id:'alice'},passwordRecovery:true};
 let count=0;
 const f=ownedRecoveryFixture(state,()=>{
  count++;
  return count===1?pendingOld:pendingNew;
 });
 const old=f.updateRecoveryPasswordForCurrentAccount('Password2!');
 f.bumpAuthGeneration();
 const next=f.updateRecoveryPasswordForCurrentAccount('Password3!');
 assert.equal(f.calls.length,2);
 releaseOld({error:null});
 assert.equal(await old,false);
 await assert.rejects(f.updateRecoveryPasswordForCurrentAccount('DuplicatePassword!'),
  /déjà en cours/,'old request must not release the newer request lock');
 releaseNew({error:null});
 assert.equal(await next,true);
 assert.equal(f.currentRequest(),null);
});

test('LR-026: a late recovery result must not clear the replacement account view',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},passwordRecovery:true};
 const f=ownedRecoveryFixture(state,()=>pending);
 const saving=f.updateRecoveryPasswordForCurrentAccount('Password2!');
 state.user={id:'bob'};
 release({error:null});
 assert.equal(await saving,false);
 assert.equal(f.currentRequest(),null);
 assert.equal(state.user.id,'bob');
});

test('LR-026: rejected previous-account password reset is suppressed after switching accounts',async()=>{
 let reject;
 const pending=new Promise((_,rejectFn)=>{reject=rejectFn;});
 const state={user:{id:'alice'},passwordRecovery:true};
 const f=ownedRecoveryFixture(state,()=>pending);
 const saving=f.updateRecoveryPasswordForCurrentAccount('Password2!');
 state.user={id:'bob'};
 reject(Error('Alice recovery failed'));
 assert.equal(await saving,false);
 assert.equal(f.currentRequest(),null);
});

test('LR-026: account-owned password recovery errors remain visible to the current user',async()=>{
 const state={user:{id:'alice'},passwordRecovery:true};
 const f=ownedRecoveryFixture(state,async()=>({error:Error('Password update rejected')}));
 await assert.rejects(f.updateRecoveryPasswordForCurrentAccount('Password2!'),/Password update rejected/);
 assert.equal(f.currentRequest(),null);
});

test('LR-026: duplicate password recovery writes are blocked for the same account',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},passwordRecovery:true};
 const f=ownedRecoveryFixture(state,()=>pending);
 const first=f.updateRecoveryPasswordForCurrentAccount('Password2!');
 await assert.rejects(f.updateRecoveryPasswordForCurrentAccount('Password3!'),/déjà en cours/);
 assert.equal(f.calls.length,1);
 release({error:null});
 assert.equal(await first,true);
 assert.equal(f.currentRequest(),null);
});

test('LR-026: closing password recovery invalidates a pending reset result',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},passwordRecovery:true};
 const f=ownedRecoveryFixture(state,()=>pending);
 const saving=f.updateRecoveryPasswordForCurrentAccount('Password2!');
 state.passwordRecovery=false;
 release({error:null});
 assert.equal(await saving,false);
});

test('LR-026: password recovery UI checks account ownership before advancing the route',()=>{
 const start=app.indexOf("if(verb==='auth-update-password'){");
 const end=app.indexOf("if(verb==='signout'){",start);
 assert.ok(start>=0&&end>start);
 const block=app.slice(start,end);
 assert.match(block,/const ownerId=state\.user\.id/);
 assert.match(block,/await updateRecoveryPasswordForCurrentAccount\(password\)/);
 assert.match(block,/state\.user\?\.id!==ownerId\|\|!state\.passwordRecovery\)return/);
 assert.match(block,/if\(state\.user\?\.id===ownerId&&state\.passwordRecovery\)/);
 assert.doesNotMatch(block,/client\.auth\.updateUser\(/);
});

function emailAuthTransitionFixture(state,signOutCurrentAccount){
 const loginStart=app.indexOf("if(verb==='email-confirm-login'){");
 const loginEnd=app.indexOf("if(verb==='email-confirm-recheck'){",loginStart);
 const editStart=app.indexOf("if(verb==='email-confirm-edit'){");
 const editEnd=app.indexOf("if(verb==='auth-reset-request'){",editStart);
 assert.ok(loginStart>0&&loginEnd>loginStart&&editStart>0&&editEnd>editStart);
 const calls={paint:0,routes:[]};
 const scope={
  state,signOutCurrentAccount,verifiedLoveEmail:()=>false,
  authFeedbackGeneration:0,
  keepAuthModeInUrl:route=>calls.routes.push(route),
  render:()=>calls.paint++
 };
 const login=runInNewContext('(async verb=>{'+app.slice(loginStart,loginEnd)+'})',scope);
 const edit=runInNewContext('(async verb=>{'+app.slice(editStart,editEnd)+'})',scope);
 return {login:()=>login('email-confirm-login'),
  edit:()=>edit('email-confirm-edit'),calls};
}

test('LR-026: editing email after normal signout opens registration safely',async()=>{
 const state={user:{id:'alice'},emailVerificationPending:true,authDraftEmail:'old@example.com',
  authMode:'signin',showAuth:false};
 const f=emailAuthTransitionFixture(state,async()=>{state.user=null;return true;});
 await f.edit();
 assert.equal(state.authMode,'signup');
 assert.equal(state.authDraftEmail,'');
 assert.equal(state.showAuth,true);
 assert.equal(state.emailVerificationPending,false);
 assert.equal(f.calls.paint,1);
});

test('LR-026: editing email cannot clear a replacement account after old logout',async()=>{
 let finish;
 const pending=new Promise(resolve=>{finish=resolve;});
 const state={user:{id:'alice'},emailVerificationPending:true,
  authDraftEmail:'new-account@example.com',showAuth:false};
 const f=emailAuthTransitionFixture(state,()=>pending);
 const editing=f.edit();
 state.user={id:'bob'};
 finish(false);
 await editing;
 assert.equal(state.user.id,'bob');
 assert.equal(state.authDraftEmail,'new-account@example.com');
 assert.equal(state.emailVerificationPending,true);
 assert.equal(f.calls.paint,0);
});

test('LR-026: confirmation login opens the sign-in screen after old unverified logout',async()=>{
 const state={user:{id:'alice'},emailVerificationPending:true,showAuth:false};
 const f=emailAuthTransitionFixture(state,async()=>{state.user=null;return true;});
 await f.login();
 assert.equal(state.authMode,'signin');
 assert.equal(state.showAuth,true);
 assert.equal(state.emailVerificationPending,false);
 assert.equal(f.calls.routes[0],'signin');
 assert.equal(f.calls.paint,1);
});

test('LR-026: confirmation login never overwrites a replacement account',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},emailVerificationPending:true,showAuth:false,authMode:'signup'};
 const f=emailAuthTransitionFixture(state,()=>pending);
 const login=f.login();
 state.user={id:'bob'};
 release(false);
 await login;
 assert.equal(state.user.id,'bob');
 assert.equal(state.authMode,'signup');
 assert.equal(state.emailVerificationPending,true);
 assert.equal(f.calls.paint,0);
 assert.equal(f.calls.routes.length,0);
});

test('LR-026: replacing Auth identity cancels previous password-recovery UI state',()=>{
 const start=app.indexOf('function adoptAuthenticatedIdentity(');
 const end=app.indexOf('async function refreshVerifiedIdentity()',start);
 assert.ok(start>0&&end>start);
 const owner=app.slice(start,end);
 assert.match(owner,/state\.passwordRecovery=false;state\.emailVerificationPending=false/);
 assert.match(owner,/state\.authNotice=null;state\.authNeedsEmailConfirmation=false/);
});

test('LR-026: confirmation transitions use guarded signout rather than raw client signout',()=>{
 const start=app.indexOf("if(verb==='email-confirm-login'){");
 const end=app.indexOf("if(verb==='auth-reset-request'){",start);
 assert.ok(start>0&&end>start);
 const slice=app.slice(start,end);
 assert.equal(slice.match(/await signOutCurrentAccount\(\)/g)?.length,2);
 assert.doesNotMatch(slice,/await client\.auth\.signOut\(\)/);
});

function emailVerificationRecheckFixture(state,refreshVerifiedIdentity){
 const begin=app.indexOf("if(verb==='email-confirm-recheck'){");
 const end=app.indexOf("if(verb==='email-confirm-resend'",begin);
 assert.ok(begin>0&&end>begin);
 const status={textContent:''},calls={reloads:0,paints:0,routes:0};
 const action=runInNewContext('(async verb=>{'+app.slice(begin,end)+'})',{
  state,refreshVerifiedIdentity,
  id:()=>status,
  reload:async()=>{calls.reloads++;},
  render:()=>calls.paints++,
  keepAuthModeInUrl:()=>{calls.routes++;}
 });
 return {recheck:()=>action('email-confirm-recheck'),calls,status};
}

test('LR-026: stale email-confirmation recheck cannot modify the replacement account',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},emailVerificationPending:true,authNotice:'Alice'};
 const f=emailVerificationRecheckFixture(state,()=>pending);
 const checking=f.recheck();
 state.user={id:'bob'};state.authNotice='Bob';
 release(false);
 await checking;
 assert.equal(state.user.id,'bob');
 assert.equal(state.authNotice,'Bob');
 assert.equal(f.status.textContent,'');
 assert.equal(f.calls.reloads,0);
});

test('LR-026: successful verification refreshes the same account',async()=>{
 const state={user:{id:'alice'},emailVerificationPending:true,authNotice:'Old'};
 const f=emailVerificationRecheckFixture(state,async()=>true);
 await f.recheck();
 assert.equal(state.emailVerificationPending,false);
 assert.equal(state.authNotice,null);
 assert.equal(f.calls.reloads,1);
});

test('LR-026: unverified current account retains verification guidance',async()=>{
 const state={user:{id:'alice'},emailVerificationPending:true};
 const f=emailVerificationRecheckFixture(state,async()=>false);
 await f.recheck();
 assert.match(f.status.textContent,/pas encore confirmée/);
 assert.equal(f.calls.reloads,0);
});

function authFeedbackFixture(state,{resend=async()=>({error:null}),
 reset=async()=>({error:null}),email='alice@example.com'}={}){
 const helperStart=app.indexOf('function captureAuthFeedbackContext(){');
 const helperEnd=app.indexOf('function authMessage(',helperStart);
 const resendStart=app.indexOf("if(verb==='email-confirm-resend'||verb==='auth-resend-confirmation'){");
 const resendEnd=app.indexOf("if(verb==='email-confirm-edit'){",resendStart);
 const resetStart=app.indexOf("if(verb==='auth-send-reset'){");
 const resetEnd=app.indexOf("if(verb==='auth-update-password'){",resetStart);
 assert.ok(helperStart>0&&helperEnd>helperStart&&resendStart>0&&
  resendEnd>resendStart&&resetStart>0&&resetEnd>resetStart);
 const calls={resends:[],resets:[],messages:[],storage:new Map(),
  status:{textContent:''}};
 const storage={
  getItem:key=>calls.storage.get(key)||null,
  setItem:(key,value)=>calls.storage.set(key,String(value))
 };
 const scope=runInNewContext(
  'let authFeedbackGeneration=0;'+app.slice(helperStart,helperEnd)+
  'const resendAction=async (verb,element)=>{'+app.slice(resendStart,resendEnd)+'};'+
  'const resetAction=async (verb,element)=>{'+app.slice(resetStart,resetEnd)+'};'+
  '({resendAction,resetAction,bump:()=>authFeedbackGeneration++})',{
   state,sessionStorage:storage,
   client:{auth:{
    resend:async value=>{calls.resends.push(value);return resend(value);},
    resetPasswordForEmail:async (...args)=>{calls.resets.push(args);return reset(...args);}
   }},
   id:key=>key==='signin-email'?{value:email}:
    key==='auth-resend-status'||key==='email-confirm-status'?calls.status:null,
   loginEmail:value=>String(value||'').trim().toLowerCase(),
   pendingInviteUrl:()=> 'https://love.example/auth',
   passwordAuthMessage:error=>error?.message||'Error',
   authMessage:message=>calls.messages.push(message)
  });
 return {...scope,calls};
}

test('LR-026: current email resend records throttling and confirmation feedback',async()=>{
 const state={user:{id:'alice'},authMode:'signup',showAuth:true,
  authDraftEmail:'alice@example.com',emailVerificationPending:false};
 const f=authFeedbackFixture(state),button={disabled:false};
 await f.resendAction('auth-resend-confirmation',button);
 assert.equal(f.calls.resends.length,1);
 assert.equal(f.calls.resends[0].email,'alice@example.com');
 assert.equal(f.calls.status.textContent.includes('Demande reçue'),true);
 assert.equal(f.calls.storage.has('loverollConfirmResendAfter'),true);
 assert.equal(button.disabled,false);
});

test('LR-026: stale email resend cannot change replacement login',async()=>{
 let resolve;
 const pending=new Promise(done=>{resolve=done;});
 const state={user:{id:'alice'},authMode:'signup',showAuth:true,
  authDraftEmail:'alice@example.com',emailVerificationPending:false};
 const f=authFeedbackFixture(state,{resend:()=>pending});
 const button={disabled:false},saving=f.resendAction('email-confirm-resend',button);
 state.user={id:'bob'};state.authDraftEmail='bob@example.com';f.bump();
 resolve({error:null});
 await saving;
 assert.equal(state.authDraftEmail,'bob@example.com');
 assert.equal(f.calls.status.textContent,'');
 assert.equal(f.calls.storage.has('loverollConfirmResendAfter'),false);
 assert.equal(button.disabled,false);
});

test('LR-026: stale email resend error cannot show on new account',async()=>{
 let reject;
 const pending=new Promise((_,bad)=>{reject=bad;});
 const state={user:{id:'alice'},authMode:'signup',showAuth:true,
  emailVerificationPending:false};
 const f=authFeedbackFixture(state,{resend:()=>pending});
 const saving=f.resendAction('email-confirm-resend',{disabled:false});
 state.user={id:'bob'};f.bump();
 reject(Error('Expired Alice resend'));
 await saving;
 assert.equal(f.calls.messages.length,0);
});

test('LR-026: current reset link request preserves expected confirmation and throttle',async()=>{
 const state={user:null,authMode:'request-reset',showAuth:true,
  authDraftEmail:'alice@example.com'};
 const f=authFeedbackFixture(state),button={disabled:false};
 await f.resetAction('auth-send-reset',button);
 assert.equal(f.calls.resets.length,1);
 assert.equal(f.calls.resets[0][0],'alice@example.com');
 assert.equal(f.calls.storage.has('loverollResetAfter'),true);
 assert.equal(f.calls.messages[0].includes('Demande de récupération acceptée'),true);
 assert.equal(button.disabled,false);
});

test('LR-026: switching anonymous Auth forms ignores a delayed reset link',async()=>{
 let resolve;
 const pending=new Promise(done=>{resolve=done;});
 const state={user:null,authMode:'request-reset',showAuth:true,
  authDraftEmail:'alice@example.com'};
 const f=authFeedbackFixture(state,{reset:()=>pending});
 const saving=f.resetAction('auth-send-reset',{disabled:false});
 state.authMode='signup';f.bump();
 resolve({error:null});
 await saving;
 assert.equal(f.calls.storage.has('loverollResetAfter'),false);
 assert.equal(f.calls.messages.length,0);
});

test('LR-026: stale reset email failure cannot overwrite the new login',async()=>{
 let reject;
 const pending=new Promise((_,bad)=>{reject=bad;});
 const state={user:null,authMode:'request-reset',showAuth:true};
 const f=authFeedbackFixture(state,{reset:()=>pending});
 const saving=f.resetAction('auth-send-reset',{disabled:false});
 state.user={id:'bob'};state.authMode='signin';f.bump();
 reject(Error('Expired request for Alice'));
 await saving;
 assert.equal(f.calls.messages.length,0);
});

test('LR-026: Auth navigations invalidate previous email/reset feedback generation',()=>{
 const slice=app.slice(app.indexOf("if(verb==='show-auth'){"),
  app.indexOf("if(verb==='auth-eye'){"));
 assert.match(slice,/if\(verb==='show-auth'\)\{\s*authFeedbackGeneration\+\+/);
 assert.match(slice,/if\(verb==='auth-mode'\)\{\s*authFeedbackGeneration\+\+/);
 assert.match(slice,/if\(verb==='show-landing'\)\{authFeedbackGeneration\+\+/);
 const reset=app.slice(app.indexOf("if(verb==='auth-reset-request'){"),
  app.indexOf("if(verb==='auth-send-reset'){"));
 assert.match(reset,/authFeedbackGeneration\+\+/);
 const adopt=app.slice(app.indexOf('function adoptAuthenticatedIdentity('),
  app.indexOf('async function refreshVerifiedIdentity()'));
 assert.match(adopt,/authFeedbackGeneration\+\+/);
});

function passwordAuthSubmitFixture(state,{signIn=async()=>({data:{user:{id:'alice'}},error:null}),
 signUp=async()=>({data:{session:null},error:null})}={}){
 const start=app.indexOf('let currentPasswordAuthRequest=null;');
 const end=app.indexOf('function authMessage(',start);
 assert.ok(start>0&&end>start,'real password Auth helper must be available');
 const calls={signins:[],signups:[],messages:[],renders:0,reloads:0,adopts:[]};
 let generation=0;
 const scope=runInNewContext(app.slice(start,end)+
  ';({submitPasswordAuth,request:()=>currentPasswordAuthRequest})',{
  state,client:{auth:{
   signInWithPassword:async value=>{calls.signins.push(value);return signIn(value);},
   signUp:async value=>{calls.signups.push(value);return signUp(value);}
  }},
  captureAuthFeedbackContext:()=>{
   const owner=state.user?.id??null,mode=state.authMode,
    currentGeneration=generation;
   return ()=>generation===currentGeneration&&
    (state.user?.id??null)===owner&&state.authMode===mode;
  },
  pendingInviteUrl:()=> 'https://love.example/verify',
  verifiedLoveEmail:()=>true,
  adoptAuthenticatedIdentity:user=>{generation++;calls.adopts.push(user.id);state.user=user;},
  reload:async()=>{calls.reloads++;},
  render:()=>{calls.renders++;},
  authMessage:message=>calls.messages.push(message),
  passwordAuthMessage:error=>error?.message||String(error)
 });
 return {...scope,calls,bump:()=>{generation++;}};
}

test('LR-026: late password sign-in reply cannot restore a former account',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:null,authMode:'signin',showAuth:true};
 const f=passwordAuthSubmitFixture(state,{signIn:()=>pending});
 const login=f.submitPasswordAuth('auth-signin-password','alice@example.com','secret');
 state.user={id:'bob'};f.bump();
 release({data:{user:{id:'alice'}},error:null});
 assert.equal(await login,false);
 assert.equal(state.user.id,'bob');
 assert.equal(f.calls.adopts.length,0);
 assert.equal(f.calls.reloads,0);
});

test('LR-026: stale password sign-in network error stays off new Auth view',async()=>{
 let reject;
 const pending=new Promise((_,bad)=>{reject=bad;});
 const state={user:null,authMode:'signin',showAuth:true};
 const f=passwordAuthSubmitFixture(state,{signIn:()=>pending});
 const login=f.submitPasswordAuth('auth-signin-password','alice@example.com','secret');
 state.authMode='signup';f.bump();
 reject(Error('Alice authentication offline'));
 assert.equal(await login,false);
 assert.equal(f.calls.messages.length,0);
 assert.equal(f.calls.reloads,0);
});

test('LR-026: normal password sign-in adopts identity and reloads',async()=>{
 const state={user:null,authMode:'signin',showAuth:true};
 const f=passwordAuthSubmitFixture(state);
 assert.equal(await f.submitPasswordAuth('auth-signin-password','alice@example.com','secret'),true);
 assert.equal(state.user.id,'alice');
 assert.equal(state.showAuth,false);
 assert.equal(f.calls.reloads,1);
 assert.equal(f.calls.adopts[0],'alice');
 assert.equal(f.request(),null);
});

test('LR-026: unconfirmed sign-in retains confirmation instructions for the originating form',async()=>{
 const state={user:null,authMode:'signin',showAuth:true};
 const f=passwordAuthSubmitFixture(state,{signIn:async()=>({
  error:{code:'email_not_confirmed',message:'Email not confirmed'},data:null
 })});
 assert.equal(await f.submitPasswordAuth('auth-signin-password','alice@example.com','secret'),false);
 assert.equal(state.authNeedsEmailConfirmation,true);
 assert.match(state.authNotice,/doit être confirmée/);
 assert.equal(f.calls.renders,1);
 assert.equal(f.calls.adopts.length,0);
});

test('LR-026: password signup without a session preserves email verification',async()=>{
 const state={user:null,authMode:'signup',showAuth:true};
 const f=passwordAuthSubmitFixture(state);
 assert.equal(await f.submitPasswordAuth('auth-signup-password','alice@example.com','secret'),true);
 assert.equal(state.authDraftEmail,'alice@example.com');
 assert.equal(state.emailVerificationPending,true);
 assert.equal(f.calls.renders,1);
 assert.equal(f.calls.reloads,0);
});

test('LR-026: old password signup result cannot show verification for another account',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:null,authMode:'signup',showAuth:true};
 const f=passwordAuthSubmitFixture(state,{signUp:()=>pending});
 const signup=f.submitPasswordAuth('auth-signup-password','alice@example.com','secret');
 state.user={id:'bob'};f.bump();
 release({data:{session:null},error:null});
 assert.equal(await signup,false);
 assert.equal(state.emailVerificationPending,undefined);
 assert.equal(f.calls.renders,0);
});

test('LR-026: duplicate password submissions cannot start simultaneous Supabase Auth calls',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:null,authMode:'signin',showAuth:true};
 const f=passwordAuthSubmitFixture(state,{signIn:()=>pending});
 const first=f.submitPasswordAuth('auth-signin-password','alice@example.com','secret');
 const duplicate=await f.submitPasswordAuth('auth-signin-password','alice@example.com','secret');
 assert.equal(duplicate,false);
 assert.equal(f.calls.signins.length,1);
 release({data:{user:{id:'alice'}},error:null});
 assert.equal(await first,true);
 assert.equal(f.request(),null);
});

test('LR-026: changing Auth form allows a new attempt and ignores old request',async()=>{
 let releaseOld;
 const old=new Promise(resolve=>{releaseOld=resolve;});
 const state={user:null,authMode:'signin',showAuth:true};
 const f=passwordAuthSubmitFixture(state,{
  signIn:()=>old,signUp:async()=>({data:{session:null},error:null})
 });
 const oldLogin=f.submitPasswordAuth('auth-signin-password','alice@example.com','secret');
 state.authMode='signup';f.bump();
 assert.equal(await f.submitPasswordAuth('auth-signup-password','bob@example.com','secret'),true);
 releaseOld({data:{user:{id:'alice'}},error:null});
 assert.equal(await oldLogin,false);
 assert.equal(state.authDraftEmail,'bob@example.com');
 assert.equal(state.emailVerificationPending,true);
 assert.equal(f.calls.adopts.length,0);
});

test('LR-026: password Auth action delegates to account-owned helper',()=>{
 const begin=app.indexOf("if(verb==='auth-signup-password'||verb==='auth-signin-password'){");
 const end=app.indexOf("if(verb==='email-confirm-login'){",begin);
 assert.ok(begin>0&&end>begin);
 const action=app.slice(begin,end);
 assert.match(action,/await submitPasswordAuth\(verb,email,password\)/);
 assert.doesNotMatch(action,/state\.user\s*=\s*data\.user/);
 assert.doesNotMatch(action,/client\.auth\.signInWithPassword\(/);
 assert.doesNotMatch(action,/client\.auth\.signUp\(/);
});

test('LR-026: current signup with a verified session signs in without losing the new identity',async()=>{
 const state={user:null,authMode:'signup',showAuth:true};
 const f=passwordAuthSubmitFixture(state,{signUp:async()=>({
  data:{session:{user:{id:'alice'}}},error:null
 })});
 assert.equal(await f.submitPasswordAuth('auth-signup-password','alice@example.com','secret'),true);
 assert.equal(state.user.id,'alice');
 assert.equal(state.showAuth,false);
 assert.equal(f.calls.adopts[0],'alice');
 assert.equal(f.calls.reloads,1);
});

test('LR-026: active sign-in failure is visible but does not enter the game',async()=>{
 const state={user:null,authMode:'signin',showAuth:true};
 const f=passwordAuthSubmitFixture(state,{signIn:async()=>({
  data:null,error:{code:'invalid_credentials',message:'Invalid password'}
 })});
 assert.equal(await f.submitPasswordAuth('auth-signin-password','alice@example.com','wrong'),false);
 assert.equal(state.user,null);
 assert.equal(f.calls.messages.length,1);
 assert.equal(f.calls.reloads,0);
});

test('LR-026: a stale password signup network failure cannot warn a new account',async()=>{
 let reject;
 const pending=new Promise((_,bad)=>{reject=bad;});
 const state={user:null,authMode:'signup',showAuth:true};
 const f=passwordAuthSubmitFixture(state,{signUp:()=>pending});
 const signup=f.submitPasswordAuth('auth-signup-password','alice@example.com','secret');
 state.user={id:'bob'};f.bump();
 reject(Error('Expired old signup request'));
 assert.equal(await signup,false);
 assert.equal(f.calls.messages.length,0);
 assert.equal(f.calls.renders,0);
});

test('LR-026: switching to Google or Apple invalidates pending password form replies',()=>{
 const nativeStart=app.indexOf("if(verb==='google'&&window.LoveRollNativeAuth?.googleSignIn){");
 const browserStart=app.indexOf("if(verb==='google'||verb==='apple'){",nativeStart);
 const end=app.indexOf("if(verb==='auth-mode'){",browserStart);
 assert.ok(nativeStart>0&&browserStart>nativeStart&&end>browserStart);
 assert.match(app.slice(nativeStart,browserStart),/authFeedbackGeneration\+\+/);
 assert.match(app.slice(browserStart,end),/authFeedbackGeneration\+\+/);
});

test('LR-026: switching accounts clears calendar, invitation and review caches',async()=>{
 const state={user:{id:'alice'},coupleId:'duo-alice',
  monthly:{secret:'alice-month'},monthlyActivities:[{id:'private-activity'}],
  rollStatus:{secret:'alice-roll'},events:[{id:'private-event'}],
  journal:[{text:'private-journal'}],occasionSettings:{private:true},
  occasionRolls:[{id:'alice-roll'}],advent:[{secret:true}],
  advent2026Config:{secret:'alice'},advent2026Days:[{secret:'alice'}],
  adventYear:2026,adventSelected:4,adventServerDate:'2026-12-04',
  specialEventsConfig:{secret:'alice'},specialEventKeys:['alice'],
  unlockKey:'alice-secret-key',weeklyRollHistory:[{id:'alice'}],
  calendarPassQuota:[{id:'alice'}],monthlyPassQuota:{private:true},
  calendarPassMonth:'2026-10',cycleStatus:{private:true},
  eveningHistoryStats:[{id:'alice'}],eveningCalendarChallenges:[{id:'alice'}],
  eveningReviews:[{id:'alice'}],reviewModalSessionId:'alice-session',
  reviewDraft:{private:'alice'},reviewSaving:true,
  inviteDraft:{link:'alice-private-link'},inviteCopyFallback:true,
  eveninGPlaceholder:null,geoVenue:{secret:'alice'},
  geoReservation:{secret:'alice'},pushDevice:{token:'alice-device'},
  guidance:'alice-guidance',notifications:'intact'};
 const f=privateAuthBoundaryFixture(state,async()=>({data:{user:state.user}}));
 f.adoptAuthenticatedIdentity({id:'bob'});
 await Promise.resolve();
 for(const field of ['monthlyActivities','events','journal','occasionRolls','advent',
  'advent2026Days','weeklyRollHistory','calendarPassQuota',
  'eveningHistoryStats','eveningCalendarChallenges','eveningReviews','specialEventKeys']){
  assert.equal(state[field].length,0,field+' must be empty on a different login');
 }
 for(const field of ['rollStatus','occasionSettings','advent2026Config','unlockKey',
  'monthlyPassQuota','calendarPassMonth','cycleStatus','reviewModalSessionId',
  'inviteDraft','geoVenue','geoReservation','pushDevice']){
  assert.equal(state[field],null,field+' must be null for Bob');
 }
 assert.equal(Object.keys(state.monthly).length,0);
 assert.equal(Object.keys(state.reviewDraft).length,0);
 assert.equal(state.reviewSaving,false);
 assert.equal(state.inviteCopyFallback,false);
 assert.equal(state.guidance,'playful');
 assert.equal(state.notifications,'intact','unrelated preferences are unchanged');
});

test('LR-026: auth account switch stops old challenge timer but keeps chosen vibration preference',()=>{
 const state={user:{id:'alice'},coupleId:'duo-alice',
  timerCompletionContext:{userId:'alice'},timerCompletionRetryOwner:'alice',
  timerStartContext:{userId:'alice'},redrawBusy:true,redrawBusyContext:{userId:'alice'},
  eveningInviteBusy:true,eveningQueueSeen:{private:'alice'}};
 const f=privateAuthBoundaryFixture(state,async()=>({data:{user:state.user}}));
 assert.equal(f.timer.running,true);
 assert.equal(f.timer.mode,'vibrate');
 f.adoptAuthenticatedIdentity({id:'bob'});
 assert.equal(f.timer.running,false);
 assert.equal(f.timer.id,null);
 assert.equal(f.timer.ownerUserId,null);
 assert.equal(f.timer.ownerSessionId,null);
 assert.equal(f.timer.deadline,0);
 assert.equal(f.timer.autoCompletePending,false);
 assert.equal(f.timer.mode,'vibrate');
 assert.equal(state.timerCompletionContext,null);
 assert.equal(state.timerCompletionRetryOwner,null);
 assert.equal(state.timerStartContext,null);
 assert.equal(state.redrawBusy,false);
 assert.equal(state.redrawBusyContext,null);
 assert.equal(state.eveningInviteBusy,false);
 assert.equal(state.eveningQueueSeen,null);
});

test('LR-026: an identity refresh for the same user retains the running timer and private month',()=>{
 const state={user:{id:'alice'},coupleId:'duo-alice',
  monthly:{secret:'alice-month'},inviteDraft:{link:'alice-link'}};
 const f=privateAuthBoundaryFixture(state,async()=>({data:{user:state.user}}));
 assert.equal(f.adoptAuthenticatedIdentity({id:'alice',email:'new@example.com'}),false);
 assert.equal(state.user.email,'new@example.com');
 assert.equal(state.monthly.secret,'alice-month');
 assert.equal(state.inviteDraft.link,'alice-link');
 assert.equal(f.timer.running,true);
 assert.equal(f.timer.ownerUserId,'alice');
 assert.equal(f.calls.channelRemovals,0);
});

test('LR-026: signing out clears account-specific presentation and pending installations',()=>{
 const state={user:{id:'alice'},coupleId:'duo-alice',
  installModalOpen:true,installAfterSignup:true,showInstallSteps:true,
  forceInstallGuide:true,personalPass:'alice-private',jsonPending:{secret:'alice'}};
 const f=privateAuthBoundaryFixture(state,async()=>({data:{user:state.user}}));
 f.adoptAuthenticatedIdentity(null);
 assert.equal(state.user,null);
 assert.equal(state.installModalOpen,false);
 assert.equal(state.installAfterSignup,false);
 assert.equal(state.showInstallSteps,false);
 assert.equal(state.forceInstallGuide,false);
 assert.equal(state.personalPass,null);
 assert.equal(state.jsonPending,null);
});

test('LR-026: switching accounts saves the former owner\'s running timer before clearing it',()=>{
 const state={user:{id:'alice'},coupleId:'alice-duo',tab:'session'};
 const f=privateAuthBoundaryFixture(state,async()=>({data:{user:state.user}}));
 assert.equal(f.timer.running,true);
 assert.equal(f.adoptAuthenticatedIdentity({id:'bob'}),true);
 assert.equal(f.calls.savedTimers.length,1);
 assert.equal(f.calls.savedTimers[0].ownerUserId,'alice');
 assert.equal(f.calls.savedTimers[0].id,'alice-card');
 assert.equal(f.calls.savedTimers[0].remainingMs,55000);
 assert.equal(f.timer.id,null);
 assert.equal(f.timer.ownerUserId,null);
 assert.equal(f.timer.mode,'vibrate');
});

test('LR-026: refreshing the same account does not save or clear its current timer',()=>{
 const state={user:{id:'alice'},coupleId:'alice-duo',tab:'session'};
 const f=privateAuthBoundaryFixture(state,async()=>({data:{user:state.user}}));
 assert.equal(f.adoptAuthenticatedIdentity({id:'alice',email:'alice@example.com'}),false);
 assert.equal(f.calls.savedTimers.length,0);
 assert.equal(f.timer.ownerUserId,'alice');
 assert.equal(f.timer.running,true);
});

test('LR-026: signing out persists the previous owner\'s timer without keeping private runtime state',()=>{
 const state={user:{id:'alice'},coupleId:'alice-duo',tab:'session'};
 const f=privateAuthBoundaryFixture(state,async()=>({data:{user:state.user}}));
 assert.equal(f.adoptAuthenticatedIdentity(null),true);
 assert.equal(f.calls.savedTimers.length,1);
 assert.equal(f.calls.savedTimers[0].ownerUserId,'alice');
 assert.equal(state.user,null);
 assert.equal(state.coupleId,null);
 assert.equal(f.timer.running,false);
});

test('LR-026: old getUser rejection cannot revoke a new login of the same account',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},coupleId:'new-session-pending',tab:'eclat'};
 const f=privateAuthBoundaryFixture(state,()=>pending);
 const checking=f.refreshVerifiedIdentity();
 f.adoptAuthenticatedIdentity(null);
 f.adoptAuthenticatedIdentity({id:'alice',email:'fresh-session@example.com'});
 release({error:{code:'invalid_token'},data:null});
 assert.equal(await checking,null);
 assert.equal(state.user.id,'alice');
 assert.equal(state.user.email,'fresh-session@example.com');
 assert.equal(f.calls.paints,0,'old expired token cannot clear a fresh account');
 assert.equal(f.calls.reloads,0);
});

test('LR-026: old getUser success cannot rewrite a new login of the same account',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice',email:'old@example.com'},tab:'home'};
 const f=privateAuthBoundaryFixture(state,()=>pending);
 const checking=f.refreshVerifiedIdentity();
 f.adoptAuthenticatedIdentity(null);
 f.adoptAuthenticatedIdentity({id:'alice',email:'new@example.com'});
 release({data:{user:{id:'alice',email:'old@example.com'}},error:null});
 assert.equal(await checking,null);
 assert.equal(state.user.email,'new@example.com');
 assert.equal(f.calls.paints,0);
});

test('LR-026: real Chromium redraw mock respects strict persisted receipt validation',async()=>{
 const browser=readFileSync(new URL('./boot-smoke.cjs',import.meta.url),'utf8');
 const begin=browser.indexOf('const fakeSupabase=\x60');
 const end=browser.indexOf('\n\x60;',begin);
 assert.ok(begin>=0&&end>begin,'browser fixture must be available');
 const mock=browser.slice(begin+'const fakeSupabase=\x60'.length,end)
  .replace('export function createClient(){','function createClient(){');
 for(const [action,exclude] of [['pass',false],['refuse',false],['refuse',true]]){
  const sandbox={window:{},URL,location:{href:'https://test.invalid/?boot_case=paired-redraw-pass'}};
  const client=runInNewContext(mock+';createClient()',sandbox);
  const originalRows=await client.from('couple_challenges').select('*');
  const original=originalRows.data.find(row=>row.id==='redraw-original');
  const snapshot=snapshotEveningCardBeforeRedraw(original);
  assert.ok(snapshot,'the original browser card must include every immutable field');
  const {data:receipt,error}=await client.rpc('love_respond_and_redraw',{
   p_challenge:'redraw-original',p_action:action,p_exclude:exclude
  });
  assert.equal(error,null);
  assert.equal(isValidEveningRedrawReceipt(receipt,'redraw-original'),true,
   'the browser mock must return the official receipt shape');
  const persisted=await client.from('couple_challenges').select('*');
  assert.equal(isPersistedEveningRedrawReceipt(receipt,persisted.data,
   'test-user-1','active-session-synthetic',snapshot),true,
   'the browser mock must persist valid D100 fields and timestamps');
  assert.equal(activeEveningRedrawReplacementId(persisted.data,receipt,
   'test-user-1','active-session-synthetic'),'redraw-replacement');
 }
});

test('LR-026: same-user reauthentication reloads a private Éclat note instead of retaining an old draft',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1},eclatBrowse:false};
 let finishOld,reads=0;
 const pending=new Promise(resolve=>{finishOld=resolve;});
 const f=privateEclatReadFixture(state,()=>++reads===1?pending:
  Promise.resolve({note:'Note de la nouvelle session',clue:'Indice récent',moment_done:false}));
 const previous=f.eclatNoteState();
 f.setAuthGeneration(2);
 const current=f.eclatNoteState();
 assert.notEqual(previous,current,'new Auth generation must not reuse an old private draft');
 await settlePrivateNoteRead();
 assert.equal(current.note,'Note de la nouvelle session');
 finishOld({note:'Ancienne note',clue:'Vieil indice',moment_done:true});
 await settlePrivateNoteRead();
 assert.equal(current.note,'Note de la nouvelle session');
 assert.equal(current.moment_done,false);
 assert.equal(previous.note,'','old private reply is ignored');
 assert.equal(f.paintCount(),1,'old request cannot repaint the reauthenticated account');
 assert.equal(reads,2);
});

test('LR-026: private Éclat save finishing after same-user reauthentication is not a valid receipt',async()=>{
 let finishSave;
 const pending=new Promise(resolve=>{finishSave=resolve;});
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 const f=privateEclatSaveFixture(state,()=>pending);
 const previous=f.saveCurrentEclatNote(true);
 f.setAuthGeneration(2);
 finishSave();
 assert.equal(await previous,null,'old saved note is not a receipt for the new login');
 assert.equal(f.draft.moment_done,false);
 assert.equal(f.draft.saved,false);
 assert.equal(f.draft.saving,false);
 assert.deepEqual(f.labels,initialEclatSaveFeedback);
});

test('LR-026: expired Éclat note-save error cannot report failure to the new login',async()=>{
 let rejectSave;
 const pending=new Promise((_,reject)=>{rejectSave=reject;});
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 const f=privateEclatSaveFixture(state,()=>pending);
 const previous=f.saveCurrentEclatNote(true);
 f.setAuthGeneration(2);
 rejectSave(new Error('Former session failed'));
 assert.equal(await previous,null);
 assert.deepEqual(f.labels,initialEclatSaveFeedback,'the old request must not change the new login feedback');
 assert.equal(f.draft.saving,false);
});

test('LR-026: cached note from a previous login cannot start a save',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 let networkCalls=0;
 const f=privateEclatSaveFixture(state,async()=>{networkCalls++;});
 f.setAuthGeneration(2);
 assert.equal(await f.saveCurrentEclatNote(true),null);
 assert.equal(networkCalls,0,'a stale draft must not reach the network');
 assert.equal(f.draft.moment_done,false);
 assert.equal(f.draft.saving,false);
});

test('LR-026: a private Éclat save without a loaded draft keeps the original validation',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 let calls=0;
 const f=privateEclatSaveFixture(state,async()=>{calls++;});
 f.drafts.delete('alice:session-1:1');
 await assert.rejects(f.saveCurrentEclatNote(true),/Attends le chargement de ta note/);
 assert.equal(calls,0,'no private note is sent before it loads');
});

test('LR-026: a cached private note is allowed to save within its original login',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 let calls=0;
 const f=privateEclatSaveFixture(state,async()=>{calls++;});
 assert.equal(await f.saveCurrentEclatNote(true),'alice:session-1:1');
 assert.equal(calls,1);
 assert.equal(f.draft.moment_done,true);
});

test('LR-026: private Éclat note never loads without a ready couple',()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  members:[{id:'alice'}],
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 let reads=0;
 const f=privateEclatReadFixture(state,async()=>{reads++;return {note:'old-private'};});
 assert.deepEqual(Object.keys(f.eclatNoteState()),[]);
 assert.equal(reads,0,'must not send a private-note request without both partners');
 assert.equal(f.drafts.size,0);
});

test('LR-026: private Éclat note load ignores membership revocation during request',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1},eclatBrowse:false};
 let resolveRead;
 const wait=new Promise(resolve=>{resolveRead=resolve;});
 const f=privateEclatReadFixture(state,()=>wait);
 const draft=f.eclatNoteState();
 state.members=[{id:'alice'}];
 resolveRead({note:'formerly authorized',clue:'private',moment_done:true});
 await settlePrivateNoteRead();
 assert.equal(draft.note,'','revoked partner private reply must not become visible');
 assert.equal(draft.moment_done,false);
 assert.equal(f.paintCount(),0);
 assert.deepEqual(Object.keys(f.eclatNoteState()),[]);
});

test('LR-026: private Éclat note cannot be submitted once membership is revoked',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 let writes=0;
 const f=privateEclatSaveFixture(state,async()=>{writes++;});
 state.members=[{id:'alice'}];
 assert.equal(await f.saveCurrentEclatNote(true),null);
 assert.equal(writes,0);
 assert.equal(f.draft.moment_done,false);
});

test('LR-026: revoked private note save response must not acknowledge an older session',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 let finish;
 const waiting=new Promise(resolve=>{finish=resolve;});
 const f=privateEclatSaveFixture(state,()=>waiting);
 const inflight=f.saveCurrentEclatNote(true);
 state.members=[{id:'alice'}];
 finish();
 assert.equal(await inflight,null);
 assert.equal(f.draft.saved,false);
 assert.equal(f.draft.moment_done,false);
 assert.equal(f.draft.saving,false);
 assert.deepEqual(f.labels,initialEclatSaveFeedback);
});


test('LR-026: revoked Éclat entitlement prevents loading private notes',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:false,active:true,session_id:'session-1',chapter_index:1}};
 let calls=0;
 const f=privateEclatReadFixture(state,async()=>{
  calls++;return {note:'should stay private'};
 });
 assert.deepEqual(Object.keys(f.eclatNoteState()),[]);
 assert.equal(calls,0);
 assert.equal(f.drafts.size,0);
});

test('LR-026: pending note read cannot commit after Éclat entitlement is revoked',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1},
  eclatBrowse:false};
 let finish;
 const waiting=new Promise(resolve=>{finish=resolve;});
 const f=privateEclatReadFixture(state,()=>waiting);
 const draft=f.eclatNoteState();
 state.eclat={...state.eclat,access:false};
 finish({note:'revoked private content',clue:'old clue',moment_done:true});
 await settlePrivateNoteRead();
 assert.equal(draft.note,'','a revoked result must never repopulate private draft');
 assert.equal(draft.moment_done,false);
 assert.equal(f.paintCount(),0);
 assert.deepEqual(Object.keys(f.eclatNoteState()),[]);
});

test('LR-026: pending note save cannot mark completion after Éclat access is revoked',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 let finish;
 const waiting=new Promise(resolve=>{finish=resolve;});
 const f=privateEclatSaveFixture(state,()=>waiting);
 const pending=f.saveCurrentEclatNote(true);
 state.eclat={...state.eclat,access:false};
 finish();
 assert.equal(await pending,null);
 assert.equal(f.draft.moment_done,false);
 assert.equal(f.draft.saved,false);
 assert.equal(f.draft.saving,false);
 assert.deepEqual(f.labels,initialEclatSaveFeedback);
});

test('LR-026: already revoked Éclat access cannot initiate private note save',async()=>{
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:false,active:true,session_id:'session-1',chapter_index:1}};
 let writes=0;
 const f=privateEclatSaveFixture(state,async()=>{writes++;});
 assert.equal(await f.saveCurrentEclatNote(true),null);
 assert.equal(writes,0);
 assert.equal(f.draft.saved,false);
});


function invitationSwitchFixture(command,signOut){
 const start=app.indexOf("if(verb==='"+command+"'){");
 const next=command==='use-existing-account'?"if(verb==='join-invite-from-solo')":"if(verb==='native-update')";
 const end=app.indexOf(next,start);
 assert.ok(start>0&&end>start,'production invitation account switch exists');
 const state={user:{id:'alice'},coupleId:'duo-alice',couple:{id:'duo-alice'},
  members:[{user_id:'alice'},{user_id:'bob'}],tab:'eclat',
  eclatMembershipScope:JSON.stringify(['duo-alice','alice','bob']),
  eclat:{id:'private-session'},eclatHistory:[{id:'private-history'}],
  eclatMusic:true,inviteAccepted:true};
 const auth=privateAuthBoundaryFixture(state,async()=>({data:{user:state.user}}));
 state.channel=null;
 let renders=0;
 const scope={state,authFeedbackGeneration:0,client:{auth:{signOut},removeChannel:async()=>{}},
  sessionStorage:{},pendingInviteReference:()=>({kind:'id'}),
  safeNativePushToken:()=>false,
  adoptAuthenticatedIdentity:auth.adoptAuthenticatedIdentity,
  render:()=>{renders++;}};
 const action=runInNewContext('(async verb=>{'+app.slice(start,end)+'})',scope);
 return {state,scope,auth,execute:()=>action(command),renders:()=>renders};
}

test('LR-026: invitation account switching clears all Éclat private data through auth boundary',async()=>{
 for(const command of ['use-existing-account','switch-account-invite']){
  const f=invitationSwitchFixture(command,async()=>({error:null}));
  await f.execute();
  assert.equal(f.state.user,null,command);
  assert.equal(f.state.coupleId,null,command);
  assert.equal(f.state.eclatMembershipScope,null,command);
  assert.equal(f.state.eclat,null,command);
  assert.deepEqual(Array.from(f.state.eclatHistory),[],command);
  assert.equal(f.state.eclatMusic,false,command);
  assert.equal(f.auth.drafts.size,0,command);
  assert.equal(f.state.showAuth,true,command);
  assert.equal(f.state.inviteAccepted,true,command);
  assert.equal(f.renders(),1,command);
 }
});

test('LR-026: obsolete invitation sign-out cannot erase another account',async()=>{
 for(const command of ['use-existing-account','switch-account-invite']){
  let finish;const pending=new Promise(resolve=>{finish=resolve;});
  const f=invitationSwitchFixture(command,()=>pending);
  const old=f.execute();
  f.state.user={id:'carol'};f.state.coupleId='carol-duo';
  finish({error:null});await old;
  assert.equal(f.state.user.id,'carol',command);
  assert.equal(f.state.coupleId,'carol-duo',command);
  assert.equal(f.auth.drafts.size,1,command);
  assert.equal(f.renders(),0,command);
 }
});

test('LR-026: new same-user login invalidates pending invitation logout',async()=>{
 for(const command of ['use-existing-account','switch-account-invite']){
  let finish;const pending=new Promise(resolve=>{finish=resolve;});
  const f=invitationSwitchFixture(command,()=>pending);
  const old=f.execute();
  f.scope.authFeedbackGeneration=1;
  finish({error:null});await old;
  assert.equal(f.state.user.id,'alice',command);
  assert.equal(f.state.eclat?.id,'private-session',command);
  assert.equal(f.auth.drafts.size,1,command);
  assert.equal(f.renders(),0,command);
 }
});


test('LR-026: stale invitation logout error result cannot report failure in replacement account',async()=>{
 for(const command of ['use-existing-account','switch-account-invite']){
  let finish;const pending=new Promise(resolve=>{finish=resolve;});
  const f=invitationSwitchFixture(command,()=>pending);
  const former=f.execute();
  f.state.user={id:'carol'};f.state.coupleId='carol-duo';
  finish({error:Error('Old session sign-out failed')});
  await assert.doesNotReject(former,command);
  assert.equal(f.state.user.id,'carol',command);
  assert.equal(f.state.coupleId,'carol-duo',command);
  assert.equal(f.renders(),0,command);
 }
});

test('LR-026: rejected stale invitation logout cannot affect replacement account',async()=>{
 for(const command of ['use-existing-account','switch-account-invite']){
  let reject;const pending=new Promise((resolve,fail)=>{reject=fail;});
  const f=invitationSwitchFixture(command,()=>pending);
  const former=f.execute();
  f.state.user={id:'carol'};f.state.coupleId='carol-duo';
  reject(Error('Old session network error'));
  await assert.doesNotReject(former,command);
  assert.equal(f.state.user.id,'carol',command);
  assert.equal(f.renders(),0,command);
 }
});

test('LR-026: current invitation logout error remains visible and preserves account',async()=>{
 for(const command of ['use-existing-account','switch-account-invite']){
  const f=invitationSwitchFixture(command,async()=>({error:Error('Current signout failed')}));
  await assert.rejects(f.execute(),/Current signout failed/,command);
  assert.equal(f.state.user.id,'alice',command);
  assert.equal(f.state.eclat?.id,'private-session',command);
  assert.equal(f.renders(),0,command);
 }
});

test('LR-026: current invitation logout network rejection is not silently ignored',async()=>{
 for(const command of ['use-existing-account','switch-account-invite']){
  const f=invitationSwitchFixture(command,async()=>{throw Error('Current logout network failure');});
  await assert.rejects(f.execute(),/Current logout network failure/,command);
  assert.equal(f.state.user.id,'alice',command);
  assert.equal(f.renders(),0,command);
 }
});


test('LR-026: failed invitation sign-out retains journal, personal pass and unlock key',async()=>{
 for(const command of ['use-existing-account','switch-account-invite']){
  const f=invitationSwitchFixture(command,async()=>({error:Error('Logout denied')}));
  f.state.unlockKey='owned-key';f.state.personalPass={id:'current-pass'};
  f.state.personalJournal=[{id:'private-entry'}];
  await assert.rejects(f.execute(),/Logout denied/,command);
  assert.equal(f.state.user.id,'alice',command);
  assert.equal(f.state.unlockKey,'owned-key',command);
  assert.equal(f.state.personalPass?.id,'current-pass',command);
  assert.equal(f.state.personalJournal[0]?.id,'private-entry',command);
 }
});

test('LR-026: rejected invitation sign-out keeps private current account journal',async()=>{
 for(const command of ['use-existing-account','switch-account-invite']){
  const f=invitationSwitchFixture(command,async()=>{throw Error('Offline');});
  f.state.unlockKey='unchanged';f.state.personalPass={id:'kept'};
  f.state.personalJournal=[{id:'keep'}];
  await assert.rejects(f.execute(),/Offline/,command);
  assert.equal(f.state.unlockKey,'unchanged',command);
  assert.equal(f.state.personalPass.id,'kept',command);
  assert.deepEqual(f.state.personalJournal,[{id:'keep'}],command);
 }
});

test('LR-026: invite sign-out keeps local private data while server request is in flight',async()=>{
 for(const command of ['use-existing-account','switch-account-invite']){
  let resolve;const delayed=new Promise(done=>{resolve=done;});
  const f=invitationSwitchFixture(command,()=>delayed);
  f.state.unlockKey='still-authorized';
  f.state.personalPass={id:'pending'};
  f.state.personalJournal=[{id:'not-lost'}];
  const task=f.execute();
  assert.equal(f.state.unlockKey,'still-authorized',command);
  assert.equal(f.state.personalPass.id,'pending',command);
  assert.equal(f.state.personalJournal[0]?.id,'not-lost',command);
  resolve({error:null});await task;
  assert.equal(f.state.user,null,command);
  assert.equal(f.state.personalPass,null,command);
  assert.deepEqual(Array.from(f.state.personalJournal),[],command);
 }
});


test('LR-026: missing Éclat entitlement blocks private note loading',async()=>{
 let reads=0;
 for(const status of [null,{active:true,session_id:'session-1',chapter_index:1},
  {access:null,active:true,session_id:'session-1',chapter_index:1}]){
  const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
   eclat:status,eclatBrowse:false};
  const f=privateEclatReadFixture(state,async()=>{reads++;return {note:'private'};});
  assert.deepEqual(Object.keys(f.eclatNoteState()),[]);
  assert.equal(f.drafts.size,0);
 }
 assert.equal(reads,0,'an unknown subscription cannot start private note reads');
});

test('LR-026: missing Éclat entitlement blocks private note saving',async()=>{
 for(const status of [null,{active:true,session_id:'session-1',chapter_index:1},
  {access:null,active:true,session_id:'session-1',chapter_index:1}]){
  let writes=0;
  const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',eclat:status};
  const f=privateEclatSaveFixture(state,async()=>{writes++;});
  assert.equal(await f.saveCurrentEclatNote(true),null);
  assert.equal(writes,0);
  assert.equal(f.draft.moment_done,false);
 }
});

test('LR-026: pending private note read ignores entitlement becoming unconfirmed',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1},
  eclatBrowse:false};
 const f=privateEclatReadFixture(state,()=>pending);
 const draft=f.eclatNoteState();
 state.eclat={...state.eclat,access:null};
 release({note:'no longer confirmed',moment_done:true});
 await settlePrivateNoteRead();
 assert.equal(draft.note,'');
 assert.equal(draft.moment_done,false);
 assert.equal(f.paintCount(),0);
});

test('LR-026: pending private note save cannot acknowledge an unconfirmed subscription',async()=>{
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const state={user:{id:'alice'},coupleId:'duo',tab:'eclat',
  eclat:{access:true,active:true,session_id:'session-1',chapter_index:1}};
 const f=privateEclatSaveFixture(state,()=>pending);
 const saving=f.saveCurrentEclatNote(true);
 state.eclat={...state.eclat,access:undefined};
 release();
 assert.equal(await saving,null);
 assert.equal(f.draft.saved,false);
 assert.equal(f.draft.moment_done,false);
 assert.equal(f.draft.saving,false);
});
