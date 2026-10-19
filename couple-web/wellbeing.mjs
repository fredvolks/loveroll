// LoveRoll: advice without pressure, based on private optional self-assessment.
export const RELATIONSHIP_OPTIONS=[
 ['great','Très bien, on se sent proches'],
 ['good','Bien, mais on manque de temps'],
 ['distant','On se sent un peu éloignés'],
 ['difficult','C’est difficile actuellement'],
 ['skip','Je préfère ne pas répondre']
];
export const INTIMACY_OPTIONS=[
 ['fulfilled','Épanouissante'],
 ['improve','Bien, mais on aimerait raviver la complicité'],
 ['different','Nos envies ou rythmes sont différents'],
 ['infrequent','On a peu de moments intimes'],
 ['sensitive','Sujet sensible, on veut y aller doucement'],
 ['skip','Je préfère ne pas répondre']
];
export const EVENING_GUIDANCE={
 gentle:{heading:'Retrouver un espace rassurant',ideas:[
  ['Une promenade pour parler','Chacun exprime ses besoins, sans obligation de trouver une solution immédiate.'],
  ['Un rendez-vous sans attente','Prenez un moment calme, chacun choisit la proximité qui lui convient.'],
  ['Un souvenir heureux','Partagez un bon souvenir et une petite attention que vous appréciez.']]},
 reconnect:{heading:'Retrouver la complicité',ideas:[
  ['30 minutes sans écran','Un moment pour discuter et se redécouvrir.'],
  ['Deux envies chacun','Échangez librement vos préférences et choisissez ensemble.'],
  ['Petite surprise','Préparez une attention simple sans attente en retour.']]},
 quality:{heading:'Se donner du temps',ideas:[
  ['Un rendez-vous planifié','Bloquez un petit moment pour vous deux.'],
  ['Rejouer votre premier rendez-vous','Retrouvez un souvenir que vous aimez.'],
  ['Une nouvelle activité','Choisissez ensemble une idée qui tente les deux.']]},
 playful:{heading:'Cultiver votre complicité',ideas:[
  ['Une soirée surprise','Une sortie ou une activité choisie à deux.'],
  ['Trois idées chacun','Comparez vos envies, sans obligation de les réaliser.'],
  ['La soirée à votre rythme','Choisissez librement vos défis ou une activité douce.']]}
};
export function guidanceFor(relationship,intimacy){
 if(relationship==='difficult'||intimacy==='sensitive')return 'gentle';
 if(relationship==='distant'||['different','infrequent'].includes(intimacy))return 'reconnect';
 if(relationship==='good'||intimacy==='improve')return 'quality';
 return 'playful';
}
export function guidedIdeas(tier){return EVENING_GUIDANCE[tier]||EVENING_GUIDANCE.gentle;}
