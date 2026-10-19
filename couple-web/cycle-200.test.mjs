import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {cycleIntensityQuestionnaireHtml} from './cycle-questionnaire.mjs';
import {futureCoupleStyleMix,chooseFutureStyle} from './play-style.mjs';
const read=path=>readFileSync(new URL('./'+path,import.meta.url),'utf8');
const sql=read('migrations/20261018_challenge_cycles_and_recycled_passes.sql');
const stylesSql=read('migrations/20261018_future_style_5050.sql');
const passesSql=read('migrations/20261018_play_style_and_pass_quota.sql');
const app=read('app.js');

test('Dons et passes se réinitialisent au 1er du mois au Québec, pour chaque personne',()=>{
 assert.match(passesSql,/AT TIME ZONE 'America\/Toronto'/);
 assert.match(passesSql,/PARTITION BY q\.recipient/);
 assert.match(passesSql,/chronicle\.sequence<=3/);
 // Existing gifts are keyed to a calendar month; resetting cards must not
 // delete gifts or alter the current per-person monthly gift counter.
 assert.match(app,/g\.donor_user_id===uid&&g\.month_key\?\.slice\(0,7\)===month\(\)/);
 assert.doesNotMatch(sql,/delete from public\.couple_challenge_gifts/i);
 assert.doesNotMatch(sql,/truncate .*gift/i);
});

test('A passed challenge returns into the card pool while still shown in history',()=>{
 assert.match(sql,/if p_status='passed' then[\s\S]*?delete from public\.love_card_draw_history h/);
 assert.match(sql,/h\.recipient_user_id=c\.recipient/);
 assert.match(sql,/h\.category=c\.category and h\.card_id=c\.card_id/);
 assert.match(sql,/and used\.status<>'passed'/);
 assert.match(sql,/update public\.couple_challenges set status=p_status/);
 assert.doesNotMatch(sql,/delete from public\.couple_challenges/i);
});

test('200 completed challenges open the pair questionnaire only after a counted evening',()=>{
 assert.match(sql,/challenge_cycle_target integer not null default 200/);
 assert.match(sql,/challenge_cycle_pending boolean not null default false/);
 assert.match(sql,/join public\.couple_sessions ss on ss\.id=cc\.session_id/);
 assert.match(sql,/ss\.counted=true/);
 assert.match(sql,/cc\.status='completed'/);
 assert.match(sql,/if cycle_completed>=cycle_goal then/);
 assert.match(sql,/challenge_cycle_pending=true/);
 assert.match(sql,/if p_count then[\s\S]*?cycle_completed/);
 assert.match(sql,/Répondez au questionnaire des 200 défis/);
});

