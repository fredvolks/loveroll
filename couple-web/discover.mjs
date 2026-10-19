import {ritualBrandHtml} from './brand.mjs';
import {editorialIcon} from './editorial-ui.mjs';
// A shared presentation, followed by explicit invitation consent or public account entry.
const gift='<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 22h32v21H8zM5 15h38v9H5zM24 15v28M24 15C8 15 9 1 17 6c4 2 7 9 7 9s3-7 7-9c8-5 9 9-7 9Z"/><path d="M24 31c-5-5-10 2 0 8 10-6 5-13 0-8Z"/></svg>';
export function discoverHtml(hasInvitation=false,externalBrowserHelp=''){
 const features=[['dice','Soirées<br>au dé','soiree'],['heart','Activité<br>surprise','surprise'],['mail','25 lettres<br>de l’Avent','avent'],['calendar','Vos dates et<br>événements à deux','couple']];
 return '<div class="love-discover discover-ritual '+(hasInvitation?'discover-invite':'discover-public')+'" aria-label="'+(hasInvitation?'Invitation LoveRoll':'Présentation LoveRoll')+'">'+
 '<header class="discover-header"><div class="discover-brand">'+ritualBrandHtml()+'</div><span class="discover-kicker">UNE INVITATION POUR NOUS DEUX</span><h1 class="discover-editorial-title">On se donne<br>rendez-vous ?</h1></header>'+
 '<section class="discover-editorial-stage" aria-label="Les quatre expériences LoveRoll"><div class="discover-editorial-die"><img src="./assets/loveroll-invitation-scene-v139.webp" alt="Un cœur en verre rubis, un dé à points blancs et un dé numéroté sur du marbre et du satin bordeaux" width="1254" height="1254" decoding="async" loading="eager" fetchpriority="high"></div>'+
 '<div class="discover-ticket"><span aria-hidden="true">'+gift+'</span><p>200 défis. Des surprises.<br><em>Juste nous.</em></p><i aria-hidden="true">✦</i></div>'+
 '<div class="discover-editorial-list" aria-label="Découvrir les fonctions">'+features.map(([icon,label,kind])=>'<article class="discover-editorial-item discover-editorial-'+kind+'"><span class="discover-editorial-icon" aria-hidden="true">'+editorialIcon(icon)+'</span><h2>'+label+'</h2></article>').join('')+'</div></section>'+
 '<section class="discover-editorial-bottom">'+(hasInvitation?'<button class="discover-accept" type="button" data-action="invite-start"><span aria-hidden="true">♡</span> ACCEPTER L’INVITATION <i aria-hidden="true">›</i></button>':'<button class="discover-accept" type="button" data-action="show-auth:signup"><span aria-hidden="true">♡</span> COMMENCER NOTRE AVENTURE <i aria-hidden="true">›</i></button><button class="discover-login" type="button" data-action="show-auth:signin">J’ai déjà un compte · Me connecter</button>')+
 (hasInvitation?externalBrowserHelp:'')+'<p class="discover-privacy">Votre espace à deux · 18 ans et plus</p></section></div>';
}
