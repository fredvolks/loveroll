#!/usr/bin/env node
// CI-ONLY: rewrite the MD5 preflight digests to match synthetic RPC fixtures.
// The actual migration in GitHub is NEVER modified and no database is accessed.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const [draw,redraw]=process.argv.slice(2);
if(![draw,redraw].every(v=>/^[a-f0-9]{32}$/.test(v||'')))
 throw Error('Expected two 32-character fixture-only RPC hashes');
const filename=path.join(__dirname,'lr026-server-variety.sql');
let sql=fs.readFileSync(filename,'utf8');
const substitutions=[
 ['b85aab4563ec7e04956bd059d91479fa',draw],
 ['d3b15210682919a56242ba996994f6b2',redraw]
];
for(const [oldValue,newValue] of substitutions){
 if(sql.split("'"+oldValue+"'").length!==2)
  throw Error('Reviewed fingerprint is absent or ambiguous');
 sql=sql.replace("'"+oldValue+"'","'"+newValue+"'");
}
if(!sql.includes("DO $lr026_guard$")||!sql.includes("DO $lr026_postcheck$"))
 throw Error('Cannot test unguarded or incomplete migration');
process.stdout.write(sql);
