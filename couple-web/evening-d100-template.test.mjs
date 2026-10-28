import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml} from './premium-evening.mjs';
import {eveningPlayInfoHtml} from './evening-d100-template.mjs';
const ready={session:{id:'s',paired_turns:true,self_draws:true},members:[{user_id:'a',name:'Fred'},{user_id:'b',name:'Émilie'}],me:'a',status:{both_ready:true},turn:{ready:true,next:'a',remaining:{a:2,b:3}}};
test('No category is preselected; an eligible player can press roll to receive guidance',()=>{
 const html=premiumEveningHtml(ready);
 assert.equal((html.match(/aria-pressed="false"/g)||[]).length,3);
 assert.doesNotMatch(html,/aria-pressed="true"/);
 assert.doesNotMatch(html,/data-action="new-challenge"[^>]*disabled/);
 for(const blocked of [{...ready,turn:{...ready.turn,next:'b'}},{...ready,rolling:true},{...ready,status:{both_ready:false}}]){
  assert.match(premiumEveningHtml(blocked),/data-action="new-challenge"[^>]*disabled/);
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
