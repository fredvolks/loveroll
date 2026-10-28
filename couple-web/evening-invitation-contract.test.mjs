import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const app=source('app.js');
const sql=source('migrations/20261028_lr028_evening_invitation.sql');
const sw=source('service-worker.js');
const stage=source('premium-evening.mjs');
const sync=source('couple-live-sync.mjs');

test('server verifies exact couple, recipient, one invitation per Québec day',()=>{
 for(const rule of [
  'constraint love_evening_invitation_one_per_day unique(couple_id,local_day)',
  'sender_id<>recipient_id','couple_private.is_member(p_couple)',
  'auth.uid()','recipient_id<>auth.uid()',
  "at time zone 'America/Toronto'",
  'for update','p_answer not in',
  "('yes','no','maybe','ignored')",
  'love_evening_invite_available(p_couple,recipient)'
 ]) assert.ok(sql.toLowerCase().includes(rule.toLowerCase()),rule);
 assert.match(sql,/revoke all on public\.love_evening_invitations from public,anon,authenticated/i);
 assert.match(sql,/grant select on public\.love_evening_invitations to authenticated/i);
 assert.match(sql,/if row_inv\.status not in \('pending','maybe'\)/);
});
test('invitation RPCs never draw dice or create sessions',()=>{
 assert.doesNotMatch(sql,/\b(insert into public\.couple_(?:sessions|personal_rolls|rolls)|perform public\.ensure_couple_session)\b/i);
 assert.match(sql,/love_evening_invite_status\(p_couple uuid\)/);
 assert.match(sql,/love_evening_invite_send\(p_couple uuid\)/);
 assert.match(sql,/love_evening_invite_respond\(/);
 assert.match(sql,/couple_personal_rolls/);
 assert.match(sql,/couple_sessions/);
 assert.match(sql,/weekly_created/);
});
test('Push is opt-in and private while in-app invite always exists',()=>{
 assert.match(sql,/from public\.love_push_preferences p[\s\S]*?p\.enabled and p\.invitation/);
 assert.match(sql,/on conflict\(user_id,event_key\) do nothing/);
 assert.match(sql,/♥ Une invitation LoveRoll t''attend/);
 assert.doesNotMatch(sql,/select .*card_title/i);
 assert.match(sw,/kind==='invitation'\?'session'/);
});
test('Yes only navigates and optionally starts real server session; D6 still by user',()=>{
 assert.match(app,/if\(verb==='evening-invite'\)/);
 assert.match(app,/rpc\('love_evening_invite_respond'/);
 assert.match(app,/rpc\('ensure_couple_session'/);
 const block=app.slice(app.indexOf("if(verb==='evening-invite')"),app.indexOf("if(verb==='eclat')"));
 assert.doesNotMatch(block,/roll_my_evening_d6|animateRoll|new-challenge/);
 assert.match(stage,/invitationHtml/);
 assert.match(sync,/love_evening_invite_status/);
 assert.match(app,/eveningInviteInboxHtml\(state\.eveningInvite/);
 assert.match(app,/table:'love_evening_invitations',filter:'couple_id=eq.'/);
 assert.match(app,/eveningInviteHtml\(state\.eveningInvite/);
});
test('private read has realtime/polling fallback and no forced Push permission',()=>{
 assert.match(sync,/if\(remote\.invitation&&/);
 assert.match(app,/state\.eveningInvite=await rpc\('love_evening_invite_status'/);
 assert.doesNotMatch(app.slice(app.indexOf("if(verb==='evening-invite')"),app.indexOf("if(verb==='eclat')")),/Notification\.requestPermission|enablePush/);
});
