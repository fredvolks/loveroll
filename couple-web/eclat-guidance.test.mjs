import test from 'node:test';
import assert from 'node:assert/strict';
import {eclatStage} from './eclat-catalog.mjs';
import {eclatGuide,eclatNoteKey,loadEclatNote,saveEclatNote} from './eclat-guidance.mjs';
import {eclatGuidedPlay} from './eclat-guided-ui.mjs';
const status={active:true,session_id:'s',chapter_index:1,chapter_total:6,minutes:60,my_choice:null};
test('Every authored variant has actionable directions; physical moments never require writing',()=>{
 for(let c=1;c<=12;c++)for(let n=1;n<=8;n++)for(let v=0;v<4;v++){
  const g=eclatGuide(eclatStage(c,n,v));assert.equal(g.steps.length,3);
  assert.ok(g.steps.every(s=>s.length>45));
  if(g.kind==='x')assert.match(g.steps[0],/facultatif/);
 }
 assert.equal(eclatGuide(eclatStage(1,1,0)).label,'Choisir un souvenir');
 assert.equal(eclatGuide(eclatStage(7,1,0)).kind,'d');
 assert.equal(eclatGuide(eclatStage(9,1,0)).kind,'p');
});
test('Private draft cannot inject markup and mood selection follows the actual moment',()=>{
 const args={stage:eclatStage(1,1,0),status,members:[{user_id:'a'},{user_id:'b'}],userId:'a'};
 const html=eclatGuidedPlay({...args,noteState:{note:'</textarea><img src=x onerror=alert(1)>'}});
 assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;\/textarea&gt;/);
 assert.doesNotMatch(html,/eclat:choose:1/);
 assert.match(eclatGuidedPlay({...args,noteState:{moment_done:true}}),/eclat:choose:1/);
 assert.match(eclatGuidedPlay({...args,status:{...status,my_choice:1}}),/On attend ton partenaire/);
 assert.notEqual(eclatNoteKey(status,'a'),eclatNoteKey(status,'b'));
 assert.notEqual(eclatNoteKey(status,'a'),eclatNoteKey({...status,chapter_index:2},'a'));
});
test('Only current author/session/step is read or saved; errors do not turn into empty notes',async()=>{
 const calls=[];const q={select(){return this;},eq(k,v){calls.push([k,v]);return this;},then(ok){return Promise.resolve({data:[{note:'Retained',clue:'Indice'}]}).then(ok);},async upsert(value,options){calls.push(value,options);return {error:null};}};
 const client={from(table){assert.equal(table,'love_eclat_private_notes');return q;}};
 assert.equal((await loadEclatNote(client,status,'a')).note,'Retained');
 assert.deepEqual(calls,[['user_id','a'],['session_id','s'],['chapter_index',1]]);
 await saveEclatNote(client,status,'a',{note:'Private',clue:'Indice',moment_done:true});
 assert.deepEqual(calls[3],{session_id:'s',chapter_index:1,user_id:'a',note:'Private',clue:'Indice',moment_done:true});
 await assert.rejects(saveEclatNote(client,status,'a',{note:'a'.repeat(2001)}));
 const failing={from(){return {select(){return this;},eq(){return this;},then(ok){return Promise.resolve({error:new Error('Read failed')}).then(ok);}};}};
 await assert.rejects(loadEclatNote(failing,status,'a'),/Read failed/);
});
