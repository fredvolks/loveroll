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

test('Saved answers may be changed and previous Q2 uses its own answer labels after Q3 opens',()=>{
 const s=status(7,0,90,3,{substep_index:2,
  my_answer:0,my_prediction:1,
  reveal_answers:{question:2,players:{
   A:{answer:2,prediction:0},B:{answer:0,prediction:2}}}});
 const display=renderEclatV2PlayA({status:s,viewerId:aid});
 assert.match(display,/Découverte de la question 2/);
 assert.match(display,/data-eclat-v2-action="answer:0"/);
 const changed=renderEclatV2PlayA({status:s,viewerId:aid,
  predictionDraft:{answer:1,prediction:1}});
 assert.match(changed,/Enregistrer mes modifications/);
 const clue=renderEclatV2PlayA({status:status(6,1,30,3),viewerId:aid});
 assert.match(clue,/DOSSIER A/);
 assert.doesNotMatch(clue,/près d’un banc/);
});

test('06 puzzle requires server verification or voluntary second-level hint before continue',()=>{
 const s=status(6,0,30,3,{puzzle_solved:false,puzzle_hint_level:0});
 const p=renderEclatV2PlayA({status:s,viewerId:aid});
 assert.match(p,/data-eclat-v2-action="puzzle-place:Verrière"/);
 assert.match(p,/data-eclat-v2-action="puzzle-time:21 h 30"/);
 assert.match(p,/data-eclat-v2-action="puzzle-help"/);
 assert.doesNotMatch(p,/data-eclat-v2-action="act:continue"/);
 assert.doesNotMatch(p,/Solution révélée/);
 const ready=renderEclatV2PlayA({status:s,viewerId:aid,
  puzzleDraft:{place:'Verrière',time:'21 h 30',code:null}});
 assert.match(ready,/data-eclat-v2-action="puzzle-submit"/);
 const h=renderEclatV2PlayA({status:{...s,puzzle_hint_level:2},viewerId:aid});
 assert.match(h,/Solution révélée/);
 assert.match(h,/data-eclat-v2-action="act:continue"/);
 const c=renderEclatV2PlayA({status:status(6,1,30,6,{puzzle_solved:false,puzzle_hint_level:0}),viewerId:aid});
 assert.match(c,/data-eclat-v2-action="puzzle-code:562"/);
});


test('07 shared-phone: both roles choose privately before a joint reveal',()=>{
 const s=status(7,0,30,1,{device_mode:'one'});
 const answers={A:{answer:0,prediction:1},B:{answer:1,prediction:0}};
 const hidden=renderEclatV2PlayA({status:s,viewerId:aid,
  sharedAnswers:answers,sharedConfirmed:['A','B']});
 assert.match(hidden,/Passer le téléphone/);
 assert.doesNotMatch(hidden,/Comme tu l’imaginais|Une découverte/);
 const before=renderEclatV2PlayA({status:s,viewerId:aid,localRole:'A',
  sharedAnswers:answers,sharedConfirmed:['A']});
 assert.doesNotMatch(before,/data-eclat-v2-action="reveal-oral"/);
 const approved=renderEclatV2PlayA({status:s,viewerId:aid,localRole:'A',
  sharedAnswers:answers,sharedConfirmed:['A','B']});
 assert.match(approved,/data-eclat-v2-action="reveal-oral"/);
 assert.doesNotMatch(approved,/Comme tu l’imaginais/);
 const shown=renderEclatV2PlayA({status:{...s,revealed:true},viewerId:aid,localRole:'A',
  sharedReveal:{question:1,options:['Marcher','Écouter de la musique','Jouer'],players:answers}});
 assert.match(shown,/Comme tu l’imaginais/);
 assert.match(shown,/Question 1/);
});

