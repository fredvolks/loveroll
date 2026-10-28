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
});
