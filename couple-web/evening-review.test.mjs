import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eveningReviewModal,validEveningReview,eveningPersonReviewMarkup,REVIEW_QUESTIONS} from './evening-review.mjs';
import {eveningHistoryMarkup} from './evening-calendar.mjs';
const read=f=>readFileSync(new URL(f,import.meta.url),'utf8');
const members=[{user_id:'fred',name:'Fred'},{user_id:'partner',name:'Partenaire'}];
const sessions=[{id:'evening-1',started_at:'2026-10-16T17:00:00Z',finished_at:'2026-10-16T22:00:00Z',counted:true}];
const reviews=[
 {session_id:'evening-1',author_id:'fred',overall:4,connection:5,appreciation:3,again:4,
  comment:'Une belle soirée',submitted_at:'2026-10-16T18:00:00Z'},
 {session_id:'evening-1',author_id:'partner',overall:5,connection:4,appreciation:4,again:5,
  comment:'J’ai aimé notre moment',submitted_at:'2026-10-16T19:00:00Z'}
];
test('One premium review modal, four heart questions and NO calendar CTA or passphrase',()=>{
 assert.deepEqual(REVIEW_QUESTIONS.map(q=>q.label),[
  'Rendu global de la soirée','Connexion à deux','Appréciation des défis','Envie de recommencer']);
 const html=eveningReviewModal({sessionId:'evening-1',draft:reviews[0]});
 assert.equal((html.match(/class="lr-review-question"/g)||[]).length,4);
 assert.equal((html.match(/class="lr-review-heart(?: is-lit)?"/g)||[]).length,20);
 assert.match(html,/Enregistrer notre bilan/);
 assert.doesNotMatch(html,/data-action="review-calendar"|>Voir le calendrier|phrase secrète|id="journal-pass"/i);
 assert.match(html,/maxlength="500"/);
 assert.doesNotMatch(html,/Plaisir des défis/);
});
test('Rating bounds, comment size and HTML escaping stay protected',()=>{
 assert.equal(validEveningReview(reviews[0]),true);
 assert.equal(validEveningReview({...reviews[0],appreciation:0}),false);
 assert.equal(validEveningReview({...reviews[0],connection:6}),false);
 assert.equal(validEveningReview({...reviews[0],comment:'x'.repeat(501)}),false);
 const html=eveningReviewModal({sessionId:'evening-1',draft:{comment:'<script>alert(1)</script>'}});
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>/);
});
test('Each person accordion owns ONLY their challenges and their own review',()=>{
 const historyChallenges=[
  {id:'a',session_id:'evening-1',recipient:'fred',category:'SENSUEL',face:2,status:'completed',created_at:'2026-10-16T18:00:00Z'},
  {id:'b',session_id:'evening-1',recipient:'partner',category:'SEXUEL',face:3,status:'proposed',created_at:'2026-10-16T19:00:00Z'}
 ];
 const html=eveningHistoryMarkup({sessions,members,reviews,historyChallenges,stats:[],me:'fred',
  month:'2026-10',selectedDate:'2026-10-16'});
 assert.equal((html.match(/class="evening-review-person"/g)||[]).length,2);
 assert.equal((html.match(/class="evening-cal-person-group"/g)||[]).length,2);
 assert.doesNotMatch(html,/evening-review-archive|evening-review-archive-grid/);
 const sections=[...html.matchAll(/<details class="evening-cal-person-group"[^>]*>([\s\S]*?)<\/details>/g)];
 assert.equal(sections.length,2);
 const fred=sections[0][1],partner=sections[1][1];
 assert.match(fred,/Bilan de Fred|Une belle soirée/);
 assert.match(fred,/Une belle soirée/);
 assert.doesNotMatch(fred,/J’ai aimé notre moment/);
 assert.match(fred,/Modifier mon bilan/);
 assert.match(partner,/J’ai aimé notre moment/);
 assert.doesNotMatch(partner,/Une belle soirée|Modifier mon bilan/);
});
test('Unsubmitted partner is pending only in their accordion',()=>{
 const fred=eveningPersonReviewMarkup({reviews:reviews.slice(0,1),sessionId:'evening-1',person:members[0],me:'fred'});
 const partner=eveningPersonReviewMarkup({reviews:reviews.slice(0,1),sessionId:'evening-1',person:members[1],me:'fred'});
 assert.match(fred,/Une belle soirée/);
 assert.match(partner,/En attente de son bilan/);
 assert.doesNotMatch(partner,/data-action="review-open:evening-1"/);
 const mine=eveningPersonReviewMarkup({reviews:[],sessionId:'evening-1',person:members[0],me:'fred'});
 assert.match(mine,/data-action="review-open:evening-1"/);
});
test('Only closed evenings show a review below challenges; ongoing sessions do not',()=>{
 const pending=eveningHistoryMarkup({sessions:[{...sessions[0],finished_at:null}],members,reviews,
  stats:[],historyChallenges:[],month:'2026-10',selectedDate:'2026-10-16'});
 assert.doesNotMatch(pending,/evening-review-person|Bilan de Fred/);
});
test('Old passphrase-based evening reviews are gone from app routes',()=>{
 const app=read('app.js');
 for(const old of ['choose-feedback','save-feedback','renderFeedback','my_love_feedback_status',
  'couple_feedback', "state.tab==='feedback'",'feedbackItemsFor','review-calendar']){
  assert.ok(!app.includes(old),'Obsolete feedback workflow still referenced: '+old);
 }
 assert.match(app,/rpc\('save_love_evening_review'/);
 assert.match(app,/rpc\('love_evening_reviews_for_couple'/);
 assert.match(app,/if\(board\?\.finished\)/);
});
test('New per-person reviews remain authenticated and protected',()=>{
 const sql=read('migrations/20261016_evening_hearts_reviews.sql');
 assert.match(sql,/PRIMARY KEY\(session_id,author_id\)/);
 assert.match(sql,/couple_private\.is_member\(v_couple\)/);
 assert.match(sql,/couple_private\.is_member\(p_couple\)/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/REVOKE ALL ON TABLE public\.couple_evening_reviews FROM PUBLIC, anon, authenticated/);
});