test('05 attention turn: distinct proposal and reply roles and voluntary opt-out',()=>{
 const s=status(5,0,30,6,{substep_index:1,attention_index:null,attention_response:null});
 const a=renderEclatV2PlayA({status:s,viewerId:aid});
 const b=renderEclatV2PlayA({status:s,viewerId:bid});
 assert.match(a,/data-eclat-v2-action="attention-propose:0"/);
 assert.doesNotMatch(b,/data-eclat-v2-action="attention-propose:0"/);
 assert.doesNotMatch(a,/data-eclat-v2-action="act:continue"/);
 const proposed={...s,attention_index:2,attention_response:null};
 const toB=renderEclatV2PlayA({status:proposed,viewerId:bid});
 assert.match(toB,/data-eclat-v2-action="attention-reply:yes"/);
 assert.match(toB,/data-eclat-v2-action="attention-reply:other"/);
 assert.match(toB,/data-eclat-v2-action="attention-reply:pass"/);
 assert.doesNotMatch(toB,/data-eclat-v2-action="act:continue"/);
 const alternative=renderEclatV2PlayA({status:{...proposed,attention_response:'other'},viewerId:aid});
 assert.match(alternative,/Une autre proposition a été demandée/);
 assert.match(alternative,/data-eclat-v2-action="attention-propose:1"/);
 const passed=renderEclatV2PlayA({status:{...proposed,attention_response:'pass'},viewerId:aid});
 assert.match(passed,/data-eclat-v2-action="act:continue"/);
 const second=renderEclatV2PlayA({status:{...s,substep_index:2},viewerId:bid});
 assert.match(second,/Au tour de B de proposer/);
 assert.match(second,/data-eclat-v2-action="attention-propose:2"/);
});
test('05 shared phone attention uses A/B screens, no fake impersonation',()=>{
 const s=status(5,1,30,6,{device_mode:'one',attention_index:1});
 const hidden=renderEclatV2PlayA({status:s,viewerId:aid});
 assert.doesNotMatch(hidden,/data-eclat-v2-action="attention-reply:yes"/);
 const b=renderEclatV2PlayA({status:s,viewerId:aid,localRole:'B'});
 assert.match(b,/data-eclat-v2-action="attention-reply:yes"/);
 assert.match(b,/aucune session de B n’est simulée/);
});

test('08 note UI is private by default with author-triggered reveal only',()=>{
 const s=status(8,0,30,1,{my_music_note:{title:'Chanson privée',artist:'',revealed:false},
   revealed_music:[],music_theme:1});
 const mine=renderEclatV2PlayA({status:s,viewerId:aid});
 assert.match(mine,/Chanson privée/);
 assert.match(mine,/data-eclat-v2-action="music-reveal"/);
 assert.match(mine,/data-eclat-v2-action="music-save"/);
 const partner=renderEclatV2PlayA({status:{...s,my_music_note:null},viewerId:bid});
 assert.doesNotMatch(partner,/Chanson privée/);
 const revealed=renderEclatV2PlayA({status:{...s,my_music_note:{title:'Chanson privée',revealed:true},
   revealed_music:[{theme:1,owner:aid,title:'Chanson privée',artist:''}]},viewerId:aid});
 assert.match(revealed,/Titres déjà révélés/);
 assert.doesNotMatch(revealed,/data-eclat-v2-action="music-save"/);
 assert.doesNotMatch(revealed,/<audio|<iframe/);
});
test('08 shared phone note is local and never claims to be B auth',()=>{
 const s=status(8,1,30,1,{device_mode:'one',music_theme:1});
 const hidden=renderEclatV2PlayA({status:s,viewerId:aid,
   sharedMusicNotes:{'B:1':{title:'Titre B',artist:''}}});
 assert.doesNotMatch(hidden,/Titre B/);
 const a=renderEclatV2PlayA({status:s,viewerId:aid,localRole:'A',
   sharedMusicNotes:{'B:1':{title:'Titre B',artist:''}}});
 assert.doesNotMatch(a,/Titre B/);
 const b=renderEclatV2PlayA({status:s,viewerId:aid,localRole:'B',
   sharedMusicNotes:{'B:1':{title:'Titre B',artist:''}}});
 assert.match(b,/Titre B/);
 assert.match(b,/data-eclat-v2-action="music-reveal"/);
});

