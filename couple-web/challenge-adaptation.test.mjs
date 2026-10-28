import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptationFor,acceptedAdaptationText,acceptedAdaptationMinutes,adaptedTimerDurationMs,needsAdaptedTimerReset,adaptationPanelHtml,pendingAdaptationsHtml} from './challenge-adaptation.mjs';
const card={id:'challenge-1',status:'proposed'};
test('original instructions and timer win until explicit other-person acceptance',()=>{
 const row={challenge_id:'challenge-1',status:'pending',proposed_text:'Deux pas de danse',proposed_minutes:15};
 assert.equal(acceptedAdaptationText('Consigne originale',row),'Consigne originale');
 assert.equal(acceptedAdaptationMinutes(5,row),5);
 assert.equal(acceptedAdaptationText('Consigne originale',{...row,status:'declined'}),'Consigne originale');
 assert.equal(acceptedAdaptationText('Consigne originale',{...row,status:'accepted'}),'Deux pas de danse');
 assert.equal(acceptedAdaptationMinutes(5,{...row,status:'accepted'}),15);
});
test('proposal is secondary and cannot start a challenge or roll any dice',()=>{
 const html=adaptationPanelHtml(card,null,{open:true,originalText:'<em>Consigne originale</em>',originalMinutes:5});
 assert.match(html,/Consigne originale/);
 assert.match(html,/Durée actuelle : 5 min/);
 assert.match(html,/&lt;em&gt;Consigne originale&lt;\/em&gt;/);
 assert.doesNotMatch(html,/<em>/);
 assert.match(html,/data-action="adapt-propose:challenge-1"/);
 assert.match(html,/data-action="adapt-cancel"/);
 assert.match(html,/lr-adapt-minutes/);
 assert.doesNotMatch(html,/data-action="(evening-start|roll:|answer:)/);
 assert.doesNotMatch(adaptationPanelHtml({...card,status:'completed'},null),/data-action/);
 assert.doesNotMatch(adaptationPanelHtml({...card,status:'accepted'},null,{open:true}),/lr-adapt-minutes/);
});
test('one recipient approves or keeps original, user-supplied content is escaped',()=>{
 const rows=[{challenge_id:'challenge-1',proposed_by:'alice',proposed_text:'<img src=x onerror=alert(1)>',status:'pending',proposed_minutes:30},
  {challenge_id:'challenge-2',proposed_by:'bob',status:'pending'}];
 const html=pendingAdaptationsHtml(rows,'bob');
 assert.match(html,/adapt-answer:challenge-1:yes/);
 assert.match(html,/adapt-answer:challenge-1:no/);
 assert.doesNotMatch(html,/adapt-answer:challenge-2/);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
 assert.equal(adaptationFor(rows,'challenge-1'),rows[0]);
});

test('accepted timer duration resets expired or running OLD client timer, never pending consent',()=>{
 const proposal={challenge_id:'challenge-1',status:'pending',proposed_minutes:12};
 const accepted={...proposal,status:'accepted'};
 const declined={...proposal,status:'declined'};
 assert.equal(adaptedTimerDurationMs(proposal),null);
 assert.equal(adaptedTimerDurationMs(declined),null);
 assert.equal(adaptedTimerDurationMs(accepted),720000);
 assert.equal(needsAdaptedTimerReset(accepted,300000),true);
 assert.equal(needsAdaptedTimerReset(accepted,undefined),true);
 assert.equal(needsAdaptedTimerReset(accepted,720000),false);
 assert.equal(needsAdaptedTimerReset(proposal,300000),false);
 assert.equal(needsAdaptedTimerReset(declined,300000),false);
 assert.equal(needsAdaptedTimerReset({...accepted,proposed_minutes:null},300000),false);
 assert.equal(needsAdaptedTimerReset({...accepted,proposed_minutes:361},300000),false);
});
