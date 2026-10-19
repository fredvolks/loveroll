import {ritualBrandHtml} from './brand.mjs';
import {editorialIcon} from './editorial-ui.mjs';
// LoveRoll — public onboarding UI. Profile name and personal anniversary come from registration.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(id,label,cls='')=>'<button class="'+cls+'" data-action="'+esc(id)+'">'+label+'</button>';
const months=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
export function monthDayInputs(prefix,initial='',optional=false){
 const v=/^\d{2}-\d{2}$/.test(initial||'')?initial.split('-').map(Number):[0,0];
 return '<div class="date-fields"><label>Mois<select id="'+prefix+'-month"><option value="">Choisir le mois</option>'+
  months.map((name,i)=>'<option value="'+(i+1)+'" '+(v[0]===i+1?'selected':'')+'>'+name+'</option>').join('')+
  '</select></label><label>Jour<select id="'+prefix+'-day"><option value="">Jour</option>'+
  Array.from({length:31},(_,i)=>'<option value="'+(i+1)+'" '+(v[1]===i+1?'selected':'')+'>'+(i+1)+'</option>').join('')+
  '</select></label></div>'+
  (optional?'<p class="tiny-note">Facultatif : vous pourrez déterminer cette date ensemble plus tard.</p>':'');
}
export function parseMonthDay(prefix,required=true,documentRef=globalThis.document){
 const month=documentRef.getElementById(prefix+'-month')?.value;
 const day=documentRef.getElementById(prefix+'-day')?.value;
 if(!month&&!day&&!required)return null;
 if(!month||!day)throw Error('Sélectionne le mois et le jour.');
 const m=Number(month),d=Number(day);
 const valid=new Date(Date.UTC(2000,m-1,d));
 if(valid.getUTCMonth()!==m-1||valid.getUTCDate()!==d)throw Error('Cette date n’existe pas.');
 return String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
const lineIcon = (type) => {
 const common='width="36" height="36" viewBox="0 0 48 48" fill="none" stroke="#ff82bd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
 const shapes={
  dice:'<rect x="6" y="15" width="24" height="24" rx="6"/><rect x="19" y="7" width="23" height="23" rx="6"/><path d="M12 22l3 3 3-3 3 3 3-3M26 12c1-3 6-3 7 0 0 0 3-3 5 0 2 3-3 7-7 9-4-2-9-6-7-9z"/>',
  couple:'<path d="M24 39C10 30 5 25 8 17c3-8 13-7 16 0 3-7 13-8 16 0 3 8-2 13-16 22z"/><path d="M24 18c-2-5-9-5-11 0"/>',
  calendar:'<rect x="7" y="11" width="34" height="30" rx="5"/><path d="M7 21h34M16 7v8M32 7v8"/><path d="M24 35c-7-5-9-8-6-11 2-2 5-1 6 1 2-3 5-3 7-1 3 4-2 8-7 11z"/>',
  lock:'<rect x="11" y="22" width="26" height="20" rx="5"/><path d="M16 22v-8a8 8 0 0 1 16 0v8"/><path d="M24 28c-4-4-9 1 0 8 9-7 4-12 0-8z"/>',
  flame:'<path d="M24 42c-9 0-15-6-15-15 0-9 8-15 11-22 1 7 4 11 7 14 2-4 2-6 2-9 9 8 10 14 10 20 0 7-6 12-15 12z"/><path d="M24 40c-5 0-7-3-7-7 0-3 3-7 6-10 0 4 5 6 5 10s-1 7-4 7z"/>',
  heart:'<path d="M24 40C11 31 5 26 7 17c2-9 13-10 17-2 4-8 15-7 17 2 2 9-4 14-17 23z"/>',
  clock:'<circle cx="24" cy="24" r="17"/><path d="M24 12v13l9 6"/>',
  users:'<circle cx="18" cy="17" r="6"/><path d="M5 40v-5c0-7 6-11 13-11s13 4 13 11v5M33 12c6 0 9 9 2 12M35 29c5 1 8 4 8 10"/>',
  shield:'<path d="M24 5l16 7v10c0 12-8 18-16 21C16 40 8 34 8 22V12z"/><path d="m17 24 5 5 9-10"/>'
 };
 return '<svg '+common+'>'+shapes[type]+'</svg>';
};
const feature = (icon,title,body) =>
 '<article class="love-feature"><div class="love-feature-icon">'+lineIcon(icon)+'</div>'+
 '<h3>'+title+'</h3><p>'+body+'</p></article>';
const benefit = (icon,title,caption) =>
 '<div class="love-benefit"><div class="love-benefit-icon">'+lineIcon(icon)+'</div>'+
 '<strong>'+title+'</strong><small>'+caption+'</small></div>';
export function marketingHtml(){
 return '<div class="marketing-shell love-onepage" aria-label="LoveRoll · présentation avant connexion">'+
 '<section class="love-hero love-compact-hero">'+
  '<div class="love-scene"><div class="love-brand">'+
   '<span class="love-brand-decoration">♡</span>'+
   '<div class="love-wordmark"><span>Love</span><b>Roll</b></div>'+
   '<div class="love-signature">JEUX · DÉFIS · DATES · NOUS</div></div>'+
   '<img class="love-hero-art" src="./assets/loveroll-premium-scene.png" alt="Cœur en verre rose, deux dés noirs brillants et satin bourgogne" fetchpriority="high" decoding="async" width="1200" height="630">'+
  '</div>'+
  '<div class="love-hero-copy">'+
   '<h1>Votre aventure à deux <em>commence ici.</em></h1>'+
   '<p>Défis sensuels, soirées surprises et moments complices à partager.</p>'+
   '<div class="love-cta-group">'+
    button('show-auth','♡ CRÉER MON COMPTE GRATUITEMENT →','love-cta-primary')+
    button('show-auth','J’AI DÉJÀ UN COMPTE · ME CONNECTER →','love-cta-secondary')+
   '</div>'+
   '<div class="love-auth-note">♢ Connexion sécurisée pour Android et iPhone.</div>'+
  '</div>'+
 '</section>'+
 '<section class="love-features" aria-label="Quatre fonctionnalités LoveRoll">'+
  feature('dice','Dés à deux','Vos défis synchronisés.')+
  feature('couple','Votre match','Connectez votre couple.')+
  feature('calendar','Calendrier','Vos dates importantes.')+
  feature('lock','Espace privé','Rien qu’à vous.')+
 '</section>'+
 '<section class="love-mini-finale" aria-label="Notre philosophie">'+
   '<h2>Plus qu’un jeu, <em>votre histoire à deux. ♡</em></h2>'+
   '<p>Complicité, surprises et frissons à votre rythme.</p>'+
 '</section>'+
 '<footer class="love-compact-footer">'+
   '<a href="loveroll://offline" class="love-old-data" aria-label="Ouvrir les anciennes données hors ligne dans LoveRoll Android">Retrouver mes anciennes données hors ligne ↗</a>'+
   '<p>Réservé aux adultes de 18 ans et plus. Chaque activité est facultative.</p>'+
 '</footer>'+
 '</div>';
}
const entryHeader=(invitation=false,progress=false)=>'<header class="entry-account-hero">'+ritualBrandHtml()+'<p>'+(invitation?'INVITATION PRIVÉE':'VOTRE ESPACE PRIVÉ')+'</p>'+
 (progress?'<div class="entry-account-progress"><span><b>✓</b> Invitation reçue</span><i></i><span><b>2</b> Votre compte</span></div>':'')+'</header>';
const eye='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const googleButton=()=>'<button type="button" data-action="google" class="entry-google"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.28 5.48-4.81 7.18l7.75 6.01C44.4 38.03 46.98 31.84 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.3 14.3 0 0 1 9.75 24c0-1.59.27-3.13.77-4.59l-7.98-6.2A23.84 23.84 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.79l-7.75-6.01c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>Continuer avec Google</button>';
export function authHtml(invitation=false,mode='signup',notice='',emailValue='',confirmNeeded=false,providers={google:true}){
 const recovering=mode==='recover',requestingReset=mode==='request-reset',signingIn=mode==='signin',access=recovering||requestingReset;
 const title=recovering?'Nouveau<br>mot de <em>passe.</em>':requestingReset?'Retrouver<br>mon <em>compte.</em>':signingIn?'Retrouvez votre espace.':'Créez votre compte.';
 const helper=recovering?'Choisissez un mot de passe pour votre compte.':requestingReset?'Recevez un lien pour choisir un nouveau mot de passe.':'Votre espace LoveRoll.';
 const segment=access?'':'<div class="entry-auth-segments" role="group" aria-label="Choisir un mode"><button type="button" data-action="auth-mode:signup" class="'+(!signingIn?'is-active':'')+'" aria-pressed="'+!signingIn+'">Créer un compte</button><button type="button" data-action="auth-mode:signin" class="'+(signingIn?'is-active':'')+'" aria-pressed="'+signingIn+'">Se connecter</button></div>';
 const email='<label class="entry-auth-field"><span>Votre courriel</span><span class="entry-input">'+editorialIcon('mail')+'<input id="signin-email" name="email" type="email" autocomplete="email" inputmode="email" spellcheck="false" placeholder="Votre adresse courriel" maxlength="254" value="'+esc(emailValue)+'" required></span></label>';
 const pass='<label class="entry-auth-field"><span>'+(recovering?'Nouveau mot de passe':signingIn?'Votre mot de passe':'Choisissez un mot de passe')+'</span><span class="entry-input">'+editorialIcon('lock')+'<input id="signin-password" name="password" type="password" autocomplete="'+(signingIn?'current-password':'new-password')+'" placeholder="••••••••" minlength="8" required><button type="button" class="entry-password-eye" data-action="auth-eye" aria-label="Afficher le mot de passe" aria-pressed="false">'+eye+'</button></span></label>';
 const meter=!requestingReset?'<div class="entry-password-meter'+(signingIn?' entry-password-placeholder':'')+'" '+(signingIn?'aria-hidden="true"':'aria-label="Robustesse du mot de passe"')+'><div class="entry-meter-bars"><i></i><i></i><i></i><i></i></div><p id="auth-password-hint">8 caractères, une majuscule, une minuscule et un chiffre.</p></div>':'';
 const action=recovering?'auth-update-password':requestingReset?'auth-send-reset':signingIn?'auth-signin-password':'auth-signup-password';
 return '<div class="entry-account-screen auth-editorial entry-access-screen entry-mode-'+mode+(recovering?' entry-recover':'')+'" aria-label="Compte LoveRoll"><div class="entry-access-heart" aria-hidden="true"><img src="./assets/loveroll-glass-heart-v123.webp" width="88" height="88" alt=""></div>'+entryHeader(invitation,false)+
 '<section class="entry-auth-card">'+(access?'<div class="entry-symbol">'+editorialIcon(recovering?'lock':'mail')+'</div>':'')+
 '<div class="entry-auth-title"><h1>'+title+'</h1></div><p class="entry-auth-lead">'+helper+'</p>'+segment+
 '<form id="invite-auth-form" autocomplete="on"><div class="entry-auth-fields">'+(recovering?'':email)+(requestingReset?'':pass)+'</div>'+meter+
 '<div class="entry-auth-feedback" id="auth-form-feedback" role="status" aria-live="polite">'+esc(notice)+'</div>'+button(action,recovering?'Enregistrer mon mot de passe':requestingReset?'Envoyer le lien':signingIn?'Se connecter':'Créer mon compte','entry-auth-submit')+'</form>'+
 (confirmNeeded&&signingIn?'<section class="entry-confirm-resend"><strong>Adresse non confirmée</strong><p>Ouvrez le lien reçu pour activer votre compte.</p>'+button('auth-resend-confirmation','Renvoyer le courriel','entry-auth-resend')+'<p id="auth-resend-status" role="status"></p></section>':'')+
 (access?button('auth-mode:signin','‹ Retour à la connexion','entry-auth-back'):(providers.google?'<div class="entry-or"><span>ou</span></div>'+googleButton():'')+
 '<footer class="entry-footer">'+button(invitation?'invite-return':'show-landing',invitation?'‹ Revenir à l’invitation':'‹ Retour à l’accueil','entry-auth-back')+(signingIn?button('auth-reset-request','Mot de passe oublié ?','entry-auth-link'):'')+'<p>Chaque personne utilise son propre compte.</p></footer>')+'</section>'+(providers.browserHelp||'')+'</div>';
}
export function emailConfirmationHtml(email,{needsSignIn=false,invitation=false,google=true}={}){
 return '<div class="entry-account-screen auth-editorial email-confirm-screen">'+entryHeader(invitation)+'<section class="entry-auth-card"><div class="entry-symbol">'+editorialIcon('mail')+'</div>'+
 '<h1>Confirmez<br>votre <em>courriel.</em></h1><p>Ouvrez le lien reçu pour activer votre compte.</p>'+
 '<label>Votre adresse courriel<span class="entry-input">'+editorialIcon('mail')+'<input type="email" readonly aria-readonly="true" value="'+esc(email||'')+'"></span></label>'+
 '<div id="email-confirm-status" role="status" aria-live="polite"></div>'+
 button(needsSignIn?'email-confirm-login':'email-confirm-recheck',needsSignIn?'J’ai confirmé · me connecter':'J’ai confirmé mon courriel','entry-auth-submit')+
 '<div class="entry-footer">'+button('email-confirm-resend','Renvoyer le courriel','entry-auth-resend')+button('email-confirm-edit','Modifier mon adresse','entry-auth-resend')+'</div>'+
 (needsSignIn?'<p class="entry-small-note">Si ce compte existe déjà, connectez-vous avec sa méthode habituelle. Un renvoi accepté ne garantit pas la livraison.</p>'+(google?googleButton():''):'')+
 '<p class="entry-small-note">Vérifiez aussi les indésirables.'+(invitation?' Votre invitation reste conservée.':'')+'</p></section></div>';
}

export function profileAccountChoiceHtml(user){
 // These screens are rendered for an already authenticated Supabase session.
 // Show which identity is active and offer a way back to sign-in without deleting a profile.
 const email=user?.email?esc(user.email):'un compte connecté';
 return '<div class="entry-account-choice" role="group" aria-label="Compte LoveRoll">'+
 '<p>Compte actuellement connecté : <strong>'+email+'</strong></p>'+
 '<button type="button" class="entry-switch-account" data-action="use-existing-account">'+
 '↗ Se connecter à mon compte existant</button>'+
 '<small>Si c’est bien votre compte, complétez seulement les informations manquantes. Aucune donnée ne sera supprimée.</small>'+
 '</div>';
}
export function profileGenderSelect(gender='',id='profile-gender'){
 const chosen=gender==='him'||gender==='her'?gender:'';
 return '<label class="loveroll-gender-select">Mon genre'+
  '<select id="'+id+'" required aria-label="Mon genre">'+
   '<option value=""'+(!chosen?' selected':'')+' disabled>Choisir mon genre</option>'+
   '<option value="him"'+(chosen==='him'?' selected':'')+'>Homme</option>'+
   '<option value="her"'+(chosen==='her'?' selected':'')+'>Femme</option>'+
  '</select></label>';
}
export function profilePlayStyleSelect(style='medium',id='profile-play-style'){
 const chosen=['soft','medium','intense'].includes(style)?style:'medium';
 return '<label class="loveroll-style-select">Mon style de jeu'+
  '<select id="'+id+'" required aria-label="Mon style de jeu">'+
  [['soft','Soft'],['medium','Medium'],['intense','Intense']].map(([value,label])=>
   '<option value="'+value+'"'+(chosen===value?' selected':'')+'>'+label+'</option>').join('')+
  '</select><small>Votre préférence est personnelle et modifiable à tout moment. Elle ne change pas encore les cartes.</small></label>';
}
function profileScreen(user,profile,invitation){
 const name=profile?.display_name||user?.user_metadata?.given_name||user?.user_metadata?.full_name||user?.user_metadata?.name||'';
 return '<div class="entry-account-screen auth-editorial entry-profile-screen">'+entryHeader(invitation,invitation)+
 '<section class="entry-auth-card entry-profile-card"><h1>Votre profil.</h1><p>Quelques informations pour personnaliser LoveRoll.</p>'+profileAccountChoiceHtml(user)+
 '<form class="editorial-form" onsubmit="return false"><label>Votre prénom<input id="profile-name" autocomplete="given-name" maxlength="80" value="'+esc(name)+'"></label>'+'<div class="loveroll-profile-choice-row">'+profileGenderSelect(profile?.gender)+profilePlayStyleSelect(profile?.play_style)+'</div>'+
 '<div class="entry-birthday"><span>Votre anniversaire</span>'+monthDayInputs('signup-birth',profile?.birthday_md||'')+'</div>'+
 '<label class="checkline"><input type="checkbox" id="age-confirm"> Je confirme avoir 18 ans ou plus.</label>'+button('complete-registration','Terminer mon inscription','entry-auth-submit')+'</form>'+
 '<p class="entry-small-note">Seuls le mois et le jour sont conservés.</p>'+button('use-existing-account','‹ Retour à la connexion','entry-auth-back')+'</section></div>';
}
export function inviteProfileHtml(user,profile){return profileScreen(user,profile,true);}
export function profileHtml(user,profile){return profileScreen(user,profile,false);}
export function matchHtml(name,invitation){
 return '<div class="partner-create-form"><p>Bienvenue '+esc(name)+'.</p>'+
 (invitation?
 '<p>Votre invitation sera associée automatiquement après la vérification du compte.</p>':
 '<p>Créez votre duo, puis invitez votre partenaire par courriel. Elle ou il remplira son propre profil.</p>'+
 '<fieldset class="partner-create-date"><legend>Anniversaire du couple</legend>'+
 monthDayInputs('signup-couple','',true)+'</fieldset>'+
 button('create-couple','Créer notre espace à deux','settings-primary')+
 button('prepare-cards','Préparer mes défis avant l’invitation','settings-secondary'))+
 '</div>';
}
