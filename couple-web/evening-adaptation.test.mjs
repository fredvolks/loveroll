import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptationHtml,acceptedAdaptation,adaptationInboxHtml} from './evening-adaptation.mjs';
import {coupleSyncChanged} from './couple-live-sync.mjs';
const sql=readFileSync(new URL('./migrations/20261028_lr017_challenge_adaptation.sql',import.meta.url),'utf8');
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const card={id:'challenge-1',status:'proposed'};
const pending={challenge_id:'challenge-1',proposer_id:'alice',approver_id:'bob',
 proposed_description:'On y va ensemble ♥',proposed_minutes:12,status:'pending'};
test('LR-017 keeps the official card untouched until a distinct partner consents',()=>{
 assert.equal(acceptedAdaptation([pending],'challenge-1'),null);
 const accepted={...pending,status:'accepted'};
 assert.equal(acceptedAdaptation([accepted],'challenge-1'),accepted);
 assert.equal(acceptedAdaptation([accepted],'another-challenge'),null);
 assert.match(adaptationHtml(card,{adaptation:accepted,viewerId:'alice'}),/Adaptation acceptée à deux/);
 assert.doesNotMatch(adaptationHtml({...card,status:'completed'},{adaptation:accepted}),/data-action/);
});
test('Proposer can cancel, approver has Yes/Keep original, and absent proposal allows edit',()=>{
 let html=adaptationHtml(card,{viewerId:'alice'});
 assert.match(html,/Adapter ce défi/);
 assert.match(html,/evening-adapt-open:challenge-1/);
 html=adaptationHtml(card,{viewerId:'alice',editing:true});
 assert.match(html,/maxlength="1200"/);
 assert.match(html,/evening-adapt-propose:challenge-1/);
 assert.match(html,/evening-adapt-dismiss:challenge-1/);
 html=adaptationHtml(card,{adaptation:pending,viewerId:'alice'});
 assert.match(html,/evening-adapt-cancel:challenge-1/);
 assert.doesNotMatch(html,/evening-adapt-accept:/);
 html=adaptationHtml(card,{adaptation:pending,viewerId:'bob'});
 assert.match(html,/evening-adapt-accept:challenge-1/);
 assert.match(html,/evening-adapt-decline:challenge-1/);
 assert.doesNotMatch(html,/evening-adapt-cancel:/);
});
test('Private adaptation inbox escapes all partner-provided HTML and discloses no D100 result',()=>{
 const attack={...pending,proposed_description:'<script>alert("x")</script>'};
 const html=adaptationInboxHtml([attack,{...pending,challenge_id:'x',status:'accepted'}],'bob');
 assert.match(html,/&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/Durée proposée : 12 min/);
 assert.equal((html.match(/evening-adapt-accept:/g)||[]).length,1);
 assert.equal(adaptationInboxHtml([attack],'alice'),'');
 assert.doesNotMatch(html,/D100|Résultat/);
});
test('Only a change in partner-approved adaptation can trigger a cross-device refresh',()=>{
 const base={weekly:null,monthly:{},session:null,adaptations:[pending]};
 const data={rolls:[],sessions:[],adaptations:[{...pending,status:'accepted'}]};
 assert.equal(coupleSyncChanged(base,data,{tab:'session'}),true);
 assert.equal(coupleSyncChanged(base,{...data,adaptations:[pending]},{tab:'session'}),false);
 assert.equal(coupleSyncChanged(base,{...data,adaptations:null},{tab:'session'}),false);
});
test('Backend requires verified Auth, exact couple, two distinct members and unstarted challenge',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.love_challenge_adaptations/);
 assert.match(sql,/PRIMARY KEY REFERENCES public\.couple_challenges/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/couple_private\.is_member\(couple_id\)/);
 assert.match(sql,/v_me=v_card\.recipient/);
 assert.match(sql,/v_me=v_card\.offered_by/);
 assert.match(sql,/v_other=v_me/);
 assert.match(sql,/v_card\.status<>'proposed'/);
 assert.match(sql,/finished_at IS NULL FOR UPDATE/);
 assert.match(sql,/love_require_verified_identity\(\)/);
 assert.match(sql,/v_row\.approver_id IS DISTINCT FROM auth\.uid\(\)/);
 assert.match(sql,/v_row\.proposer_id IS DISTINCT FROM auth\.uid\(\)/);
 assert.match(sql,/REVOKE ALL ON public\.love_challenge_adaptations FROM PUBLIC,anon,authenticated/);
 assert.doesNotMatch(sql,/UPDATE public\.couple_challenges SET|UPDATE public\.love_custom_challenges|UPDATE public\.love_base_challenges|love_card_draw_history|pass_limit|draw_for_partner|create_session/i);
});
test('Real Soirée calls the server and only replaces the description and timer after accepted',()=>{
 assert.match(app,/acceptedAdaptation\(state\.adaptations,view\.id\)/);
 assert.match(app,/adapted\?\.proposed_description\|\|resolvedCard\(view\)\.description/);
 assert.match(app,/adapted\?\.proposed_minutes\?\?resolvedCard\(view\)\.minutes/);
 for(const action of ['love_adaptation_propose','love_adaptation_respond','love_adaptation_cancel','my_love_challenge_adaptations'])
  assert.ok(app.includes(action),action);
 assert.match(app,/state\.adaptations=Array\.isArray\(adaptations\)\?adaptations:null/);
 assert.match(app,/adaptationInboxHtml\(state\.adaptations,uid/);
});
