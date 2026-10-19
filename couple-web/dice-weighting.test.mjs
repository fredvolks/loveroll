import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {WEEKLY_ODDS,premiumHomeHtml} from './premium-home.mjs';
import {
 WEEKLY_DEFAULT_WEIGHTS,EVENING_DEFAULT_WEIGHTS,DICE_WEIGHT_CONFIG,
 validateDiceWeights,configuredDiceWeights,effectiveDicePercentages,
 displayedDicePercent,parseDiceWeightInputs
} from './dice-weighting.mjs';

const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const app=read('app.js');
const sql=read('migrations/20261018_admin_dice_weighting.sql');
const css=read('settings-premium.css');

test('Original weekly probabilities and uniform evening D6 are the unchanged defaults',()=>{
 assert.deepEqual(WEEKLY_ODDS,[50,25,12,8,4,1]);
 assert.deepEqual(WEEKLY_DEFAULT_WEIGHTS,WEEKLY_ODDS);
 assert.deepEqual(EVENING_DEFAULT_WEIGHTS,[30,25,20,12,8,5]);
 assert.equal(EVENING_DEFAULT_WEIGHTS.reduce((a,b)=>a+b,0),100);
 assert.deepEqual(effectiveDicePercentages(WEEKLY_ODDS,true),WEEKLY_ODDS);
 assert.deepEqual(effectiveDicePercentages(EVENING_DEFAULT_WEIGHTS,false,EVENING_DEFAULT_WEIGHTS),
  Array(6).fill(100/6));
 assert.equal(displayedDicePercent(100/6),'16,7');
 assert.equal(displayedDicePercent(25),'25');
});

test('Strict percentages: exactly six integer entries adding to 100; 0% may exclude a face',()=>{
 assert.equal(validateDiceWeights([0,0,0,0,0,100]),true);
 assert.equal(validateDiceWeights([10,20,30,20,10,10]),true);
 for(const list of [[20,20,20,20,20,20],[100,0,0],[50,25,12,8,4,-1],[50,25,12,8,4,1.2],[100,0,0,0,0,null]])
  assert.equal(validateDiceWeights(list),false,JSON.stringify(list));
 assert.deepEqual(configuredDiceWeights([1,2,3]),WEEKLY_ODDS);
 assert.deepEqual(parseDiceWeightInputs(['0','0','0','0','0','100']),[0,0,0,0,0,100]);
 for(const list of [['50','25','12','8','4','2'],['50','25','12','8','4',''],
  ['50','25','12','8','4','-1'],['50','25','12','8','4','1.5']])
  assert.throws(()=>parseDiceWeightInputs(list));
});

test('Home only changes the 6 weight numbers; all existing visual HTML stays identical',()=>{
 const options={now:new Date('2026-10-18T18:00:00Z')};
 const original=premiumHomeHtml(options);
 const custom=premiumHomeHtml({...options,weeklyWeights:[10,20,30,20,10,10]});
 const equal=premiumHomeHtml({...options,weeklyWeightsEnabled:false});
 const percentages=html=>[...html.matchAll(/<b>([1-6])x<\/b><span>([0-9,]+)%<\/span><\/span>/g)]
  .map(match=>match[2]);
 assert.deepEqual(percentages(original),['50','25','12','8','4','1']);
 assert.deepEqual(percentages(custom),['10','20','30','20','10','10']);
 assert.deepEqual(percentages(equal),Array(6).fill('16,7'));
 const withoutOdds=html=>html
  .replace(/(title="[1-6] soirées? : )[0-9,]+( %")/g,'$1X$2')
  .replace(/(<b>[1-6]x<\/b><span>)[0-9,]+(%<\/span>)/g,'$1X$2');
 assert.equal(withoutOdds(original),withoutOdds(custom));
 assert.equal(withoutOdds(original),withoutOdds(equal));
 assert.equal((custom.match(/class="home-weight"/g)||[]).length,6);
});

