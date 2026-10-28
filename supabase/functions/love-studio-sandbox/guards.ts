// This is a pure authorization guard shared by the Edge function and isolated
// Deno security tests. Never accept self-editable user_metadata as authority.
export type RegisteredSeat = {user_id:string|null;synthetic_email:string};
export type AuthPrincipal = {
 id:string;
 email?:string|null;
 app_metadata?:Record<string,unknown>|null;
};

export function isRegisteredStudioIdentity(
 user:AuthPrincipal|null|undefined,
 seat:RegisteredSeat,
 adminId:string
):boolean{
 return !!seat.user_id&&!!seat.synthetic_email&&!!user?.id&&
  user.id===seat.user_id&&
  user.email===seat.synthetic_email&&
  user.app_metadata?.love_studio_test===true&&
  user.app_metadata?.love_studio_admin===adminId;
}

export function canSkipAlreadyDeletedStudioUser(
 error:{status?:number|null;code?:string|null}|null|undefined,
 state:string|null|undefined,
 coupleId:string|null|undefined
):boolean{
 // Only after the SECURITY DEFINER purge has nullified the test couple.
 // A missing Auth identity during the active/creating state is a corruption,
 // never authorization to erase or overwrite a different user's data.
 return state==='deleting'&&coupleId===null&&
  (error?.status===404||error?.code==='user_not_found');
}
