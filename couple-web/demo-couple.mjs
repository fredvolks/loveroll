// LoveRoll - aperçu couple entièrement local, en mémoire, sans requête d'écriture.
// Ne doit jamais être confondu avec un match, une soirée ou un partenaire réel.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const B=(action,text,cls='')=>`<button type="button" class="${cls}" data-action="${action}">${text}</button>`;
const panel=(head,title,text,footer='')=>`<section class="card demo-card"><div class="premium-eyebrow">${head}</div><h2>${title}</h2><p>${text}</p>${footer}</section>`;
export const DEMO_TABS=Object.freeze(['home','session','special','advent','settings','journal']);
const DEFAULT_PARTNER='Camille (démo)';
export function demoCoupleHtml({userName='Moi',tab='home',roll=null,surprise=null,day=1,challengeComplete=false}={}){
 const mine=esc(userName),partner=DEFAULT_PARTNER;
 const navItems=[['home','⌂','Accueil'],['session','🎲','Soirée'],['special','✦','Surprise'],
 ['advent','🎁','Avent'],['settings','⚙','Réglages']];
 const nav='<nav class="nav demo-nav"><div class="nav-inner" style="grid-template-columns:repeat(5,minmax(0,1fr))">'+
   navItems.map(([id,ic,label])=>B('demo-tab:'+id,'<span>'+ic+'</span>'+label,tab===id?'active':'')).join('')+'</div></nav>';
 let body='';
 if(tab==='home'){
  body='<section class="premium-intro"><div class="premium-eyebrow">♡ NOTRE RITUEL À DEUX</div><h2>'+mine+' <span>♥</span> Camille</h2><p>Une semaine, un dé et de nouvelles surprises à partager.</p></section>'+
   panel('♡ NOTRE RITUEL DE LA SEMAINE','Notre dé de la semaine',
   roll?'Résultat fictif : '+roll+' soirée(s) cette semaine.':'Découvrez combien de soirées partager cette semaine.',
   '<div class="demo-big-die">♥ <strong>'+(roll||'?')+'</strong></div>'+B('demo-roll','🎲 Lancer le dé (démo)'))+
   panel('♥ NOTRE SOIRÉE','Nos défis partagés','Découvrez les défis sensuels et coquins à jouer chacun votre tour.',
    B('demo-tab:session','Voir nos défis'))+
   panel('✦ RENDEZ-VOUS SURPRISE','Une activité à découvrir','Une suggestion romantique pour votre prochain moment.',
    B('demo-tab:special','Voir notre rendez-vous','subtle'));
 }else if(tab==='session'){
  body='<section class="premium-intro"><div class="premium-eyebrow">♥ NOTRE SOIRÉE PARTAGÉE</div><h2>Nos défis à deux</h2><p>Un aperçu fictif d’une soirée synchronisée sur deux comptes.</p></section>'+
   panel('ÉTAPE 1 · NOS DÉFIS','Combien de défis ce soir ?','Un lancer par partenaire. Dans cette démonstration, les résultats sont simulés.',
    '<div class="two"><div class="stat"><strong>'+(roll||3)+'</strong><small>'+mine+'</small></div><div class="stat"><strong>4</strong><small>'+partner+'</small></div></div>'+
    B('demo-roll','🎲 Relancer mes défis (démo)'))+
   panel('ÉTAPE 2 · NOTRE TOUR','À toi de jouer !','Un défi apparaît, avec le choix de l’accepter ou de le passer.',
    '<div class="demo-challenge"><span>♡ SENSUEL</span><h3>Le moment complice</h3><p>Partagez sept minutes de tendresse et de complicité, à votre rythme.</p></div>'+
    B('demo-complete',challengeComplete?'✓ Défi fictif terminé':'♡ Simuler un défi réalisé','subtle')+
    '<p class="tiny-note">Aucun défi réel n’est lancé, attribué ou enregistré.</p>')+
   panel('♥ NOS SOUVENIRS','Notre calendrier de couple','Un aperçu des statistiques et du calendrier partagé.',
    B('demo-tab:journal','Ouvrir le calendrier fictif','subtle'));
 }else if(tab==='special'){
  body='<section class="premium-intro"><div class="premium-eyebrow">✦ NOTRE RENDEZ-VOUS SURPRISE</div><h2>Notre prochain rendez-vous</h2><p>Des idées de sorties et d’attentions à partager ensemble.</p></section>'+
   panel('♡ ACTIVITÉ DU MOIS','Une surprise à découvrir',
    surprise?'Idée fictive : '+esc(surprise):'Un dé choisit une activité pour votre couple.',
    '<div class="demo-big-die">✦</div>'+B('demo-surprise','🎲 Découvrir une activité (démo)'))+
   panel('💘 NOS DATES IMPORTANTES','Les occasions spéciales','Saint-Valentin, anniversaires et fêtes : des surprises pour chaque occasion.',
    '<p class="tag">♡ Saint-Valentin · 14 février</p>'+B('demo-tab:journal','Voir le calendrier','subtle'));
 }else if(tab==='advent'){
  body='<section class="premium-intro"><div class="premium-eyebrow">🎁 NOTRE AVENT</div><h2>25 moments à découvrir</h2><p>Un calendrier de surprises pour le mois de décembre.</p></section>'+
   '<section class="card demo-card"><div class="premium-eyebrow">APERÇU DU CALENDRIER</div><div class="day-grid">'+
    Array.from({length:25},(_,i)=>B('demo-day:'+(i+1),(day===i+1?'♥ ':'♡ ')+(i+1),day===i+1?'demo-active':'')).join('')+
   '</div><p class="tiny-note">Démo : les 25 journées peuvent être consultées sans modifier votre vrai calendrier.</p></section>'+
   panel('♡ CASE '+day,'Une petite attention','Une surprise à inventer ensemble, adaptée à vos envies et à votre rythme.');
 }else if(tab==='journal'){
  body='<section class="premium-intro"><div class="premium-eyebrow">♥ NOTRE HISTOIRE</div><h2>Notre calendrier</h2><p>Un exemple visuel, sans utiliser votre historique personnel.</p></section>'+
  panel('♡ OCTOBRE 2026','Moments importants','Nos rendez-vous, nos petites attentions et nos souvenirs.',
  '<div class="demo-calendar">'+Array.from({length:31},(_,i)=>'<span class="'+([4,14,22].includes(i+1)?'marked':'')+'">'+(i+1)+'</span>').join('')+'</div>'+
  B('demo-tab:session','← Retour à la soirée','subtle'));
 }else{
  body='<section class="premium-intro"><div class="premium-eyebrow">♡ NOTRE ESPACE PRIVÉ</div><h2>Réglages du couple</h2><p>Prévisualisation sans modifier vos vrais paramètres.</p></section>'+
  panel('♥ VOTRE COUPLE','Deux profils connectés (simulation)',mine+' et '+partner+'.',
    '<p class="tiny-note">Aucun compte fictif n’a été créé. Aucun jumelage réel n’est effectué.</p>')+
  panel('🎲 JEU ET PERSONNALISATION','Cartes et défis','Configurer les cartes et vos préférences lors d’un véritable match.')+
  panel('♡ CONFIDENTIALITÉ','Votre espace reste privé','Les données de démonstration ne sont ni partagées ni sauvegardées.');
 }
 return '<div class="demo-shell"><div class="demo-control"><span>♡ MODE DÉMO · PARTENAIRE FICTIVE</span>'+
 B('demo-exit','✕ Quitter','demo-exit')+'</div>'+
 '<div class="demo-pairline">♥ '+mine+' <span>♡</span> '+esc(partner)+'</div>'+
 '<div class="demo-body">'+body+
 '<p class="demo-disclaimer">Simulation visuelle seulement · Zéro modification à votre compte ou aux défis.</p></div>'+
 nav+'</div>';
}
