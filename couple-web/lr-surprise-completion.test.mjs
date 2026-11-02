import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {monthlyCompletionHtml} from './monthly-completion.mjs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';
const read=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');
const roll={monthly_activity:{id:'roll-1',face:13},monthly_host:{face:2}};
const members=[{user_id:'A',name:'Alice'},{user_id:'B',name:'Bob'}];

test('no migration, no active couple or no completion state never renders a fake completed outing',()=>{
 assert.equal(monthlyCompletionHtml({available:false,viewerId:'A'}),'');
 assert.equal(monthlyCompletionHtml({available:true,viewerId:null}),'');
 const html=monthlyCompletionHtml({available:true,viewerId:'A'});
 assert.match(html,/data-action="geo-complete"/);
 assert.match(html,/On l’a fait/);
 assert.doesNotMatch(html,/Réservation déclarée confirmée|paiement effectué/i);
});

test('shared completion is visible and personal note has rating plus saved content',()=>{
 const completion={completed_at:'2026-12-12T20:00:00Z'};
 const feedback=[
  {author_id:'A',rating:4,memory_text:'Quelle belle journée !'},
  {author_id:'B',rating:5,memory_text:'Un café <img src=x onerror=alert(1)>'}
 ];
 const html=monthlyCompletionHtml({available:true,viewerId:'A',completion,feedback});
 assert.match(html,/On l’a fait !/);
 assert.match(html,/geo-memory-rating/);
 assert.match(html,/value="4" selected/);
 assert.match(html,/Quelle belle journée/);
 assert.match(html,/geo-memory-text/);
 assert.match(html,/data-action="geo-memory-save"/);
 assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/&lt;img src=x/);
 assert.match(html,/5\/5/);
 assert.match(html,/membres actuels/);
});

test('finished outing is shown in real Surprise modal with no new D100 roll',()=>{
 const html=premiumSurpriseHtml({
  monthly:roll,members,showActivity:true,
  activity:{title:'Randonnée surprise',description:'Un moment à deux'},
  completionAvailable:true,completion:{completed_at:'2026-12-12T20:00:00Z'},
  monthlyFeedback:[],viewerId:'A'
 });
 assert.match(html,/D100 · 13/);
 assert.match(html,/On l’a fait !/);
 assert.doesNotMatch(html,/data-action="roll:monthly_activity"/);
});

test('completion and feedback SQL enforce verified duo membership and RLS; never touch booking',()=>{
 const sql=read('migrations/20261102_lr_surprise_monthly_memories.sql');
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/g);
 assert.match(sql,/couple_private\.is_member\(couple_id\)/g);
 assert.match(sql,/love_require_verified_identity\(\)/g);
 assert.match(sql,/kind='monthly_activity'/g);
 assert.match(sql,/VALUES\(p_roll,v_roll\.couple_id,auth\.uid\(\),p_rating/);
 assert.match(sql,/ON CONFLICT \(roll_id\) DO NOTHING/);
 assert.match(sql,/ON CONFLICT \(roll_id,author_id\) DO UPDATE/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.mark_love_monthly_completed/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.save_love_monthly_feedback/);
 assert.doesNotMatch(sql,/UPDATE public\.couple_rolls|INSERT INTO public\.couple_rolls/);
 assert.doesNotMatch(sql,/UPDATE public\.love_monthly_reservations/);
});

test('actions use current roll, confirmation, mutation gate and validate score and note length',()=>{
 const code=read('app.js');
 const start=code.indexOf("if(verb==='geo-complete')");
 const save=code.indexOf("if(verb==='geo-memory-save')",start);
 const next=code.indexOf("if(['geo-date-propose'",save);
 assert.ok(start>0&&save>start&&next>save);
 const completion=code.slice(start,save),feedback=code.slice(save,next);
 assert.match(completion,/premiumConfirm\(/);
 assert.match(completion,/geoCompletionMutationGate/);
 assert.match(completion,/mark_love_monthly_completed/);
 assert.match(completion,/state\.user\?\.id!==actor/);
 assert.match(feedback,/geoCompletionMutationGate/);
 assert.match(feedback,/save_love_monthly_feedback/);
 assert.match(feedback,/memory\.length>500/);
 assert.match(feedback,/!Number\.isInteger\(rating\)/);
 assert.match(feedback,/geoFeedback=\[\.\.\.state\.geoFeedback\.filter/);
 assert.doesNotMatch(completion+feedback,/roll_couple_once|cancel_love_monthly_reservation/);
});

test('reload gracefully hides not-yet-deployed completion tables',()=>{
 const app=read('app.js');
 assert.match(app,/query\('love_monthly_completions'/);
 assert.match(app,/query\('love_monthly_feedback'/);
 assert.match(app,/state\.geoCompletionAvailable=false/);
 assert.match(app,/completionAvailable:state\.geoCompletionAvailable/);
});
