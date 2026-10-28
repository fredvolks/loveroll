import test from 'node:test';
import assert from 'node:assert/strict';
import {eveningInviteHtml,isEveningInviteAction,eveningInviteChanged} from './evening-invitation.mjs';
test('discreet invite only offered when verified server says available',()=>{
 assert.equal(eveningInviteHtml({state:'none',available:false}),'');
 assert.equal(eveningInviteHtml(null),'');
 assert.equal(eveningInviteHtml({state:'obsolete',direction:'received'}),'');
 assert.equal(eveningInviteHtml({state:'obsolete',direction:'sent'}),'');
 const html=eveningInviteHtml({state:'none',available:true});
 assert.match(html,/As-tu envie de jouer ce soir/);
 assert.match(html,/data-action="evening-invite:send"/);
 assert.doesNotMatch(html,/my-d6|roll_my_evening_d6|new-session/);
});
test('incoming private invitation allows real yes/no/maybe/ignore, no dice automation',()=>{
 const html=eveningInviteHtml({state:'pending',direction:'received',id:'123'},{partnerName:'Alex'});
 assert.match(html,/Alex a envie de jouer ce soir/);
 for(const answer of ['yes','no','maybe','ignored'])
  assert.ok(html.includes('evening-invite:'+answer));
 assert.doesNotMatch(html,/roll_my_evening_d6|ensure_couple_session/);
 const maybe=eveningInviteHtml({state:'maybe',direction:'received'});
 assert.match(maybe,/evening-invite:yes/);
 assert.doesNotMatch(maybe,/evening-invite:maybe/);
});
test('escaping names and user feedback, no direct card text in invitation',()=>{
 const html=eveningInviteHtml({state:'pending',direction:'received'},
  {partnerName:'<img src=x onerror=alert(1)>'});
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
});
test('sender sees polite response states with no resend button',()=>{
 for(const status of ['pending','yes','no','maybe','expired','ignored']){
  const html=eveningInviteHtml({state:status,direction:'sent'},{partnerName:'Alex'});
  assert.ok(html.includes('lr-evening-invite'));
  assert.doesNotMatch(html,/evening-invite:send/);
 }
});
test('status changes only when official invitation read changes',()=>{
 assert.equal(eveningInviteChanged({state:'pending',id:'a'},{state:'yes',id:'a'}),true);
 assert.equal(eveningInviteChanged({state:'none',available:false},{state:'none',available:true}),true);
 assert.equal(eveningInviteChanged({state:'yes',id:'a'},{state:'yes',id:'a'}),false);
 assert.equal(isEveningInviteAction('send'),true);
 assert.equal(isEveningInviteAction('roll'),false);
});
