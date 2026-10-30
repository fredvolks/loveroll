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
 assert.match(sql,/seen\.category=p_category AND seen\.card_id=p_card_id/);
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
 assert.match(sql,/shared>=5 AND shared\*100 >= 68\*/);
 assert.match(sql,/THEN 1 ELSE 0 END/);
 assert.match(sql,/ASC, random\(\) LIMIT 1;/);
 assert.match(sql,/NE PAS appliquer en production/);
});
