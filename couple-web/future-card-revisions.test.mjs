import test from 'node:test';
import assert from 'node:assert/strict';
import {
 FUTURE_ARCHIVE_KIND,FUTURE_ARCHIVE_LIMIT,FUTURE_ARCHIVE_MAX_BYTES,
 blankFutureArchive,inspectFutureArchive,addFutureArchiveRevision,
 recoverFutureArchiveRevision
} from './future-card-revisions.mjs';

const card=(id,title)=>({id,title,
 description:'Un défi complet que les deux partenaires peuvent accepter ou refuser.',
 levels:['soft','medium'],target:'both',minutes:3});
const firstDate='2026-10-31T18:00:00.000Z',nextDate='2026-11-01T18:00:00.000Z';

test('each local version keeps its original snapshot and never mutates older cards',()=>{
 const original=[card('rituel-a','Le rituel original')];
 const one=addFutureArchiveRevision(blankFutureArchive(),original,{
  createdAt:firstDate,label:'Premier catalogue'});
 original[0].title='Titre modifié après archivage';
 const modified=[card('rituel-a','Le rituel renouvelé'),card('rituel-b','Le rituel suivant')];
 const two=addFutureArchiveRevision(one,modified,{createdAt:nextDate,label:'Deuxième catalogue'});
 assert.equal(two.kind,FUTURE_ARCHIVE_KIND);
 assert.equal(inspectFutureArchive(two).valid,true);
 assert.equal(inspectFutureArchive(two).count,2);
 assert.equal(one.revisions.length,1);
 assert.equal(recoverFutureArchiveRevision(two,'revision:'+firstDate)[0].title,
  'Le rituel original');
 assert.equal(recoverFutureArchiveRevision(two,'revision:'+nextDate).length,2);
 const recovered=recoverFutureArchiveRevision(two,'revision:'+firstDate);
 recovered[0].title='Encore changé';
 assert.equal(recoverFutureArchiveRevision(two,'revision:'+firstDate)[0].title,
  'Le rituel original');
});
test('a corrupted or untrusted archive is rejected before import or recovery',()=>{
 for(const value of [null,{},[],{kind:FUTURE_ARCHIVE_KIND,version:99,revisions:[]},
  {...blankFutureArchive(),revisions:[{id:'hacker',cards:[card('a','Titre valide')]}]},
  {...blankFutureArchive(),revisions:[{id:'revision:'+firstDate,
   createdAt:firstDate,label:'Version',cards:[card('a','<script>bad</script>')]}]}])
  assert.equal(inspectFutureArchive(value).valid,false);
 assert.throws(()=>recoverFutureArchiveRevision({},'x'),/Historique/);
 assert.throws(()=>addFutureArchiveRevision({},[card('a','Titre valide')],{
  createdAt:firstDate,label:'Valid'}),/Historique/);
});
test('dates, duplicate revisions, malformed cards and missing labels cannot archive',()=>{
 const archive=blankFutureArchive();
 const good=[card('a','Un titre valide')];
 for(const date of ['2026-02-30T12:00:00.000Z','2026-10-31',
  '2026-10-31T18:00:00Z','not-a-date'])
  assert.throws(()=>addFutureArchiveRevision(archive,good,{
   createdAt:date,label:'V1'}),/Date/);
 for(const cards of [[],[card('bad!','Un titre valide')],[
  card('a','Un titre valide'),card('a','Un titre valide')
 ],[{...card('a','Un titre valide'),minutes:7}],
  [{...card('a','Un titre valide'),levels:['medium','medium']}],
  [{...card('a','Un titre valide'),description:'trop court'}]])
  assert.throws(()=>addFutureArchiveRevision(archive,cards,{
   createdAt:firstDate,label:'Test'}),/Corriger/);
 assert.throws(()=>addFutureArchiveRevision(archive,good,{
  createdAt:firstDate,label:''}),/Nom/);
 const one=addFutureArchiveRevision(archive,good,{createdAt:firstDate,label:'Version'});
 assert.throws(()=>addFutureArchiveRevision(one,good,{
  createdAt:firstDate,label:'Doublon'}),/existe déjà/);
 assert.equal(archive.revisions.length,0);
});
test('full archives fail closed and never silently drop old versions',()=>{
 let archive=blankFutureArchive();
 for(let i=0;i<FUTURE_ARCHIVE_LIMIT;i++)archive=addFutureArchiveRevision(
  archive,[card('a','Un titre valide')],{
   createdAt:new Date(Date.parse(firstDate)+i*1000).toISOString(),
   label:'Version '+i
  });
 assert.equal(inspectFutureArchive(archive).count,FUTURE_ARCHIVE_LIMIT);
 assert.throws(()=>addFutureArchiveRevision(archive,[card('a','Un titre valide')],{
  createdAt:nextDate,label:'Au-delà'}),/Limite/);
 assert.equal(archive.revisions[0].label,'Version 0');
 assert.ok(FUTURE_ARCHIVE_MAX_BYTES>=1024*1024);
});
test('JSON export/import round-trip preserves all revisions and original cards',()=>{
 const one=addFutureArchiveRevision(blankFutureArchive(),
  [card('first','Première idée originale')],{
   createdAt:firstDate,label:'Version initiale'});
 const copy=JSON.parse(JSON.stringify(one));
 assert.deepEqual(copy,one);
 assert.equal(inspectFutureArchive(copy).valid,true);
 assert.equal(recoverFutureArchiveRevision(copy,'revision:'+firstDate)[0].id,'first');
});