test('Questionnaire personnel présente trois choix, puis attend le deuxième partenaire',()=>{
 const normal=cycleIntensityQuestionnaireHtml({
  status:{pending:true,answered_self:false,cycle:1},style:'medium',partnerName:'Alex'
 });
 assert.match(normal,/200 défis à deux/);
 for(const code of ['down','same','up'])assert.match(normal,new RegExp('data-action="cycle-answer:'+code+'"'));
 assert.match(normal,/Votre intensité actuelle : <strong>Medium<\/strong>/);
 const soft=cycleIntensityQuestionnaireHtml({status:{pending:true},style:'soft'});
 assert.match(soft,/data-action="cycle-answer:down" disabled/);
 const intense=cycleIntensityQuestionnaireHtml({status:{pending:true},style:'intense'});
 assert.match(intense,/data-action="cycle-answer:up" disabled/);
 const waiting=cycleIntensityQuestionnaireHtml({
  status:{pending:true,answered_self:true},style:'soft',partnerName:'Alex'
 });
 assert.match(waiting,/En attente de Alex/);
 assert.doesNotMatch(waiting,/data-action="cycle-answer:/);
 assert.equal(cycleIntensityQuestionnaireHtml({status:{pending:false}}),'');
});

test('Each partner responds once, changes intensity by one notch, then new cycle starts atomically',()=>{
 assert.match(sql,/primary key\(couple_id,cycle_number,user_id\)/);
 assert.match(sql,/choice in \('down','same','up'\)/);
 assert.match(sql,/on conflict\(couple_id,cycle_number,user_id\) do nothing/);
 assert.match(sql,/if v_total=2 and v_received=2 then/);
 assert.match(sql,/when 'up' then case p\.play_style when 'soft' then 'medium'/);
 assert.match(sql,/when 'down' then case p\.play_style when 'intense' then 'medium'/);
 assert.match(sql,/challenge_cycle_number=challenge_cycle_number\+1/);
 assert.match(sql,/challenge_cycle_pending=false/);
 assert.match(sql,/delete from public\.love_card_draw_history where couple_id=p_couple/);
 assert.match(app,/rpc\('answer_love_cycle_intensity'/);
 assert.match(app,/state\.cycleStatus\?\.pending/);
 assert.match(app,/cycleIntensityQuestionnaireHtml/);
 assert.match(app,/cycle-reopen/);
});

test('Admin reset starts a NEW shuffle bag, never clears stored cards/results/history',()=>{
 assert.match(sql,/function public\.reset_love_challenges_admin/);
 assert.match(sql,/v_owner is distinct from auth\.uid\(\)/);
 assert.match(sql,/not couple_private\.is_member\(p_couple\)/);
 assert.match(sql,/finished_at is null/);
 assert.match(sql,/delete from public\.love_card_draw_history where couple_id=p_couple/);
 for(const source of ['couple_challenges','couple_sessions','couple_challenge_gifts',
  'couple_profiles','love_custom_challenges'])
  assert.doesNotMatch(sql,new RegExp('delete from public\\.'+source+'\\b','i'));
 assert.match(app,/button\('admin-reset-challenges'/);
 assert.match(app,/rpc\('reset_love_challenges_admin'/);
 assert.match(app,/premiumConfirm\([\s\S]*?Recommencer un nouveau cycle/);
 assert.match(app,/Une confirmation/); // Existing admin reset-ALL-dice notice remains
});

test('50/50 choice is correct for two different intensity card collections',()=>{
 assert.deepEqual(futureCoupleStyleMix('soft','intense'),[
  {style:'soft',weight:50},{style:'intense',weight:50}
 ]);
 assert.deepEqual(futureCoupleStyleMix('soft','soft'),[{style:'soft',weight:100}]);
 assert.equal(chooseFutureStyle('soft','intense',0.49),'soft');
 assert.equal(chooseFutureStyle('soft','intense',0.5),'intense');
 assert.equal(chooseFutureStyle('medium','medium',0.99),'medium');
 assert.throws(()=>chooseFutureStyle('soft','intense',1));
 assert.match(stylesSql,/if random\(\)<0\.5 then return a/);
 assert.match(stylesSql,/if a=b then return a/);
 assert.match(sql,/create table if not exists public\.love_future_style_cards/);
 assert.match(sql,/card_id integer not null check\(card_id between 1 and 100\)/);
 assert.match(sql,/style in \('soft','medium','intense'\)/);
 assert.doesNotMatch(sql,/couple_private\.pick_future_love_style\(s\.couple_id\)/);
});

test('Confirmation cancelled does not request an admin reset',async()=>{
 const start=app.indexOf(" if(verb==='admin-reset-challenges'){");
 const end=app.indexOf(" if(verb==='cycle-answer'){",start);
 assert.ok(start>=0&&end>start);
 const calls=[],state={coupleId:'duo',session:null};
 const context={state,isLoveAdmin:()=>true,
  premiumConfirm:async()=>{calls.push('confirm');return false},
  rpc:async name=>calls.push(name),reload:async()=>calls.push('reload')};
 const fn=vm.runInNewContext('(async function(verb){'+app.slice(start,end)+'})',context);
 await fn('admin-reset-challenges');
 assert.deepEqual(calls,['confirm']);
});

test('On confirmed admin reset, only the secure server RPC is called',async()=>{
 const start=app.indexOf(" if(verb==='admin-reset-challenges'){");
 const end=app.indexOf(" if(verb==='cycle-answer'){",start);
 const calls=[],state={coupleId:'duo',session:null,cycleDeferred:42};
 const context={state,isLoveAdmin:()=>true,
  premiumConfirm:async()=>true,
  rpc:async(name,args)=>{calls.push([name,args]);return {cycle:2}},
  reload:async()=>calls.push(['reload']),notify:()=>calls.push(['notify'])};
 const fn=vm.runInNewContext('(async function(verb){'+app.slice(start,end)+'})',context);
 await fn('admin-reset-challenges');
 assert.equal(calls[0][0],'reset_love_challenges_admin');
 assert.equal(calls[0][1].p_couple,'duo');
 assert.deepEqual(calls.slice(1).map(c=>c[0]),['reload','notify']);
 assert.equal(state.cycleDeferred,null);
});

test('Changer de bibliothèque SEXUEL pendant le cycle préserve les cartes déjà pigées',()=>{
 const modeSql=read('migrations/20261018_midcycle_auto_or_custom_sexual_cards.sql');
 assert.match(modeSql,/sexual_card_mode text not null default 'custom'/);
 assert.match(modeSql,/set_love_sexual_card_mode\(p_couple uuid,\s*p_mode text\)/);
 assert.match(modeSql,/p_mode not in \('automatic','custom'\)/);
 assert.match(modeSql,/owner_user_id into v_owner/);
 assert.match(modeSql,/couple_private\.is_member\(p_couple\)/);
 const setter=modeSql.slice(modeSql.indexOf('CREATE OR REPLACE FUNCTION public.set_love_sexual_card_mode'),modeSql.indexOf('revoke all on function public.set_love_sexual_card_mode'));
 assert.doesNotMatch(setter,/delete from public\.love_card_draw_history|delete from public\.couple_challenges|challenge_cycle_number\s*=/i);
 assert.match(modeSql,/couple_private\.love_active_challenges cc/);
 assert.match(modeSql,/couple_private\.ensure_love_style_pool\(s\.couple_id\)/);
 assert.match(modeSql,/role_total\/2/);
 assert.match(modeSql,/position<=case when v_styles\[1\]=v_styles\[2\]/);
 assert.match(app,/data-sexual-mode-editor="true"/);
 assert.match(app,/rpc\('set_love_sexual_card_mode'/);
 assert.match(app,/state\.couple\?\.sexual_card_mode==='automatic'/);
 assert.match(app,/state\.tab='settings';settingsOpenSection='admin';renderSettings\(\)/);
});

test('Private MEDIUM copy is seeded once per duo, editable without changing common cards',()=>{
 const personal=read('migrations/20261018_private_medium_prefilled_editor_cards.sql');
 const editors=read('editorial-editors.mjs');
 assert.match(personal,/create table if not exists public\.love_personal_sexual_cards/);
 assert.match(personal,/references public\.couples\(id\) on delete cascade/);
 assert.match(personal,/alter table public\.love_personal_sexual_cards enable row level security/);
 assert.match(personal,/grant select on public\.love_personal_sexual_cards to authenticated/);
 assert.match(personal,/c\.owner_user_id=\(select auth\.uid\(\)\)/);
 assert.match(personal,/and couple_private\.is_member\(c\.id\)/);
 assert.match(personal,/on conflict \(couple_id,card_id\) do nothing/);
 assert.match(personal,/f\.style='medium'/);
 assert.match(personal,/v_saved<>100/);
 assert.match(personal,/set_love_sexual_card_mode\(p_couple uuid,p_mode text\)/);
 assert.match(personal,/perform couple_private\.ensure_love_personal_sexual_cards\(p_couple\)/);
 assert.match(personal,/save_love_personal_sexual_card/);
 assert.match(personal,/restore_love_personal_sexual_card/);
 assert.match(personal,/import_love_personal_sexual_cards/);
 assert.match(personal,/pc\.couple_id,'SEXUEL'::text/);
 assert.match(personal,/c\.sexual_card_mode='custom'/);
 assert.match(app,/query\('love_personal_sexual_cards'/);
 assert.match(app,/state\.personalSexualCardsReady=personalSexualCards\.length===100/);
 assert.match(app,/state\.customCategory='SEXUEL';state\.customSlot=1/);
 assert.match(app,/rpc\('save_love_personal_sexual_card'/);
 assert.match(app,/rpc\('restore_love_personal_sexual_card'/);
 assert.match(app,/rpc\('import_love_personal_sexual_cards'/);
 assert.match(editors,/Restaurer la version MEDIUM/);
 assert.match(editors,/Ces cartes ne sont pas partagées avec d’autres couples/);
 // Import and edit requests for SENSUEL still follow the prior RPC.
 assert.match(app,/else if\(preview\.kind==='evening'\)\s+await rpc\('import_love_evening_library'/);
 assert.match(app,/else\{\s+await rpc\('save_love_card_with_roles'/);
 // The new personal RPC must never edit the future/default libraries or prior cards.
 const saver=personal.slice(personal.indexOf('create or replace function public.save_love_personal_sexual_card'),
  personal.indexOf('revoke all on function public.save_love_personal_sexual_card'));
 assert.doesNotMatch(saver,/update public\.love_future_style_cards|delete from public\.love_custom_challenges|truncate/i);
});
