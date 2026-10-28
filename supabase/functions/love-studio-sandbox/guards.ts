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
