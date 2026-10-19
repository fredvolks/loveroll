import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoCoupleHtml,DEMO_TABS} from './demo-couple.mjs';
import {authHtml} from './onboarding.mjs';

const source=readFileSync(new URL('./demo-couple.mjs',import.meta.url),'utf8');
const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');

test('All five couple tabs plus journal are available without any real partner',()=>{
 assert.deepEqual(DEMO_TABS,['home','session','special','advent','settings','journal']);
 for(const tab of DEMO_TABS){
  const html=demoCoupleHtml({userName:'Moi',tab,roll:3,day:14});
  assert.match(html,/MODE DÉMO/);
  if(['home','session','settings'].includes(tab)) assert.ok(html.includes('Camille (démo)'));
  assert.match(html,/data-action="demo-exit"/);
  assert.match(html,/Simulation visuelle seulement/);
  assert.match(html,/data-action="demo-tab:home"/);
  assert.match(html,/data-action="demo-tab:session"/);
  assert.match(html,/data-action="demo-tab:special"/);
  assert.match(html,/data-action="demo-tab:advent"/);
  assert.match(html,/data-action="demo-tab:settings"/);
 }
});
test('Demo lives solely in memory and cannot write to Supabase',()=>{
 assert.doesNotMatch(source,/client\.|\.rpc\(|fetch\(|localStorage|sessionStorage|couple_members|couple_invitations/);
 assert.match(app,/if\(state\.demoMode\)/);
 assert.match(app,/if\(verb==='demo-enter'\)/);
 assert.match(app,/if\(verb==='demo-exit'\)/);
 assert.match(app,/if\(verb==='demo-tab'\)/);
 assert.match(app,/if\(verb==='demo-day'\)/);
 assert.doesNotMatch(app,/button\('demo-enter'/);
 const assets=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
 assert.match(assets,/demo-couple\.mjs/);
 assert.match(assets,/demo-couple\.css/);
});
test('Invitation login no longer shows duplicate Discover LoveRoll link',()=>{
 const html=authHtml(true);
 assert.doesNotMatch(html,/Découvrir LoveRoll|data-action="discover-loveroll"/);
 assert.match(html,/data-action="invite-return"/);
 assert.match(html,/Continuer avec Google/);
});
test('Demo renders fake but usable elements with no server action controls',()=>{
 const html=demoCoupleHtml({userName:'Fred',tab:'session',roll:4});
 assert.match(html,/Fred/);
 assert.match(html,/data-action="demo-roll"/);
 assert.match(html,/data-action="demo-complete"/);
 assert.doesNotMatch(html,/data-action="(accept-invite|end-couple|new-session|answer:|signout)"/);
});
