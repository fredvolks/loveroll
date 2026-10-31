import test from 'node:test';
import assert from 'node:assert/strict';
import {auditFutureCardCatalog,auditFuturePlayableCatalog,selectFutureCard,FUTURE_LEVELS,FUTURE_TARGETS}
 from './future-card-catalog.mjs';

const balancedCatalog=()=>{
 const make=(level,idx)=>({id:level+'-'+idx,levels:[level],
  target:FUTURE_TARGETS[idx%3],minutes:2+idx%5});
 const soft=Array.from({length:100},(_,i)=>make('soft',i));
 const medium=Array.from({length:100},(_,i)=>make('medium',i));
 const intense=Array.from({length:100},(_,i)=>make('intense',i));
 // Reuse five Soft cards within Medium without creating duplicate IDs.
 for(let i=0;i<5;i++)soft[i].levels.push('medium');
 // Reuse three Medium cards within Intense, still 100 per bucket.
 for(let i=5;i<8;i++)medium[i].levels.push('intense');
 return [...soft,...medium.slice(5),...intense.slice(3)];
};
test('300 memberships allow multi-level reuse with near-equal personal audiences',()=>{
 const cards=balancedCatalog();
 assert.equal(cards.length,292,'unique IDs do not need to equal memberships');
 const result=auditFutureCardCatalog(cards);
 assert.equal(result.valid,true,result.errors.join('\n'));
 for(const level of FUTURE_LEVELS){
  const summary=result.counts[level];
  assert.equal(summary.total,100);
  const values=FUTURE_TARGETS.map(key=>summary[key]);
  assert.equal(Math.max(...values)-Math.min(...values)<=1,true);
 }
 assert.equal(cards.filter(c=>c.levels.length>1).length,8);
});
test('Medium plus Intense excludes Soft and splits buckets exactly 50/50',()=>{
 const cards=balancedCatalog();
 const medium=selectFutureCard({cards,styleA:'medium',styleB:'intense',
  styleTicket:0.499999,cardTicket:0});
 const intense=selectFutureCard({cards,styleA:'medium',styleB:'intense',
  styleTicket:0.5,cardTicket:0.99});
 assert.equal(medium.level,'medium');
 assert.equal(intense.level,'intense');
 assert.equal(medium.candidateCount,100);
 assert.equal(intense.candidateCount,100);
 assert.ok(medium.card.levels.includes('medium'));
 assert.ok(intense.card.levels.includes('intense'));
 const same=selectFutureCard({cards,styleA:'soft',styleB:'soft',
  styleTicket:0.99,cardTicket:0.3});
 assert.equal(same.level,'soft');
 assert.equal(same.candidateCount,100);
});
test('Already-used cards are excluded without filling empty bucket with another style',()=>{
 const cards=balancedCatalog();
 const used=cards.filter(c=>c.levels.includes('medium')).map(c=>c.id);
 const out=selectFutureCard({cards,styleA:'medium',styleB:'intense',
  styleTicket:0.1,cardTicket:0.2,excludedIds:used});
 assert.equal(out.level,'medium');
 assert.equal(out.card,null);
 assert.equal(out.candidateCount,0);
 const selected=selectFutureCard({cards,styleA:'medium',styleB:'intense',
  styleTicket:0.8,cardTicket:0.2,excludedIds:used});
 assert.equal(selected.level,'intense');
 assert.ok(selected.card);
 assert.ok(!used.includes(selected.card.id));
});
test('Invalid card metadata cannot pass the future-only 300-card quality gate',()=>{
 const cards=balancedCatalog();
 assert.equal(auditFutureCardCatalog(null).valid,false);
 assert.equal(auditFutureCardCatalog(cards.slice(0,100)).valid,false);
 assert.equal(auditFutureCardCatalog([...cards,cards[0]]).valid,false);
 assert.equal(auditFutureCardCatalog([...cards,{...cards[0],id:'invalid-duration',minutes:7}]).valid,false);
 assert.equal(auditFutureCardCatalog([...cards,{...cards[0],id:'duplicated-level',levels:['soft','soft']}]).valid,false);
 assert.equal(auditFutureCardCatalog([...cards,{...cards[0],id:'missing-target',target:'unknown'}]).valid,false);
 const unbalanced=cards.map(c=>c.levels.includes('soft')?{...c,target:'both'}:c);
 assert.equal(auditFutureCardCatalog(unbalanced).valid,false);
 assert.throws(()=>selectFutureCard({styleTicket:-0.1}),/style|tirage|compris/i);
 assert.throws(()=>selectFutureCard({cardTicket:1}),/Tirage de carte invalide/);
});

test('A 300-slot metadata deck is not releasable until every real card has playable copy',()=>{
 const cards=balancedCatalog();
 assert.equal(auditFutureCardCatalog(cards).valid,true);
 const draft=auditFuturePlayableCatalog(cards);
 assert.equal(draft.valid,false);
 assert.ok(draft.errors.some(error=>error.includes('consigne absente')));
 const ready=cards.map((card,index)=>({...card,
  title:'Rituel original '+(index+1),
  description:'Proposition ludique rédigée et vérifiée pour la carte '+(index+1)+'.'
 }));
 assert.equal(auditFuturePlayableCatalog(ready).valid,true);
 const duplicate=ready.map(card=>({...card}));
 duplicate[1].title=duplicate[0].title;
 duplicate[1].description=duplicate[0].description;
 assert.equal(auditFuturePlayableCatalog(duplicate).valid,false);
 assert.ok(auditFuturePlayableCatalog(duplicate).errors.some(e=>e.includes('Consigne répétée')));
});
test('Future release audit rejects HTML, control characters and very short instructions',()=>{
 const cards=balancedCatalog().map((card,index)=>({...card,
  title:'Rituel '+(index+1),
  description:'Défi convivial numéro '+(index+1)+' avec consigne complète.'
 }));
 cards[2].title='<img src=x>';
 cards[3].description='Trop court';
 cards[4].description='Interdit <script>alert(1)</script>';
 const result=auditFuturePlayableCatalog(cards);
 assert.equal(result.valid,false);
 assert.ok(result.errors.some(e=>e.includes('titre absent')));
 assert.ok(result.errors.filter(e=>e.includes('consigne absente')).length>=2);
});
