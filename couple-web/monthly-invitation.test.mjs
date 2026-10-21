import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyInvitation} from './monthly-invitation.mjs';
import {premiumHomeHtml} from './premium-home.mjs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';
import {monthlyActivityForRoll} from './monthly-activities.mjs';
const members=[{user_id:'a',name:'Fred'},{user_id:'b',name:'Émilie'}];
const activity={face:19,activity_title:'Notre activité enregistrée',activity_description:'Description conservée'};
test('Every saved monthly D6 face selects the same inviter on Home and Surprise',()=>{
 for(let face=1;face<=6;face++){
  const monthly={monthly_activity:activity,monthly_host:{face}},index=face%2===0?0:1;
  const result=monthlyInvitation(monthly,members);
  assert.equal(result.host.user_id,members[index].user_id);
  assert.equal(result.guest.user_id,members[1-index].user_id);
  const home=premiumHomeHtml({monthly,members,monthlyActivity:monthlyActivityForRoll(activity)});
  const surprise=premiumSurpriseHtml({monthly,members,activity:monthlyActivityForRoll(activity)});
  assert.ok(home.includes(members[index].name+' invite '+members[1-index].name));
  assert.ok(surprise.includes(members[index].name+' invite cette fois-ci'));
  assert.ok(home.includes('Notre activité enregistrée'));
  assert.match(home,/class="home-next-month[^"]*" data-action="tab:special"/);assert.doesNotMatch(home,/home-monthly-recap/);
 }
});
test('Unrolled and partially rolled months never invent an activity or inviter',()=>{
 const empty=premiumHomeHtml({members});
 assert.match(empty,/Brasser notre surprise/);assert.match(empty,/Un tirage commun ce mois-ci/);
 const pending=premiumHomeHtml({members,monthly:{monthly_activity:activity}});
 assert.match(pending,/Notre activité enregistrée/);assert.match(pending,/Déterminer qui invite/);
 assert.doesNotMatch(pending,/Fred invite Émilie|Émilie invite Fred/);
 assert.equal(monthlyInvitation({monthly_host:{face:2}},members),null);
 for(const face of [0,7,NaN,null])assert.equal(monthlyInvitation({monthly_activity:activity,monthly_host:{face}},members),null);
});
test('Saved titles, distinct same-first-name partners and HTML escaping are retained',()=>{
 const monthly={monthly_activity:{...activity,activity_title:'Spa <privé> "à deux"'},monthly_host:{face:2}};
 const same=[{user_id:'a',name:'Alex Tremblay'},{user_id:'b',name:'Alex Roy'}];
 const html=premiumHomeHtml({members:same,monthly,monthlyActivity:monthlyActivityForRoll(monthly.monthly_activity)});
 assert.match(html,/Alex Tremblay invite Alex Roy/);
 assert.match(html,/Spa &lt;privé&gt; &quot;à deux&quot;/);assert.doesNotMatch(html,/<privé>/);
 assert.equal(monthlyActivityForRoll(monthly.monthly_activity).title,'Spa <privé> "à deux"');
});