test('12 reads persisted server dice and offers consented constraint-only reroll',()=>{
 const sample=status(12,0,30,1,{
  story_dice:{decor:2,roles:3,constraint:4},constraint_rerolls:0,
  constraint_enabled:true,story_decision_confirmed:false
 });
 const pending=renderEclatV2PlayA({status:sample,viewerId:aid});
 assert.match(pending,/data-eclat-v2-action="story-vote:reroll"/);
 assert.match(pending,/data-eclat-v2-action="story-vote:keep"/);
 assert.doesNotMatch(pending,/data-eclat-v2-action="story-vote:off"/);
 assert.doesNotMatch(pending,/data-eclat-v2-action="act:continue"/);
 assert.match(pending,/Décor \(2\)/);
 const confirmed=renderEclatV2PlayA({status:{...sample,story_decision_confirmed:true},viewerId:aid});
 assert.match(confirmed,/data-eclat-v2-action="act:continue"/);
 const long=status(12,1,90,6,{
  story_dice:{decor:1,roles:5,constraint:6},constraint_rerolls:3,
  constraint_enabled:false,story_decision_confirmed:true
 });
 const stage6=renderEclatV2PlayA({status:long,viewerId:aid});
 assert.match(stage6,/data-eclat-v2-action="story-vote:off"/);
 assert.match(stage6,/Sans contrainte/);
 const absent=renderEclatV2PlayA({status:status(12,1,30,1),viewerId:aid});
 assert.match(absent,/Aucun résultat local n’est créé/);
});

test('09 two-phone selections stay private until both confirmed',()=>{
 const waiting=status(9,0,30,1,{my_cards_ready:false,my_cards:[],common_cards:null});
 const before=renderEclatV2PlayA({status:waiting,viewerId:aid,cardDraft:[1,7]});
 assert.match(before,/data-eclat-v2-action="wish-toggle:1"/);
 assert.match(before,/data-eclat-v2-action="wish-confirm"/);
 assert.doesNotMatch(before,/data-eclat-v2-action="act:continue"/);
 const b=renderEclatV2PlayA({status:{...waiting,my_cards:[]},viewerId:bid});
 assert.doesNotMatch(b,/Sélection validée/);
 const aReady=renderEclatV2PlayA({status:{...waiting,my_cards:[1,7],my_cards_ready:true},viewerId:aid});
 assert.match(aReady,/Sélection validée/);
 assert.doesNotMatch(aReady,/data-eclat-v2-action="wish-toggle:1"/);
 const joint=renderEclatV2PlayA({status:{...waiting,common_cards:[7],revealed:true},viewerId:aid});
 assert.match(joint,/data-eclat-v2-action="act:continue"/);
 const chooser=renderEclatV2PlayA({status:status(9,0,30,3,{common_cards:[7],selected_card:null}),viewerId:aid});
 assert.match(chooser,/data-eclat-v2-action="wish-vote:7"/);
 assert.doesNotMatch(chooser,/data-eclat-v2-action="act:continue"/);
 const selected=renderEclatV2PlayA({status:status(9,0,30,3,{common_cards:[7],selected_card:7}),viewerId:aid});
 assert.match(selected,/Carte retenue ensemble/);
 assert.match(selected,/data-eclat-v2-action="act:continue"/);
});
test('09 shared phone requires two ephemeral choices before joint submission',()=>{
 const s=status(9,1,30,1,{device_mode:'one',common_cards:null});
 const picks={A:[1,4],B:[4]};
 const hidden=renderEclatV2PlayA({status:s,viewerId:aid,
  sharedCardDraft:picks,sharedCardConfirmed:['A','B']});
 assert.doesNotMatch(hidden,/wish-reveal-joint/);
 const onlyOne=renderEclatV2PlayA({status:s,viewerId:aid,localRole:'A',
  sharedCardDraft:picks,sharedCardConfirmed:['A']});
 assert.doesNotMatch(onlyOne,/wish-reveal-joint/);
 const both=renderEclatV2PlayA({status:s,viewerId:aid,localRole:'A',
  sharedCardDraft:picks,sharedCardConfirmed:['A','B']});
 assert.match(both,/data-eclat-v2-action="wish-reveal-joint"/);
});

