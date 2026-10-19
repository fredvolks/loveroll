// LoveRoll: Messenger/Chrome invitations with a NON-SECRET reference in the URL.
// The UUID only locates the invitation; the server independently verifies the
// authenticated recipient's confirmed email before allowing a match.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN=/^[0-9a-f]{64}$/i;
export const INVITATION_REVISION='20261014-messenger-v5';
// Share revision seen with working image cards in Messenger; kept separate from auth flow.
export const MESSENGER_SHARE_PREVIEW_REVISION='20261017-messenger142';
export function inviteLinkForId(siteUrl,invitationId){
 if(!UUID.test(invitationId||''))throw Error('Référence d’invitation invalide.');
 const url=new URL(siteUrl);
 url.searchParams.set('invite_id',invitationId);
 // A fresh public preview revision lets Messenger fetch the approved rendez-vous artwork.
 url.searchParams.set('v',MESSENGER_SHARE_PREVIEW_REVISION);
 url.hash='';
 return url.toString();
}
export function parseInvitationFromUrl(value){
 const url=new URL(value);
 const queryId=url.searchParams.get('invite_id');
 const fragment=new URLSearchParams(url.hash.replace(/^#/, ''));
 const token=fragment.get('invite')||url.searchParams.get('invite');
 if(queryId&&!UUID.test(queryId))throw Error('Lien d’invitation invalide.');
 if(!queryId&&token&&!TOKEN.test(token))throw Error('Lien d’invitation invalide.');
 return {id:queryId||null,token:queryId?null:(token||null)};
}
export function pendingInviteReference(storage,durable=typeof localStorage!=='undefined'?localStorage:null){
 const id=storage.getItem('pendingInviteId');
 if(id&&UUID.test(id))return {kind:'id',value:id};
 const token=storage.getItem('pendingInvite');
 if(token&&TOKEN.test(token))return {kind:'token',value:token};
 // Public invitation IDs (never secret tokens) can survive email verification,
 // a fresh browser tab and a PKCE/OAuth return on the same origin.
 if(durable&&durable!==storage){
  try{
   const storedId=durable.getItem('pendingInviteId');
   const until=Number(durable.getItem('loverollInviteUntil'));
   if(storedId&&UUID.test(storedId)&&Number.isFinite(until)&&until>Date.now())
    return {kind:'id',value:storedId};
  }catch(error){/* Local storage may be disabled in private browsers. */}
 }
 return null;
}
