import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('admin.html',import.meta.url),'utf8');
const css=readFileSync(new URL('studio-real-sandbox.css',import.meta.url),'utf8');
const js=readFileSync(new URL('platform-admin.js',import.meta.url),'utf8');
const sandbox=readFileSync(new URL('studio-real-sandbox.mjs',import.meta.url),'utf8');
const gameApp=readFileSync(new URL('app.js',import.meta.url),'utf8');
test('Studio real sandbox uses existing secure platform gate and no standalone fake dice',()=>{
 assert.match(html,/id="gate"/);
 assert.match(html,/data-panel="realtest"/);
 assert.match(html,/studio-real-frame-A/);
 assert.match(html,/studio-real-frame-B/);
 assert.match(html,/studio-real-delete/);
 assert.match(html,/id="studio-real-reset"/);
 assert.match(html,/id="studio-real-reconnect"/);
 assert.match(sandbox,/\$\('studio-real-reconnect'\)\.addEventListener/);
 assert.match(html,/id="studio-real-check"/);
 assert.match(html,/id="studio-real-diagnostics"/);
 assert.match(html,/id="studio-real-progress"/);
 assert.match(html,/id="studio-real-progress-count"/);
 assert.match(html,/id="studio-real-progress-list"/);
 assert.match(html,/id="studio-real-eclat-count"/);
 assert.match(html,/id="studio-real-eclat-grid"/);
 assert.match(css,/\.studio-real-eclat-coffret/);
 assert.match(sandbox,/function renderEclatProgress\(/);
 assert.match(sandbox,/studioEclatOverview\(status,ECLAT_COFFRETS\)/);
 assert.match(sandbox,/heading\.textContent=\(running\?/);
 assert.match(css,/\.studio-real-eclat-coffret\[data-state="active"\]/);
 assert.doesNotMatch(sandbox,/item\.innerHTML/);
 assert.match(css,/\.studio-real-progress/);
 assert.match(sandbox,/function renderProgress\(/);
 assert.match(sandbox,/studioTestProgress\(status,authenticatedSeats\)/);
 assert.match(html,/id="studio-real-audit"/);
 assert.match(html,/id="studio-real-audit-list"/);
 assert.match(css,/\.studio-real-audit/);
 assert.match(sandbox,/function renderAudit\(/);
 assert.match(sandbox,/list\.replaceChildren\(\)/);
 assert.match(sandbox,/time\.textContent=Number\.isFinite/);
 assert.doesNotMatch(sandbox,/item\.innerHTML/);
 assert.match(html,/id="studio-real-challenge-cards"/);
 assert.match(html,/id="studio-real-challenge-list"/);
 assert.match(css,/\.studio-real-challenge-card/);
 assert.match(sandbox,/function renderChallengeCards\(/);
 assert.match(sandbox,/list\.replaceChildren\(\)/);
 assert.match(sandbox,/title\.textContent=String\(card\.title/);
 assert.doesNotMatch(sandbox,/article\.innerHTML/);
 assert.match(css,/\.studio-real-diagnostics/);
 for(const seat of ['A','B']){
  assert.match(html,new RegExp('id="studio-real-expand-'+seat+'"'));
  assert.match(html,new RegExp('id="studio-real-jump-'+seat+'"'));
 }
 assert.match(css,/\.studio-real-jump/);
 for(const route of ['journal','personal-journal','occasions']){
  assert.equal((html.match(new RegExp('<option value="'+route+'">','g'))||[]).length,2,route+' appears on both real seats');
  assert.match(js,/createStudioRealSandbox/);
 assert.match(js,/btn\.closest\('\.studio-mobile-shortcuts'\)/);
 assert.match(js,/scrollIntoView\(\{behavior:'smooth',block:'start'\}\)/);
 }
 for(const seat of ['A','B'])assert.match(html,new RegExp('id="studio-real-seat-state-'+seat+'"'));
 assert.match(sandbox,/authenticatedSeats\.size===2/);
 assert.match(sandbox,/authenticatedSeats\.delete\(seat\)/);
 assert.match(sandbox,/showSeatConnection\(seat,'connected'\)/);
 assert.doesNotMatch(sandbox,/say\('Vraies sessions LoveRoll A et B disponibles/);
 assert.match(js,/createStudioRealSandbox/);
 assert.match(js,/realSandbox\.init/);
 assert.match(js,/const gated=\(\)=>\{\s*authGateGeneration\+\+;\s*realSandbox\.deactivate\(\)/);
 assert.match(js,/authGateGeneration\+\+/);
 assert.match(js,/generation!==authGateGeneration/);
 assert.match(js,/if\(generation!==authGateGeneration\)return; \/\/ Don't reshow admin after signout/);
 assert.match(js,/if\(event==='SIGNED_OUT'\)\{data=null;gated\(\)/);
 assert.match(sandbox,/function deactivate\(\)/);
 assert.match(sandbox,/active=false;\s*status=null;\s*closeFrames\(\)/);
 assert.doesNotMatch(html,/id="sim-d100"|id="sim-d6-face-0"/);
});
test('Responsive iPad desktop split and mobile seat switching',()=>{
 assert.match(css,/@media\(min-width:1024px\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:1023px\)/);
 assert.match(css,/\.studio-real-frame\.studio-real-active/);
 assert.match(css,/\.studio-real-frame\.studio-real-maximized/);
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/studio-real-fullscreen/);
});

test('Studio inspector refreshes after real Supabase RPC success, without fabricating card payloads',()=>{
 assert.match(gameApp,/const studioGameWriteRpcs=new Set/);
 assert.match(gameApp,/if\(studioSeatId&&studioGameWriteRpcs\.has\(name\)\)/);
 assert.match(gameApp,/if\(error\)throw error/);
 assert.match(gameApp,/type:'loveroll-studio-game-updated',seat:studioSeatId/);
 assert.match(sandbox,/if\(msg\.type==='loveroll-studio-game-updated'\)/);
 assert.match(sandbox,/if\(authenticatedSeats\.has\(seat\)\)/);
 assert.match(sandbox,/await refresh\(\)/);
});


test('real history pagination is keyboard-accessible on iPad/PC/mobile, not a synthetic card list',()=>{
 assert.match(html,/id="studio-real-history-seat"/);
 assert.match(sandbox,/filter\.disabled=historyBusy\|\|!available/);
 for(const id of ['studio-real-history-open','studio-real-history-nav',
  'studio-real-history-prev','studio-real-history-next',
  'studio-real-history-count','studio-real-history-close']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/aria-label="Pages de l’historique des défis"/);
 assert.match(html,/studio-real-history-count" role="status" aria-live="polite"/);
 assert.match(css,/\.studio-real-history-nav/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(sandbox,/function loadChallengeHistory\(page\)/);
 assert.match(sandbox,/await request\('challenge_history',historySeat==='all'\?null:historySeat,\{page\}\)/);
 assert.match(sandbox,/const cards=historyOpen\?historyCards:/);
 assert.match(sandbox,/Array\.isArray\(game\?\.challenge_preview\)/);
 assert.match(sandbox,/const available=status\?\.ready===true/);
 assert.match(sandbox,/historyBusy\|\|\(historyPage\+1\)\*10>=historyTotal/);
 assert.match(sandbox,/historyPage===0/);
 assert.match(sandbox,/const requestGeneration=historyGeneration/);
 assert.doesNotMatch(sandbox,/document\.write|article\.innerHTML|Math\.random/);
});


test('12 coffrets each route to the REAL logged-in A/B app, never a local fake scene',()=>{
 assert.match(sandbox,/function openRealCoffret\(seat,coffretId\)/);
 assert.match(sandbox,/authenticatedSeats\.has\(seat\)/);
 assert.match(sandbox,/frames\[seat\]\.contentWindow\.postMessage/);
 assert.match(sandbox,/type:'loveroll-studio-navigate',seat,tab:'eclat',coffret_id:coffretId/);
 assert.match(sandbox,/button\.textContent='Ouvrir dans '\+seat/);
 assert.match(sandbox,/button\.disabled=!active\|\|tearingDown\|\|busy\|\|!authenticatedSeats\.has\(seat\)/);
 assert.match(sandbox,/button\.addEventListener\('click',\(\)=>openRealCoffret\(seat,coffret\.id\)\)/);
 assert.match(css,/\.studio-real-eclat-open:focus-visible/);
 assert.match(gameApp,/await handle\('tab:'\+tab\)/);
 assert.match(gameApp,/await handle\('eclat:detail:'\+coffretId\)/);
 assert.match(gameApp,/state\.tab!=='eclat'/);
 assert.doesNotMatch(sandbox,/fakeEclat|Math\.random|fakeCoffret/);
});
