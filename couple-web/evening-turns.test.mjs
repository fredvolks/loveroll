import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {sharedEveningTurns,evenLabels,lastOfficialChallengeFace,latestCountedSession} from './evening-turns.mjs';

const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const members=[{user_id:a},{user_id:b}],id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const session={id,opened_by:a,starting_user_id:a,paired_turns:true,self_draws:true};
const rolls=(aCount,bCount)=>[{user_id:a,face:aCount},{user_id:b,face:bCount}];
const cards=(completedA,completedB)=>[
 ...Array.from({length:completedA},(_,i)=>({id:'a'+i,recipient:a,offered_by:b,status:'completed'})),
 ...Array.from({length:completedB},(_,i)=>({id:'b'+i,recipient:b,offered_by:a,status:'completed'}))
];

test('4 versus 2 alternates A B A B A A on both accounts',()=>{
 const history=[];
 for(let i=0;i<6;i++){
  const state=sharedEveningTurns(session,members,rolls(4,2),history);
  assert.equal(state.ready,true);
  assert.equal(state.pending,null);
  assert.equal(state.first,a);
  assert.deepEqual(state.targets,{[a]:4,[b]:2});
  history.push({id:String(i),recipient:state.next,offered_by:state.next===a?b:a,status:'completed'});
 }
 assert.deepEqual(history.map(x=>x.recipient),[a,b,a,b,a,a]);
 assert.equal(sharedEveningTurns(session,members,rolls(4,2),history).finished,true);
});

test('starter is a 50/50 server decision; client honours whichever was picked',()=>{
 assert.equal(sharedEveningTurns({...session,starting_user_id:b},members,rolls(2,2),[]).next,b);
 assert.equal(sharedEveningTurns(session,members,rolls(2,2),[]).next,a);
});

test('cannot reveal either count or show turn before BOTH personal rolls',()=>{
 assert.equal(sharedEveningTurns(session,members,[{user_id:a,face:2}],[]).ready,false);
 assert.equal(sharedEveningTurns(session,members,[],[]).reason,'personal-rolls');
});

test('gift with TWO challenges moves one remaining turn to the other, no six minimum',()=>{
 const gift={session_id:id,donor_user_id:a,receiver_user_id:b};
 let turn=sharedEveningTurns(session,members,rolls(2,2),[],[gift]);
 assert.deepEqual(turn.targets,{[a]:1,[b]:3});
 assert.deepEqual(turn.remaining,{[a]:1,[b]:3});
 turn=sharedEveningTurns(session,members,rolls(2,2),cards(1,0),[gift]);
 assert.equal(turn.remaining[a],0);
 assert.equal(turn.next,b);
});

test('queued challenge counts as drawn while the other partner may keep drawing',()=>{
 const pending={id:'open',recipient:a,offered_by:b,status:'proposed'};
 const state=sharedEveningTurns(session,members,rolls(1,2),[pending]);
 assert.equal(state.pending?.id,'open');
 assert.equal(state.remaining[a],0);
 assert.equal(state.next,b);
 assert.equal(state.drawn[a],1);
});

