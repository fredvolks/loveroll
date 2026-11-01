import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {invitationStatus,coupleInvitationView,canConfirmInvitationShare,coupleStats,formatCoupleDate,invitationEmailText,invitationMessengerText,invitationPreviewMarkup} from './couple-dashboard.mjs';
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

test('Invitation selection is scoped to the current couple and genuine unexpired records',()=>{
 const NOW=Date.parse('2026-10-31T18:00:00Z');
 const mine={id:'mine',couple_id:'couple-a',invited_email:'a@example.com',
  expires_at:'2026-11-07T18:00:00Z'};
 const other={id:'other',couple_id:'couple-b',invited_email:'x@example.com',
  expires_at:'2026-11-07T18:00:00Z'};
 assert.deepEqual(coupleInvitationView([other,mine],'couple-a',NOW),{latest:mine,active:mine});
 assert.deepEqual(coupleInvitationView([other],'couple-a',NOW),{latest:null,active:null});
 assert.deepEqual(coupleInvitationView([mine],'couple-a',Date.parse('2026-11-07T18:00:00Z')),
  {latest:mine,active:null});
 assert.equal(coupleInvitationView([{...mine,cancelled_at:'2026-10-30'}],'couple-a',NOW).active,null);
 assert.equal(coupleInvitationView([{...mine,accepted_at:'2026-10-30'}],'couple-a',NOW).active,null);
 assert.equal(coupleInvitationView([{...mine,expires_at:'invalid'}],'couple-a',NOW).active,null);
 assert.equal(coupleInvitationView(null,'couple-a',NOW).active,null);
});
test('Expired cached invitation can never be shared or silently regenerated',async()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const start=app.indexOf('async function ensureInviteDraft(');
 const end=app.indexOf('\nfunction keepAuthModeInUrl(',start);
 assert.ok(start>=0&&end>start);
 const code=app.slice(start,end);
 const state={coupleId:'couple-a',members:[{user_id:'member'}],invitations:[],
  inviteDraft:{id:'cached',email:'a@example.com',link:'https://old.test'}};
 let created=0;
 const invite={id:'fresh-id',couple_id:'couple-a',invited_email:'a@example.com',
  expires_at:'2099-01-01T00:00:00Z'};
 const ensure=new Function('state','id','normalizeInviteEmail','CONFIG',
  'coupleInvitationView','inviteLinkForId','randomInviteToken','hashToken','rpc','query',
  code+'\nreturn ensureInviteDraft;')(
   state,()=>({value:'a@example.com'}),v=>v,{siteUrl:'https://example.test'},
   coupleInvitationView,(site,id)=>site+'/?invite='+id,
   ()=>'synthetic-token',async()=> 'synthetic-hash',
   async()=>{created++;return invite.id;},async()=>[invite]
  );
 await assert.rejects(()=>ensure(false),/Aucun lien actif/);
 assert.equal(created,0);
 const draft=await ensure(true);
 assert.equal(created,1);
 assert.equal(draft.id,'fresh-id');
 assert.equal((await ensure(false)).id,'fresh-id');
 state.invitations=[{...invite,expires_at:'2026-01-01T00:00:00Z'}];
 await assert.rejects(()=>ensure(false),/Aucun lien actif/);
 assert.equal(created,1);
 state.invitations=[{...invite,cancelled_at:'2026-10-30'}];
 await assert.rejects(()=>ensure(false),/Aucun lien actif/);
 state.invitations=[{...invite,couple_id:'couple-b'}];
 await assert.rejects(()=>ensure(false),/Aucun lien actif/);
 assert.equal(created,1);
});
test('Invitation UI only exposes sharing controls for active same-couple links',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const panel=app.slice(app.indexOf('function renderInvitePanel(){'),
  app.indexOf('\nfunction renderPartnerInvitation(){'));
 const waiting=app.slice(app.indexOf('function renderWaitingPartner(){'),
  app.indexOf('\n// One private draft',app.indexOf('function renderWaitingPartner(){')));
 assert.match(panel,/coupleInvitationView\(state\.invitations,state\.coupleId\)/);
 assert.match(waiting,/coupleInvitationView\(state\.invitations,state\.coupleId\)/);
 assert.match(panel,/if\(active\)\{/);
 assert.doesNotMatch(panel,/if\(active\|\|!latest\)/);
 assert.match(panel,/Créer mon invitation/);
 assert.match(panel,/Copier le lien/);
 assert.match(app,/if\(!forceNew\)throw Error\('Aucun lien actif/);
});

test('Manual invitation sent confirmation is scoped to exact user, duo and link',()=>{
 const NOW=Date.parse('2026-10-31T18:00:00Z');
 const invite={id:'invite-a',couple_id:'couple-a',expires_at:'2026-11-07T18:00:00Z'};
 const attempt={userId:'alice',coupleId:'couple-a',inviteId:'invite-a',method:'messenger'};
 assert.equal(canConfirmInvitationShare(attempt,invite,'alice','couple-a',NOW),true);
 assert.equal(canConfirmInvitationShare({...attempt,method:'partage'},invite,'alice','couple-a',NOW),true);
 assert.equal(canConfirmInvitationShare({...attempt,method:'lien'},invite,'alice','couple-a',NOW),false);
 for(const [a,i,u,c] of [
  [null,invite,'alice','couple-a'],
  [attempt,null,'alice','couple-a'],
  [attempt,{...invite,id:'new-link'},'alice','couple-a'],
  [attempt,invite,'bob','couple-a'],
  [attempt,invite,'alice','other-couple'],
  [{...attempt,method:'untrusted'},invite,'alice','couple-a'],
  [attempt,{...invite,cancelled_at:'2026-10-30'},'alice','couple-a'],
  [attempt,{...invite,accepted_at:'2026-10-30'},'alice','couple-a'],
  [attempt,{...invite,expires_at:'2026-10-31T18:00:00Z'},'alice','couple-a']
 ])assert.equal(canConfirmInvitationShare(a,i,u,c,NOW),false);
});
test('Share UI and confirmation block must follow a composer attempt, never silently mark delivery',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 const panel=app.slice(app.indexOf('function renderInvitePanel(){'),
  app.indexOf('\nfunction renderPartnerInvitation(){'));
 assert.match(panel,/canConfirmInvitationShare\(state\.lastInviteShareAttempt,liveInvite,state\.user\?\.id,state\.coupleId\)/);
 const from=app.indexOf("if(verb==='send-sms'||verb==='send-email'||verb==='send-messenger'||verb==='copy-invite'){");
 const to=app.indexOf("if(verb==='cancel-invite'){",from);
 const code=app.slice(from,to);
 assert.ok(from>=0&&to>from);
 assert.match(code,/state\.lastInviteShareAttempt=\{userId,coupleId,inviteId:d\.id,method\}/);
 assert.match(code,/if\(error\?\.name==='AbortError'\)return/);
 assert.match(code,/if\(!canConfirmInvitationShare\(attempt,active,userId,coupleId\)\)/);
 assert.match(code,/p_invitation:active\.id,p_method:attempt\.method/);
 assert.match(code,/state\.lastInviteShareAttempt=null/);
 assert.doesNotMatch(code,/lastShareMethod/);
 assert.match(code,/recordAttempt\('partage'\)/);
 const sql=readFileSync(new URL('./invitation-status-couple-overview.sql',import.meta.url),'utf8');
 assert.match(sql,/p_method not in \('partage','sms','courriel','messenger'\)/);
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
