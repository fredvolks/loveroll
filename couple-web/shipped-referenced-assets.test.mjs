// LR-AUDIT-GLOBAL: prevent broken stylesheet, script and image references in the shipped site.
// The test runs on PR checks AND in the mandatory GitHub Pages pre-deploy gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('./service-worker.js',import.meta.url),'utf8');
const linked=[...html.matchAll(/\b(?:href|src)="(\.\/[^"?#]+)(?:\?[^\"]*)?"/g)].map(match=>match[1]);
const styles=[...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="(\.\/[^"?#]+)(?:\?[^\"]*)?"/g)].map(match=>match[1]);

test('Every relative HTML link, script, splash asset and stylesheet resolves to a shipped file',()=>{
 assert.ok(linked.length>=50,'Expected the real LoveRoll production HTML with its assets');
 const root=new URL('./',import.meta.url).pathname;
 for(const relative of new Set(linked)){
  const candidate=new URL(relative,import.meta.url);
  assert.ok(candidate.pathname.startsWith(root),'Relative asset escapes the LoveRoll web root: '+relative);
  assert.ok(existsSync(candidate),'Production HTML references a missing asset: '+relative);
 }
});

test('Do not load the same stylesheet twice or accidentally reactivate the deprecated D100 skin',()=>{
 assert.ok(styles.length>=35,'Production styles must be audited rather than a reduced fixture');
 assert.equal(styles.length,new Set(styles).size,'Duplicate stylesheet links break layering and visual parity');
 assert.ok(styles.includes('./evening-editorial.css'),'Private Soirée card must receive approved editorial styles');
 assert.ok(styles.includes('./soiree-home-template.css'),'Soirée responsive layout must be shipped');
 assert.doesNotMatch(html,/evening-queue-fixed-v102\.css|evening-private-queue\.css/,
  'Deprecated D100 queue skin must never be loaded in the public app');
});

test('The active Soirée styles must be available in the PWA offline shell',()=>{
 assert.ok(sw.includes("'./evening-editorial.css'"),'Editorial private card CSS must remain cached offline');
 assert.ok(sw.includes("'./soiree-home-template.css'"),'Active Soirée responsive CSS must remain cached offline');
});

const shellMatch=sw.match(/const SHELL=\[([\s\S]*?)\];/);
const shell=shellMatch
 ? [...shellMatch[1].matchAll(/'(\.\/[^']*)'/g)].map(m=>m[1])
 : [];

test('Every offline PWA shell entry exists, stays inside the Web root and is unique',()=>{
 assert.ok(shellMatch,'A real offline Service Worker SHELL is mandatory');
 assert.ok(shell.length>=150,'Audit the full LoveRoll offline shell, not a fixture');
 assert.equal(new Set(shell).size,shell.length,
  'Duplicate PWA shell paths waste cache space and may break offline updates');
 const root=new URL('./',import.meta.url).pathname;
 for(const path of shell){
  const file=new URL(path,import.meta.url);
  assert.ok(file.pathname.startsWith(root),'Offline asset leaves the LoveRoll Web root: '+path);
  assert.ok(existsSync(file),'PWA will fail to precache a missing asset: '+path);
 }
});

test('Every linked stylesheet and JavaScript entrypoint remains accessible offline',()=>{
 const scripts=[...html.matchAll(/<script\b[^>]*\bsrc="(\.\/[^"?#]+)(?:\?[^"]*)?"/g)]
  .map(m=>m[1]);
 assert.ok(styles.length>=35&&scripts.length>=4,
  'Protect the real production styles and JavaScript entrypoints');
 const offline=new Set(shell);
 for(const asset of [...styles,...scripts]){
  assert.ok(offline.has(asset),
   'Web resource not declared in PWA offline shell: '+asset);
 }
});
