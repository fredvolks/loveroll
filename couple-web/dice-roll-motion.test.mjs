import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAST_ROLL_MS,SLOW_ROLL_MS,ROLL_TOTAL_MS,rollProgress,rollAngles,makeForwardRoll,rollOffset} from './dice-roll-motion.mjs';
const diceSource=readFileSync(new URL('./dice3d.js',import.meta.url),'utf8');
const appSource=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const TWO_PI=2*Math.PI;
test('Roll rotates at full velocity for exactly 3 seconds, then gradually decelerates',()=>{
 assert.equal(FAST_ROLL_MS,3000);
 assert.equal(SLOW_ROLL_MS,1500);
 assert.equal(ROLL_TOTAL_MS,4500);
 assert.equal(rollProgress(0),0);
 assert.equal(rollProgress(ROLL_TOTAL_MS),1);
 assert.equal(rollProgress(FAST_ROLL_MS),.8);
 const speed=(t)=> (rollProgress(t+1)-rollProgress(t-1))/2;
 const during=[500,1500,2500].map(speed);
 assert.ok(Math.max(...during)-Math.min(...during)<1e-9,'Fast segment must not slow down');
 assert.ok(Math.abs(speed(FAST_ROLL_MS+1)-speed(FAST_ROLL_MS-1))<2e-8,'No velocity jump at slowdown');
 const sampled=[3050,3300,3700,4100,4450].map(speed);
 for(let i=1;i<sampled.length;i++)assert.ok(sampled[i]<sampled[i-1],'Slowdown must progressively lose speed');
 assert.ok(speed(4499)<speed(3500)/500,'Final motion must naturally come close to rest');
 assert.equal(rollProgress(4700),1);
});
test('All three axes move FORWARD continuously, never reverse or snap at the end',()=>{
 const faceQuaternions=[
  [0.16,-.18,-.02], // D6
  [-.95,.65,.04], // D20
  [.075,-.09,1.19], // D35
 ];
 for(const target of faceQuaternions){
  for(const random of [[.2,.4,.6],[.999,.05,.37],[0,.8,.1]]){
   const path=makeForwardRoll(target,random);
   for(let axis=0;axis<3;axis++){
    assert.ok(path.finish[axis]>path.start[axis]);
    // Endpoint equals the target Euler angle modulo full forward revolutions.
    const n=Math.round((path.finish[axis]-target[axis])/TWO_PI);
    assert.ok(n>=2);
    assert.ok(Math.abs(path.finish[axis]-target[axis]-n*TWO_PI)<1e-11);
   }
   let prior=rollAngles(path,0);
   for(let ms=16;ms<=ROLL_TOTAL_MS+16;ms+=16){
    const next=rollAngles(path,ms);
    for(let i=0;i<3;i++)assert.ok(next[i]>=prior[i]-1e-12,'Reverse direction found');
    prior=next;
   }
   const final=rollAngles(path,ROLL_TOTAL_MS);
   for(let i=0;i<3;i++)assert.ok(Math.abs(final[i]-path.finish[i])<1e-10);
  }
 }
});
test('D100 live reroll starts from the existing visible face and stops exactly on the official value',()=>{
 const original=[.17,-.36,.29],dest=[-.41,.23,-.78];
 const trajectory=makeForwardRoll(dest,[.1,.2,.3,.4,.5,.6,.7,.8,.9],original);
 assert.deepEqual(rollAngles(trajectory,0),original);
 const settled=rollAngles(trajectory,ROLL_TOTAL_MS);
 for(let axis=0;axis<3;axis++){
  assert.ok(Math.abs(Math.sin((settled[axis]-dest[axis])/2))<1e-8);
 }
 const diceSource=readFileSync(new URL('./dice3d.js',import.meta.url),'utf8');
 assert.match(diceSource,/canvas\.loveRollDie=\{rollTo,readState/);
 assert.match(diceSource,/target=selected/);
 assert.match(diceSource,/built\.group\.quaternion\.copy\(target\)/);
});

test('No end-of-roll quaternion interpolation nor result-number overlay',()=>{
 assert.match(diceSource,/rollAngles\(trajectory,elapsed\)/);
 assert.match(diceSource,/built\.group\.quaternion\.setFromEuler\(euler\)/);
 assert.doesNotMatch(diceSource,/orientationAtSettle|settleStart|slerpQuaternions\(orientationAtSettle/);
 assert.doesNotMatch(diceSource,/result-number-overlay|rolling-result-overlay/);
 assert.match(appSource,/import \{ROLL_TOTAL_MS\} from '\.\/dice-roll-motion\.mjs'/);
 assert.equal((appSource.match(/setTimeout\(resolve,window\.matchMedia\?/g)||[]).length,2);
});

test('A fresh random seed produces distinct trajectories without ever changing the official face',()=>{
 const target=[.16,-.18,-.02];
 const seeds=[
  [.23,.14,.82,.03,.87,.44,.29,.51,.73],
  [.67,.85,.09,.91,.17,.69,.98,.11,.34],
  [.19,.32,.78,.59,.38,.12,.41,.73,.23]
 ];
 const trajectories=seeds.map(seed=>makeForwardRoll(target,seed));
 assert.equal(new Set(trajectories.map(x=>JSON.stringify(x))).size,seeds.length);
 assert.ok(trajectories[0].finish.some((v,i)=>v!==trajectories[1].finish[i]));
 for(const t of trajectories){
  for(let a=0;a<3;a++){
   const end=rollAngles(t,ROLL_TOTAL_MS)[a],prior=rollAngles(t,0)[a];
   assert.ok(end>prior);
   for(let ms=1;ms<=ROLL_TOTAL_MS;ms+=12)
    assert.ok(rollAngles(t,ms)[a]+1e-10>=rollAngles(t,ms-12)[a],
     'An axis reversed its movement');
   assert.ok(Math.abs(Math.atan2(Math.sin(end),Math.cos(end))-
     Math.atan2(Math.sin(target[a]),Math.cos(target[a])))<1e-9);
  }
 }
});
test('No numeric fallback behind actual WebGL dice',()=>{
 const home=readFileSync(new URL('./premium-home.mjs',import.meta.url),'utf8');
 const evening=readFileSync(new URL('./premium-evening.mjs',import.meta.url),'utf8');
 const overlay=readFileSync(new URL('./dice-no-overlay.css',import.meta.url),'utf8');
 assert.match(home,/dice-fallback/);
 assert.match(evening,/dice-fallback/);
 assert.doesNotMatch(home,/ready\?weekly.face:'♡'\)\+'<\/strong>'/);
 assert.doesNotMatch(evening,/valid\?esc\(face\):'♡'/);
 assert.match(overlay,/display:none!important;visibility:hidden!important;opacity:0!important/);
 assert.match(diceSource,/Uint32Array\(9\)/);
});

test('Launch and diminishing contacts settle with zero translation and velocity',()=>{
 const path=makeForwardRoll([.1,.2,.3],[.2,.4,.6]);
 assert.deepEqual(rollOffset(path,0),{x:0,y:0,contact:1});
 assert.ok(rollOffset(path,850).y>.2);
 assert.ok(rollOffset(path,2450).y<.11);
 assert.ok(rollOffset(path,3400).y<.04);
 const final=rollOffset(path,ROLL_TOTAL_MS);
 assert.ok(Math.abs(final.x)<1e-12&&final.y===0);
 assert.ok(Math.abs(rollOffset(path,ROLL_TOTAL_MS-1).x)<1e-10);
 for(let t=0;t<=ROLL_TOTAL_MS;t+=16){const pose=rollOffset(path,t);assert.ok(Number.isFinite(pose.x)&&pose.y>=0&&pose.contact>=0&&pose.contact<=1);}
});
test('A failed draw followed by a refresh outage unlocks the interface without another draw',async()=>{
 const source=appSource.slice(appSource.indexOf('async function animateRoll('),appSource.indexOf('\nasync function hashToken('));
 const state={tab:'special',diceStatus:null},tabs=Array.from({length:5},()=>({disabled:false}));
 const root={querySelector:()=>null,querySelectorAll:()=>tabs};let calls=0,renders=0;
 const render=()=>{renders++;for(const tab of tabs)tab.disabled=!!state.diceStatus;};
 const run=new Function('state','root','render','refreshShared','ROLL_TOTAL_MS',source+';return animateRoll;')(
  state,root,render,async()=>{throw Error('Réseau indisponible');},ROLL_TOTAL_MS);
 await assert.rejects(()=>run(async()=>{calls++;throw Error('Tirage non confirmé');},'monthly_activity'),/Réseau indisponible/);
 assert.equal(calls,1);assert.equal(state.diceStatus,null);assert.equal(state.rollAnimationFace,null);
 assert.equal(tabs.some(t=>t.disabled),false);assert.ok(renders>=2);
});
