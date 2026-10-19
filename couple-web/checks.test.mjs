import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import { marketingHtml,authHtml,profileHtml,matchHtml,monthDayInputs,parseMonthDay } from './onboarding.mjs';
import { EVENING_CATEGORIES,EVENING_CHALLENGES,eveningCard,availableEveningCategories,formatCountdown,customCardSlots,editableCardSlots,resolvedCard } from './evening-challenges.mjs';
import {MONTHLY_ACTIVITIES,editableMonthlyActivities,monthlyActivityForRoll} from './monthly-activities.mjs';
import {ADVENT_YEAR,validateAdventJson,calendarFromSaved} from './advent-calendar.mjs';
import {validateSpecialEventsJson,privateSpecialKey,SPECIAL_EVENT_KEYS} from './private-special-events.mjs';
import { SPECIAL_SURPRISES,OCCASIONS,occasionDate,dueOccasions,specialSurprise,nthSunday,occasionRoles,TARGETED_OCCASIONS } from './special-occasions.mjs';
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const editorSource=['editorial-editors.mjs','editorial-ui.mjs'].map(p=>readFileSync(new URL('./'+p,import.meta.url),'utf8')).join('\n');
const sql=readFileSync(new URL('./schema.sql',import.meta.url),'utf8');
test('User names originate from the authenticated profile',()=>{
 assert.match(app,/state\.profile\.display_name/);
 assert.match(sql,/references auth\.users\(id\)/);
 assert.match(sql,/save_my_profile\(p_name text\)/);
 assert.doesNotMatch(app,/['"]Fred['"]|['"]Émilie['"]/);
});
test('Every person draws only their own D6',()=>{
 assert.match(sql,/function public\.roll_my_evening_d6/);
 assert.match(sql,/values\(p_session,auth\.uid\(\),floor\(random\(\)\*6\)::int\+1\)/);
 assert.match(sql,/primary key\(session_id,user_id\)/);
});
test('Shared weekly monthly dice outcomes are unique and atomic',()=>{
 assert.match(sql,/unique\(couple_id,kind,key\)/);
 assert.match(sql,/perform 1 from public\.couples where id=p_couple for update/);
 assert.match(sql,/when a<50 then 1 when a<75 then 2 when a<87 then 3/);
 assert.match(sql,/if p_kind='monthly_restaurant' and a not in \(1,3,7,13,18\)/);
});
test('Invitations require the intended verified email, and enforce two members',()=>{
 assert.match(sql,/email_confirmed_at is not null/);
 assert.match(sql,/verified_email<>inv\.invited_email/);
 assert.match(sql,/if n<>1 then raise exception/);
 assert.match(sql,/token_hash text not null unique/);
 assert.match(app,/randomInviteToken\(/);
});
test('One heart review per partner and separately encrypted journal entries',()=>{
 const reviews=readFileSync(new URL('./migrations/20261016_evening_hearts_reviews.sql',import.meta.url),'utf8');
 assert.match(reviews,/PRIMARY KEY\(session_id,author_id\)/);
 assert.match(reviews,/auth\.uid\(\)/);
 assert.match(reviews,/s\.finished_at IS NOT NULL AND s\.counted IS TRUE/);
 assert.match(app,/crypto\.subtle\.encrypt/);
 assert.match(app,/iterations:240000/);
 assert.match(app,/rpc\('save_love_evening_review'/);
});
test('Backend explicitly rejects opening future advent days',()=>{
 assert.match(readFileSync(new URL('./migrations/20261014_advent_one_door_per_day.sql',import.meta.url),'utf8'),/p_day is distinct from extract\(day from d\)::int/);
 assert.match(sql,/primary key\(couple_id,year,day\)/);
});
test('No cross-project configuration or privileged key in client',()=>{
 const cfg=readFileSync(new URL('./config.js',import.meta.url),'utf8');
 assert.doesNotMatch(cfg,/prwlnxbqttxfjxpehmok|kvejpsgeypxmlhqzioig/);
 assert.doesNotMatch(cfg,/service_role|sb_secret_/);
 assert.match(cfg,/supabasePublishableKey/);
});

test('WebGL dice do not determine official random results',()=>{
 const webgl=readFileSync(new URL('./dice3d.js',import.meta.url),'utf8');
 assert.match(webgl,/new THREE\.WebGLRenderer/);
 assert.match(webgl,/IcosahedronGeometry\(1\.16,0\)/);
 assert.match(webgl,/RoundedBoxGeometry/);
 assert.match(webgl,/let target=orientationFor/);
 assert.doesNotMatch(webgl,/Math\.random\(/);
 assert.match(app,/roll_couple_once/);
 assert.match(app,/data-dice-sides/);
});

test('A partner cannot flood the other with simultaneous challenges',()=>{
 assert.match(sql,/status in \('proposed','accepted'\)/);
 assert.match(sql,/Tous les défis de votre partenaire sont terminés/);
 assert.match(sql,/for update;\s*select user_id into target/s);
});
test('Cancelled evenings never consume a weekly game and completion needs both D6 targets',()=>{
 assert.match(sql,/counted boolean not null default false/);
 assert.match(sql,/and counted=true/);
 assert.match(sql,/finish_couple_session\(p_session uuid,p_count boolean default true\)/);
 assert.match(sql,/if done<target then raise exception/);
 assert.match(app,/p_count:true/);
 assert.match(app,/p_count:false/);
 assert.match(app,/confirm-cancel/);
});
test('The new heart review only belongs to a closed counted session',()=>{
 const reviews=readFileSync(new URL('./migrations/20261016_evening_hearts_reviews.sql',import.meta.url),'utf8');
 assert.match(reviews,/s\.finished_at IS NOT NULL AND s\.counted IS TRUE/);
 assert.match(reviews,/couple_private\.is_member/);
 assert.doesNotMatch(app,/choose-feedback|save-feedback|renderFeedback/);
});
test('Invitation URL uses non-secret UUID and removes legacy secret tokens from address',()=>{
 assert.match(app,/inviteLinkForId\(CONFIG\.siteUrl,invitationId\)/);
 assert.match(app,/sessionStorage\.setItem\('pendingInviteId',value\)/);
 assert.match(app,/frag\.delete\('invite'\)/);
 assert.match(app,/history\.replaceState/);
 assert.doesNotMatch(app,/url\.searchParams\.set\('invite',token\)/);
});
test('No default opinion: every rating requires an actual user choice',()=>{
 assert.doesNotMatch(app,/\(v===4\?'checked':''\)/);
 assert.match(app,/validEveningReview\(draft\)/);
});

test('A member waiting for their match is notified when the partner accepts',()=>{
 assert.match(app,/event:'\*',schema:'public',table:'couple_members'/);
 assert.match(app,/Votre partenaire a accepté le match/);
 assert.match(app,/if\(state.members.length<2\)\{/);
 assert.match(app,/state.channel=channel.subscribe\(status=>/);
 assert.match(app,/liveSync.request\(200\)/);
});
test('The five bottom tabs keep Settings while Journal and questionnaires move to Soirée',()=>{
 assert.match(app,/\['settings','⚙','Réglages'\]/);
 assert.match(app,/Ouvrir notre calendrier partagé/);
 assert.match(app,/rpc\('save_love_evening_review'/);
 assert.doesNotMatch(app,/NOS AVIS APRÈS LA SOIRÉE|choose-feedback/);
 assert.match(app,/compte:\{title:'Mon compte'/);
});

test('Only the dedicated Supabase project and its publishable client key are configured',()=>{
 const cfg=readFileSync(new URL('./config.js',import.meta.url),'utf8');
 assert.match(cfg,/ejsrqfpkgwraorrznjpm\.supabase\.co/);
 assert.match(cfg,/sb_publishable_/);
 assert.doesNotMatch(cfg,/service_role|sb_secret_/);
 assert.match(cfg,/fredvolks\.github\.io\/mon-wallet-android/);
});
test('Password signup/signin and Google use distinct secure providers',()=>{
 assert.match(authHtml(),/Continuer avec Google/);
 assert.match(authHtml(),/type="password"/);
 assert.match(authHtml(),/auth-mode:signup/);
 assert.match(authHtml(),/auth-mode:signin/);
 assert.match(app,/client\.auth\.signUp/);
 assert.match(app,/client\.auth\.signInWithPassword/);
 assert.match(app,/client\.auth\.resetPasswordForEmail/);
});

test('LoveRoll special events have twenty separate fully-worded surprises',()=>{
 assert.equal(SPECIAL_SURPRISES.length,20);
 assert.equal(new Set(SPECIAL_SURPRISES.map(x=>x.title)).size,20);
 assert.ok(SPECIAL_SURPRISES.every(x=>x.title.length>6&&x.detail.length>36));
 assert.equal(OCCASIONS.length,7);
 for(let i=1;i<=20;i++)assert.equal(specialSurprise(i),SPECIAL_SURPRISES[i-1]);
 assert.throws(()=>specialSurprise(0));
 assert.throws(()=>specialSurprise(21));
});
test('2026 Canadian Mothers and Fathers days are calculated correctly',()=>{
 assert.equal(nthSunday(2026,5,2),10);
 assert.equal(nthSunday(2026,6,3),21);
 assert.equal(occasionDate('mothers_day',2026,{},null),'2026-05-10');
 assert.equal(occasionDate('fathers_day',2026,{},null),'2026-06-21');
 assert.equal(occasionDate('valentine',2026,{},null),'2026-02-14');
});
test('Occasion setting dates originate from the couple rather than hardcoded names',()=>{
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 const settings={anniversary_md:'10-20',birthday_by_user:{[a]:'02-29',[b]:'06-07'}};
 assert.equal(occasionDate('anniversary',2026,settings,null),'2026-10-20');
 assert.equal(occasionDate('birthday',2026,settings,a),'2026-02-28');
 assert.equal(occasionDate('birthday',2028,settings,a),'2028-02-29');
 assert.equal(occasionDate('birthday',2026,settings,b),'2026-06-07');
 assert.equal(dueOccasions('2026-10-13',settings,[{user_id:a},{user_id:b}]).find(x=>x.key==='anniversary')?.date,'2026-10-20');
 assert.equal(occasionDate('anniversary',2026,{anniversary_md:null},null),null);
});
test('Special events have server enforced unique draw and host sequencing',()=>{
 const sql=readFileSync(new URL('./special-occasions.sql',import.meta.url),'utf8');
 assert.match(sql,/primary key\(couple_id,event_year,occasion_key,roll_type\)/);
 assert.match(sql,/perform 1 from public.couples where id=p_couple for update/);
 assert.match(sql,/Brassez le D20 de la surprise avant le D6/);
 assert.match(sql,/couple_private.is_member\(p_couple\)/);
 assert.match(sql,/alter table public.couple_occasion_rolls enable row level security/);
 assert.match(app,/roll_love_occasion_once/);
 assert.match(app,/function renderOccasions\(\)/);
 assert.match(app,/set_love_occasion_date/);
});
test('Brand LoveRoll is applied to PWA',()=>{
 const manifest=readFileSync(new URL('./manifest.webmanifest',import.meta.url),'utf8');
 assert.match(manifest,/"name": "LoveRoll"/);
 assert.match(app,/LoveRoll/);
});

test('The evening asks for a category at each draw with 88/12 odds',()=>{
 assert.deepEqual(EVENING_CATEGORIES,['SENSUEL','SEXUEL']);
 assert.deepEqual(availableEveningCategories('SENSUEL'),[{category:'SENSUEL',weight:88},{category:'SEXUEL',weight:12}]);
 assert.deepEqual(availableEveningCategories('SEXUEL'),[{category:'SENSUEL',weight:12},{category:'SEXUEL',weight:88}]);
 assert.match(app,/EVENING_CATEGORIES\.map/);
 assert.match(readFileSync(new URL('./premium-evening.mjs',import.meta.url),'utf8'),/categoryOdds=88/);
 assert.match(app,/diceStatus:null,rollAnimationFace:null,rollAnimationKind:null,category:null,randomMode:false/);
 assert.ok(app.includes("Défi '+(otherCompleted+1)+' / '+theirs.face"));
 assert.ok(app.includes("if(!EVENING_CATEGORIES.includes(state.category)&&state.category!=='HASARD')"));
 assert.match(app,/draw_for_partner_random/);
 assert.ok(app.includes("state.category=null; // Choix renouvelé à chaque défi."));
 assert.ok(app.includes('Sélectionnez Sensuel ou Sexuel pour activer le tirage.'));
 const weights=availableEveningCategories('SENSUEL');
 assert.equal(weights.reduce((sum,entry)=>sum+entry.weight,0),100);
 assert.equal(availableEveningCategories('SEXUEL').reduce((sum,entry)=>sum+entry.weight,0),100);
 assert.doesNotMatch(app,/Aléatoire : Sexuel 40/);
});
test('50 seeded cards and 150 optional creator-only slots',()=>{
 for(const category of EVENING_CATEGORIES){
  assert.equal(EVENING_CHALLENGES[category].length,25);
  for(let cardId=1;cardId<=25;cardId++){
   const card=eveningCard(category,cardId);
   assert.ok(card.title.length>=5);
   assert.ok(card.description.length>35);
   assert.ok(Number.isInteger(card.minutes)&&card.minutes>=0&&card.minutes<=15);
  }
  const slots=customCardSlots(category);
  assert.equal(slots.length,75);
  assert.ok(slots.every(s=>s.cardId>=26&&s.cardId<=100&&!s.filled));
 }
 assert.equal(eveningCard('SENSUEL',3).minutes,4);
 assert.equal(eveningCard('SEXUEL',5).minutes,12);
 assert.equal(eveningCard('SEXUEL',16).minutes,0);
 assert.throws(()=>eveningCard('COQUIN',1));
 assert.throws(()=>eveningCard('SEXUEL',26));
 const snapshot={category:'SEXUEL',card_id:29,face:5,card_title:'Une carte libre',
  card_description:'Une proposition personnalisée sans durée.',card_timer_minutes:null};
 assert.equal(resolvedCard(snapshot).minutes,null);
 assert.equal(resolvedCard(snapshot).cardId,29);
});
test('Countdown uses a monotonic wall deadline, pause reset and optional signals',()=>{
 assert.equal(formatCountdown(600_000),'10:00');
 assert.equal(formatCountdown(61_200),'01:02');
 assert.equal(formatCountdown(-500),'00:00');
 assert.match(app,/challengeTimer\.deadline-Date\.now\(\)/);
 assert.match(app,/timer-reset/);
 assert.match(app,/timer-toggle/);
 assert.match(app,/navigator\.vibrate/);
 assert.match(app,/AudioContext/);
 assert.match(app,/Le minuteur n’oblige jamais/);
});

test('Marketing page before OAuth or email signup',()=>{
 const h=marketingHtml();
 assert.match(h,/Votre aventure à deux/);
 assert.match(h,/CRÉER MON COMPTE GRATUITEMENT/);
 assert.match(h,/Android et iPhone/);
 assert.match(app,/root\.innerHTML=discoverHtml\(false\)/);
 assert.match(app,/if\(!state\.user&&!state\.showAuth\)/);
 assert.match(app,/if\(verb==='show-auth'\)/);
});
test('Registration obtains the name from identity and birthday in the initial form',()=>{
 const h=profileHtml({user_metadata:{full_name:'Camille Martin'}},null);
 assert.match(h,/Camille Martin/);
 assert.match(h,/signup-birth-month/);
 assert.match(h,/signup-birth-day/);
 assert.match(h,/age-confirm/);
 assert.doesNotMatch(h,/Fred|Émilie/);
 assert.match(app,/complete_love_registration/);
 assert.match(app,/p_birthday_md:birthday/);
});
test('Birthday inputs reject invalid dates, and support leap day',()=>{
 const fake=(m,d)=>({getElementById:k=>({value:k.endsWith('month')?String(m):String(d)})});
 assert.equal(parseMonthDay('signup-birth',true,fake(2,29)),'02-29');
 assert.equal(parseMonthDay('signup-birth',true,fake(10,13)),'10-13');
 assert.throws(()=>parseMonthDay('signup-birth',true,fake(2,30)));
 assert.throws(()=>parseMonthDay('signup-birth',true,fake(13,10)));
 assert.equal(parseMonthDay('signup-couple',false,fake('','')),null);
 assert.match(monthDayInputs('signup-birth','06-23'),/value="6" selected/);
});
test('New couple match uses two individual sign-ups',()=>{
 assert.match(matchHtml('Camille',false),/signup-couple-month/);
 assert.match(matchHtml('Camille',false),/Créer notre espace à deux/);
 assert.doesNotMatch(matchHtml('Alex',true),/CONFIRMER NOTRE MATCH/);
 assert.match(app,/create_love_match/);
 assert.match(app,/accept_love_match/);
 assert.match(app,/parseMonthDay\('signup-couple',false\)/);
 assert.doesNotMatch(app,/rpc\('create_my_couple'/);
});
test('Anniversary and dates are not re-entered in Settings',()=>{
 const fragment=app.slice(app.indexOf('function renderSettings()'),app.indexOf('async function refreshAndShow()',app.indexOf('function renderSettings()')));
 assert.match(fragment,/Mon anniversaire/);
 assert.doesNotMatch(fragment,/loveroll-birthday|save-occasion-date:birthday/);
});
test('Database onboarding enforces profile birthday and revokes old bypasses',()=>{
 const schema=readFileSync(new URL('./registration-onboarding.sql',import.meta.url),'utf8');
 assert.match(schema,/create or replace function public\.complete_love_registration/);
 assert.match(schema,/birthday_md text/);
 assert.match(schema,/public\.create_love_match/);
 assert.match(schema,/public\.accept_love_match/);
 assert.match(schema,/revoke execute on function public\.save_my_profile/);
 assert.match(schema,/couple_private\.validate_month_day/);
});

test('Premium LoveRoll landing has exactly one create and one login CTA',()=>{
 const source=marketingHtml();
 const actions=[...source.matchAll(/data-action="show-auth"/g)];
 assert.equal(actions.length,2,'No duplicate login/sign-up buttons');
 assert.equal((source.match(/CRÉER MON COMPTE GRATUITEMENT/g)||[]).length,1);
 assert.equal((source.match(/J’AI DÉJÀ UN COMPTE/g)||[]).length,1);
 assert.ok(source.indexOf('CRÉER MON COMPTE')<source.indexOf('love-features'));
 assert.ok(source.indexOf('J’AI DÉJÀ UN COMPTE')<source.indexOf('love-features'));
 const footer=source.slice(source.indexOf('<footer'));
 assert.doesNotMatch(footer,/data-action=/);
});
test('LoveRoll landing uses real artwork, not emoji substitutes or screenshot text',()=>{
 const source=marketingHtml();
 assert.match(source,/Love<\/span><b>Roll<\/b>/);
 assert.match(source,/JEUX · DÉFIS · DATES · NOUS/);
 assert.match(source,/assets\/loveroll-premium-scene\.png/);
 assert.match(source,/alt="Cœur en verre rose/);
 assert.match(source,/Votre aventure à deux/);
 assert.match(source,/commence ici\./);
 assert.match(source,/Connexion sécurisée pour Android et iPhone/);
 assert.equal((source.match(/class="love-feature"/g)||[]).length,4);
 assert.equal((source.match(/class="love-benefit"/g)||[]).length,0);
 assert.match(source,/Plus qu’un jeu/);
 assert.match(source,/Complicité, surprises et frissons/);
 assert.match(source,/Chaque activité est facultative/);
 assert.doesNotMatch(source,/🎲|💌|🔒/);
});
test('Premade art and CSS are available, web cache contains the artwork',()=>{
 const image=readFileSync(new URL('./assets/loveroll-hero.webp',import.meta.url));
 assert.ok(image.byteLength>1000);
 assert.equal(image.subarray(0,4).toString(),'RIFF');
 assert.equal(image.subarray(8,12).toString(),'WEBP');
 const stylesheet=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
 assert.match(stylesheet,/\.love-hero-art/);
 assert.match(stylesheet,/\.love-mini-finale/);
 assert.match(stylesheet,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 const sw=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 assert.match(sw,/assets\/loveroll-hero\.webp/);
 assert.match(sw,/const CACHE='loveroll-static-v\d+';/);
});

test('Compact v2 keeps exactly six zones and all essential content',()=>{
 const h=marketingHtml();
 for(const x of ['love-brand','love-scene','love-cta-group','love-features','love-mini-finale','love-compact-footer']){
  assert.match(h,new RegExp('class="[^"]*'+x));
 }
 assert.match(h,/Dés à deux/);
 assert.match(h,/Votre match/);
 assert.match(h,/Calendrier/);
 assert.match(h,/Espace privé/);
 assert.match(h,/Plus qu’un jeu, <em>votre histoire à deux/);
 assert.match(h,/Réservé aux adultes de 18 ans et plus/);
 assert.match(h,/Chaque activité est facultative/);
 assert.match(h,/href="loveroll:\/\/offline"/);
 assert.doesNotMatch(h,/Pourquoi vous allez aimer/);
});


test('Historical wellbeing guidance is preserved without asking or fabricating new answers',async()=>{
 const {RELATIONSHIP_OPTIONS,INTIMACY_OPTIONS,guidanceFor,guidedIdeas}=await import('./wellbeing.mjs');
 assert.equal(RELATIONSHIP_OPTIONS.length,5);
 assert.equal(INTIMACY_OPTIONS.length,6);
 assert.ok(RELATIONSHIP_OPTIONS.some(([v])=>v==='skip'));
 assert.ok(INTIMACY_OPTIONS.some(([v])=>v==='skip'));
 assert.equal(guidanceFor('difficult','fulfilled'),'gentle');
 assert.equal(guidanceFor('great','sensitive'),'gentle');
 assert.equal(guidanceFor('distant','different'),'reconnect');
 assert.equal(guidanceFor('good','fulfilled'),'quality');
 assert.equal(guidanceFor('great','fulfilled'),'playful');
 assert.equal(guidedIdeas('gentle').ideas.length,3);
 assert.doesNotMatch(profileHtml({user_metadata:{name:'Camille'}},null),/wellbeing-relationship|wellbeing-intimacy/);
 assert.doesNotMatch(app,/rpc\('save_my_wellbeing'/);
 assert.match(app,/get_love_guidance/);
});
test('Removing a partner retains their own diary and removes access at the server',()=>{
 const sql=readFileSync(new URL('./partner-privacy-wellbeing.sql',import.meta.url),'utf8');
 assert.match(sql,/create table if not exists public\.love_personal_intimacy/);
 assert.match(sql,/user_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/create or replace function public\.end_love_match/);
 assert.match(sql,/delete from public\.couple_members where couple_id=p_couple/);
 assert.doesNotMatch(sql,/delete from public\.couple_intimacy/);
 assert.match(sql,/on conflict\s*\(user_id,source_event_id\) do nothing/);
 assert.match(sql,/create or replace function public\.add_my_love_event/);
 const splitSql=readFileSync(new URL('./migrations/20261018_dissociate_to_two_solo_admins.sql',import.meta.url),'utf8');
 assert.match(splitSql,/public\.end_love_match\(p_couple\)/);
 assert.match(splitSql,/insert into public\.couples\(owner_user_id\)/);
 assert.match(app,/rpc\('dissociate_love_to_solo'/);
 assert.match(app,/rpc\('add_my_love_event'/);
 assert.match(app,/function renderPersonalJournal\(/);
 assert.match(app,/state\.personalPass=null/);
 assert.match(app,/data-action="personal-date/);
});
test('Optional partner linking, settings management and individualized tips',()=>{
 assert.doesNotMatch(matchHtml('Camille',false),/skip-couple|Explorer sans partenaire/);
 assert.match(matchHtml('Camille',false),/prepare-cards/);
 assert.match(app,/function renderWaitingPartner\(/);
 assert.doesNotMatch(app,/function renderSolo\(/);
 assert.match(app,/Dissocier notre duo/);
 assert.match(app,/Inviter un conjoint ou une conjointe/);
 assert.match(app,/function ideaHtml\(/);
 assert.match(app,/Chacun peut dire non/);
});

test('Embedded Android account screen uses Google native bridge and secure passwords',()=>{
 const html=authHtml();
 assert.match(html,/signin-password/);
 assert.match(html,/auth-eye/);
 assert.match(html,/auth-signup-password/);
 assert.match(app,/LoveRollNativeAuth\?\.googleSignIn/);
 assert.match(app,/signInWithIdToken/);
 assert.match(app,/signInWithPassword/);
 assert.match(app,/launchParams\.has\('auth'\)/);
 assert.match(app,/launchParams\.has\('settings'\)/);
});

test('Registration needs an explicit age confirmation and has no wellbeing controls',()=>{
 const html=profileHtml({email:'test@example.com'},null);
 assert.match(html,/id="age-confirm"/);
 assert.doesNotMatch(html,/id="age-confirm"[^>]*checked|wellbeing-|save-wellbeing|Mon ressenti/);
 assert.doesNotMatch(app,/if\(!state\.wellbeing\)/);
 assert.match(app,/id\('age-confirm'\)\?\.checked/);
});

test('Unpaired members only see invitation, personal account, calendar and private card editing',()=>{
 const match=matchHtml('Camille',false);
 assert.ok(match.includes('prepare-cards'));
 assert.ok(match.includes('create-couple'));
 assert.ok(!match.includes('Explorer sans partenaire'));
 assert.ok(!match.includes('skip-couple'));
 assert.ok(app.includes('function renderWaitingPartner(){'));
 assert.ok(app.includes('function renderCardLibrary(){'));
 assert.ok(app.includes('function renderPersonalJournal(){'));
 assert.ok(app.includes('function renderSettings(){'));
 assert.ok(app.includes('function isSharedCoupleReady('));
 assert.ok(app.includes("if(state.tab==='library'&&isLoveAdmin())renderCardLibrary()")||
           app.includes("state.tab==='library'&&isLoveAdmin()"));
 assert.ok(app.includes("if(verb==='prepare-cards')"));
 assert.ok(app.includes("state.tab='library'"));
 assert.ok(app.includes("['home','settings','invitation','library','personal-journal','monthly-library','advent-editor','special-editor']"));
 for(const forbidden of ['renderSoloSession','renderSoloSpecial','renderSoloOccasions',
  'renderSoloAdvent','renderSolo()','solo-roll','solo-category','solo-advent',
  'SOLO_MESSAGE','drawSoloFace','state.solo','loveroll-skip']){
  assert.ok(!app.includes(forbidden),'Stale solo exploration code: '+forbidden);
 }
 for(const forbidden of ['Essayer le D35','Découvrir un défi D35',
  'Découverte libre en mode solo','D6 individuel · essai']){
  assert.ok(!app.includes(forbidden),'Stale solo UI: '+forbidden);
 }
 assert.ok(app.includes("Les jeux exigent deux comptes associés."));
 assert.ok(app.includes("Cette action nécessite deux comptes associés."));
 assert.ok(!readFileSync(new URL('./service-worker.js',import.meta.url),'utf8').includes('solo-mode.mjs'));
});
test('Before invitation the account retains its private cards and current calendar',()=>{
 assert.ok(app.includes("p_anniversary_md:null"));
 assert.ok(app.includes("if(!state.coupleId)await rpc('create_love_match'"));
 assert.ok(app.includes("isLoveAdmin()"));
 assert.ok(app.includes("if(state.couple?.owner_user_id===state.user.id)"));
 assert.ok(app.includes("save_love_card_with_roles"));
 assert.ok(app.includes("editorialRow('Nos 200 défis','','tab:library','dice')"));
 assert.ok(app.includes("renderInvitePanel()"));
 assert.ok(app.includes("button('invite','Remplacer le lien actuel'"));
 assert.ok(app.includes("if(['journal','personal-journal'].includes(state.tab))"));
 assert.ok(app.includes("else if(state.tab==='evening-calendar')renderEveningCalendar()"));
 assert.ok(!app.includes("renderPersonalJournal().catch(fail)"));
 assert.ok(app.includes("button('tab:personal-journal','Ouvrir mon calendrier personnel')"));
 assert.ok(!app.includes("if(verb==='skip-couple')"));
});
test('Creator-only access and private draws are enforced server side',()=>{
 const sql=readFileSync(new URL('./creator-only-custom-challenges.sql',import.meta.url),'utf8');
 assert.ok(sql.includes('owner_user_id'));
 assert.ok(sql.includes('creator-only'));
 assert.ok(sql.includes('love_custom_owner_read'));
 assert.ok(sql.includes('save_love_custom_card'));
 assert.ok(sql.includes('delete_love_custom_card'));
 assert.ok(sql.includes('my_love_roll_status'));
 assert.ok(sql.includes('both_rolls_ready'));
 assert.ok(sql.includes('card_id between 26 and 35'));
 assert.ok(sql.includes('card<=25'));
 assert.ok(sql.includes('card_title,card_description,card_timer_minutes'));
 assert.ok(app.includes("function isLoveAdmin()"));
 assert.ok(app.includes("function renderCardLibrary()"));
 assert.ok(app.includes("editorialRow('Nos 200 défis','','tab:library','dice')"));
 assert.ok(app.includes("Seul l’administrateur")||app.includes("Accès réservé à l’administrateur"));
 assert.ok(app.includes('state.rollStatus?.both_ready'));
 assert.ok(app.includes("p_card_id:state.customSlot"));
 assert.ok(app.includes("state.couple?.owner_user_id===state.user?.id"));
 assert.ok(app.includes("state.tab==='library')renderCardLibrary()"));
 assert.ok(app.includes("' · CARTE N° '+safe(active.face)"));
 assert.equal(app.includes("' · CARTE '+"),false);
 assert.ok(app.includes("safe(role.giver.name)"));
 assert.ok(app.includes("' offre · '+safe(role.receiver.name)+' reçoit"));
 assert.ok(app.includes('Sans minuteur'));
});


test('Fixed celebration roles and shared couple anniversary',()=>{
 const couple=[{user_id:'a',name:'A'},{user_id:'b',name:'B'}];
 const conf={celebrants:{mothers_day:'b',womens_day:'b',fathers_day:'a',mens_day:'a'}};
 for(const key of TARGETED_OCCASIONS){
  const role=occasionRoles({key},conf,couple);
  assert.equal(role.shared,false);
  assert.ok(role.receiver&&role.giver&&role.receiver.user_id!==role.giver.user_id);
 }
 assert.equal(occasionRoles({key:'mothers_day'},conf,couple).giver.user_id,'a');
 assert.equal(occasionRoles({key:'fathers_day'},conf,couple).giver.user_id,'b');
 assert.equal(occasionRoles({key:'birthday',actorId:'a'},conf,couple).giver.user_id,'b');
 assert.equal(occasionRoles({key:'anniversary'},conf,couple).shared,true);
 assert.equal(occasionRoles({key:'valentine'},conf,couple).shared,true);
 assert.equal(occasionRoles({key:'mothers_day'},null,couple).receiver,null);
 assert.equal(occasionDate('womens_day',2026,{},null),'2026-03-08');
 assert.equal(occasionDate('mens_day',2026,{},null),'2026-11-19');
 const sql=readFileSync(new URL('./celebration-roles.sql',import.meta.url),'utf8');
 assert.ok(sql.includes("set_love_celebrant"));
 assert.ok(sql.includes("owner_user_id=auth.uid()"));
 assert.ok(sql.includes("p_kind in ('mothers_day','fathers_day','womens_day','mens_day','birthday','anniversary','valentine')"));
 assert.ok(app.includes("data-action=\"set-celebrant:"));
});

test('Neither partner sees whether a drawn card was created by the admin',()=>{
 const custom=resolvedCard({category:'SEXUEL',card_id:29,face:7,
  card_title:'Surprise à deux',card_description:'Une proposition choisie par votre partenaire.',
  card_timer_minutes:null});
 const official=resolvedCard({category:'SEXUEL',card_id:5,face:7});
 assert.equal(Object.hasOwn(custom,'custom'),false);
 assert.equal(Object.hasOwn(official,'custom'),false);
 assert.equal(custom.title,'Surprise à deux');
 const missing=resolvedCard({category:'SENSUEL',card_id:28,face:4});
 assert.equal(missing.title,'Défi surprise');
 assert.equal(missing.description,'Consigne momentanément indisponible.');
 const gameScreen=app.slice(app.indexOf('function renderLegacySession(){'),app.indexOf('function renderSpecial(){'));
 assert.ok(gameScreen.includes("' · CARTE N° '+safe(active.face)"));
 assert.ok(!gameScreen.includes('challenge.cardId'));
 assert.ok(!gameScreen.includes('active.card_id'));
 assert.ok(!gameScreen.includes('défis personnalisés'));
 assert.ok(!gameScreen.includes('Carte personnalisée'));
 assert.ok(!gameScreen.includes('carte personnalisée'));
 assert.ok(gameScreen.includes('OFFRE → '));
 assert.ok(gameScreen.includes('REÇOIT'));
 // The existing admin-only catalogue can retain its internal slot numbers.
 assert.ok(app.includes('function isLoveAdmin()'));
});

test('The administrator can edit all 200 cards without replacing the fixed originals',()=>{
 for(const category of EVENING_CATEGORIES){
  const original=editableCardSlots(category);
  assert.equal(original.length,100);
  assert.equal(original.filter(c=>c.isOriginal).length,25);
  assert.equal(original.filter(c=>!c.isOriginal).length,75);
  assert.equal(original.filter(c=>c.filled).length,25);
  assert.equal(original.filter(c=>c.saved).length,0);
  const edited=editableCardSlots(category,[
   {category,card_id:3,title:'Une version adaptée',description:'Des consignes pour un nouveau défi.',
    timer_minutes:null,recipient_user_id:'recipient',drawer_user_id:'drawer'},
   {category,card_id:30,title:'Une nouvelle carte',description:'Description d’une carte.',
    timer_minutes:9,recipient_user_id:null,drawer_user_id:null}
  ]);
  assert.equal(edited[2].title,'Une version adaptée');
  assert.equal(edited[2].minutes,null);
  assert.equal(edited[2].recipientId,'recipient');
  assert.equal(edited[2].drawerId,'drawer');
  assert.equal(edited[2].saved,true);
  assert.equal(edited[29].minutes,9);
  assert.equal(edited[29].filled,true);
  assert.equal(edited[30].filled,false);
  const snapshot=resolvedCard({category,card_id:3,face:19,
   card_title:'Une version adaptée',card_description:'Des consignes pour un nouveau défi.',
   card_timer_minutes:null});
  assert.equal(snapshot.title,'Une version adaptée');
  assert.equal(snapshot.minutes,null);
  assert.equal(Object.hasOwn(snapshot,'custom'),false);
 }
});
test('All card draws respect drawer eligibility and persistent no-repeat cycles',()=>{
 const sql=readFileSync(new URL('./edit-all-cards-shufflebag.sql',import.meta.url),'utf8');
 for(const fragment of [
  'add constraint love_custom_challenges_card_id_check check(card_id between 1 and 35)',
  'add column if not exists drawer_user_id uuid',
  'no_repeat_challenges boolean not null default true',
  'create table if not exists public.love_card_draw_history',
  'primary key(couple_id,recipient_user_id,category,card_id)',
  'create or replace function public.set_love_draw_rule(',
  'owner_user_id=auth.uid()',
  'select coalesce(no_repeat_challenges,true) into v_no_repeat',
  "where cc.couple_id=s.couple_id and cc.category=cats.category",
  'cc.drawer_user_id<>auth.uid()',
  'cc.recipient_user_id<>target',
  'and not exists(',
  'delete from public.love_card_draw_history',
  'and history.card_id=card',
  'if v_no_repeat then',
  'insert into public.love_card_draw_history',
  'case when chosen.card_id is not null'
 ])assert.ok(sql.includes(fragment),'Missing draw or permission rule: '+fragment);
 assert.ok(app.includes("function isLoveAdmin()"));
 assert.ok(editorSource.includes("editorButton('save-draw-rule'"));
 assert.ok(editorSource.includes("id=\"no-repeat-cards\""));
 assert.ok(app.includes("rpc('set_love_draw_rule'"));
 assert.ok(app.includes("p_drawer_role:drawer"));
 assert.ok(app.includes("custom-drawer"));
 assert.ok(app.includes("custom-recipient"));
 assert.ok(app.includes("state.customSlot=slot"));
 assert.ok(app.includes("slot<1||slot>100"));
 assert.ok(editorSource.includes("Restaurer l’original"));
 assert.ok(!app.includes("CARTE '+safe(challenge.cardId"));
});

test('D100 is a genuine 100-face numbered 3D die and Supabase stores 1..100',()=>{
 const webgl=readFileSync(new URL('./dice3d.js',import.meta.url),'utf8');
 const db=readFileSync(new URL('./migrations/20261016_d100_200_cards.sql',import.meta.url),'utf8');
 const evening=readFileSync(new URL('./premium-evening.mjs',import.meta.url),'utf8');
 assert.ok(webgl.includes('function manySidedGeometry(count=35)'));
 assert.ok(webgl.includes('new ConvexGeometry(points)'));
 assert.ok(webgl.includes('sides===35||sides===100?manySidedGeometry(sides)'));
 assert.ok(webgl.includes('sideNormals.set(i+1,outward)'));
 assert.ok(db.includes('CHECK (face BETWEEN 1 AND 100)'));
 assert.ok(db.includes('d100:=floor(random()*100)::integer+1'));
 assert.ok(db.includes('generate_series(1,100)'));
 assert.ok(db.includes('v_cat,d100,cid'));
 assert.ok(db.includes("cc.drawer_role='owner'"));
 assert.ok(db.includes("cc.recipient_role='partner'"));
 assert.ok(db.includes('love_card_draw_history'));
 assert.ok(evening.includes('premiumPolyDie(100,'));
 assert.ok(!app.includes('solo-roll:challenge'));
 assert.ok(app.includes('DÉCOUVRIR UN DÉFI POUR'));
 assert.ok(app.includes('CARTE N° '));
 assert.ok(readFileSync(new URL('./premium-surprise.mjs',import.meta.url),'utf8').includes('premiumPolyDie(100,'));
});
test('Prepare cards privately before inviting a partner with future partner roles',()=>{
 const view=matchHtml('Test',false);
 const roles=readFileSync(new URL('./preinvite-card-roles.sql',import.meta.url),'utf8');
 assert.ok(view.includes('prepare-cards'));
 assert.ok(app.includes("if(verb==='prepare-cards')"));
 assert.ok(app.includes("create_love_match',{p_anniversary_md:null}"));
 assert.ok(app.includes("state.tab='library'"));
 assert.ok(app.includes('Créer mes défis avant l’invitation'));
 assert.ok(editorSource.includes("him:'Homme'"));
  assert.ok(editorSource.includes("her:'Femme'"));
 assert.ok(app.includes('save_love_card_with_roles'));
 assert.ok(app.includes('p_recipient_role:recipient'));
 assert.ok(app.includes('p_drawer_role:drawer'));
 assert.ok(roles.includes("drawer_role text not null default 'both'"));
 assert.ok(roles.includes("recipient_role text not null default 'both'"));
 assert.ok(roles.includes("owner_user_id=auth.uid()"));
 assert.ok(roles.includes("p_drawer_role=p_recipient_role"));
});

test('All 50 original cards are varied, ready to play and individually editable',()=>{
 const all=new Set();
 for(const category of EVENING_CATEGORIES){
  const cards=Array.from({length:25},(_,i)=>eveningCard(category,i+1));
  assert.equal(cards.length,25);
  assert.ok(cards.filter(c=>c.minutes>0).length>=9,'Not enough playable timed challenges in '+category);
  assert.ok(cards.filter(c=>c.minutes===0).length>=9,'Open-ended surprises should never force a countdown in '+category);
  for(const [i,card] of cards.entries()){
   assert.ok(card.title.length>=8&&card.title.length<=120,'Missing card title '+category+' '+i);
   assert.ok(card.description.length>=90&&card.description.length<=900,'Incomplete instructions '+category+' '+i);
   assert.ok(Number.isInteger(card.minutes)&&card.minutes>=0&&card.minutes<=15,'Invalid timer');
   assert.ok(!/À écrire|Titre à remplir|Carte personnalisée|lorem ipsum/i.test(card.title+' '+card.description),'Placeholder '+category+' '+i);
   assert.ok(!all.has(category+'-'+card.title.toLowerCase()),'Duplicate title '+card.title);
   all.add(category+'-'+card.title.toLowerCase());
  }
  const overrides=editableCardSlots(category,[
   {category,card_id:1,title:'Ma version personnelle',description:'Une consigne modifiée qui demeure prioritaire dans cet espace.',
    timer_minutes:null,recipient_role:'partner',drawer_role:'owner'}
  ]);
  assert.equal(overrides[0].title,'Ma version personnelle');
  assert.equal(overrides[0].minutes,null,'Timer switch-off must override any factory timer');
  assert.equal(overrides[0].recipientRole,'partner');
  assert.equal(overrides[0].drawerRole,'owner');
  assert.equal(overrides[1].title,eveningCard(category,2).title);
 }
 assert.equal(all.size,50);
 assert.equal(eveningCard('SEXUEL',1).title,'Strip-tease privé');
 assert.equal(eveningCard('SEXUEL',8).title,'Le Kamasutra à deux');
 assert.equal(eveningCard('SENSUEL',4).title,'Douche à deux');
});
test('Database snapshots and server defaults match all 50 client cards without changing private edits',()=>{
 const sql=readFileSync(new URL('./base-cards-v2-snapshots.sql',import.meta.url),'utf8');
 for(const token of [
 'update public.couple_challenges ch',
 'and ch.card_title is null',
 'create table if not exists public.love_base_challenges',
 'check(timer_minutes between 0 and 15)',
 'alter table public.love_base_challenges enable row level security',
 'revoke all on public.love_base_challenges from public,anon,authenticated',
 'insert into public.love_base_challenges(category,card_id,title,description,timer_minutes)',
 'on conflict(category,card_id) do update set',
 'original public.love_base_challenges%rowtype',
 'select * into original from public.love_base_challenges',
 'coalesce(chosen.title,original.title)',
 'coalesce(chosen.description,original.description)',
 'case when chosen.card_id is not null then chosen.timer_minutes',
 'love_card_draw_history',
 "cc.recipient_role='owner'",
 "cc.drawer_role='partner'",
 'd35:=floor(random()*35)::integer+1'
 ])assert.ok(sql.includes(token),'Missing important server behaviour: '+token);
 const protectedEntries=sql.split('update public.couple_challenges ch')[1].split('create table')[0];
 const seededEntries=sql.split('insert into public.love_base_challenges(category,card_id,title,description,timer_minutes)')[1].split('on conflict(category,card_id)')[0];
 for(const category of EVENING_CATEGORIES){
  for(let id=1;id<=25;id++){
   const c=eveningCard(category,id);
   const escapedTitle=c.title.replaceAll("'","''");
   const escapedDesc=c.description.replaceAll("'","''");
   assert.ok(seededEntries.includes(escapedTitle),'Server missing title '+category+' '+id);
   assert.ok(seededEntries.includes(escapedDesc),'Server missing description '+category+' '+id);
  }
 }
 assert.ok(protectedEntries.includes('card_timer_minutes=historical.minutes'));
 assert.ok(!sql.includes('delete from public.love_custom_challenges'));
 assert.ok(!sql.includes('delete from public.love_personal_intimacy'));
});

test('All 100 monthly D100 activities are editable without changing their face identifiers',()=>{
 assert.equal(MONTHLY_ACTIVITIES.length,100);
 assert.deepEqual(MONTHLY_ACTIVITIES.map(a=>a.face),Array.from({length:100},(_,i)=>i+1));
 for(const item of MONTHLY_ACTIVITIES){
  assert.ok(item.title.length>=3&&item.title.length<=120);
  assert.ok(item.description.length>=10&&item.description.length<=900);
  assert.equal(typeof item.is_restaurant,'boolean');
 }
 const edits=[{face:1,title:'Notre sortie surprise',description:'Une sortie personnalisée et encore inconnue.',is_restaurant:false,catalogue_version:2}];
 const result=editableMonthlyActivities(edits);
 assert.equal(result.length,100);
 assert.equal(result[0].title,'Notre sortie surprise');
 assert.equal(result[0].edited,true);
 assert.equal(result[0].is_restaurant,false);
 assert.equal(result[1].edited,false);
 assert.equal(result[1].title,MONTHLY_ACTIVITIES[1].title);
 assert.equal(editableMonthlyActivities([])[0].title,MONTHLY_ACTIVITIES[0].title);
 assert.deepEqual(monthlyActivityForRoll({face:1}),{
  face:1,title:MONTHLY_ACTIVITIES[0].title,
  description:MONTHLY_ACTIVITIES[0].description,is_restaurant:MONTHLY_ACTIVITIES[0].is_restaurant,timer_minutes:null
 });
 const historic={face:1,activity_title:'Ancienne activité du mois',
  activity_description:'Le souvenir de notre ancienne sortie à deux.',
  activity_is_restaurant:false};
 assert.equal(monthlyActivityForRoll(historic).title,'Ancienne activité du mois');
 assert.equal(monthlyActivityForRoll(historic).is_restaurant,false);
 assert.throws(()=>monthlyActivityForRoll({face:101}),/invalide/);
});
test('Only LoveRoll couple owner edits monthly activities, including before partner invitation',()=>{
 const sql=readFileSync(new URL('./edit-monthly-activities.sql',import.meta.url),'utf8');
 const serviceWorker=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 for(const clause of [
  'create table if not exists public.love_monthly_activity_overrides',
  'alter table public.love_monthly_activity_overrides enable row level security',
  'love_monthly_activity_owner_read',
  'owner_user_id=(select auth.uid())',
  'create or replace function public.save_love_monthly_activity(',
  'create or replace function public.reset_love_monthly_activity(',
  'where c.id=p_couple and c.owner_user_id=auth.uid()',
  'perform 1 from public.couples where id=p_couple for update',
  'primary key(couple_id,face)',
  'r.activity_title is null',
  'activity_title,activity_description,activity_is_restaurant',
  'coalesce(edited.title,selected.title)',
  'coalesce(edited.description,selected.description)',
  'coalesce(edited.is_restaurant,selected.is_restaurant)',
  "if p_kind='monthly_restaurant' and not coalesce(is_restaurant,false)"
 ])assert.ok(sql.includes(clause),'Missing owner-only or snapshot rule: '+clause);
 assert.ok(!sql.includes('delete from public.couple_rolls'));
 assert.ok(!sql.includes('delete from public.couple_intimacy'));
 assert.ok(app.includes("function renderMonthlyLibrary(){"));
 assert.ok(app.includes("state.tab==='monthly-library'&&isLoveAdmin()"));
 assert.ok(app.includes("['home','settings','invitation','library','personal-journal','monthly-library','advent-editor','special-editor']"));
 assert.ok(app.includes("query('love_monthly_activity_overrides',{eq:{couple_id:state.coupleId}})"));
 assert.ok(app.includes("rpc('save_love_monthly_activity_with_timer'"));
 assert.ok(app.includes("rpc('reset_love_monthly_activity'"));
 assert.ok(app.includes("settingRow('Activités du mois'"));
 assert.ok(app.includes("premiumHomeHtml({")); // monthly activity now displayed via live monthly countdown
 assert.ok(app.includes("const activity=active?monthlyActivityForRoll(active):null"));
 const surpriseMarkup=readFileSync(new URL('./premium-surprise.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(surpriseMarkup,/Restaurant connu ou nouveau \?|roll:monthly_restaurant|surprise-restaurant-button/);
 assert.ok(serviceWorker.includes("'./monthly-activities.mjs'"));
 assert.ok(!app.includes("safe(outings[a.face-1])"));
});

test('Private Advent 2026 import accepts 25 user-written days without altering the wording',()=>{
 assert.equal(ADVENT_YEAR,2026);
 const calendar={calendar_title:'Notre calendrier de Noël',year:2026,target_audience:'18+',
  note:'Rester à la maison ou organiser deux sorties locales.',
  days:Array.from({length:25},(_,i)=>({
   day:i+1,type:i%2?'Repos':'Surprise',
   title:'Notre journée '+(i+1),
   description:'Un texte personnalisé de Noël pour notre couple, à partager seulement à deux.'
  }))};
 assert.equal(validateAdventJson(calendar),calendar);
 const saved=calendarFromSaved({
  calendar_title:calendar.calendar_title,target_audience:'18+',note:calendar.note
 },calendar.days);
 assert.deepEqual(saved,{...calendar,days:calendar.days.map(d=>({...d,timer_minutes:null}))});
 assert.throws(()=>validateAdventJson({...calendar,year:2027}),/2026/);
 assert.throws(()=>validateAdventJson({...calendar,days:calendar.days.slice(0,24)}),/25/);
 assert.throws(()=>validateAdventJson({...calendar,days:[...calendar.days.slice(0,24),calendar.days[0]]}),/uniques/);
 assert.throws(()=>validateAdventJson({...calendar,days:calendar.days.map((x,i)=>i===0?{...x,title:''}:x)}),/invalide/);
 assert.throws(()=>validateAdventJson({...calendar,target_audience:'all'}),/18/);
});
test('Founder-only Advent editor, server date locks and shared immutable case snapshots',()=>{
 const migration=readFileSync(new URL('./import-private-advent-2026.sql',import.meta.url),'utf8');
 for(const part of [
  'public.love_advent_2026_config',
  'public.love_advent_2026_days',
  'enable row level security',
  'love_advent_config_owner_read',
  'love_advent_days_owner_read',
  'c.owner_user_id=(select auth.uid())',
  'create or replace function public.import_love_advent_2026(',
  'jsonb_array_length',
  'count(distinct (value->>\'day\')::integer)',
  'select 1 from public.couples c where c.id=p_couple and c.owner_user_id=auth.uid()',
  'p_day>extract(day from d)::int',
  'extract(year from d)::int=2026',
  'advent_type,advent_title,advent_description',
  'if found then return rowout;end if;',
  "values(p_couple,'advent',auth.uid(),'Case de décembre')"
 ])assert.ok(migration.includes(part),'Missing Advent SQL guarantee: '+part);
 assert.ok(!migration.includes('delete from public.couple_advent'));
 assert.ok(!migration.includes('delete from public.love_custom_challenges'));
 assert.ok(!migration.includes('delete from public.couple_intimacy'));
 assert.ok(app.includes("function renderAdventEditor()"));
 assert.ok(app.includes("import_love_advent_2026"));
 assert.ok(app.includes("previewPortableJson('advent')"));
 assert.ok(app.includes("state.advent2026Config=adventConfig[0]||null"));
 assert.ok(app.includes("['home','settings','invitation','library','personal-journal','monthly-library','advent-editor','special-editor']"));
 assert.ok(app.includes("['library','monthly-library','advent-editor','special-editor'].includes(parts[0])"));
 const newAdvent=readFileSync(new URL('./premium-advent.mjs',import.meta.url),'utf8');
 assert.match(newAdvent,/opened\.advent_description/);
 assert.match(newAdvent,/opened\.advent_type/);
 assert.match(newAdvent,/opened\.advent_title/);
 assert.match(app,/adventPremiumHtml\(/);
 assert.ok(!app.includes('advent[selected.day-1])</h3>'));
 const sw=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 assert.ok(sw.includes("'./advent-calendar.mjs'"));
});

test('Six festivals have two complete independent six-sided dice in the JSON importer',()=>{
 const calendar={evenements_speciaux:{}};
 for(const key of SPECIAL_EVENT_KEYS)calendar.evenements_speciaux[key]={
  evenement:'Célébration surprise',date:'2027-05-09',
  D6_activite:Array.from({length:6},(_,i)=>({[i+1]:'Activité confidentielle numéro '+(i+1)})),
  D6_modificateur:Array.from({length:6},(_,i)=>({[i+1]:'Règle confidentielle numéro '+(i+1)}))
 };
 assert.equal(validateSpecialEventsJson(calendar),calendar);
 assert.equal(SPECIAL_EVENT_KEYS.length,6);
 assert.throws(()=>validateSpecialEventsJson({...calendar,evenements_speciaux:{}}),/six/);
 assert.throws(()=>validateSpecialEventsJson({...calendar,
  evenements_speciaux:{...calendar.evenements_speciaux,saint_valentin:{
   ...calendar.evenements_speciaux.saint_valentin,D6_activite:[{1:'Erreur'}]}}}),/Six/);
 assert.throws(()=>validateSpecialEventsJson({...calendar,
  evenements_speciaux:{...calendar.evenements_speciaux,fete_des_peres:{
   ...calendar.evenements_speciaux.fete_des_peres,D6_modificateur:[
    {1:'Correctement numéroté'}, {2:'Correctement numéroté'}, {2:'Mauvaise face'},
    {4:'Correctement numéroté'}, {5:'Correctement numéroté'}, {6:'Correctement numéroté'}]
  }}}),/Option/);
 assert.equal(privateSpecialKey('birthday','creator','creator'),'mon_anniversaire');
 assert.equal(privateSpecialKey('birthday','partner','creator'),'anniversaire_de_mon_partenaire');
 assert.equal(privateSpecialKey('mothers_day',null,'creator'),'fete_des_meres');
 assert.equal(privateSpecialKey('womens_day',null,'creator'),null);
});
test('Server protects future D6 options, uses only random 1..6, and preserves previous rolls',()=>{
 const schema=readFileSync(new URL('./special-event-private-schema.sql',import.meta.url),'utf8');
 const validator=readFileSync(new URL('./special-events-import-rpc.sql',import.meta.url),'utf8');
 const rolls=readFileSync(new URL('./special-events-roll-rpc.sql',import.meta.url),'utf8');
 const worker=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 for(const token of [
  "check(roll_type in ('surprise','host','activity','modifier'))",
  "check(roll_type not in ('host','activity','modifier') or face<=6)",
  'alter table public.love_special_event_catalogue enable row level security',
  'love_special_event_catalogue',
  'revoke all on public.love_special_modifier_snapshots from public,anon,authenticated'
 ])assert.ok(schema.includes(token),'Missing private DB restriction '+token);
 for(const token of [
  'c.owner_user_id=auth.uid()','import_love_special_events',
  'jsonb_array_length(d6)<>6',
  'my_love_special_event_keys',
  'couple_private.is_member(p_couple)'
 ])assert.ok(validator.includes(token),'Missing owner validation '+token);
 for(const token of [
  "p_roll not in ('surprise','host','activity','modifier')",
  "if p_roll='activity' then",
  "if p_roll='modifier' then",
  "floor(random()*6)::int+1",
  "n-1)->>(n::text)",
  "prior.couple_id is null",
  "p_kind='birthday'",
  "if eventyear>=2027",
  'on conflict(couple_id,event_year,occasion_key) do nothing',
  'from public.love_special_modifier_snapshots',
  "if data is not null then raise exception 'Pour cette fête, utilisez les deux D6'",
 ])assert.ok(rolls.includes(token),'Missing random D6 or snapshot behavior '+token);
 assert.ok(app.includes("rpc('my_love_special_event_keys'"));
 assert.ok(app.includes("function renderSpecialEventsEditor()"));
 assert.ok(app.includes("heroDice(activity.face,6,"));
 assert.ok(app.includes("heroDice(modifier.face,6,"));
 assert.ok(app.includes("':activity','Découvrir l’activité','class=\"settings-primary\"'"));
 assert.ok(app.includes("':modifier','Révéler la touche surprise','class=\"settings-primary\"'"));
 assert.ok(app.includes("previewPortableJson('special')"));
 assert.ok(app.includes('state.specialEventsConfig=specialSettings[0]?.events||null'));
 assert.ok(worker.includes("'./private-special-events.mjs'"));
 assert.ok(!rolls.includes('delete from public.couple_occasion_rolls'));
});

test('Real-time server D35 odds mirror 88/12 preference and keep safeguards',()=>{
 const sql=readFileSync(new URL('./draw-category-88-12.sql',import.meta.url),'utf8');
 assert.ok(sql.includes('weights:=array_append(weights,case when v_cat=p_preference then 88 else 12 end);'));
 assert.ok(!sql.includes('then 80 else 20'));
 assert.ok(sql.includes("if p_preference not in ('SENSUEL','SEXUEL')"));
 assert.ok(sql.includes('if capacity>0 then'));
 assert.ok(sql.includes('ticket:=floor(random()*total)::integer;'));
 assert.ok(sql.includes('and history.card_id=card'));
 assert.ok(sql.includes('coalesce(chosen.title,original.title)'));
 assert.ok(sql.includes('coalesce(chosen.description,original.description)'));
 assert.ok(sql.includes('insert into public.love_card_draw_history'));
 assert.ok(sql.includes('cc.drawer_role'));
 assert.ok(sql.includes('cc.recipient_role'));
 assert.ok(sql.includes('d35:=floor(random()*35)::integer+1'));
 assert.ok(!sql.includes('delete from public.couple_challenges'));
 assert.ok(app.includes("p_preference:selectedCategory,p_random:false"));
 assert.match(app,/selectedCategory==='HASARD'/);
});

test('Settings groups remain settings-only; after-party forms live under Soirée',()=>{
 const settings=app.slice(app.indexOf('function renderSettings(){'),app.indexOf('async function refreshAndShow()',app.indexOf('function renderSettings()')));
 assert.match(settings,/compte:\{title:'Mon compte'/);
 assert.match(settings,/couple:\{title:'Notre duo'/);
 assert.match(settings,/notifications:\{title:'Notifications'/);
 assert.match(settings,/application:\{title:'Application et aide'/);
 assert.doesNotMatch(settings,/button\('tab:feedback'/);
 assert.match(app,/if\(!s&&state\.sessions\?\.some/);
 assert.match(app,/if\(verb==='review-open'\)/);
 assert.doesNotMatch(app,/choose-feedback|save-feedback/);
 assert.match(app,/if\(verb==='send-messenger'\)/);
 assert.match(app,/LoveRollNativeAuth\?\.openShare/);
 assert.match(app,/navigator\.share/);
});

test('Android APK and Web use one shared LoveRoll interface; iPad layout is adaptive',()=>{
 const manifest=readFileSync(new URL('../app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
 const native=readFileSync(new URL('../app/src/main/java/ca/desadeux/jeu/ConnectedLoveRollActivity.java',import.meta.url),'utf8');
 const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
 const install=readFileSync(new URL('./home-install.mjs',import.meta.url),'utf8');
 assert.ok(manifest.includes('<activity android:name=".ConnectedLoveRollActivity" android:exported="true"'));
 assert.match(manifest,/<intent-filter><action android:name="android.intent.action.MAIN"\/><category android:name="android.intent.category.LAUNCHER"\/><\/intent-filter>/);
 const mainBlock=manifest.slice(manifest.indexOf('<activity android:name=".MainActivity"'),manifest.indexOf('</activity>',manifest.indexOf('<activity android:name=".MainActivity"')));
 assert.doesNotMatch(mainBlock,/android.intent.category.LAUNCHER/);
 assert.doesNotMatch(native,/Button back = new Button/);
 assert.match(native,/web.loadUrl\(SITE\+suffix\)/);
 assert.match(native,/openLegacyOffline/);
 assert.match(native,/checkForUpdates/);
 assert.match(app,/settings-editorial/);
 assert.match(app,/native-legacy/);
 assert.match(app,/native-update/);
 assert.match(css,/@media \(min-width:768px\)/);
 assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(install,/navigator.platform==='MacIntel'/);
});

test('LoveRoll user-facing navigation uses inviting words instead of technical dice codes',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const nav=app.slice(app.indexOf('function nav(){'),app.indexOf('function bindActions(){'));
 assert.match(nav,/Surprise/);
 assert.doesNotMatch(nav,/D6|D20|D35/);
 assert.match(readFileSync(new URL('./premium-home.mjs',import.meta.url),'utf8'),/BRASSER LE DÉ/);
 assert.match(app,/DÉCOUVRIR UN DÉFI POUR/);
 assert.match(readFileSync(new URL('./premium-surprise.mjs',import.meta.url),'utf8'),/Brasser le dé/);
 assert.match(app,/SURPRISE DU MOIS|RENDEZ-VOUS SURPRISE/);
 assert.doesNotMatch(app,/LANCER LE D35 POUR|LANCER LE D20 MENSUEL/);
});

test('Premium screens share a responsive dice and invitation layout on mobile and tablets',()=>{
 const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const onboarding=readFileSync(new URL('./onboarding.mjs',import.meta.url),'utf8');
 for(const cls of ['premium-intro','hero-game-card','premium-die','premium-invite-hero','premium-auth-panel','premium-help']){
  assert.ok(css.includes('.'+cls),'Missing responsive component: '+cls);
 }
 assert.match(css,/@media\(min-width:768px\)/);
 assert.match(app,/premiumHomeHtml\(\{/);
 assert.match(app,/heroDice\(null,100/);
 assert.match(app,/heroDice\(null,20/);
 assert.match(onboarding,/entry-auth-segments/);
});
