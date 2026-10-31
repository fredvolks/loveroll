import test from 'node:test';
import assert from 'node:assert/strict';
import {eclatHtml} from './eclat-ui.mjs';

test('LR-026: revoked duo sees guidance instead of private coffret or paywall',()=>{
 const html=eclatHtml({
  coupleReady:false,
  status:{access:true,active:true,coffret_id:1,chapter_number:1,variant_number:0},
  selected:2,music:true,details:true,browse:false,
  finished:'former couple private title',
  history:[{coffret_id:1,note:'former private memory'}],
  noteState:{note:'hidden personal note'},
  userId:'alice',members:[{id:'alice'}]
 });
 assert.match(html,/Votre duo n’est pas prêt/);
 assert.match(html,/deux partenaires associés/);
 assert.match(html,/data-action="tab:session"/);
 assert.doesNotMatch(html,/former couple private title|former private memory|hidden personal note/);
 assert.doesNotMatch(html,/eclat:music|eclat:start:|eclat:choose:/);
 assert.doesNotMatch(html,/999|forfait|abonnement|\/mois/i,
  'missing couple membership is not a subscription problem');
});

test('LR-026: normal incomplete subscription still shows regular Éclat offer with an associated duo',()=>{
 const html=eclatHtml({coupleReady:true,status:null});
 assert.match(html,/ÉCLAT PREMIUM/);
 assert.match(html,/L’activation et le paiement en ligne ne sont pas encore disponibles/);
 assert.doesNotMatch(html,/Votre duo n’est pas prêt/);
});
