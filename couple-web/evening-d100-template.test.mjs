import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumEveningHtml,updateEveningCategoryUi} from './premium-evening.mjs';
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
 // Escape must respect ANY active native dialog, including Surprise, not only D100.
 assert.match(app,/!document\.querySelector\('\\.lr-dialog-overlay,dialog\\[open\\]'\)/);
 assert.doesNotMatch(app,/!document\\.querySelector\\('dialog#evening-play-info\\[open\\]'\\)/);
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
 assert.equal(at(1180,820,660,276),352,'Playable landscape iPad uses the 43dvh cap even with a short theater');
 assert.equal(at(1024,768,640,490),330,'Landscape iPad uses the Surprise 43dvh cap');
 assert.equal(at(1024,600,620,200),258,'Landscape tablet never shrinks to the grid-row height');
});


function categoryOddsFixture(){
 const doc={createElement:tag=>({
  tag,className:'',children:[],_text:'',
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');},
  set textContent(value){this._text=String(value);this.children=[];},
  appendChild(child){this.children.push(child);},
  setAttribute(name,value){this[name]=value;}
 })};
 const options={};
 const buttons=['SENSUEL','HASARD','SEXUEL'].map(type=>{
  const option={odds:null,
   querySelector:()=>option.odds,
   appendChild(node){option.odds=node;node.remove=()=>{option.odds=null;};}
  };
  options[type]=option;
  const attrs={};
  return {dataset:{action:'category:'+type},ownerDocument:doc,disabled:false,attrs,
   classList:{toggle(){}},closest:()=>option,setAttribute:(key,val)=>{attrs[key]=val;}};
 });
 const roll={disabled:true};
 const group={querySelectorAll:()=>buttons,classList:{remove(){}},
  querySelector:()=>null,closest:()=>({querySelector:()=>roll})};
 return {root:{querySelector:()=>group},options,buttons,roll};
}

test('Live D100 odds show random category as 50/50 and preserve readable spacing',()=>{
 const f=categoryOddsFixture();
 assert.equal(updateEveningCategoryUi(f.root,'HASARD',74),true);
 assert.equal(f.options.HASARD.odds?.textContent,'50 % Sensuel · 50 % Sexuel');
 assert.equal(f.options.HASARD.odds?.['aria-live'],'polite');
 assert.equal(f.roll.disabled,false);
 assert.equal(f.buttons[1].attrs['aria-pressed'],'true');

 assert.equal(updateEveningCategoryUi(f.root,'SENSUEL',74),true);
 assert.equal(f.options.HASARD.odds,null);
 assert.equal(f.options.SENSUEL.odds?.textContent,'74 % de chances d’avoir cette catégorie');
 assert.equal(f.buttons[0].attrs['aria-pressed'],'true');
 assert.equal(f.buttons[1].attrs['aria-pressed'],'false');

 assert.equal(updateEveningCategoryUi(f.root,'SEXUEL',61),true);
 assert.equal(f.options.SENSUEL.odds,null);
 assert.equal(f.options.SEXUEL.odds?.textContent,'61 % de chances d’avoir cette catégorie');
 assert.equal(updateEveningCategoryUi(f.root,'SEXUEL',61),true);
 assert.equal(f.options.SEXUEL.odds?.textContent,'61 % de chances d’avoir cette catégorie');
});

test('Server-rendered D100 category labels survive the next responsive refresh',()=>{
 const base={...ready,categoryOdds:74};
 const random=premiumEveningHtml({...base,category:'HASARD'});
 assert.match(random,/data-action="category:HASARD"[^>]*aria-pressed="true"/);
 assert.match(random,/<small class="evening-choice-odds" aria-live="polite">50 % Sensuel · 50 % Sexuel<\/small>/);
 assert.doesNotMatch(random,/chancesd’avoir/);
 for(const category of ['SENSUEL','SEXUEL']){
  const html=premiumEveningHtml({...base,category});
  assert.match(html,/74 % de chances <span>d’avoir cette catégorie<\/span>/);
  assert.doesNotMatch(html,/chancesd’avoir/);
 }
 const none=premiumEveningHtml({...base,category:null});
 assert.doesNotMatch(none,/class="evening-choice-odds"/);
});


test('D100 odds never print an invalid percentage across live and fresh views',()=>{
 for(const [raw,expected] of [[Infinity,88],[NaN,88],[135,100],[-15,0]]){
  const html=premiumEveningHtml({...ready,category:'SEXUEL',categoryOdds:raw});
  assert.match(html,new RegExp('>'+expected+' % de chances <span>d’avoir cette catégorie'));
  assert.doesNotMatch(html,/Infinity|NaN|135 %|-15 %/);

  const live=categoryOddsFixture();
  assert.equal(updateEveningCategoryUi(live.root,'SEXUEL',raw),true);
  assert.equal(live.options.SEXUEL.odds?.textContent,
   expected+' % de chances d’avoir cette catégorie');
 }
 const random=premiumEveningHtml({...ready,category:'HASARD',categoryOdds:Infinity});
 assert.match(random,/50 % Sensuel · 50 % Sexuel/);
 assert.doesNotMatch(random,/Infinity|NaN/);
});

test('Disabled D100 category is never selected by a stale touch or late event',()=>{
 const f=categoryOddsFixture();
 f.buttons[1].disabled=true; // e.g. server forbids a category during a turn switch
 assert.equal(updateEveningCategoryUi(f.root,'HASARD',74),false);
 assert.equal(f.options.HASARD.odds,null);
 assert.equal(f.roll.disabled,true);
 assert.equal(f.buttons[1].attrs['aria-pressed'],undefined);
 // A different enabled choice is still valid; only the disabled target is refused.
 assert.equal(updateEveningCategoryUi(f.root,'SENSUEL',74),true);
 assert.equal(f.options.SENSUEL.odds?.textContent,'74 % de chances d’avoir cette catégorie');
 assert.equal(f.roll.disabled,false);
 const all=categoryOddsFixture();
 all.buttons.forEach(button=>button.disabled=true);
 assert.equal(updateEveningCategoryUi(all.root,'SEXUEL'),false);
 assert.equal(all.roll.disabled,true);
});
