import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {readEveningIntensity,saveEveningIntensity,eveningIntensityChooserHtml} from './evening-intensity-preference.mjs';
import {premiumEveningHtml} from './premium-evening.mjs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const store=()=>{const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};

test('Nightly intensity planning stays separate per account, with profile style fallback',()=>{
 const storage=store();
 assert.equal(readEveningIntensity('alice','soft',storage),'soft');
 assert.equal(readEveningIntensity('bob','intense',storage),'intense');
 assert.equal(saveEveningIntensity('alice','intense',storage),true);
 assert.equal(readEveningIntensity('alice','soft',storage),'intense');
 assert.equal(readEveningIntensity('bob','medium',storage),'medium');
 assert.equal(saveEveningIntensity('bob','soft',storage),true);
 assert.equal(readEveningIntensity('bob','intense',storage),'soft');
 assert.equal(readEveningIntensity('alice','soft',storage),'intense');
 assert.equal(saveEveningIntensity('alice','SEXUEL',storage),false);
 assert.equal(saveEveningIntensity('', 'medium',storage),false);
 assert.equal(readEveningIntensity('','soft',storage),'soft');
});
test('Safari blocked localStorage retains this visit without leaking to another user',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('SecurityError');}});
  assert.equal(readEveningIntensity('blocked-alice','medium'),'medium');
  assert.equal(saveEveningIntensity('blocked-alice','soft'),true);
  assert.equal(readEveningIntensity('blocked-alice','intense'),'soft');
  assert.equal(readEveningIntensity('blocked-bob','intense'),'intense');
  assert.equal(saveEveningIntensity('blocked-bob','intense'),true);
  assert.equal(readEveningIntensity('blocked-bob','soft'),'intense');
 }finally{
  if(original)Object.defineProperty(globalThis,'localStorage',original);
  else delete globalThis.localStorage;
 }
 const saved=store();
 assert.equal(saveEveningIntensity('blocked-alice','medium',saved),true);
 assert.equal(readEveningIntensity('blocked-alice','soft',saved),'medium');
});
test('Pre-session screen offers accessible Soft Medium Intense without extra play actions',()=>{
 const html=premiumEveningHtml({
  session:null,me:'alice',members:[{user_id:'alice',name:'Alice'},{user_id:'bob',name:'Bob'}],
  eveningIntensity:'intense',sessionLength:'15',canStartEvening:true
 });
 assert.match(html,/data-evening-intensity-select="true"/);
 assert.match(html,/Intensité souhaitée pour la prochaine soirée/);
 assert.match(html,/<option value="intense" selected>Intense<\/option>/);
 assert.match(html,/<option value="15" selected>15 min<\/option>/);
 const actions=html.match(/<div class="evening-finale-actions">([\s\S]*?)<\/div>/)?.[1];
 assert.equal((actions?.match(/<button\b/g)||[]).length,2);
 assert.match(html,/les tirages actuels ne changent pas/);
 assert.doesNotMatch(premiumEveningHtml({
  session:{id:'live'},me:'alice',members:[{user_id:'alice'},{user_id:'bob'}]
 }),/data-evening-intensity-select="true"/);
});
test('Intensity changes are only allowed before a new soirée, never while a D100 is live',async()=>{
 const app=read('./app.js');
 const start=app.indexOf("if(verb==='evening-intensity'){");
 const end=app.indexOf("if(verb==='timer-mode'){",start);
 assert.ok(start>=0&&end>start);
 const saved=[];
 const state={user:{id:'alice'},profile:{play_style:'medium'},tab:'session',session:null};
 const action=runInNewContext('(async (verb,parts)=>{'+app.slice(start,end)+'})',{
  state,saveEveningIntensity:(id,style)=>{saved.push([id,style]);return true;},
  render:()=>{}
 });
 await action('evening-intensity',['soft']);
 assert.equal(saved.length,1);
 assert.equal(saved[0][0],'alice');
 assert.equal(saved[0][1],'soft');
 state.session={id:'active'};
 await assert.rejects(action('evening-intensity',['intense']),/avant la prochaine soirée/);
 assert.equal(saved.length,1);
 assert.match(app,/authFeedbackGeneration!==intensityGeneration/);
 assert.match(app,/root\.contains\(intensitySelect\)/);
 assert.match(app,/eveningIntensity:readEveningIntensity\(uid,state\.profile\?\.play_style\)/);
 assert.match(read('./service-worker.js'),/\.\/evening-intensity-preference\.mjs/);
});