test('10 clock never auto-finishes and offers explicit timed or untimed rounds',()=>{
 const base=status(10,0,30,1,{timer_mode:null,timer_remaining_seconds:null});
 const choose=renderEclatV2PlayA({status:base,viewerId:aid});
 assert.match(choose,/data-eclat-v2-action="timer-mode:with"/);
 assert.match(choose,/data-eclat-v2-action="timer-mode:without"/);
 assert.doesNotMatch(choose,/data-eclat-v2-action="act:continue"/);
 assert.doesNotMatch(choose,/data-eclat-v2-action="act:pass"/);
 const starting=renderEclatV2PlayA({status:{...base,timer_mode:'with'},viewerId:aid});
 assert.match(starting,/01:30/);
 assert.match(starting,/data-eclat-v2-action="timer-action:start"/);
 const running=renderEclatV2PlayA({status:{...base,timer_mode:'with',timer_running:true,timer_remaining_seconds:63},viewerId:aid});
 assert.match(running,/01:03/);
 assert.match(running,/data-eclat-v2-action="timer-action:pause"/);
 const paused=renderEclatV2PlayA({status:{...base,timer_mode:'with',timer_running:false,timer_remaining_seconds:61},viewerId:aid});
 assert.match(paused,/data-eclat-v2-action="timer-action:resume"/);
 const elapsed=renderEclatV2PlayA({status:{...base,timer_mode:'with',timer_running:true,timer_remaining_seconds:0},viewerId:aid});
 assert.match(elapsed,/Le temps indicatif est écoulé/);
 assert.match(elapsed,/data-eclat-v2-action="timer-action:extend"/);
 const without=renderEclatV2PlayA({status:{...base,timer_mode:'without'},viewerId:aid});
 assert.doesNotMatch(without,/timer-action:start/);
 const two=renderEclatV2PlayA({status:status(10,1,90,4,{timer_mode:'with'}),viewerId:aid});
 assert.match(two,/03:00/);
});

test('11 both distinct partners propose from only three approved cards',()=>{
 const a=status(11,0,30,3,{attention_index:null,attention_response:null});
 const onA=renderEclatV2PlayA({status:a,viewerId:aid});
 const onB=renderEclatV2PlayA({status:a,viewerId:bid});
 assert.match(onA,/data-eclat-v2-action="attention-propose:0"/);
 assert.doesNotMatch(onB,/attention-propose:0/);
 assert.doesNotMatch(onA,/data-eclat-v2-action="act:continue"/);
 const proposed=renderEclatV2PlayA({status:{...a,attention_index:2},viewerId:bid});
 assert.match(proposed,/data-eclat-v2-action="attention-reply:other"/);
 assert.match(proposed,/data-eclat-v2-action="attention-reply:pass"/);
 assert.match(proposed,/contact nécessite un nouvel accord/);
 const accepted=renderEclatV2PlayA({status:{...a,attention_index:2,attention_response:'yes'},viewerId:aid});
 assert.match(accepted,/data-eclat-v2-action="act:continue"/);
 const b=status(11,1,30,6);
 const bPropose=renderEclatV2PlayA({status:b,viewerId:bid});
 assert.match(bPropose,/Tour de B/);
 assert.match(bPropose,/data-eclat-v2-action="attention-propose:2"/);
});
