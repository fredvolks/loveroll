import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('./sql-proposals/future-card-regeneration-transaction.sql',import.meta.url),'utf8');
const smoke=readFileSync(new URL('./sql-proposals/future-card-regeneration-transaction.test.sql',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/loveroll-future-card-archive-postgres.yml',import.meta.url),'utf8');
test('transaction proposal cannot change active D100 or grant paid access',()=>{
 assert.match(sql,/STAGING ONLY/);
 assert.match(sql,/SECURITY INVOKER SET search_path=''/);
 assert.match(sql,/REVOKE ALL ON FUNCTION couple_private\.apply_future_archive_regeneration/);
 assert.match(sql,/REVOKE ALL ON TABLE couple_private\.love_future_verified_regen_receipts/);
 assert.doesNotMatch(sql,/draw_for_partner|love_respond_and_redraw|love_platform_settings/);
 assert.doesNotMatch(sql,/\bGRANT\s+(EXECUTE|INSERT|UPDATE|DELETE|ALL)\b/i);
 assert.doesNotMatch(sql,/\bcheckout\b|\bcharge\b|\bstripe\b/i);
});
test('a locked verified receipt is consumed only with a new archived version',()=>{
 assert.match(sql,/WHERE id=p_receipt_id FOR UPDATE/);
 assert.match(sql,/FROM public\.couples WHERE id=r\.couple_id FOR UPDATE/);
 assert.match(sql,/amount_cad_cents=400/);
 assert.match(sql,/v_baseline<>1/);
 assert.match(sql,/love_future_regen_next_utc\(v_last_generated\)/);
 assert.match(sql,/INTERVAL '2 months'/);
 assert.match(sql,/AT TIME ZONE 'UTC'/);
 assert.match(sql,/LEAST\(EXTRACT\(day FROM v_utc\)::integer,v_last_day\)/);
 assert.match(smoke,/July 31 should clamp to September 30/);
 assert.match(smoke,/December 31 should clamp to February 28/);
 assert.match(smoke,/Leap-year February 29 expected/);
 assert.match(sql,/v_now<v_next/);
 assert.match(sql,/love_future_archive_cards_valid\(p_cards,r\.level\)/);
 assert.match(sql,/Recycled cards are forbidden/);
 assert.match(sql,/RETURNING id INTO v_archive/);
 assert.match(sql,/SET consumed_at=v_now,archive_id=v_archive/);
});
test('disposable PostgreSQL checks client access, partner isolation, duplicates and cooldown',()=>{
 for(const phrase of ['Client can see payment proof','Original A archive lost',
 'Duplicate receipt accepted','Cooldown bypassed','Partner isolation failed',
 'Cross-couple receipt accepted','Recycled cards were accepted after cooldown'])
  assert.ok(smoke.includes(phrase),phrase);
 assert.match(workflow,/future-card-regeneration-transaction\.sql/);
 assert.match(workflow,/future-card-regeneration-transaction\.test\.sql/);
 const race=readFileSync(new URL('./sql-proposals/future-card-regeneration-race.test.sh',import.meta.url),'utf8');
 assert.match(workflow,/future-card-regeneration-race\.test\.sh/);
 assert.match(race,/two-receipts/);
 assert.match(race,/same-receipt/);
 assert.match(race,/Refusing non-test database/);
 assert.match(race,/Two-receipt race consumed more than one receipt/);
});
