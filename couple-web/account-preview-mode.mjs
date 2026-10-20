// UI simulation only. Supabase remains the sole authority for billing and permissions.
// Never grant server roles or change entitlements from these presentation helpers.
export const PREVIEW_MODES=Object.freeze(['real','admin','member','eclat']);
export function previewMode(mode,authorized){
 return authorized===true&&PREVIEW_MODES.includes(mode)?mode:'real';
}
export function previewCanEdit(isRealOwner,mode,authorized){
 return Boolean(isRealOwner)&&previewMode(mode,authorized)!=='member';
}
export function previewEclatStatus(status,mode,authorized){
 if(previewMode(mode,authorized)==='member')
  return {...(status||{}),access:false,active:false};
 return status||null;
}
