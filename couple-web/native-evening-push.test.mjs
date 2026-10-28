import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const java=readFileSync(new URL('../app/src/main/java/ca/desadeux/jeu/LoveRollFcmService.java',import.meta.url),'utf8');
const activity=readFileSync(new URL('../app/src/main/java/ca/desadeux/jeu/ConnectedLoveRollActivity.java',import.meta.url),'utf8');

test('native Android Push routes genuine evening invitations to real Soirée',()=>{
 assert.match(java,/String eventKey=data\.get\("event_key"\)/);
 assert.match(java,/eventKey\.startsWith\("evening-invite:"\)/);
 assert.match(java,/eventKey\.startsWith\("evening-reply:"\)/);
 assert.match(java,/kind\.equals\("weekly"\)\|\|eveningRequest\|\|eveningReply/);
 assert.match(java,/\.putExtra\("push_section",screen\)/);
 assert.match(activity,/\?open="\+pushed/);
 assert.match(activity,/section\.matches\("home\|session\|special\|advent"\)/);
});
test('fallback native notifications are generic, respectful and private',()=>{
 assert.match(java,/Une nouveauté LoveRoll vous attend/);
 assert.match(java,/♥ Une invitation LoveRoll t'attend/);
 assert.doesNotMatch(java,/Votre partenaire vous a rejoint/);
 assert.doesNotMatch(java,/challenge_title|challenge_description|card_title/);
 assert.match(java,/kind\.equals\("monthly"\)\|\|kind\.equals\("special"\)/);
});
