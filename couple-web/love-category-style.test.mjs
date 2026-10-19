import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml} from './premium-evening.mjs';
import {profileHtml,profilePlayStyleSelect} from './onboarding.mjs';
import {futureCoupleStyleMix} from './play-style.mjs';
const read=file=>readFileSync(new URL('./'+file,import.meta.url),'utf8');
const app=read('app.js');
const categorySql=read('migrations/20261018_admin_category_preference.sql');
const profileSql=read('migrations/20261018_play_style_and_pass_quota.sql');
const template={
 session:{id:'sess',self_draws:true,paired_turns:true},
 members:[{user_id:'a',name:'Alex'},{user_id:'b',name:'Sam'}],me:'a',
 rolls:[{user_id:'a',face:3},{user_id:'b',face:2}],
 status:{my_rolled:true,partner_rolled:true,both_ready:true},
 turn:{ready:true,drawsFinished:false,finished:false,next:'a',
  remaining:{a:3,b:2},targets:{a:3,b:2},completed:{a:0,b:0}}
};
test('Admin category bias keeps actual server default 88/12, independent toggle & symmetric input',()=>{
 assert.match(categorySql,/category_weights_enabled boolean NOT NULL DEFAULT true/);
 assert.match(categorySql,/category_preference_percent integer NOT NULL DEFAULT 88/);
 assert.match(categorySql,/category_preference_percent BETWEEN 0 AND 100/);
 assert.match(categorySql,/v_owner IS DISTINCT FROM \(select auth\.uid\(\)\)/);
 assert.match(categorySql,/REVOKE ALL ON FUNCTION public\.save_love_category_weights/);
 assert.match(categorySql,/GRANT EXECUTE ON FUNCTION public\.save_love_category_weights/);
 assert.match(categorySql,/when p_random then 50/);
 assert.match(categorySql,/when gifted_turn and not p_random then 100/);
 assert.match(categorySql,/when not coalesce\(v_category_enabled,true\) then 50/);
 assert.match(categorySql,/when v_cat=p_preference then v_category_percent/);
 assert.match(categorySql,/else 100-v_category_percent/);
 assert.match(app,/function adminCategoryWeightEditor\(/);
 assert.match(app,/rpc\('save_love_category_weights'/);
 assert.match(app,/data-category-weights="true"/);
 assert.match(app,/adminDiceWeightEditor\('evening'\)\+adminCategoryWeightEditor\(\)/);
});
test('New numeric chance changes just one percent in the SAME Soirée visual',()=>{
 const defaultMarkup=premiumEveningHtml({...template,category:'SEXUEL'});
 const customMarkup=premiumEveningHtml({...template,category:'SEXUEL',categoryOdds:65});
 const uniform=premiumEveningHtml({...template,category:'SEXUEL',categoryOdds:50});
 assert.match(defaultMarkup,/88 % de chances/);
 assert.match(customMarkup,/65 % de chances/);
 assert.match(uniform,/50 % de chances/);
 assert.doesNotMatch(customMarkup,/88 % de chances/);
 assert.equal(customMarkup.replace('65 % de chances','X % de chances'),
  defaultMarkup.replace('88 % de chances','X % de chances'));
 assert.doesNotMatch(premiumEveningHtml({...template,category:'HASARD',categoryOdds:65}),
  /65 % de chances/);
 assert.match(app,/categoryOdds:state\.couple\?\.category_weights_enabled===false\?50/);
});
test('Soft/Medium/Intense chosen at either signup path, editable in profile, saved per user',()=>{
 const html=profileHtml({email:'test@example.test'},null);
 assert.match(html,/id="profile-play-style"/);
 assert.match(html,/option value="soft"/);
 assert.match(html,/option value="medium" selected/);
 assert.match(html,/option value="intense"/);
 assert.match(profilePlayStyleSelect('soft'),/option value="soft" selected/);
 assert.match(app,/profilePlayStyleSelect\(state\.profile\.play_style\)/);
 assert.match(app,/rpc\('save_my_play_style',\{p_style:playStyle\}\)/);
 assert.match(profileSql,/ADD COLUMN IF NOT EXISTS play_style text NOT NULL DEFAULT 'medium'/);
 assert.match(profileSql,/play_style IN \('soft','medium','intense'\)/);
 assert.match(profileSql,/WHERE id=\(select auth\.uid\(\)\)/);
 assert.match(profileSql,/GRANT EXECUTE ON FUNCTION public\.save_my_play_style\(text\) TO authenticated/);
 assert.deepEqual(futureCoupleStyleMix('soft','intense'),[
  {style:'soft',weight:50},{style:'intense',weight:50}
 ]);
 assert.deepEqual(futureCoupleStyleMix('soft','soft'),[{style:'soft',weight:100}]);
});
test('Monthly free skip date is stamped server-side, per user chronological quota',()=>{
 assert.match(profileSql,/ADD COLUMN IF NOT EXISTS passed_at timestamptz/);
 assert.match(profileSql,/NEW\.passed_at:=now\(\)/);
 assert.match(profileSql,/BEFORE UPDATE OF status/);
 assert.match(profileSql,/PARTITION BY q\.recipient ORDER BY q\.passed_at,q\.id/);
 assert.match(profileSql,/chronicle\.sequence<=3/);
 assert.match(profileSql,/America\/Toronto/);
 assert.match(profileSql,/IF p_couple IS NULL OR NOT couple_private\.is_member\(p_couple\)/);
 assert.match(profileSql,/GRANT EXECUTE ON FUNCTION public\.love_calendar_pass_quota\(uuid,text\) TO authenticated/);
 assert.doesNotMatch(profileSql,/delete from public\.couple_challenges/i);
 assert.match(app,/rpc\('love_calendar_pass_quota'/);
});
