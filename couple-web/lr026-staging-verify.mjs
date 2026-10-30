#!/usr/bin/env node
// Execute from a shell with ephemeral environment variables ONLY.
// Modes: --check (offline guards), --auth (real Auth + RLS, read-only),
// --ready (A/B Auth+RLS+D6+empty evening preflight, zero writes),
// --play (one mutating D100/Passer scenario, staging only, explicit opt-in).
import {runStage} from './lr026-staging-recipe.mjs';

const modes = {'--check': 'check', '--auth': 'auth', '--audit': 'audit',
  '--ready': 'ready', '--play': 'play'};
const mode = modes[process.argv[2]];
if (!mode || process.argv.length !== 3) {
  process.stderr.write(
    'Usage: node couple-web/lr026-staging-verify.mjs --check|--auth|--audit|--ready|--play\n');
  process.exitCode = 2;
} else {
  try {
    const output = await runStage(process.env, mode);
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } catch (error) {
    // Never echo raw HTTP replies, bearer tokens, passwords or environment.
    const safeReason = String(error.message || 'Unknown error')
      .replace(/eyJ[A-Za-z0-9._-]{30,}/g, '[redacted token]')
      .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, '[redacted key]');
    process.stderr.write('LR-026 staging recipe FAILED: ' + safeReason + '\n');
    process.exitCode = 1;
  }
}
