import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('migrations/20261027_love_studio_exclude_analytics.sql',import.meta.url),'utf8');
test('real test users/couples never inflate platform metrics',()=>{
 assert.match(sql,/not exists\(select 1 from public\.love_studio_test_seats s where s\.user_id=u\.id\)/);
 assert.match(sql,/raw_app_meta_data->>'love_studio_test' IS DISTINCT FROM 'true'/);
 assert.match(sql,/not exists\(select 1 from public\.love_studio_test_pools t where t\.couple_id=paired\.couple_id\)/);
 assert.match(sql,/t\.couple_id=r\.couple_id/);
 assert.match(sql,/t\.couple_id=x\.couple_id/);
 assert.match(sql,/public\.love_platform_is_admin\(\)/);
});
