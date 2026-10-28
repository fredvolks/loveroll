import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../supabase/functions/love-studio-sandbox/index.ts',import.meta.url),'utf8');
const guard=readFileSync(new URL('../supabase/functions/love-studio-sandbox/guards.ts',import.meta.url),'utf8');
const schema=readFileSync(new URL('migrations/20261027_love_studio_real_sandbox_foundation.sql',import.meta.url),'utf8');
test('studio backend only acts for verified platform administrators',()=>{
 assert.match(source,/service\.auth\.getUser\(token\)/);
 assert.match(source,/email_confirmed_at/);
 assert.match(source,/\.from\('love_platform_admins'\)/);
 assert.match(source,/\.eq\('user_id',adminId\)/);
 assert.match(source,/origin!==allowedOrigin/);
 assert.match(source,/productionOrigin='https:\/\/fredvolks\.github\.io'/);
 assert.match(source,/productionRef='ejsrqfpkgwraorrznjpm'/);
 assert.match(source,/LOVEROLL_STUDIO_STAGING_MODE/);
 assert.match(source,/LOVEROLL_STUDIO_STAGING_ORIGIN/);
 assert.match(source,/stagingAllowed\?stagingOrigin:productionOrigin/);
});
test('two real Auth users are generated without pre-known credentials',()=>{
 assert.match(source,/service\.auth\.admin\.createUser/);
 assert.match(source,/\.insert\(\{admin_id:adminId,seat:s,user_id:null,synthetic_email:email\}\)/,
  'must persist exact pending technical email BEFORE creating Supabase Auth user');
 assert.match(source,/\.update\(\{user_id:created\.user\.id\}\)/,
  'must attach the actual Auth UUID to the pre-reserved seat');
 assert.match(source,/\.eq\('synthetic_email',email\)\.is\('user_id',null\)/,
  'registration may not overwrite a preexisting Auth identity');
 assert.match(source,/service\.rpc\('love_studio_recover_pending_seats'/,
  'failed creation must recover any newly issued Auth identity');
 assert.match(source,/Date\.now\(\)-createdAt<5\*60\*1000/,
  'deletion must not race an actively creating Auth account');
 assert.match(schema,/FUNCTION public\.love_studio_recover_pending_seats\(p_admin uuid\)/);
 assert.match(schema,/FROM auth\.users u/);
 assert.match(schema,/lower\(u\.email\)=lower\(v_seat\.synthetic_email\)/);
 assert.match(schema,/v_auth\.raw_app_meta_data->>'love_studio_admin' IS DISTINCT FROM p_admin::text/);
 assert.match(schema,/REVOKE ALL ON FUNCTION public\.love_studio_recover_pending_seats\(uuid\) FROM PUBLIC,anon,authenticated/);
 assert.match(source,/email_confirm:true/);
 assert.match(source,/app_metadata:\{love_studio_test:true,love_studio_admin:adminId\}/);
 assert.match(source,/service\.from\('couple_members'\)\.insert/);
 assert.match(source,/service\.from\('couple_profiles'\)\.insert/);
 assert.match(source,/service\.from\('couples'\)/);
 assert.match(source,/registeredCouple\?\.couple_id!==newCouple/);
 assert.match(source,/\.eq\('state','creating'\)\.is\('couple_id',null\)/);
 assert.match(source,/\.eq\('id',newCouple\)\.eq\('owner_user_id',ids\[0\]\)/);
 
 assert.doesNotMatch(source,/Math\.random\(/);
 assert.match(source,/love_account_premium_exemptions/);
 assert.match(source,/love_eclat_entitlements/);
 assert.match(source,/studio_synthetic_qa_only/);
 assert.match(source,/source:'studio_test_only'/);
 assert.match(source,/service\.from\('love_eclat_sessions'\)\.select\('coffret_id'\)/);
 assert.match(source,/\.eq\('cancelled',false\)/);
 assert.match(source,/\.not\('ended_at','is',null\)/);
 assert.match(source,/eclat_completed_coffrets/);
 assert.match(source,/\.filter\(\(id:number\)=>Number\.isInteger\(id\)&&id>=1&&id<=12\)/);
 assert.match(source,/monthly_d100_limit:12/);
 assert.match(source,/let identitiesClean=true/);
 assert.match(source,/canSkipAlreadyDeletedStudioUser\(lookupError,deletePool\.state,deletePool\.couple_id\)/);
 assert.match(source,/if\(!deletePool\)return response/);
 assert.match(source,/canSkipAlreadyDeletedStudioUser\(lookupError,'deleting',null\)/);
 assert.match(source,/if\(deleteError\)identitiesClean=false/);
 assert.match(source,/if\(identitiesClean\)/);
 assert.doesNotMatch(source,/stripe\.checkout|payment_intent\.succeeded|fakePayment/);
});
test('seat auth uses official one-time magiclink and fixed registry',()=>{
 assert.match(source,/rows\?\.find\(r=>r\.seat===seat\)/);
 assert.match(source,/type:'magiclink'/);
 assert.match(source,/link\.properties\.hashed_token/);
 assert.match(source,/love_studio_admin!==adminId/);
 assert.match(source,/async function validRegisteredPair\(/);
 assert.match(source,/members\.data\?\.length!==2/);
 assert.match(source,/couple\.data\?\.owner_user_id!==a\.user_id/);
 assert.match(source,/isRegisteredStudioIdentity\(authA\.data\?\.user,a,adminId\)/);
 assert.match(source,/isRegisteredStudioIdentity\(authB\.data\?\.user,b,adminId\)/);
 assert.match(source,/if\(rowsError\|\|!await validRegisteredPair\(pool\.couple_id,rows\|\|null\)\)/);




 assert.match(source,/isRegisteredStudioIdentity\(link\.user,row,adminId\)/);
 assert.match(guard,/user\.id===seat\.user_id/);
 assert.match(guard,/user\.email===seat\.synthetic_email/);
 assert.match(guard,/user\.app_metadata\?\.love_studio_test===true/);
 assert.match(guard,/user\.app_metadata\?\.love_studio_admin===adminId/);
 assert.match(source,/Lien Auth non conforme au joueur technique enregistré/);
 assert.match(source,/state:pool\.state==='ready'&&!ready\?'invalid'/);
});
test('only registered test couples and identities are eligible for deletion',()=>{
 assert.match(schema,/public\.love_studio_test_pools/);
 assert.match(schema,/public\.love_studio_test_seats/);
 assert.match(schema,/auth\.role\(\) IS DISTINCT FROM 'service_role'/);
 assert.match(schema,/owner_seat\.seat='A'/);
 assert.match(schema,/owner_seat\.user_id=c\.owner_user_id/);
 assert.match(schema,/count\(\*\) FROM public\.love_studio_test_seats s/);
 assert.match(schema,/Propriétaire ou duo test non vérifié : suppression bloquée/);
 assert.match(schema,/PERFORM 1 FROM public\.couples c WHERE c\.id=v_pool\.couple_id FOR UPDATE/);
 assert.match(schema,/Couple enregistré absent : purge interrompue/);
 assert.match(schema,/cm\.couple_id<>v_pool\.couple_id/);
 assert.match(schema,/other_couple\.owner_user_id/);
 assert.match(schema,/Identité test utilisée dans un autre couple : purge interdite/);
  assert.match(schema,/public\.love_monthly_paid_entitlements p/);
 assert.match(schema,/public\.love_annual_discount_settlements p/);
 assert.match(schema,/public\.love_promo_redemptions p/);
 assert.match(schema,/Écriture financière détectée : purge de test bloquée/);
 assert.match(schema,/public\.love_referral_credit_usage u/);
 assert.match(schema,/Crédit payé lié au banc : suppression bloquée/);
 assert.match(schema,/public\.love_personal_intimacy x/);
 assert.match(schema,/public\.couple_evening_reviews x/);
 assert.match(schema,/public\.love_eclat_private_notes x/);
 assert.match(schema,/Historique personnel extérieur au banc : purge interdite/);
 assert.match(schema,/love_eclat_sessions','started_by/);
 assert.match(schema,/Membre réel détecté/);
 assert.match(schema,/public\.love_user_library_backup/);
 assert.match(schema,/Lien vers un utilisateur ou un couple réel/);
 assert.match(schema,/public\.couple_rolls r/);
 assert.match(schema,/s\.user_id=r\.actor/);
 assert.match(schema,/public\.couple_sessions ss/);
 assert.match(schema,/s\.user_id=ss\.opened_by/);
 assert.match(schema,/s\.user_id=ss\.starting_user_id/);
 assert.match(schema,/public\.couple_challenges ch/);
 assert.match(schema,/s\.user_id=ch\.recipient/);
 assert.match(schema,/public\.couple_personal_rolls pr/);
 assert.match(schema,/s\.user_id=pr\.user_id/);
 assert.match(schema,/Un lancer ou un défi appartient à un utilisateur réel/);
 assert.match(schema,/couple_advent','opened_by/);
 assert.match(schema,/couple_events','actor_id/);
 assert.match(schema,/love_card_draw_history','recipient_user_id/);
 assert.match(schema,/love_custom_challenges','recipient_user_id/);
 assert.match(schema,/love_all_dice_reset_audit','actor_id/);
 assert.match(schema,/love_cycle_excluded_cards','excluded_by/);
 assert.match(schema,/love_personal_sexual_cards','drawer_user_id/);
 assert.match(schema,/love_personal_sexual_cards','recipient_user_id/);
 assert.match(schema,/love_venice_preview_trials','requested_by/);
 assert.match(schema,/love_weekly_reset_audit','actor_id/);
 assert.match(schema,/public\.love_couple_free_trials t/);
 assert.match(schema,/s\.user_id=t\.first_user_id/);
 assert.match(schema,/s\.user_id=t\.second_user_id/);
 assert.match(schema,/Essai lié à un utilisateur réel : purge interdite/);
 assert.match(schema,/Auteur externe dans les données du jeu/);
 assert.match(schema,/x\.source_couple_id=v_pool\.couple_id/);
 assert.match(schema,/s\.admin_id=p_admin AND s\.user_id=x\.user_id/);
 assert.match(schema,/x\.referrer_couple_id IS NOT NULL/);

 assert.match(schema,/public\.love_studio_test_audit/);
 assert.match(schema,/love_studio_test_audit ENABLE ROW LEVEL SECURITY/);
 assert.match(schema,/REVOKE ALL ON public\.love_studio_test_audit FROM PUBLIC,anon,authenticated/);
 assert.match(schema,/GRANT SELECT,INSERT ON public\.love_studio_test_audit TO service_role/);
 assert.match(source,/async function auditStudio\(/);
 assert.match(source,/auditStudio\('create_requested'\)/);
 assert.match(source,/auditStudio\('login_requested'\)/);
 assert.match(source,/auditStudio\('delete_requested'\)/);
 assert.doesNotMatch(source,/auditStudio\([^)]*token_hash/);
  assert.match(schema,/GRANT EXECUTE ON FUNCTION public\.love_studio_purge_test_couple/);
 assert.match(source,/\.eq\('couple_id',pool\.couple_id\)/);
 assert.match(source,/\.eq\('session_id',latest\.id\)/);
 assert.match(source,/card_title,card_description,category,face,created_at/);
 assert.match(source,/challenge_preview:challenges\.map/);
 assert.match(source,/\{count:'exact'\}/);
 assert.match(source,/\.order\('created_at',\{ascending:false\}\)\.limit\(3\)/);
 assert.match(source,/challenges_total:challengeResult\.count/);
 assert.match(source,/Diagnostic temporairement indisponible/);
 assert.match(source,/service\.rpc\('love_studio_purge_test_couple'/);
 assert.match(source,/service\.auth\.admin\.deleteUser/);
 assert.match(guard,/error\?\.status===404\|\|error\?\.code==='user_not_found'/);
 assert.match(source,/Identité Auth non vérifiable; registre conservé/);
 assert.match(source,/Réponse Auth incomplète; registre conservé/);
 assert.match(schema,/REVOKE ALL ON public\.love_studio_test_pools FROM PUBLIC,anon,authenticated/);
});

test('staging A/B recipe clicks only controls shipped by the real production game',()=>{
 const recipe=readFileSync(new URL('studio-authenticated-e2e.cjs',import.meta.url),'utf8');
 const home=readFileSync(new URL('premium-home.mjs',import.meta.url),'utf8');
 const surprise=readFileSync(new URL('premium-surprise.mjs',import.meta.url),'utf8');
 const game=readFileSync(new URL('app.js',import.meta.url),'utf8');
 const category=readFileSync(new URL('evening-challenges.mjs',import.meta.url),'utf8');
 const confirmation=readFileSync(new URL('evening-category-confirm.mjs',import.meta.url),'utf8');
 assert.match(home,/data-action="roll:weekly"/);
 assert.match(surprise,/button\('roll:monthly_activity'/);
 assert.match(game,/button\('new-session'/);
 assert.match(game,/button\('my-d6'/);
 assert.match(game,/button\('new-challenge'/);
 assert.match(category,/EVENING_CATEGORIES=\['SENSUEL','SEXUEL'\]/);
 assert.match(recipe,/category:SENSUEL/);
 assert.match(confirmation,/data-confirm-action="yes"/);
 assert.doesNotMatch(recipe,/category:HASARD|lr-dialog-accept/,
  'staging must not click fictional controls absent from real LoveRoll');
});
