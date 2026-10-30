import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('./lr026-server-variety.sql',import.meta.url),'utf8');

test('LR-026: live draw functions require reviewed fingerprints before replacement',()=>{
 assert.match(sql,/BEGIN;[\s\S]*?DO \$lr026_guard\$/);
 assert.match(sql,/b85aab4563ec7e04956bd059d91479fa/);
 assert.match(sql,/d3b15210682919a56242ba996994f6b2/);
 assert.match(sql,/pg_catalog\.md5\(v_draw\)/);
 assert.match(sql,/pg_catalog\.md5\(v_redraw\)/);
 assert.match(sql,/fonctions de pige ont changé/);
 assert.match(sql,/COMMIT;/);
});

test('LR-026: candidate ordering is modified ONLY AFTER official eligibility',()=>{
 assert.match(sql,/v_original := ' order by random\(\) limit 1;/);
 assert.match(sql,/v_original_redraw := ' ORDER BY random\(\) LIMIT 1;/);
 assert.match(sql,/v_replacement := ' order by couple_private\.love_variety_rank\('/);
 assert.match(sql,/v_replacement_redraw := ' ORDER BY couple_private\.love_variety_rank\('/);
 assert.match(sql,/ASC, random\(\) limit 1;/);
 assert.match(sql,/ASC, random\(\) LIMIT 1;/);
 assert.match(sql,/pg_catalog\.length\(v_revised\) -/);
 assert.equal((sql.match(/\bEXECUTE pg_catalog\.replace\(/g)||[]).length,2);
 assert.ok(!/\bUPDATE\s+public\.couples\b/i.test(sql));
 assert.ok(!/\bDELETE\s+FROM\s+public\.love_card_draw_history\b/i.test(sql));
});

test('LR-026: history and candidates are restricted to this couple/session/category',()=>{
 assert.match(sql,/seen\.couple_id=p_couple AND seen\.session_id=p_session/);
 assert.match(sql,/active\.couple_id=p_couple/);
 assert.match(sql,/active\.category=p_category AND active\.card_id=p_card_id/);
 assert.match(sql,/base\.category=p_category AND base\.card_id=p_card_id/);
 assert.match(sql,/AND seen\.category=p_category AND seen\.card_id=p_card_id/);
 assert.match(sql,/WHEN EXISTS \(\s+SELECT 1 FROM public\.couple_challenges seen\s+CROSS JOIN candidate current_card/);
 assert.ok(sql.indexOf('AND seen.category=p_category AND seen.card_id=p_card_id') <
            sql.indexOf('AND couple_private.love_variety_near('),
            'Exact previously drawn cards must skip semantic comparisons');
 assert.match(sql,/p_session,s\.couple_id,v_cat,card/);
 assert.match(sql,/v_old\.session_id,v_couple,v_old\.category,candidate\.card/);
});

test('LR-026: helper functions are private with no new client permissions',()=>{
 for(const name of ['love_variety_normalize','love_variety_near','love_variety_rank']){
  assert.match(sql,new RegExp('CREATE OR REPLACE FUNCTION couple_private\\.'+name+'\\('));
 }
 assert.equal((sql.match(/REVOKE ALL ON FUNCTION couple_private\./g)||[]).length,3);
 assert.ok(!/GRANT\s+EXECUTE\s+ON/i.test(sql));
 assert.ok(!/CREATE OR REPLACE FUNCTION public\./i.test(sql));
 assert.match(sql,/SECURITY INVOKER/);
});

test('LR-026: exact titles plus meaningful content similarity and non-blocking fallback',()=>{
 assert.match(sql,/a_title=b_title/);
 assert.match(sql,/pg_catalog\\.length\\(a_desc\\)<24/);
 assert.match(sql,/LANGUAGE plpgsql IMMUTABLE SET search_path=''/);
 assert.match(sql,/FOREACH word IN ARRAY a_tokens/);
 assert.match(sql,/pg_catalog\\.array_position\\(b_tokens,word\\)/);
 assert.match(sql,/pg_catalog\.cardinality\(/);
 assert.match(sql,/shared>=5 AND shared\*100 >= 68\*/);
 assert.match(sql,/THEN 1[\s\S]*?ELSE 0 END/);
 assert.match(sql,/ASC, random\(\) LIMIT 1;/);
 assert.match(sql,/NE PAS appliquer en production/);
});

test('LR-026: post-installation verification aborts before commit if either RPC patch is missing',()=>{
 assert.match(sql,/DO \$lr026_postcheck\$/);
 assert.match(sql,/pg_catalog\.strpos\(v_normal,/);
 assert.match(sql,/pg_catalog\.strpos\(v_replace,/);
 assert.match(sql,/intégration RPC incomplète, rollback/);
 assert.match(sql,/fonctions privées manquantes, rollback/);
 assert.ok(sql.indexOf('DO $lr026_guard$') <
           sql.indexOf('DO $lr026_apply$'));
 assert.ok(sql.indexOf('DO $lr026_apply$') <
           sql.indexOf('DO $lr026_postcheck$'));
 assert.ok(sql.indexOf('DO $lr026_postcheck$') <
           sql.lastIndexOf('COMMIT;'));
});

test('LR-026: each PL/pgSQL DO block closes with END; before its dollar delimiter',()=>{
 const smoke=readFileSync(new URL('./lr026-server-variety-smoke.sql',import.meta.url),'utf8');
 for(const tag of ['guard','apply','postcheck']){
  assert.ok(sql.includes('END; $lr026_'+tag+'$;'),
   'Missing END; on the '+tag+' block');
  assert.ok(!sql.includes('END $lr026_'+tag+'$;'),
   'Invalid END without semicolon on '+tag);
 }
 assert.ok(smoke.includes('END; $lr026_test$;'));
});

test('LR-026: exact history short-circuits semantic comparisons before text matching',()=>{
 const rank=sql.slice(
   sql.indexOf('CREATE OR REPLACE FUNCTION couple_private.love_variety_rank('),
   sql.indexOf('REVOKE ALL ON FUNCTION couple_private.love_variety_normalize('));
 assert.match(rank,/SELECT CASE\s+WHEN EXISTS \(/);
 assert.match(rank,/AND seen\.category=p_category AND seen\.card_id=p_card_id/);
 assert.match(rank,/WHEN EXISTS \([\s\S]*?couple_private\.love_variety_near\(/);
 assert.ok(rank.indexOf('AND seen.category=p_category AND seen.card_id=p_card_id') <
            rank.indexOf('couple_private.love_variety_near('));
 assert.match(rank,/ELSE 0 END;/);
});
