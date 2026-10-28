import {isRegisteredStudioIdentity,canSkipAlreadyDeletedStudioUser, type AuthPrincipal} from './guards.ts';

function assert(condition:unknown,description:string){
 if(!condition)throw Error(description);
}
const admin='studio-admin-id';
const seat={user_id:'synthetic-id',synthetic_email:'qa@example.invalid'};
const valid={
 id:'synthetic-id',email:'qa@example.invalid',
 app_metadata:{love_studio_test:true,love_studio_admin:admin}
};
Deno.test('existing tagged A/B identity accepted without user-provided claims',()=>{
 assert(isRegisteredStudioIdentity(valid,seat,admin),'genuine seat rejected');
});
Deno.test('magiclink cannot authorize a newly-created stranger with same synthetic email',()=>{
 assert(!isRegisteredStudioIdentity({...valid,id:'orphan-id'},seat,admin),
  'orphan Auth user was mistaken for registered seat');
});
Deno.test('real customer id or email cannot borrow a technical seat',()=>{
 assert(!isRegisteredStudioIdentity({...valid,email:'customer@example.com'},seat,admin),
  'wrong email accepted');
 assert(!isRegisteredStudioIdentity({...valid,id:'customer-id'},seat,admin),
  'wrong Auth id accepted');
});
Deno.test('user_metadata can never establish technical privilege',()=>{
 const editedMetadata={
  id:valid.id,email:valid.email,
  app_metadata:{},
  user_metadata:{love_studio_test:true,love_studio_admin:admin}
 };
 assert(!isRegisteredStudioIdentity(editedMetadata,seat,admin),
  'self-editable metadata accepted');
});
Deno.test('another platform admin cannot adopt a registered technical user',()=>{
 assert(!isRegisteredStudioIdentity(valid,seat,'different-admin'),
  'other administrator accepted');
});
Deno.test('missing, revoked or partially registered accounts fail closed',()=>{
 const invalidPrincipals: Array<AuthPrincipal|null|undefined>=[
  null,undefined,
  {id:'',email:'qa@example.invalid',app_metadata:{}},
  {id:'synthetic-id',email:'qa@example.invalid',
   app_metadata:{love_studio_test:'true',love_studio_admin:admin}}
 ];
 for(const principal of invalidPrincipals){
  assert(!isRegisteredStudioIdentity(principal,seat,admin),
   'incomplete or spoofed user accepted');
 }
 assert(!isRegisteredStudioIdentity(valid,{...seat,user_id:null},admin),
  'unregistered seat accepted');
});

Deno.test('retry deletes the remaining B after A was removed, but only post-purge',()=>{
 for(const missing of [{status:404},{code:'user_not_found'}]){
  assert(canSkipAlreadyDeletedStudioUser(missing,'deleting',null),
   'verified already-deleted A should not block B recovery');
  assert(!canSkipAlreadyDeletedStudioUser(missing,'ready',null),
   'missing user can never be tolerated during an active test');
  assert(!canSkipAlreadyDeletedStudioUser(missing,'creating',null),
   'partial registration must be investigated, not silently skipped');
  assert(!canSkipAlreadyDeletedStudioUser(missing,'deleting','real-couple-id'),
   'Auth user must not be considered deleted before the couple is purged');
 }
 for(const error of [null,{status:403},{status:500},{code:'internal_error'}]){
  assert(!canSkipAlreadyDeletedStudioUser(error,'deleting',null),
   'unexpected outages and permission failures must preserve recovery registry');
 }
});
