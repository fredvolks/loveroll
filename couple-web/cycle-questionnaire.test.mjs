import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cycleIntensityQuestionnaireHtml,ownsCycleIntensityAnswer} from './cycle-questionnaire.mjs';

const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const owner={userId:'person-a',coupleId:'couple-one',cycle:3,generation:7};
const state={user:{id:'person-a'},coupleId:'couple-one',cycleStatus:{pending:true,cycle:3}};

test('The 200-card question belongs to the original account, duo and login generation',()=>{
 assert.equal(ownsCycleIntensityAnswer(state,owner,7),true);
 for(const replaced of [
  {...state,user:{id:'person-b'}},
  {...state,user:null},
  {...state,coupleId:'another-couple'},
  null
 ])assert.equal(ownsCycleIntensityAnswer(replaced,owner,7),false);
 assert.equal(ownsCycleIntensityAnswer(state,owner,8),false);
 assert.equal(ownsCycleIntensityAnswer(state,{...owner,generation:8},7),false);
 assert.equal(ownsCycleIntensityAnswer(state,{...owner,userId:''},7),false);
 assert.equal(ownsCycleIntensityAnswer(state,{...owner,coupleId:''},7),false);
 assert.equal(ownsCycleIntensityAnswer(state,null,7),false);
});

test('The 200-card question offers one personal response and a waiting state',()=>{
 const pending=cycleIntensityQuestionnaireHtml({status:{pending:true,cycle:3},
  style:'medium',partnerName:'Camille'});
 assert.match(pending,/data-action="cycle-answer:down"/);
 assert.match(pending,/data-action="cycle-answer:same"/);
 assert.match(pending,/data-action="cycle-answer:up"/);
 assert.match(pending,/aria-modal="true"/);
 assert.match(pending,/<p class="lr-cycle-progress" role="status" aria-live="polite" hidden>/);
 assert.match(pending,/data-action="cycle-later"/);
 const answered=cycleIntensityQuestionnaireHtml({status:{pending:true,answered_self:true,cycle:3},
  style:'intense',partnerName:'Camille'});
 assert.doesNotMatch(answered,/data-action="cycle-answer:/);
 assert.match(answered,/En attente de Camille/);
 assert.equal(cycleIntensityQuestionnaireHtml({status:{pending:false}}),'');
});

test('The active cycle answer is serialized, scoped and not applied to a different account',()=>{
 const begin=source.indexOf("if(verb==='cycle-answer'){");
 const end=source.indexOf("if(verb==='cycle-reopen'){",begin);
 assert.ok(begin>=0&&end>begin);
 const handler=source.slice(begin,end);
 const lock=handler.indexOf('if(state.cycleAnswerRequest&&');
 const assign=handler.indexOf('state.cycleAnswerRequest=owner;');
 const submit=handler.indexOf("rpc('answer_love_cycle_intensity'");
 const staleCheck=handler.indexOf("if(!ownsAnswer()||state.cycleStatus?.cycle!==owner.cycle)return;");
 const reload=handler.indexOf('await reload();');
 const notification=handler.indexOf("if(result?.completed)notify(");
 assert.ok(lock>=0&&lock<assign&&assign<submit,
  'an in-flight decision must guard the RPC before it is submitted');
 assert.ok(staleCheck>submit&&staleCheck<reload,
  'a delayed answer must not reload or change another account');
 assert.ok(reload<notification);
 assert.match(handler,/generation:authFeedbackGeneration/);
 assert.match(handler,/p_couple:owner.coupleId/);
 assert.match(handler,/state.cycleStatus.answered_self/);
 assert.match(handler,/finally\{/);
 assert.match(handler,/if\(state.cycleAnswerRequest===owner\)/);
 assert.match(handler,/for\(const control of currentOverlay\?\.querySelectorAll\('\.lr-cycle-choice'\)\|\|\[\]\)/);
 assert.match(handler,/if\(progress\)progress.hidden=false/);
 assert.match(handler,/if\(liveProgress\)liveProgress.hidden=true/);
 assert.match(handler,/if\(verb==='cycle-later'\)\{[\s\S]*?state.cycleAnswerRequest/);
});

test('Pending 200-card votes remain visibly pending across a realtime redraw',()=>{
 const active=cycleIntensityQuestionnaireHtml({status:{pending:true,cycle:3},
  style:'medium',saving:true});
 assert.match(active,/<div class="lr-cycle-overlay"[^>]*aria-busy="true"/);
 for(const choice of ['down','same','up']){
  assert.match(active,new RegExp('data-action="cycle-answer:'+choice+'" disabled aria-disabled="true"'));
 }
 assert.match(active,/<p class="lr-cycle-progress" role="status" aria-live="polite">Enregistrement de votre choix…<\/p>/);
 assert.match(active,/data-action="cycle-later" disabled aria-disabled="true"/);
 const upperBound=cycleIntensityQuestionnaireHtml({status:{pending:true},
  style:'intense',saving:false});
 assert.match(upperBound,/data-action="cycle-answer:up" disabled aria-disabled="true"/);
 assert.doesNotMatch(upperBound,/aria-busy="true"/);
 const waiting=cycleIntensityQuestionnaireHtml({status:{pending:true,answered_self:true},
  saving:true});
 assert.doesNotMatch(waiting,/aria-busy="true"/);
 assert.doesNotMatch(waiting,/data-action="cycle-answer:/);
});

test('An interrupted 200-card save restores the CURRENT visible overlay, not a detached one',()=>{
 const start=source.indexOf("if(verb==='cycle-answer'){");
 const end=source.indexOf("if(verb==='cycle-reopen'){",start);
 const handler=source.slice(start,end);
 assert.match(handler,/const currentOverlay=root.querySelector\('\.lr-cycle-overlay'\)/);
 assert.match(handler,/for\(const control of currentOverlay\?\.querySelectorAll\('\.lr-cycle-choice'\)\|\|\[\]\)/);
 assert.match(handler,/currentOverlay\?\.querySelector\('\.lr-cycle-progress'\)/);
 assert.match(handler,/state\.cycleAnswerRequest===owner/);
 assert.match(source,/saving:!!\(state\.cycleAnswerRequest&&/);
 assert.match(handler,/catch\(error\)\{\s*if\(!ownsAnswer\(\)\)return;/,
  'stale RPC errors must not be shown to a different signed-in account');
});