test('Settings adds exactly two collapsible weight editors inside existing admin page',()=>{
 assert.match(app,/function adminDiceWeightEditor\(kind\)/);
 assert.match(app,/adminDiceWeightEditor\('weekly'\)\+adminDiceWeightEditor\('evening'\)/);
 assert.match(app,/data-dice-weight=/);
 assert.match(app,/class="settings-help-item admin-dice-weight-section"/);
 assert.match(app,/type="checkbox" role="switch" id="admin-weight-/);
 assert.match(app,/admin-dice-weight-face/);
 assert.match(app,/Total : 100 \/ 100 %/);
 assert.match(app,/save-dice-weights:/);
 assert.match(app,/parseDiceWeightInputs\(/);
 assert.match(app,/if\(saveButton\)saveButton.disabled=!valid/);
 assert.match(css,/\[data-settings-page="admin"\] \.admin-dice-weight/);
 assert.equal(DICE_WEIGHT_CONFIG.weekly.weights,'weekly_face_weights');
 assert.equal(DICE_WEIGHT_CONFIG.evening.weights,'evening_face_weights');
});

test('Only admin can persist six odds; official weekly / personal evening D6 use those stored weights',()=>{
 for(const pattern of [
  /ADD COLUMN IF NOT EXISTS weekly_weights_enabled boolean NOT NULL DEFAULT true/,
  /ADD COLUMN IF NOT EXISTS evening_weights_enabled boolean NOT NULL DEFAULT false/,
  /ADD CONSTRAINT love_weekly_weights_valid/,
  /ADD CONSTRAINT love_evening_weights_valid/,
  /valid_love_d6_weights/,
  /public\.save_love_dice_weights/,
  /v_owner IS DISTINCT FROM auth\.uid\(\)/,
  /couple_private\.is_member\(p_couple\)/,
  /GRANT EXECUTE ON FUNCTION public\.save_love_dice_weights/,
  /weekly_face_weights,weekly_weights_enabled/,
  /evening_face_weights,evening_weights_enabled/,
  /roll_love_weighted_d6\(v_weekly_weights,v_weekly_enabled\)/,
  /roll_love_weighted_d6\(v_evening_weights,v_evening_enabled\)/,
  /IF NOT FOUND THEN[\s\S]*?INSERT INTO public\.couple_personal_rolls/,
 ])assert.match(sql,pattern);
 assert.match(sql,/IF NOT coalesce\(p_enabled,false\) THEN\s+RETURN floor\(random\(\)\*6\)::integer\+1/);
 assert.match(sql,/v_ticket:=floor\(random\(\)\*100\)::integer/);
 assert.match(app,/rpc\('save_love_dice_weights'/);
 assert.match(app,/weeklyWeights:state\.couple\?\.weekly_face_weights/);
 assert.match(app,/weeklyWeightsEnabled:state\.couple\?\.weekly_weights_enabled!==false/);
 assert.doesNotMatch(sql,/DELETE FROM public\.couple_rolls|DELETE FROM public\.couple_personal_rolls/i);
});

test('Real administrator odds editor shows six editable faces and two switches',()=>{
 const start=app.indexOf('function adminDiceWeightEditor(kind){');
 const end=app.indexOf("function openSettingsPage(section='')",start);
 assert.ok(start>=0&&end>start);
 const fn=vm.runInNewContext(app.slice(start,end)+';adminDiceWeightEditor',{
  state:{couple:{weekly_face_weights:[10,20,30,20,10,10],weekly_weights_enabled:true,
    evening_face_weights:[30,25,20,12,8,5],evening_weights_enabled:false}},
  DICE_WEIGHT_CONFIG,configuredDiceWeights,
  safe:String,
  button:(action,label,extra)=>'<button data-action="'+action+'" '+extra+'>'+label+'</button>'
 });
 const weekly=fn('weekly'),evening=fn('evening');
 for(const [kind,html] of [['weekly',weekly],['evening',evening]]){
  assert.match(html,/class="settings-help-item admin-dice-weight-section"/);
  assert.match(html,new RegExp('id="admin-weight-'+kind+'-enabled"'));
  assert.equal((html.match(/type="number"/g)||[]).length,6);
  assert.match(html,new RegExp('data-action="save-dice-weights:'+kind+'"'));
  assert.match(html,/class="admin-dice-weight-total"/);
 }
 assert.match(weekly,/Face 3/);
 assert.match(weekly,/value="30"/);
 assert.match(evening,/D6 personnels/);
 assert.match(weekly,/id="admin-weight-weekly-enabled" checked/);
 assert.doesNotMatch(evening,/id="admin-weight-evening-enabled" checked/);
});

test('Actual Save handler only sends administrator validated weights to the server',async()=>{
 const start=app.indexOf(" if(verb==='save-dice-weights'){");
 const end=app.indexOf(" if(verb==='admin-reset-all-dice'){",start);
 assert.ok(start>=0&&end>start);
 const handler=app.slice(start,end);
 const send=async({weights=[10,20,30,20,10,10],admin=true,enabled=true}={})=>{
  const calls=[],display={textContent:''},panel={open:false,querySelector:()=>display};
  const context={
   DICE_WEIGHT_CONFIG,isLoveAdmin:()=>admin,parseDiceWeightInputs,
   id:key=>{
    const m=key.match(/^admin-weight-weekly-([1-6])$/);
    if(m)return {value:String(weights[Number(m[1])-1])};
    if(key==='admin-weight-weekly-enabled')return {checked:enabled};
    return null;
   },
   state:{coupleId:'private-couple'},
   rpc:async(name,args)=>{calls.push({name,args});},
   reload:async()=>calls.push({name:'reload'}),
   root:{querySelector:()=>panel},
   settingsOpenSection:''
  };
  const fn=vm.runInNewContext('(async function(verb,parts){'+handler+'})',context);
  let error=null;
  try{await fn('save-dice-weights',['weekly']);}catch(e){error=String(e);}
  return {calls,display,panel,error,context};
 };
 const ok=await send();
 assert.equal(ok.error,null);
 assert.equal(ok.calls[0]?.name,'save_love_dice_weights');
 assert.equal(ok.calls[0]?.args.p_kind,'weekly');
 assert.equal(ok.calls[0]?.args.p_couple,'private-couple');
 assert.equal(ok.calls[0]?.args.p_enabled,true);
 assert.deepEqual(Array.from(ok.calls[0]?.args.p_weights),[10,20,30,20,10,10]);
 assert.equal(ok.calls[1]?.name,'reload');
 assert.equal(ok.panel.open,true);
 assert.match(ok.display.textContent,/enregistrées/);
 assert.match((await send({weights:[10,20,30,20,10,11]})).error,/100/);
 assert.equal((await send({weights:[10,20,30,20,10,11]})).calls.length,0);
 const unauthorized=await send({admin:false});
 assert.match(unauthorized.error,/administrateur/);
 assert.equal(unauthorized.calls.length,0);
 const off=await send({enabled:false});
 assert.equal(off.calls[0]?.args.p_enabled,false);
});

test('Couple weighting updates reach both linked accounts without Soirée UI changes',()=>{
 const realtime=read('migrations/20261018_dice_settings_realtime.sql');
 assert.match(realtime,/ALTER PUBLICATION supabase_realtime ADD TABLE public\.couples/);
 assert.match(app,/table:'couples'/);
 assert.match(app,/event:'UPDATE'/);
 assert.match(app,/state\.couple=\{\.\.\.state\.couple,\.\.\.updated\}/);
 assert.match(app,/state\.tab==='home'/);
 assert.match(app,/hasUnsavedForm\(\)/);
 assert.doesNotMatch(read('premium-evening.mjs'),/dice-weighting|weeklyWeights|evening_face_weights/);
});
