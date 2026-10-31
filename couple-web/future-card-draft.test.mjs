import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_FUTURE_DRAFT_CARDS,canEditFutureDraft,upsertFutureDraftCard,
 removeFutureDraftCard} from './future-card-draft.mjs';

const make=(id='soft-001')=>({
 id,levels:['soft'],target:'both',minutes:3,title:'Défi original',
 description:'Une consigne originale et complète pour les deux partenaires.'
});
test('create/edit/delete local cards without modifying the previous deck',()=>{
 const one=upsertFutureDraftCard([],{...make(),levels:['soft','medium']});
 const two=upsertFutureDraftCard(one,{...make('medium-002'),minutes:'5',
  target:'woman',levels:['medium','intense']});
 assert.equal(one.length,1);assert.equal(two.length,2);
 assert.equal(two[1].minutes,5);
 const updated=upsertFutureDraftCard(two,{...make('medium-002'),
  title:'Deuxième défi complètement révisé'},'medium-002');
 assert.equal(updated.length,2);
 assert.equal(updated[1].title,'Deuxième défi complètement révisé');
 assert.equal(two[1].title,'Défi original');
 const removed=removeFutureDraftCard(updated,'soft-001');
 assert.deepEqual(removed.map(c=>c.id),['medium-002']);
 assert.equal(one[0].levels.length,2);
});
test('reject duplicate IDs, HTML injection and unusable metadata',()=>{
 const initial=[make()];
 const invalid=[
  {...make('soft-001')},{...make('<img>')},{...make('other'),title:'ab'},
  {...make('other'),description:'trop court'},
  {...make('other'),levels:['soft','soft']},
  {...make('other'),levels:['other']},
  {...make('other'),target:'invalid'},
  {...make('other'),minutes:'3.5'},
  {...make('other'),minutes:7},
  {...make('other'),description:'Texte <script>alert(1)</script>'}
 ];
 for(const card of invalid)assert.throws(()=>upsertFutureDraftCard(initial,card));
 assert.equal(initial.length,1);
 assert.equal(canEditFutureDraft([make('x'),make('x')]),false);
 assert.equal(canEditFutureDraft([null]),false);
 assert.equal(canEditFutureDraft({}),false);
 assert.equal(MAX_FUTURE_DRAFT_CARDS,1000);
 assert.throws(()=>upsertFutureDraftCard(initial,make('x'),'missing'));
 assert.throws(()=>removeFutureDraftCard(initial,'missing'));
});
test('allow legitimate multi-level reuse without duplicating content',()=>{
 const cards=upsertFutureDraftCard([],{...make(),levels:['soft','intense']});
 assert.deepEqual(cards[0].levels,['soft','intense']);
 assert.notEqual(cards[0].levels,make().levels);
 assert.equal(canEditFutureDraft(cards),true);
});
