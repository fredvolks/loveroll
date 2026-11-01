// Static migration contracts only: real two-device/RLS/Postgres integration
// is still required before enabling the LoveRoll LR-019 interface.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('./love-evening-favorites.sql',import.meta.url),'utf8');

test('LR-019: the five-heart list is unique, shared by couple, and member-private',()=>{
 assert.match(sql,/create table if not exists public\.love_evening_favorites\(/);
 assert.match(sql,/couple_id uuid not null references public\.couples\(id\) on delete cascade/);
 assert.match(sql,/primary key\(couple_id,category,card_id\)/);
 assert.match(sql,/category in \('SENSUEL','SEXUEL'\)/);
 assert.match(sql,/card_id between 1 and 35/);
 assert.match(sql,/added_by uuid not null references auth\.users\(id\)/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/for select to authenticated\s+using\(couple_private\.is_member\(couple_id\)\)/);
 assert.match(sql,/revoke all on public\.love_evening_favorites from public,anon,authenticated/);
 assert.match(sql,/grant select on public\.love_evening_favorites to authenticated/);
 assert.doesNotMatch(sql,/grant (insert|update|delete|all) on public\.love_evening_favorites to authenticated/i);
});

test('LR-019: both members can atomically add, remove and replace, without duplicate or sixth heart',()=>{
 assert.match(sql,/create or replace function public\.save_love_evening_favorite\(/);
 assert.match(sql,/language plpgsql security definer set search_path=''/);
 assert.match(sql,/if auth\.uid\(\) is null then/);
 assert.match(sql,/from public\.couples where id=p_couple for update/);
 assert.match(sql,/not couple_private\.is_member\(p_couple\)/);
 assert.match(sql,/p_action not in \('add','remove','replace'\)/);
 assert.match(sql,/if p_action='remove' then/);
 assert.match(sql,/if p_action='replace' then/);
 assert.match(sql,/delete from public\.love_evening_favorites/);
 assert.match(sql,/if v_count>=5 then/);
 assert.match(sql,/insert into public\.love_evening_favorites\(/);
 assert.match(sql,/if not exists\(\s*select 1 from public\.love_evening_favorites f/);
 assert.match(sql,/if p_card_id>25 and not exists\(/);
 assert.match(sql,/public\.love_custom_challenges c/);
 assert.match(sql,/raise exception 'Favori à remplacer introuvable'/);
 assert.match(sql,/revoke all on function public\.save_love_evening_favorite\([\s\S]*?from public,anon/);
 assert.match(sql,/grant execute on function public\.save_love_evening_favorite\([\s\S]*?to authenticated/);
});

test('LR-019: a heart does not directly mutate the dice, history, or completion',()=>{
 assert.doesNotMatch(sql,/\b(delete|update|insert into)\s+public\.couple_challenges\b/i);
 assert.doesNotMatch(sql,/\b(delete|update|insert into)\s+public\.love_card_draw_history\b/i);
 assert.doesNotMatch(sql,/\b(update|delete)\s+public\.couple_sessions\b/i);
 assert.doesNotMatch(sql,/\b(draw_for_partner|answer_challenge)\s*\(/i);
 assert.match(sql,/Do NOT claim D100 replay support until/);
});
