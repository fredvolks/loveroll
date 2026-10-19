// Validation et retours utilisateur pour la connexion par courriel LoveRoll.
// Le fournisseur d'authentification peut envoyer un lien de confirmation
// plutôt qu'un code OTP. Ne jamais promettre un code dans les courriels.
export function loginEmail(value){
  const email=String(value||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Entre une adresse courriel valide.');
  return email;
}
export function loginCode(value){
  const code=String(value||'').trim();
  if(!/^\d{6}$/.test(code))
    throw new Error('Saisis les 6 chiffres reçus dans ton courriel, si celui-ci contient un code. Sinon, utilise le lien de confirmation.');
  return code;
}
export function emailAuthMessage(error){
  const msg=String(error?.message||'');
  const code=String(error?.code||'');
  const status=Number(error?.status||0);
  if(status===429||code==='over_email_send_rate_limit'||code==='over_request_rate_limit'||
    /rate limit|too many requests|email.*limit/i.test(msg))
    return "Limite temporaire d'envoi de courriels atteinte chez Supabase. N'en redemande pas maintenant. Attends avant de réessayer ou utilise Google/Apple.";
  if(/otp.*expired|token.*expired|invalid.*token|invalid.*otp/i.test(msg))
    return "Ce code ou lien est expiré ou incorrect. Utilise le plus récent courriel reçu; si c'est un courriel de confirmation, clique sur son lien plutôt que d'entrer un code.";
  return 'La connexion par courriel a échoué. Réessaie plus tard ou utilise Google/Apple.';
}

export function passwordQuality(value){
 const password=String(value||'');
 const checks=[password.length>=8,/[a-z]/.test(password),/[A-Z]/.test(password),/[0-9]/.test(password)];
 const met=checks.filter(Boolean).length;
 return {met,valid:met===4,label:met>=4?'Mot de passe fort':met>=3?'Presque prêt':'À renforcer'};
}
export function requireLovePassword(value){
 const password=String(value||'');
 if(!passwordQuality(password).valid)
  throw Error('Utilisez au moins 8 caractères, dont une majuscule, une minuscule et un chiffre.');
 return password;
}
export function verifiedLoveEmail(user){
 return !!(user?.email&&user?.email_confirmed_at);
}
export function passwordAuthMessage(error){
 const code=String(error?.code||'').toLowerCase(),message=String(error?.message||'');
 if(error?.status===429||/rate_limit|too_many_requests|over_email_send/i.test(code+' '+message))
  return 'Trop de tentatives pour le moment. Attendez avant de réessayer.';
 if(/invalid_credentials|invalid_grant/i.test(code)||/invalid login credentials|invalid credentials/i.test(message))
  return 'Courriel ou mot de passe incorrect.';
 if(/email_not_confirmed/i.test(code)||/email not confirmed/i.test(message))
  return 'Confirmez votre courriel avec le lien reçu avant de vous connecter.';
 if(/weak_password|password.*short|password.*weak|password.*characters/i.test(code+' '+message))
  return 'Mot de passe refusé par les règles de sécurité. Choisissez-en un plus robuste.';
 if(/user_already_exists|email_exists|already.registered/i.test(code+' '+message))
  return 'Cette adresse est peut-être déjà utilisée. Essayez « Se connecter » ou « Mot de passe oublié ? ».';
 if(/network|fetch failed|failed to fetch/i.test(message))
  return 'Connexion Internet indisponible. Vérifiez votre réseau puis réessayez.';
 if(/expired|invalid.*token|otp_expired/i.test(code+' '+message))
  return 'Le lien de vérification ou de récupération a expiré. Demandez un nouveau courriel.';
 return 'La demande a échoué. Réessayez ou choisissez un autre mode de connexion.';
}
export function invitationAuthMessage(error){
 const text=String(error?.message||'');
 if(/autre courriel|autre compte|destinée/i.test(text))
  return 'Cette invitation appartient à une autre adresse. Utilisez le compte invité.';
 if(/expirée|annulée|déjà acceptée|invalide|already used/i.test(text))
  return 'Cette invitation est expirée, annulée ou déjà utilisée.';
 if(/déjà à un couple|appartenez déjà|couple complet/i.test(text))
  return 'Ce compte appartient déjà à un autre couple.';
 if(/Courriel de connexion non vérifié/i.test(text))
  return 'Confirmez votre adresse courriel avant de rejoindre le couple.';
 return 'Association impossible pour le moment. Vérifiez votre invitation et réessayez.';
}
