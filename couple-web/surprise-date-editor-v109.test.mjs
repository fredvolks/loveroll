import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {premiumSurpriseHtml} from './premium-surprise.mjs';
import {displaySurpriseDate,formatSurpriseDateInput,parseSurpriseDateInput,validAnnualDate} from './surprise-event-config.mjs';

const members=[{user_id:'f1',name:'Fred'},{user_id:'f2',name:'Fred'}];
const settings={surprise_event_overrides:{anniversary:{month_day:'12-25',title:'Notre fête'}}};
test('Quebec dates are displayed as day/month/year, never date-only picker',()=>{
 const html=premiumSurpriseHtml({members,settings,editSlot:'anniversary',now:new Date('2026-10-16T12:00:00-04:00')});
 assert.match(html,/id="surprise-event-date" type="text" inputmode="numeric"/);
 assert.match(html,/placeholder="JJ\/MM\/AAAA"/);
 assert.match(html,/value="25\/12\/2026"/);
 assert.match(html,/surprise-date-hint/);
 assert.doesNotMatch(html,/id="surprise-event-date" type="date"/);
 assert.doesNotMatch(html,/Voir ses surprises/);
 assert.equal((html.match(/data-action="save-surprise-event"/g)||[]).length,1);
});
test('Numeric keyboard input is formatted as eight digits are entered or pasted',()=>{
 assert.equal(formatSurpriseDateInput(''),'');
 assert.equal(formatSurpriseDateInput('2'),'2');
 assert.equal(formatSurpriseDateInput('25'),'25');
 assert.equal(formatSurpriseDateInput('251'),'25/1');
 assert.equal(formatSurpriseDateInput('2512'),'25/12');
 assert.equal(formatSurpriseDateInput('25122026'),'25/12/2026');
 assert.equal(formatSurpriseDateInput('25/12/2026'),'25/12/2026');
 assert.equal(formatSurpriseDateInput('25-12-2026'),'25/12/2026');
 assert.equal(formatSurpriseDateInput('251220261234'),'25/12/2026');
});
test('Entered dates validate and convert to ISO for existing Supabase monthly settings',()=>{
 assert.equal(parseSurpriseDateInput('25/12/2026'),'2026-12-25');
 assert.equal(parseSurpriseDateInput('29/02/2028'),'2028-02-29');
 assert.equal(parseSurpriseDateInput('29/02/2027'),null);
 assert.equal(parseSurpriseDateInput('31/04/2026'),null);
 assert.equal(parseSurpriseDateInput('00/12/2026'),null);
 assert.equal(parseSurpriseDateInput('99/12/2026'),null);
 assert.equal(parseSurpriseDateInput('25/13/2026'),null);
 assert.equal(parseSurpriseDateInput('25/12/20'),null);
 assert.equal(parseSurpriseDateInput(''),null);
 assert.equal(displaySurpriseDate('2026-12-25'),'25/12/2026');
 assert.equal(displaySurpriseDate('2026-02-29'),'');
 assert.equal(displaySurpriseDate(null),'');
 assert.ok(validAnnualDate('2028-02-29'));
});
test('Save keeps original annual month-day rules and rejects invalid typed dates',()=>{
 const app=readFileSync(new URL('./app.js',import.meta.url),'utf8');
 assert.match(app,/formatSurpriseDateInput\(raw\)/);
 assert.match(app,/parseSurpriseDateInput\(typedDate\)/);
 assert.match(app,/if\(typedDate&&!newDate\)throw Error/);
 assert.match(app,/const prior=surpriseCustom\(/);
 assert.match(app,/const md=newDate&&newDate!==row.date\?newDate.slice\(5\):prior/);
 assert.match(app,/rpc\('save_love_surprise_event'/);
});
test('Only one full-width action remains in the event editor',()=>{
 const css=readFileSync(new URL('./surprise-refined-v104.css',import.meta.url),'utf8');
 assert.match(css,/\.surprise-edit-actions/);
 assert.match(css,/grid-template-columns:1fr/);
});