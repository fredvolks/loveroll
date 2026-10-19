import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {profileHtml,inviteProfileHtml,profileGenderSelect} from './onboarding.mjs';
import {buildEveningLibrary,validateEveningLibrary} from './json-libraries.mjs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');

test('new and invited accounts select Homme/Femme, regardless of first name',()=>{
 const a={id:'one',email:'test1@example.com',user_metadata:{given_name:'Fred'}};
 const first=profileHtml(a,{display_name:'Fred'});
 const second=inviteProfileHtml({...a,id:'two'},{display_name:'Fred',gender:'her'});
 for(const html of [first,second]){
  assert.match(html,/id="profile-gender"/);
  assert.match(html,/<option value="him"/);
  assert.match(html,/<option value="her"/);
  assert.match(html,/required/);
 }
 assert.match(second,/value="her" selected/);
 assert.match(profileGenderSelect('him'),/value="him" selected/);
});
test('JSON accepts screenshot card 40 her->him and both / both without renumbering',()=>{
 const a=buildEveningLibrary('SENSUEL');
 const changes=[
  [40,'her','him'],[41,'him','her'],[42,'both','both'],
  [43,'both','him'],[44,'her','both'],[45,'him','him']
 ];
 for(const [id,drawer_role,recipient_role] of changes){
  a.cards[id-1]={card_id:id,title:'Défi pour tous '+id,
    description:'Un moment à deux après accord des partenaires.',
    timer_minutes:id===41?5:null,drawer_role,recipient_role};
 }
 assert.deepEqual(validateEveningLibrary(a),a);
 assert.equal(a.cards[39].drawer_role,'her');
 assert.equal(a.cards[39].recipient_role,'him');
 const old=structuredClone(a);
 old.cards=old.cards.slice(0,35);
 old.cards[0].drawer_role='owner';
 old.cards[0].recipient_role='partner';
 assert.deepEqual(validateEveningLibrary(old),old);
});
test('invalid card genders are rejected before sending to server',()=>{
 const invalid=buildEveningLibrary('SEXUEL');
 invalid.cards[0].drawer_role='someone';
 assert.throws(()=>validateEveningLibrary(invalid),/Restrictions/);
});
test('settings and save flows use profile gender not the two Fred display names',()=>{
 const app=read('app.js');
 assert.match(app,/profileGenderSelect\(state\.profile\.gender\)/);
 assert.match(app,/save_my_gender/);
 assert.match(read('editorial-ui.mjs'),/\['both','him','her'\]\.map\(role/);
 assert.match(app,/\['both','him','her'\]\.includes\(drawer\)/);
 assert.match(app,/gender:profilesAll\.find\(p=>p\.id===m\.user_id\)\?\.gender/);
 const j=read('json-library-ui.mjs');
 assert.match(j,/drawer_role/);
 assert.match(j,/recipient_role/);
 assert.match(j,/him/);
 assert.match(j,/her/);
});
test('Supabase filters 100 cards using each profile gender, respects old position roles',()=>{
 const sql=read('migrations/20261016_gender_roles_111.sql');
 assert.match(sql,/ADD COLUMN IF NOT EXISTS gender/);
 assert.match(sql,/CHECK \(gender IS NULL OR gender IN \('him','her'\)\)/);
 assert.match(sql,/FUNCTION public\.save_my_gender/);
 assert.match(sql,/FUNCTION couple_private\.love_role_allows/);
 assert.match(sql,/WHEN 'him' THEN EXISTS/);
 assert.match(sql,/WHEN 'her' THEN EXISTS/);
 assert.match(sql,/WHEN 'owner' THEN p_person=p_owner/);
 assert.match(sql,/WHEN 'partner' THEN p_person<>p_owner/);
 assert.equal((sql.match(/couple_private\.love_role_allows\(cc\.recipient_role,target,owner_id\)/g)||[]).length,3);
 assert.equal((sql.match(/couple_private\.love_role_allows\(cc\.drawer_role,auth\.uid\(\),owner_id\)/g)||[]).length,3);
 assert.match(sql,/generate_series\(1,100\)/);
 assert.match(sql,/88 else 12/);
 assert.match(sql,/love_card_draw_history/);
 assert.match(sql,/p_drawer_role not in \('both','owner','partner','him','her'\)/);
 assert.match(sql,/roles\[1\] not in \('both','owner','partner','him','her'\)/);
});
