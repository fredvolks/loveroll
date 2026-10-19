import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {invitationStatus,coupleStats,formatCoupleDate,invitationEmailText,invitationMessengerText,invitationPreviewMarkup} from './couple-dashboard.mjs';
import {shouldOfferInstall,dismissInstall,installOfferHtml,isStandalone} from './home-install.mjs';

test('Invitation has accurate states and never claims unsent share was delivered',()=>{
 const NOW=Date.parse('2026-10-14T12:00:00Z');
 const prepared={expires_at:'2026-12-01T00:00:00Z',sent_at:null};
 assert.equal(invitationStatus(null,false).code,'none');
 assert.equal(invitationStatus(prepared,false,NOW).code,'prepared');
 assert.equal(invitationStatus({...prepared,sent_at:'2026-10-14T08:00:00Z'},false,NOW).code,'pending');
 assert.equal(invitationStatus({...prepared,cancelled_at:'2026-10-14T08:00:00Z'},false,NOW).code,'cancelled');
 assert.equal(invitationStatus({...prepared,accepted_at:'2026-10-14T08:00:00Z'},false,NOW).code,'accepted');
 assert.equal(invitationStatus({...prepared,expires_at:'2026-01-01T00:00:00Z'},false,NOW).code,'expired');
 assert.equal(invitationStatus(null,true).code,'accepted');
});
test('Couple success rate counts fully finished sessions only',()=>{
 const stats=coupleStats([
  {finished_at:'2026-10-01',counted:true},
  {finished_at:'2026-10-02',counted:false},
  {finished_at:null,counted:false},
  {finished_at:'2026-10-03',counted:true}],
  [{status:'completed'},{status:'passed'},{status:'completed'}],3);
 assert.equal(stats.percentage,50);
 assert.equal(stats.challengesDone,2);
 assert.equal(stats.intimateReportCount,3);
 assert.equal(coupleStats([],[]).percentage,null);
});
test('Invitation links stay private, in LoveRoll theme',()=>{
 const text=invitationEmailText('https://example.test/#invite=TOKEN');
 assert.match(text,/example\.test\/\#invite=TOKEN/);
 assert.match(text,/ACCEPTER L’INVITATION/);
 assert.match(invitationPreviewMarkup(),/LoveRoll/);
 assert.match(readFileSync(new URL('./invitation-email.html',import.meta.url),'utf8'),/href="{{INVITATION_LINK}}"/);
});
test('Install suggestion is optional and remembers dismissals',()=>{
 const data=new Map();
 const store={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 assert.equal(isStandalone(),false);
 assert.equal(shouldOfferInstall('person1',store),true);
 assert.match(installOfferHtml(),/VOTRE ESPACE EST PRÊT/);
 assert.match(installOfferHtml(),/Plus tard/);
 dismissInstall('person1',store);
 assert.equal(shouldOfferInstall('person1',store),false);
 assert.equal(shouldOfferInstall('person2',store),true);
});
test('Invitation status APIs and native SMS open only a composer',()=>{
 const schema=readFileSync(new URL('./invitation-status-couple-overview.sql',import.meta.url),'utf8');
 const android=readFileSync(new URL('../app/src/main/java/ca/desadeux/jeu/ConnectedLoveRollActivity.java',import.meta.url),'utf8');
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(schema,/mark_pair_invite_sent/);
 assert.match(schema,/cancel_pair_invite/);
 assert.match(schema,/set_love_relationship_date/);
 assert.match(android,/Intent\.ACTION_SENDTO/);
 assert.doesNotMatch(android,/SmsManager\.getDefault/);
 assert.match(app,/window\.LoveRollNativeAuth\.openSms\(text\)/);
 assert.match(app,/state\.invitations=await query/);
});

test('Messenger invitation is one clickable link, not a giant blue block',()=>{
 const link='https://fredvolks.github.io/mon-wallet-android/?invite_id=72aa640b-2644-4d0d-bcf7-575587d27f31';
 const shared=invitationMessengerText(link);
 assert.equal(shared,link);
 assert.equal(shared.split(link).length,2,'Only one URL should be shared');
 assert.doesNotMatch(shared,/Je t’invite|Ouvre ton invitation/);
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 assert.match(html,/og:image:width" content="1200"/);
 assert.match(html,/og:image:height" content="630"/);
 assert.match(html,/loveroll-messenger-og-v142\.jpg/);
 assert.match(html,/og:image:type" content="image\/jpeg"/);
 assert.doesNotMatch(html,/loveroll-invite-og\.png\?v=5/);
 const image=readFileSync(new URL('./assets/loveroll-messenger-og-v142.jpg',import.meta.url));
 assert.ok(image.byteLength>30000&&image.byteLength<250000);
 assert.deepEqual([...image.subarray(0,2)],[255,216]);
 assert.deepEqual([...image.subarray(-2)],[255,217]);
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/verb==='send-messenger'\?invitationMessengerText\(d\.link\)/);
 assert.match(app,/navigator\.share\(\{url:d\.link\}\)/);
 assert.match(app,/inviteLinkForId\(CONFIG\.siteUrl,invitationId\)/);
});
