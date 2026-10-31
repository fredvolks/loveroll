import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 readSessionLength,saveSessionLength,sessionLengthChooserHtml,sessionLengthSettingsHtml
} from './session-duration-preference.mjs';

const memory=()=>{
 const values=new Map();
 return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
};
test('The 5/10/15/30/free planner persists separately for each account',()=>{
 const store=memory();
 assert.equal(readSessionLength('fred',store),'libre');
 assert.equal(saveSessionLength('fred','15',store),true);
 assert.equal(readSessionLength('fred',store),'15');
 assert.equal(readSessionLength('emilie',store),'libre');
 assert.equal(saveSessionLength('emilie','5',store),true);
 assert.equal(readSessionLength('emilie',store),'5');
 assert.equal(readSessionLength('fred',store),'15');
 assert.equal(store.values.get('loveroll-session-length:fred'),'15');
 assert.equal(saveSessionLength('', '30',store),false);
 assert.equal(saveSessionLength('fred','120',store),false);
 assert.equal(readSessionLength('',store),'libre');
});
test('Safari denied storage retains temporary preference without mixing accounts',()=>{
 const noAccess=Object.defineProperty({},'localStorage',{
  get(){throw Error('SecurityError');}
 });
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){return noAccess.localStorage;}});
  assert.equal(saveSessionLength('safari-alice','10'),true);
  assert.equal(readSessionLength('safari-alice'),'10');
  assert.equal(readSessionLength('safari-bob'),'libre');
  assert.equal(saveSessionLength('safari-bob','30'),true);
  assert.equal(readSessionLength('safari-bob'),'30');
 }finally{
  if(original)Object.defineProperty(globalThis,'localStorage',original);
  else delete globalThis.localStorage;
 }
 // A later successful persistent write ends the ephemeral fallback.
 const store=memory();
 assert.equal(saveSessionLength('safari-alice','5',store),true);
 assert.equal(readSessionLength('safari-alice',store),'5');
 assert.equal(store.values.get('loveroll-session-length:safari-alice'),'5');
});
test('The selected duration is visible in the compact pre-session picker and settings',()=>{
 const choice=sessionLengthChooserHtml('15');
 assert.match(choice,/<option value="15" selected>15 min<\/option>/);
 assert.match(choice,/data-session-length-select="true"/);
 const settings=sessionLengthSettingsHtml('30');
 assert.match(settings,/data-action="session-length:30" aria-pressed="true"/);
 assert.match(settings,/sinon pour cette visite seulement/);
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/saveSessionLength\(state\.user\.id,parts\[0\]\)/);
 assert.match(app,/sessionLength:readSessionLength\(uid\)/);
});
