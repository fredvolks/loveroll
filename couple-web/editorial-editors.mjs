import {editorialPage,editorialRow,editorialIcon,editorButton,timerFields,roleChoice,escapeHtml as esc} from './editorial-ui.mjs?v=20261017-ritual130';
import {editableCardSlots,playableEveningCount,EVENING_CATEGORIES} from './evening-challenges.mjs?v=20261016-restore113';
import {editableMonthlyActivities} from './monthly-activities.mjs?v=20261018-d100151';
import {calendarFromSaved} from './advent-calendar.mjs';
import {jsonToolsPanel} from './json-library-ui.mjs';
import {privateSpecialKey} from './private-special-events.mjs';
const names={SENSUEL:'Sensuel',SEXUEL:'Sexuel'};
const note=text=>'<p class="editorial-note">'+editorialIcon('help')+'<span>'+esc(text)+'</span></p>';
const field=(label,id,value,max=120)=>'<label>'+esc(label)+'<input id="'+id+'" maxlength="'+max+'" value="'+esc(value)+'"></label>';
const area=(label,id,value,max=900)=>'<label>'+esc(label)+'<textarea id="'+id+'" maxlength="'+max+'" rows="4">'+esc(value)+'</textarea></label>';
const importLink=kind=>editorialRow('Importer / exporter JSON','','editor-import:'+kind,'upload');
export function cardLibraryHtml(state){
 const category=state.customCategory,slots=editableCardSlots(category,state.customCards),counts=playableEveningCount(state.customCards);
 const privateSexual=category==='SEXUEL'&&state.couple?.sexual_card_mode==='custom'&&state.personalSexualCardsReady;
 if(state.libraryScreen==='edit'){
  const slot=slots.find(s=>s.cardId===state.customSlot)||slots[0];
  const legacyRole=role=>{
   if(['both','him','her'].includes(role))return role;
   return state.members.find(m=>role==='owner'?m.user_id===state.couple?.owner_user_id:m.user_id!==state.couple?.owner_user_id)?.gender||'both';
  };
  const body='<form class="editorial-form" onsubmit="return false">'+field('Titre','custom-title',slot.title)+area('Consigne','custom-description',slot.description)+
   '<fieldset><legend>Qui peut piger ?</legend>'+roleChoice('custom-drawer',legacyRole(slot.drawerRole))+'</fieldset>'+
   '<fieldset><legend>Qui peut recevoir ?</legend>'+roleChoice('custom-recipient',legacyRole(slot.recipientRole))+'</fieldset>'+
   timerFields('custom',slot.minutes)+editorButton('save-custom-card','Enregistrer')+
   (slot.saved?editorButton('delete-custom-card',privateSexual?'Restaurer la version MEDIUM':slot.isOriginal?'Restaurer l’original':'Vider cet emplacement',true):'')+'</form>'+
   note(privateSexual?
    'Cette carte est réservée à votre duo. Vous modifiez uniquement votre copie personnelle, jamais les cartes MEDIUM des autres couples. Les défis déjà pigés restent inchangés.':
    'Sans minuteur, aucun compte à rebours. Les défis déjà tirés restent inchangés.');
  return editorialPage('Modifier la carte',body,{back:'editor-back',parent:'Mes cartes',subtitle:names[category]+' · Carte '+String(slot.cardId).padStart(2,'0')});
 }
 const body='<div class="editorial-segments">'+EVENING_CATEGORIES.map(c=>'<button type="button" data-action="custom-category:'+c+'" aria-pressed="'+(category===c)+'" class="'+(category===c?'selected':'')+'">'+editorialIcon('heart')+names[c]+'</button>').join('')+'</div>'+
  '<p class="editorial-library-count">'+counts.sensual+' Sensuel · '+counts.sexual+' Sexuel jouables</p>'+
  (privateSexual?'<p class="tiny-note">♡ Vos 100 cartes SEXUEL personnelles, initialement copiées de MEDIUM. Modifiez librement le titre, la consigne, le minuteur et les rôles. Ces cartes ne sont pas partagées avec d’autres couples.</p>':'')+
  '<div class="editorial-library-filters"><label class="editorial-search">'+editorialIcon('search')+'<input id="custom-card-search" data-draft-ignore type="search" aria-label="Rechercher une carte" value="'+esc(state.customSearch||'')+'" placeholder="Titre, mot-clé ou numéro"></label>'+
  '<label class="visually-labelled">Afficher<select id="custom-card-filter" data-draft-ignore><option value="all"'+(state.customFilter!=='edited'&&state.customFilter!=='empty'?' selected':'')+'>Toutes les cartes</option><option value="edited"'+(state.customFilter==='edited'?' selected':'')+'>Cartes personnalisées</option><option value="empty"'+(state.customFilter==='empty'?' selected':'')+'>Emplacements libres</option></select></label></div>'+
  '<div class="editorial-draw-rule"><label class="push-option"><span>'+editorialIcon('sync')+'Éviter les répétitions</span><input id="no-repeat-cards" type="checkbox" role="switch"'+(state.couple?.no_repeat_challenges!==false?' checked':'')+'></label>'+editorButton('save-draw-rule','Enregistrer',true)+'</div>'+
  '<div class="custom-card-tiles editorial-card-list" aria-label="100 emplacements '+names[category]+'">'+slots.map(slot=>
   '<button type="button" class="custom-card-tile" data-action="custom-slot:'+slot.cardId+'" data-card-id="'+slot.cardId+'" data-saved="'+slot.saved+'" data-empty="'+!slot.filled+'" data-keywords="'+esc(slot.description)+'">'+
   '<span class="custom-tile-number">'+String(slot.cardId).padStart(2,'0')+'</span><span class="custom-tile-name">'+esc(slot.title||'Emplacement vide')+'</span><b aria-hidden="true">›</b></button>').join('')+'</div>'+importLink('evening')+
  note('100 emplacements par catégorie. Les emplacements vides sont exclus des tirages. Le cycle anti-répétition se poursuit entre les soirées.');
 return editorialPage('Mes cartes',body,{badge:'Créateur',kind:'list'});
}
export function monthlyEditorHtml(state){
 const items=editableMonthlyActivities(state.monthlyActivities),entry=items.find(x=>x.face===state.monthlySlot)||items[0];
 const body='<form class="editorial-form" onsubmit="return false"><label>Activité à modifier<select data-editor-select="monthly-slot" id="monthly-selection">'+items.map(x=>'<option value="'+x.face+'"'+(x.face===entry.face?' selected':'')+'>'+String(x.face).padStart(3,'0')+' · '+esc(x.title)+'</option>').join('')+'</select></label>'+
  field('Nom de l’activité','monthly-title',entry.title)+area('Description','monthly-description',entry.description)+
  '<p class="editorial-note">'+esc(entry.region)+' · '+esc(entry.location)+' — Budget approximatif pour deux : hiver '+esc(entry.prix_hiver_min)+' à '+esc(entry.prix_hiver_max)+' $; été '+esc(entry.prix_ete_min)+' à '+esc(entry.prix_ete_max)+' $.'+(entry.hotel_inclus?' Nuitée comprise.':'')+'</p>'+timerFields('monthly',entry.timer_minutes)+
  editorButton('save-monthly-activity','Enregistrer l’activité')+(entry.edited?editorButton('reset-monthly-activity','Restaurer l’original',true):'')+'</form>'+importLink('monthly')+
  note('Les tirages déjà obtenus restent conservés.');
 return editorialPage('Activités du mois',body,{subtitle:'Créateur · '+items.length+' activités'});
}
export function adventEditorHtml(state){
 const calendar=calendarFromSaved(state.advent2026Config,state.advent2026Days),day=state.adventEditorDay||1,editing=calendar?.days.find(x=>x.day===day);
 let body='';
 if(editing)body='<form class="editorial-form" onsubmit="return false"><label>Journée à modifier<select data-editor-select="advent-editor-day" id="advent-selection">'+calendar.days.map(x=>'<option value="'+x.day+'"'+(x.day===day?' selected':'')+'>'+x.day+' décembre</option>').join('')+'</select></label>'+
  field('Catégorie','advent-day-type',editing.type,90)+field('Titre','advent-day-title',editing.title,200)+area('Description','advent-day-description',editing.description,1500)+
  timerFields('advent-day',editing.timer_minutes,'Ajouter une minuterie')+editorButton('save-advent-day','Enregistrer cette journée')+'</form>';
 else body='<p>Importez votre calendrier pour préparer et modifier ses 25 journées.</p>';
 return editorialPage('Calendrier de l’Avent',body+importLink('advent')+note('Les surprises déjà ouvertes restent inchangées. Cet éditeur est privé.'),{subtitle:'Créateur · 25 journées · '+(calendar?.year||2026)});
}
export function specialEditorHtml(state,events){
 const current=state.specialEventsConfig,key=state.specialEditorKey;
 const rows=events.map(row=>({...row,catalogueKey:privateSpecialKey(row.key,row.owner,state.couple?.owner_user_id)}));
 const row=rows.find(r=>r.catalogueKey===key),entry=current?.evenements_speciaux?.[key];
 if(row){
  let body='<div class="editorial-form">'+field('Nom de l’événement','editor-event-name',row.title,55)+
   '<label>Date du calendrier<input id="editor-event-date" inputmode="numeric" placeholder="JJ/MM/AAAA" maxlength="10" value="'+esc(row.date?row.date.split('-').reverse().join('/'):'')+'"></label>'+
   editorButton('save-editor-event-date','Enregistrer le nom et la date')+'</div>';
  if(entry){
   const dice=state.specialEditorStage==='D6_modificateur'?'D6_modificateur':'D6_activite',face=state.specialEditorFace||1,minutes=entry.minuteurs?.[dice]?.[face-1];
   body+='<form class="editorial-form editorial-separated" onsubmit="return false"><h3>Préparer les surprises</h3>'+field('Nom du catalogue privé','special-option-name',entry.evenement)+field('Date ou règle de préparation','special-option-date',entry.date,50)+
    '<div class="editorial-segments">'+['D6_activite','D6_modificateur'].map((d,i)=>'<button type="button" data-action="special-editor-stage:'+d+'" class="'+(dice===d?'selected':'')+'" aria-pressed="'+(dice===d)+'">'+(i?'Variantes':'Activités')+'</button>').join('')+'</div>'+
    '<label>Option à modifier<select data-editor-select="special-editor-face" id="special-option-selection">'+Array.from({length:6},(_,i)=>'<option value="'+(i+1)+'"'+(face===i+1?' selected':'')+'>Face '+(i+1)+'</option>').join('')+'</select></label>'+
    area(dice==='D6_activite'?'Activité':'Variante','special-option-description',entry[dice][face-1][face],1000)+timerFields('special-option',minutes)+editorButton('save-special-option','Enregistrer cette option')+'</form>';
  }else body+='<p class="editorial-note">Importez le catalogue pour préparer ses six activités et ses six variantes.</p>';
  if(['mothers_day','fathers_day'].includes(row.key)&&state.members.length===2)body+='<div class="editorial-separated"><h3>Personne concernée</h3><div class="editorial-segments">'+state.members.map(m=>'<button type="button" data-action="set-celebrant:'+row.key+':'+m.user_id+'" class="'+(state.occasionSettings?.celebrants?.[row.key]===m.user_id?'selected':'')+'">'+esc(m.name)+'</button>').join('')+'</div></div>';
  return editorialPage(entry?.evenement||row.title,body+note('Aperçu privé du catalogue. Les activités déjà révélées gardent leur contenu officiel.'),{back:'special-editor-back',parent:'Événements spéciaux',subtitle:'Créateur · préparation privée'});
 }
 const body='<div class="editorial-event-list">'+rows.map(row=>editorialRow(current?.evenements_speciaux?.[row.catalogueKey]?.evenement||row.title,'','special-editor-event:'+row.catalogueKey,row.key==='birthday'?'calendar':'heart')).join('')+'</div>'+
  '<p class="tiny-note">Activités et variantes préparées pour chaque occasion. Aperçu réservé au créateur.</p>'+importLink('special');
 return editorialPage('Événements spéciaux',body,{subtitle:'Créateur · 6 événements · aperçu privé',kind:'short'});
}
export function importEditorHtml(state){
 const kind=state.libraryImportKind,label=kind==='evening'?'Soirée · '+names[state.customCategory]:({monthly:'100 activités du mois',advent:'25 surprises de l’Avent',special:'6 événements spéciaux'}[kind]);
 return editorialPage('Importer / exporter',jsonToolsPanel(kind,label,state.jsonPending),{back:'editor-import-back',parent:({evening:'Mes cartes',monthly:'Activités du mois',advent:'Calendrier de l’Avent',special:'Événements spéciaux'}[kind]),subtitle:label});
}
