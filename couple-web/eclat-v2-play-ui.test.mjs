import test from 'node:test';
import assert from 'node:assert/strict';
import {renderEclatV2PlayA} from './eclat-v2-play-ui.mjs';
import {eclatV2Plan} from './eclat-v2-contract.mjs';
const aid='11111111-1111-4111-8111-111111111111';
const bid='22222222-2222-4222-8222-222222222222';
const status=(id,variant,minutes,scene,extra={})=>{
 const plan=eclatV2Plan(id,minutes,variant),n=plan.findIndex(x=>x.sceneNumber===scene)+1;
 return {access:true,active:true,content_version:2,coffret_id:id,variant,minutes,
 role_a:aid,role_b:bid,device_mode:'two',chapter_number:scene,chapter_index:n,
 chapter_total:plan.length,budget_minutes:plan[n-1].budgetMinutes,
 state:'active',skipped_scenes:[],revealed:false,can_reveal:false,my_ready:false,...extra};
};
test('Premium scene view renders all four game variants and duration routes',()=>{
 for(let id=1;id<=4;id++)for(let v=0;v<2;v++)for(let minutes of [30,60,90]){
  for(let scene of eclatV2Plan(id,minutes,v)){
   const markup=renderEclatV2PlayA({status:status(id,v,minutes,scene.sceneNumber),viewerId:aid});
   assert.match(markup,/Étape \d+ sur \d+/);
   assert.match(markup,/eclat-v2-instruction/);
   assert.match(markup,/data-eclat-v2-action="act:pause"/);
   assert.match(markup,/data-eclat-v2-action="act:pass"/);
  }
 }
});
test('Secret mission B cannot appear in A DOM (and vice versa)',()=>{
 const s=status(2,0,30,1);
 const a=renderEclatV2PlayA({status:s,viewerId:aid});
 const b=renderEclatV2PlayA({status:s,viewerId:bid});
 assert.match(a,/soleil/);assert.doesNotMatch(a,/« lune »/);
 assert.match(b,/« lune »/);assert.doesNotMatch(b,/« soleil »/);
 assert.doesNotMatch(a,/data-eclat-v2-action="act:continue"/);
 assert.match(a,/Prêt à révéler/);
 const unlocked=renderEclatV2PlayA({status:{...s,can_reveal:true},viewerId:aid});
 assert.match(unlocked,/Révéler les missions ensemble/);
});
test('One device starts with an opaque cover and never impersonates B',()=>{
 const s=status(2,1,30,1,{device_mode:'one'});
 const hidden=renderEclatV2PlayA({status:s,viewerId:aid});
 assert.match(hidden,/Passer le téléphone/);
 assert.doesNotMatch(hidden,/cinéma|musique/);
 const onA=renderEclatV2PlayA({status:s,viewerId:aid,localRole:'A',seenRoles:['A']});
 assert.doesNotMatch(onA,/tous les deux d’accord pour révéler/);
 const onB=renderEclatV2PlayA({status:s,viewerId:aid,localRole:'B',seenRoles:['A','B']});
 assert.match(onB,/tous les deux d’accord pour révéler/);
 assert.match(onB,/Masquer et passer le téléphone/);
});
test('Branch voting cannot progress before explicit joint agreement',()=>{
 const s=status(4,0,30,1);
 const notReady=renderEclatV2PlayA({status:s,viewerId:aid});
 assert.match(notReady,/data-eclat-v2-action="door:Tendresse"/);
 assert.doesNotMatch(notReady,/data-eclat-v2-action="act:continue"/);
 const ready=renderEclatV2PlayA({status:{...s,door_confirmed:true,branch:'Jeu'},viewerId:aid});
 assert.match(ready,/data-eclat-v2-action="act:continue"/);
 const notResolved=renderEclatV2PlayA({status:status(4,1,30,3),viewerId:aid});
 assert.match(notResolved,/choix commun de la porte est requis/);
 assert.doesNotMatch(notResolved,/data-eclat-v2-action="act:continue"/);
});
test('No contact implied or score in sensory and paused screen',()=>{
 const sensory=renderEclatV2PlayA({status:status(3,0,30,6),viewerId:aid});
 assert.match(sensory,/Contact seulement après un Oui explicite des deux/);
 assert.match(sensory,/alternative sans contact/);
 assert.doesNotMatch(sensory,/score de compatibilité|Vous avez gagné/);
 const paused=renderEclatV2PlayA({status:status(1,0,30,1,{state:'paused'}),viewerId:aid});
 assert.match(paused,/Reprendre notre coffret/);
 assert.doesNotMatch(paused,/data-eclat-v2-action="act:pass"/);
});

test('Optional massage asks explicit contact consent and supports withdrawal',()=>{
 const before=renderEclatV2PlayA({status:status(3,0,30,6,{contact_approved:false}),viewerId:aid});
 assert.match(before,/data-eclat-v2-action="contact:yes"/);
 assert.match(before,/data-eclat-v2-action="contact:other"/);
 assert.match(before,/data-eclat-v2-action="contact:pass"/);
 const agreed=renderEclatV2PlayA({status:status(3,0,30,6,{contact_approved:true}),viewerId:aid});
 assert.match(agreed,/Retirer mon Oui/);
 assert.doesNotMatch(agreed,/data-eclat-v2-action="contact:yes"/);
});

test('Only controller A can advance after common oral agreement',()=>{
 const s=status(3,0,30,3);
 const a=renderEclatV2PlayA({status:s,viewerId:aid});
 const b=renderEclatV2PlayA({status:s,viewerId:bid});
 assert.match(a,/data-eclat-v2-action="act:continue"/);
 assert.match(a,/après notre accord/);
 assert.doesNotMatch(b,/data-eclat-v2-action="act:continue"/);
 assert.match(b,/accord oral/);
});

test('05–08 stage UX reflects approved content; Q predictions stay private until saved',()=>{
 const reunion=renderEclatV2PlayA({status:status(5,0,30,3),viewerId:aid});
 assert.match(reunion,/Question A/);assert.match(reunion,/Question B/);
 const evidence=renderEclatV2PlayA({status:status(6,0,30,1),viewerId:aid});
 assert.match(evidence,/DOSSIER A/);assert.doesNotMatch(evidence,/avec une horloge/);
 const other=renderEclatV2PlayA({status:status(6,0,30,1),viewerId:bid});
 assert.match(other,/DOSSIER B/);assert.doesNotMatch(other,/contient le chiffre 4/);
 const q=renderEclatV2PlayA({status:status(7,0,30,1),viewerId:aid});
 assert.match(q,/data-eclat-v2-action="answer:0"/);
 assert.match(q,/data-eclat-v2-action="prediction:0"/);
 assert.doesNotMatch(q,/data-eclat-v2-action="ready:true"/);
 const withDraft=renderEclatV2PlayA({status:status(7,0,30,1),viewerId:aid,
  predictionDraft:{answer:0,prediction:1}});
 assert.match(withDraft,/data-eclat-v2-action="save-prediction"/);
 const saved=renderEclatV2PlayA({status:status(7,0,30,1,{my_answer:0,my_prediction:1}),viewerId:aid});
 assert.match(saved,/data-eclat-v2-action="ready:true"/);
 const music=renderEclatV2PlayA({status:status(8,1,30,1),viewerId:aid});
 assert.match(music,/Thème 1/);assert.doesNotMatch(music,/<audio|<iframe/);
});
