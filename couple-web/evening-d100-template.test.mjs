import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml} from './premium-evening.mjs';
import {eveningPlayInfoHtml,calculateEveningD100StageSize} from './evening-d100-template.mjs';
const ready={session:{id:'s',paired_turns:true,self_draws:true},members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Émilie'}],me:'a',status:{both_ready:true},turn:{ready:true,next:'a',remaining:{a:2,b:3}}};
test('No category is preselected; an eligible player can press roll to receive guidance',()=>{
 const html=premiumEveningHtml(ready);
 assert.equal((html.match(/aria-pressed="false"/g)||[]).length,3);
 assert.doesNotMatch(html,/aria-pressed="true"/);
 assert.doesNotMatch(html,/data-action="new-challenge"[^>]*disabled/);
 for(const [blocked,label] of [
  [{...ready,turn:{...ready.turn,next:'b'}},'En attente du tour de ton partenaire'],
  [{...ready,rolling:true},'Brassage en cours…'],
  [{...ready,status:{both_ready:false}},'Lance ton D6 pour continuer']
 ]){
  const view=premiumEveningHtml(blocked);
  assert.doesNotMatch(view,/data-action="new-challenge"/,'A waiting state must never be a fake button');
  assert.match(view,new RegExp('class="evening-primary-status" role="status">'+label));
 }
});
test('Information uses the actual configured preference and preserves calendar and closure',()=>{
 const info=eveningPlayInfoHtml(74);
 assert.match(info,/74 % pour la catégorie choisie et 26 % pour l’autre/);
 assert.match(info,/à parts égales/);assert.match(info,/3 dons par personne et par mois/);
 assert.match(info,/data-action="evening-calendar"/);assert.match(info,/data-action="evening-close-request"/);
 assert.doesNotMatch(info,/88 %/);
});


test('The D100 information button also exists on desktop, without rolling the die',()=>{
 const source=readFileSync(new URL('./evening-d100-template.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('./evening-d100-template.css',import.meta.url),'utf8');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(source,/function installDesktopEveningInfo\(view\)/);
 assert.match(source,/root\.classList\.toggle\('has-evening-d100-desktop-info',desktop\)/);
 assert.match(source,/if\(!enabled\)\{if\(desktop\)installDesktopEveningInfo\(view\);return false;\}/);
 assert.match(source,/if\(!hero\|\|hero\.querySelector\('\.home-odds-info'\)\)return;/);
 assert.match(source,/aria-controls','evening-play-info'/);
 assert.match(source,/dialog\.addEventListener\('close'/);
 assert.match(app,/!document\.querySelector\('dialog#evening-play-info\[open\]'\)/);
 assert.match(app,/const gameInfo=document\.querySelector\('dialog#evening-play-info\[open\]'\)/);
 assert.match(app,/if\(gameInfo\)\{gameInfo\.close\(\);return true;\}/);
 assert.match(css,/@media \(min-width:1200px\) and \(pointer:fine\)/);
 assert.match(css,/\.evening-step\.two \.evening-die-row>\.home-odds-info/);
 assert.doesNotMatch(source.slice(source.indexOf('function installDesktopEveningInfo'),source.indexOf('let observer;')),/rollTo\(|give_love_challenge|Math\.random/);
});

test('Live D100 matches Surprise on iPad without changing the small-phone clamp',()=>{
 const at=(viewportWidth,viewportHeight,heroWidth,heroHeight)=>
  calculateEveningD100StageSize({viewportWidth,viewportHeight,heroWidth,heroHeight});
 assert.equal(at(393,852,393,480),322,'Android phone remains at 82vw / 41dvh');
 assert.equal(at(320,568,320,100),136,'Short phones retain the self-shrinking stage guard');
 assert.equal(at(768,1024,650,550),440,'Portrait iPad uses the Surprise 440px cap');
 assert.equal(at(1024,768,640,490),330,'Landscape iPad uses the Surprise 43dvh cap');
 assert.equal(at(1024,600,620,200),188,'Short iPad theater remains height-safe');
});
