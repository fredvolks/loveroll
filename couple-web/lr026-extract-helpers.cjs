#!/usr/bin/env node
// Extract the EXACT private helper SQL from the production migration.
// This never executes or publishes the guarded production RPC patch.
// It runs only against the disposable PostgreSQL CI fixture.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'lr026-server-variety.sql'),'utf8');
const begin='CREATE OR REPLACE FUNCTION couple_private.love_variety_normalize(';
const end='-- Patch chirurgical des DEUX RPC';
const start=sql.indexOf(begin);
const stop=sql.indexOf(end,start);
if(start<0||stop<=start)throw Error('LR-026 helper migration markers missing');
const helpers=sql.slice(start,stop);
for(const identifier of ['love_variety_normalize','love_variety_near','love_variety_rank']){
 const marker='CREATE OR REPLACE FUNCTION couple_private.'+identifier+'(';
 if(helpers.split(marker).length!==2)throw Error('Expected one '+identifier);
}
if((helpers.match(/REVOKE ALL ON FUNCTION couple_private\./g)||[]).length!==3)
 throw Error('Expected three private privilege revocations');
if(/\bEXECUTE\s+pg_catalog\.replace\(/.test(helpers)||/\bGRANT\b/i.test(helpers))
 throw Error('Unexpected public RPC write or grant in helper extraction');
process.stdout.write(helpers);
