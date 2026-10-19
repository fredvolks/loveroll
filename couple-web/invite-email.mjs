// Public email address validation shared by signup/invitations.
export function normalizeInviteEmail(value){
 const email=String(value||'').trim().toLowerCase();
 // Keep syntactic validation permissive: accounts with Hotmail/Outlook addresses
 // can authenticate through Google. Server verifies recipient on acceptance.
 if(email.length>254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email))
  throw Error('Indiquez une adresse courriel valide pour votre partenaire (Gmail, Hotmail, Outlook, etc.).');
 return email;
}
export function composeInviteEmail(email,subject,body){
 return 'mailto:'+encodeURIComponent(normalizeInviteEmail(email))+
  '?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
}
