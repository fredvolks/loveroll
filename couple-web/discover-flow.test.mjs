import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {discoverHtml} from './discover.mjs';
import {authHtml,marketingHtml} from './onboarding.mjs';

const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('./discover.css',import.meta.url),'utf8');
const sql=readFileSync(new URL('./migrations/20261014_safe_unpair_portable_library.sql',import.meta.url),'utf8');

test('Invitation immediately renders the approved premium visual, not authentication',()=>{
 const h=discoverHtml(true);
 for(const label of ['UNE INVITATION POUR NOUS DEUX','On se donne','rendez-vous ?','Soirées','surprise','Avent','événements à deux','200 défis.'])
  assert.ok(h.includes(label),label);
 assert.match(h,/data-action="invite-start"/);
 assert.match(h,/ACCEPTER L’INVITATION/);
 assert.doesNotMatch(h,/\bD6\b|\bD20\b|\bD35\b/);
 assert.doesNotMatch(h,/data-action="(show-auth|google|apple|email-login|verify-email-code)"/);
 assert.doesNotMatch(h,/Revenir à mon invitation|Continuer avec Google/);
 assert.match(h,/discover-editorial-die/);
 assert.match(css,/\.discover-editorial-die/);
 assert.match(css,/\.discover-accept/);
 assert.match(h,/loveroll-invitation-scene-v139\.webp/);
 assert.match(h,/fetchpriority="high"/);
 assert.match(css,/\.discover-editorial-list/);
 assert.equal((h.match(/class="discover-editorial-item /g)||[]).length,4);
 const shell=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 assert.match(shell,/loveroll-invitation-scene-v139\.webp/);
});

test('Public homepage shares the same premium visual while retaining account entry',()=>{
 const h=discoverHtml(false);
 assert.match(h,/data-action="show-auth:signup"/);
 assert.match(h,/data-action="show-auth:signin"/);
 assert.match(h,/COMMENCER NOTRE AVENTURE/);
 assert.doesNotMatch(h,/data-action="invite-start"/);
 assert.match(marketingHtml(),/love-onepage/);
});

test('Invitation remains the first screen, Google and email follow explicit acceptance only',()=>{
 const firstGate=app.indexOf('if(!state.passwordRecovery&&(state.showDiscover||(pendingInvite&&!state.inviteAccepted)))');
 const authGate=app.indexOf('if(!state.user||state.passwordRecovery){',app.indexOf('function render(){'));
 assert.ok(firstGate>0&&firstGate<authGate);
 assert.match(app,/root\.innerHTML=discoverHtml\(!!pendingInvite,inviteBrowserHelp\(\)\)/);
 assert.match(app,/sessionStorage\.setItem\('loverollInviteAccepted',invite\.kind\+':'\+invite\.value\)/);
 assert.match(app,/state\.showDiscover=false;/);
 assert.match(app,/if\(verb==='invite-start'\)/);
 assert.match(app,/authHtml\(!!pendingInvite,state\.passwordRecovery/);
 assert.doesNotMatch(authHtml(true),/data-action="show-landing"/);
});

test('App-wide theme brings premium visual language to all signed-in sections',()=>{
 const theme=readFileSync(new URL('./premium-theme.css',import.meta.url),'utf8');
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const worker=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 for(const selector of ['.card','.nav','.die','.settings-group','.auth-panel','button','.header']){
  assert.ok(theme.includes(selector),selector);
 }
 assert.match(html,/premium-theme\.css/);
 assert.match(worker,/premium-theme\.css/);
 assert.match(worker,/const CACHE='loveroll-static-v\d+';/);
});

test('Unpair keeps all challenges and settings in a user-owned archive',()=>{
 assert.match(app,/Dissocier notre duo/);
 assert.match(app,/rpc\('dissociate_love_to_solo'/);
 for(const table of [
  'love_custom_challenges','love_monthly_activity_overrides','love_advent_2026_config',
  'love_advent_2026_days','love_special_event_catalogue'])
  assert.match(sql,new RegExp(table));
 assert.match(sql,/snapshot_love_library\(p_couple\)/);
 assert.match(sql,/restore_love_library_for_new_owner/);
 assert.match(sql,/love_user_library_backup_owner/);
 assert.match(sql,/delete from public\.couple_members where couple_id=p_couple/);
 assert.doesNotMatch(sql,/delete from public\.love_custom_challenges/);
 assert.doesNotMatch(sql,/delete from public\.couple_challenges/);
 assert.doesNotMatch(sql,/delete from auth\.users/);
 assert.ok(sql.indexOf('perform couple_private.snapshot_love_library(p_couple);')<
  sql.indexOf('delete from public.couple_members where couple_id=p_couple;'));
});

test('iPad invitation fits one viewport without carousel or overlapping poster',()=>{
 const responsive=readFileSync(new URL('./responsive-tablet-desktop.css',import.meta.url),'utf8');
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 const h=discoverHtml(true);
 assert.match(responsive,/LoveRoll iPad v88/);
 assert.match(responsive,/max-width:1199px/);
 assert.match(responsive,/height:100dvh!important/);
 assert.match(responsive,/max-height:100dvh!important/);
 assert.match(responsive,/\.discover-editorial-die>img\{/);
 assert.match(responsive,/object-fit:contain!important/);
 assert.match(responsive,/overflow:hidden!important/);
 assert.match(html,/responsive-tablet-desktop\.css\?v=20261017-spacing125/);
 assert.equal((h.match(/class="discover-editorial-item /g)||[]).length,4);
 assert.doesNotMatch(h,/carousel|slider|swiper|overflow-x:auto/i);
});
