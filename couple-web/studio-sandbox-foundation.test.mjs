import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../supabase/functions/love-studio-sandbox/index.ts',import.meta.url),'utf8');
const schema=readFileSync(new URL('migrations/20261027_love_studio_real_sandbox_foundation.sql',import.meta.url),'utf8');
test('studio backend only acts for verified platform administrators',()=>{
 assert.match(source,/service\.auth\.getUser\(token\)/);
 assert.match(source,/email_confirmed_at/);
 assert.match(source,/\.from\('love_platform_admins'\)/);
 assert.match(source,/\.eq\('user_id',adminId\)/);
 assert.match(source,/origin!==.https:\/\/fredvolks\.github\.io./);
});
test('two real Auth users are generated without pre-known credentials',()=>{
 assert.match(source,/service\.auth\.admin\.createUser/);
 assert.match(source,/email_confirm:true/);
 assert.match(source,/app_metadata:\{love_studio_test:true,love_studio_admin:adminId\}/);
 assert.match(source,/service\.from\('couple_members'\)\.insert/);
 assert.match(source,/service\.from\('couple_profiles'\)\.insert/);
 assert.match(source,/service\.from\('couples'\)/);
 assert.doesNotMatch(source,/Math\.random\(/);
});
test('seat auth uses official one-time magiclink and fixed registry',()=>{
 assert.match(source,/\.eq\('seat',seat\)\.maybeSingle\(\)/);
 assert.match(source,/type:'magiclink'/);
 assert.match(source,/link\.properties\.hashed_token/);
 assert.match(source,/love_studio_admin!==adminId/);
});
test('only registered test couples and identities are eligible for deletion',()=>{
 assert.match(schema,/public\.love_studio_test_pools/);
 assert.match(schema,/public\.love_studio_test_seats/);
 assert.match(schema,/auth\.role\(\) IS DISTINCT FROM 'service_role'/);
 assert.match(schema,/Membre réel détecté/);
 assert.match(schema,/public\.love_user_library_backup/);
 assert.match(schema,/Lien vers un utilisateur ou un couple réel/);
 assert.match(schema,/x\.source_couple_id=v_pool\.couple_id/);
 assert.match(schema,/s\.admin_id=p_admin AND s\.user_id=x\.user_id/);
 assert.match(schema,/x\.referrer_couple_id IS NOT NULL/);

 assert.match(schema,/GRANT EXECUTE ON FUNCTION public\.love_studio_purge_test_couple/);
 assert.match(source,/\.eq\('couple_id',pool\.couple_id\)/);
 assert.match(source,/\.eq\('session_id',latest\.id\)/);
 assert.match(source,/Diagnostic temporairement indisponible/);
 assert.match(source,/service\.rpc\('love_studio_purge_test_couple'/);
 assert.match(source,/service\.auth\.admin\.deleteUser/);
 assert.match(schema,/REVOKE ALL ON public\.love_studio_test_pools FROM PUBLIC,anon,authenticated/);
});
