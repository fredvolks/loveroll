import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path=new URL('./sql-proposals/future-card-archive-locked.sql',import.meta.url);
const sql=readFileSync(path,'utf8');
test('staging-only future archive is separate from live D100 and payment',()=>{
 assert.match(sql,/staging-only SERVER ARCHIVE SCHEMA PROPOSAL/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.love_future_card_archive_versions/);
 assert.match(sql,/REFERENCES public\.couples\(id\) ON DELETE CASCADE/);
 assert.match(sql,/REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
 assert.match(sql,/CHECK \(level IN \('soft','medium','intense'\)\)/);
 assert.match(sql,/jsonb_array_length\(cards\) = 100/);
 assert.match(sql,/UNIQUE \(couple_id,member_id,level,version_no\)/);
 assert.match(sql,/BEGIN;[\s\S]*COMMIT;/);
 assert.doesNotMatch(sql,/draw_for_partner|love_respond_and_redraw|love_platform_settings/i);
});
test('archive has forced member-only RLS and no client write or payment RPC',()=>{
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/FORCE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE public\.love_future_card_archive_versions\s+FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT SELECT ON TABLE public\.love_future_card_archive_versions TO authenticated/);
 assert.match(sql,/FOR SELECT TO authenticated USING/);
 assert.match(sql,/public\.love_verified_identity\(\)/);
 assert.match(sql,/member_id = \(SELECT auth\.uid\(\)\)/);
 assert.match(sql,/couple_private\.is_member\(couple_id\)/);
 assert.doesNotMatch(sql,/\bGRANT\s+(INSERT|UPDATE|DELETE|ALL|EXECUTE)\b/i);
 assert.doesNotMatch(sql,/CREATE\s+(OR REPLACE\s+)?FUNCTION/i);
});
test('real postgres fixture tests partner and outsider privacy plus invalid 100-card archive',()=>{
 const smoke=readFileSync(new URL(
  './sql-proposals/future-card-archive-postgres.test.sql',import.meta.url),'utf8');
 assert.match(smoke,/Partner B archive leaked to A/);
 assert.match(smoke,/Outsider C should only see own unrelated couple/);
 assert.match(smoke,/Anonymous identity with authenticated role leaked rows/);
 assert.match(smoke,/has_table_privilege/);
 assert.match(smoke,/check_violation/);
 const wf=readFileSync(new URL(
  '../.github/workflows/loveroll-future-card-archive-postgres.yml',import.meta.url),'utf8');
 assert.match(wf,/postgres:17/);
 assert.match(wf,/future_card_archive_test/);
 assert.match(wf,/future-card-archive-postgres\.test\.sql/);
});