test('monthly 3 gift quota enforced in protected RPC and not tied to number 6',()=>{
 const schema=readFileSync(new URL('./migrations/20261014_random_starter_and_gifts.sql',import.meta.url),'utf8');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(schema,/order by random\(\) limit 1/);
 assert.match(schema,/starting_user_id/);
 assert.match(schema,/if monthly_count>=3/);
 assert.match(schema,/if face_count\+gifts_in-gifts_out<=done_count\+pending_count/);
 assert.doesNotMatch(schema,/face_count\s*[!=><]+\s*6\s*then/);
 assert.match(schema,/auth\.uid\(\)/);
 assert.match(schema,/for update/);
 assert.match(app,/rpc\('give_love_challenge'/);
 assert.match(app,/turn\.remaining\[me\]<=0/);
 assert.match(app,/Nos 200 défis/);
 assert.match(app,/state\.eveningBoard/);
});

test('baseline weekly result remains unique to the couple for one week',()=>{
 const schema=readFileSync(new URL('./schema.sql',import.meta.url),'utf8');
 assert.match(schema,/unique\(couple_id,kind,key\)/);
 assert.match(schema,/when a<50 then 1 when a<75 then 2 when a<87 then 3/);
});

test('Gift receiver chooses exact category while ordinary draws retain 88/12',()=>{
 const migration=readFileSync(new URL('./migrations/20261014_gift_challenge_category.sql',import.meta.url),'utf8');
 assert.match(migration,/if capacity>0 and \(not gifted_turn or v_cat=p_preference\)/);
 assert.match(migration,/case when gifted_turn then 100 when v_cat=p_preference then 88 else 12 end/);
 assert.match(migration,/is_gifted boolean not null default false/);
 assert.match(migration,/completed_by_me>=greatest\(0,base_turns-donated_turns\)/);
});
test('A gifted challenge is RECEIVED by the partner, who rolls their own turn',()=>{
 const migration=readFileSync(new URL('./migrations/20261014_self_received_challenge_gifts.sql',import.meta.url),'utf8');
 assert.match(migration,/if s.self_draws then target:=auth.uid\(\)/);
 assert.match(migration,/recipient=auth.uid\(\) and status='completed'/);
 assert.match(migration,/self_draws boolean not null default false/);
});

test('4/6 personal rolls immediately assign 10 challenges before any card is drawn',()=>{
 const turn=sharedEveningTurns(session,members,rolls(4,6),[],[]);
 assert.equal(turn.ready,true);assert.deepEqual(turn.targets,{[a]:4,[b]:6});
 assert.deepEqual(turn.completed,{[a]:0,[b]:0});
 assert.deepEqual(turn.remaining,{[a]:4,[b]:6});
 const afterPass=sharedEveningTurns(session,members,rolls(4,6),[
  {status:'passed',recipient:a,offered_by:b}],[]);
 assert.deepEqual(afterPass.targets,turn.targets);
 assert.deepEqual(afterPass.completed,turn.completed);
 const gifts=[{session_id:id,donor_user_id:a,receiver_user_id:b}];
 const swapped=sharedEveningTurns(session,members,rolls(4,6),[],gifts);
 assert.equal(swapped.targets[a],3);assert.equal(swapped.targets[b],7);
});
test('Last D35 face is the latest official historical result, never the oldest',()=>{
 const history=[
  {session_id:id,face:8,created_at:'2026-10-14T20:00:00Z',status:'completed'},
  {session_id:id,face:27,created_at:'2026-10-14T21:00:00Z',status:'completed'}
 ];
 assert.equal(lastOfficialChallengeFace(history,id),27);
 assert.equal(lastOfficialChallengeFace([...history].reverse(),id),27);
 assert.equal(lastOfficialChallengeFace(history,'other'),null);
 assert.equal(lastOfficialChallengeFace([{face:'—'},...history],id),27);
});

test('The D100 preserves any official face from 1 to 100 after reload',()=>{
 const history=[
  {session_id:id,face:27,created_at:'2026-10-16T14:00:00Z'},
  {session_id:id,face:55,created_at:'2026-10-16T15:00:00Z'},
  {session_id:id,face:100,created_at:'2026-10-16T16:00:00Z'}
 ];
 assert.equal(lastOfficialChallengeFace(history,id),100);
 assert.equal(lastOfficialChallengeFace(history.slice(0,2),id),55);
 assert.equal(lastOfficialChallengeFace(history.slice(0,1),id),27);
 assert.equal(lastOfficialChallengeFace([{session_id:id,face:101},...history],id),100);
 assert.equal(lastOfficialChallengeFace([{session_id:id,face:0},...history],id),100);
});

test('Aftercare selects newest counted evening even when backend returns oldest first',()=>{
 const history=[
  {id:'one',finished_at:'2026-10-10T21:00:00Z',counted:true},
  {id:'two',finished_at:'2026-10-13T21:00:00Z',counted:true},
  {id:'three',finished_at:'2026-10-14T21:00:00Z',counted:false}
 ];
 assert.equal(latestCountedSession(history)?.id,'two');
 assert.equal(latestCountedSession(history.slice().reverse())?.id,'two');
 assert.equal(latestCountedSession([{id:'open',finished_at:null,counted:true}]),null);
});
