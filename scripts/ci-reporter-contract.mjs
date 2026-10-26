import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const workflow = readFileSync('.github/workflows/loveroll-persistent-ci-report.yml', 'utf8');
assert.match(workflow, /^  actions: read$/m);
assert.match(workflow, /^  contents: read$/m);
assert.match(workflow, /^  issues: write$/m);
assert.match(workflow, /^  pull-requests: write$/m, 'PR comments require explicit write scope');
assert.match(workflow, /workflow_run:/);
assert.match(workflow, /types: \[completed\]/);
assert.match(workflow, /run\.head_sha/);
assert.match(workflow, /pr\.head\.sha !== run\.head_sha/, 'do not comment about stale PR commits');
assert.match(workflow, /run\.workflow_id/, 'prevent cross-workflow incident reporting');
assert.match(workflow, /throw error;/, 'failed PR posting must not be disguised as a success');
assert.doesNotMatch(workflow, /uses:\s*actions\/checkout@/, 'privileged workflow_run must not check out PR code');

const lines = workflow.split(/\r?\n/);
let validated = 0;
for (let index = 0; index < lines.length; index += 1) {
  if (!/^ {10}script: \|\s*$/.test(lines[index])) continue;
  const source = [];
  while (++index < lines.length) {
    const line = lines[index];
    if (line.trim() && !line.startsWith('            ')) break;
    source.push(line.startsWith('            ') ? line.slice(12) : '');
  }
  new Script('async function reporter(github, context, core) {\n' + source.join('\n') + '\n}');
  validated += 1;
}
assert.equal(validated, 2, 'both incident and PR reporter JavaScript blocks must parse');
console.log('LoveRoll reporter contract: permissions, safety invariants and both JS scripts OK');
