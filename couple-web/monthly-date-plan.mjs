// LR-SURPRISE-001: propose/agree on a date. No booking, payment, roll or reminder.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function datePlanLabel(when,locale='fr-CA'){
 const date=new Date(when??'');
 if(!Number.isFinite(date.getTime()))return 'Date à définir';
 return new Intl.DateTimeFormat(locale,{dateStyle:'long',timeStyle:'short'}).format(date);
}
export function monthlyDatePlanHtml({plan=null,hostId=null,me=null,locale='fr-CA',now=Date.now()}={}){
 if(!hostId||!me)return '';
 let inner='';
 if(plan?.status==='agreed'){
  inner='<strong>♥ Notre date est choisie</strong>'+
   '<p>'+esc(datePlanLabel(plan.proposed_for,locale))+'</p>'+
   '<small>Vous avez tous les deux accepté cette date. Cela ne confirme aucune réservation auprès de l’établissement.</small>';
 }else if(plan?.status==='proposed'){
  const mine=plan.proposed_by===me;
  const proposedAt=new Date(plan.proposed_for).getTime();
  const expired=Number.isFinite(proposedAt)&&proposedAt<=new Date(now).getTime();
  inner='<strong>'+ (expired?'Cette date est passée':mine?'Votre proposition est envoyée':'Votre partenaire propose une date') +'</strong>'+
   '<p>'+esc(datePlanLabel(plan.proposed_for,locale))+'</p>'+
   (mine?(expired?
    '<small>La date proposée est passée. Votre partenaire peut proposer un nouveau moment.</small>':
    '<small>En attente de la réponse de votre partenaire.</small>'):
    '<div class="surprise-date-plan-actions">'+
    (expired?
     '<small>Cette date est passée. Proposez un nouveau moment pour continuer.</small>':
     '<button type="button" class="surprise-primary" data-action="geo-date-accept">Accepter cette date</button>')+
    '<label for="geo-date-proposal">Ou proposer une autre date</label>'+
    '<input id="geo-date-proposal" type="datetime-local" required>'+
    '<button type="button" class="surprise-geo-text-button" data-action="geo-date-counter">Proposer une autre date</button>'+
    '</div>');
 }else if(me===hostId){
  inner='<strong>Proposer notre date</strong>'+
   '<p>Choisissez un moment. Votre partenaire pourra accepter ou proposer une autre date.</p>'+
   '<label for="geo-date-proposal">Date et heure de la sortie</label>'+
   '<input id="geo-date-proposal" type="datetime-local" required>'+
   '<button type="button" class="surprise-primary" data-action="geo-date-propose">Proposer cette date</button>';
 }else{
  inner='<strong>Notre date est à choisir</strong>'+
   '<p>La personne désignée par le D6 proposera la première date.</p>';
 }
 return '<section class="surprise-date-plan" aria-label="Choisir notre date">'+inner+'</section>';
}
