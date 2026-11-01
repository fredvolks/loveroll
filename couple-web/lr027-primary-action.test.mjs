// LR-027: do not manufacture unavailable roll actions or hide refusal/draw access.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml} from './premium-evening.mjs';

const members=[{user_id:'a',name:'Alice'},{user_id:'b',name:'Bob'}];
const base={session:{id:'current'},members,me:'a',status:{both_ready:true,my_rolled:true,partner_rolled:true},
 turn:{ready:true,next:'a',remaining:{a:2,b:2},targets:{a:2,b:2},completed:{a:0,b:0}},
 ownChallengeCount:2,category:'SENSUEL'};
const view=overrides=>premiumEveningHtml({...base,...overrides});
const dominant=html=>(html.match(/<button[^>]*class="evening-primary"[^>]*>/g)||[]);
const status=html=>html.match(/<p class="evening-primary-status" role="status">([^<]+)<\/p>/)?.[1]||null;

test('only the current player can see the dominant official D100 action',()=>{
 const own=view();
 assert.equal(dominant(own).length,1);
 assert.match(dominant(own)[0],/data-action="new-challenge"/);
 assert.match(own,/Brasser le D100/);
 const waiting=view({turn:{...base.turn,next:'b'}});
 assert.equal(dominant(waiting).length,0);
 assert.equal(status(waiting),'En attente du tour de ton partenaire');
 assert.doesNotMatch(waiting,/data-action="new-challenge"/);
 assert.match(waiting,/data-action="evening-list"/,'Browsing personal cards remains available');
});

test('before both personal D6, status is text not an unavailable primary button',()=>{
 const wait=view({status:{both_ready:false,my_rolled:true,partner_rolled:false},turn:{ready:false}});
 assert.equal(status(wait),'En attente du D6 de ton partenaire');
 assert.equal(dominant(wait).length,0);
 assert.doesNotMatch(wait,/data-action="new-challenge"/);
 assert.match(wait,/data-action="evening-list"/);
 const noRoll=view({status:{both_ready:false,my_rolled:false,partner_rolled:true},turn:{ready:false}});
 assert.equal(status(noRoll),'Lance ton D6 pour continuer');
 assert.match(noRoll,/data-action="my-d6"/);
});

test('when draws are complete, viewing own challenges becomes the one main action',()=>{
 const done=view({turn:{...base.turn,drawsFinished:true}});
 assert.equal(dominant(done).length,1);
 assert.match(dominant(done)[0],/data-action="evening-list"/);
 assert.equal((done.match(/data-action="evening-list"/g)||[]).length,1);
 assert.doesNotMatch(done,/data-action="new-challenge"/);
 const empty=view({turn:{...base.turn,drawsFinished:true},ownChallengeCount:0});
 assert.equal(dominant(empty).length,0);
 assert.equal(status(empty),'Tous les tirages sont terminés');
 const finale=view({turn:{...base.turn,finished:true,drawsFinished:true}});
 assert.equal(dominant(finale).length,1);
 assert.match(dominant(finale)[0],/data-action="finish-session"/);
});

test('actual dice animation never offers a second trigger and stays accessible',()=>{
 const rolling=view({rolling:true,rollingKind:'new-challenge'});
 assert.equal(dominant(rolling).length,0);
 assert.equal(status(rolling),'Brassage en cours…');
 assert.doesNotMatch(rolling,/data-action="new-challenge"/);
 const css=readFileSync(new URL('./evening-editorial.css',import.meta.url),'utf8');
 assert.match(css,/\.evening-primary-status\{display:grid/);
 assert.match(css,/\.evening-roll-actions:has\(> :only-child\)/);
 const mobile=readFileSync(new URL('./evening-d100-template.mjs',import.meta.url),'utf8');
 assert.match(mobile,/if\(roll\.matches\('button'\)\)/,'Waiting statuses must not receive button controls');
 assert.match(mobile,/if\(!button\|\|button===roll\)continue/,'The main View cards button must not be duplicated on mobile');
});

test('personal D6 trigger is a real button only before the roll',()=>{
 const unrolled=view({status:{both_ready:false,my_rolled:false,partner_rolled:false},
  turn:{ready:false},rolls:[]});
 assert.equal((unrolled.match(/data-action="my-d6"/g)||[]).length,1);
 assert.match(unrolled,/<button[^>]*class="evening-small-roll"[^>]*data-action="my-d6"[^>]*>🎲 Brasser mon D6<\/button>/);
 const confirmed=view({status:{both_ready:false,my_rolled:true,partner_rolled:false},
  turn:{ready:false},rolls:[{user_id:'a',face:4}]});
 assert.doesNotMatch(confirmed,/data-action="my-d6"/,
  'An already confirmed personal roll is not displayed as a disabled fake action');
 assert.match(confirmed,/<p class="evening-primary-status evening-d6-status" role="status">✓ Lancer enregistré<\/p>/);
 assert.equal(dominant(confirmed).length,0);
 const spinning=view({status:{both_ready:false,my_rolled:false,partner_rolled:false},
  turn:{ready:false},rolls:[],rolling:true,rollingKind:'my-d6',rollFace:3});
 assert.doesNotMatch(spinning,/data-action="my-d6"/);
 assert.match(spinning,/<p class="evening-primary-status evening-d6-status" role="status">Brassage en cours…<\/p>/);
 const syncing=view({status:{both_ready:false,my_rolled:true,partner_rolled:false},
  turn:{ready:false},rolls:[]});
 assert.doesNotMatch(syncing,/data-action="my-d6"/);
 assert.match(syncing,/Vérification du lancer…/);
});

test('official personal D6 row blocks a second roll even when status is stale',()=>{
 const stale=view({
  status:{both_ready:false,my_rolled:false,partner_rolled:false},
  turn:{ready:false},rolls:[{user_id:'a',face:3}]
 });
 assert.doesNotMatch(stale,/data-action="my-d6"/,
  'A lagging status RPC must not permit rerolling a confirmed D6');
 assert.match(stale,/evening-d6-status" role="status">✓ Lancer enregistré/);
 assert.equal(status(stale),'En attente du D6 de ton partenaire');
 assert.match(stale,/Ton lancer est enregistré. Attends ton partenaire/);
 assert.match(stale,/data-dice-sides="6" data-face="3"/);
 const partnerAlreadyRolled=view({
  status:{both_ready:false,my_rolled:false,partner_rolled:false},
  turn:{ready:false},rolls:[{user_id:'b',face:5}]
 });
 assert.match(partnerAlreadyRolled,/data-action="my-d6"/,
  'The other person rolling must never disable my D6');
 assert.match(partnerAlreadyRolled,/Le résultat de Bob est prêt/);
 assert.equal(status(partnerAlreadyRolled),'Lance ton D6 pour continuer');
 const invalid=view({
  status:{both_ready:false,my_rolled:false,partner_rolled:false},
  turn:{ready:false},rolls:[{user_id:'a',face:0}]
 });
 assert.match(invalid,/data-action="my-d6"/,
  'An invalid placeholder is not a server-confirmed roll');
});
