import test from 'node:test';
import assert from 'node:assert/strict';
import {extraEveningEligibility} from './extra-evening-eligibility.mjs';
test('normal weekly dice take priority',()=>assert.equal(extraEveningEligibility(2,3,true),false));
test('admin toggle defaults disabled',()=>assert.equal(extraEveningEligibility(3,3,false),false));
test('exhausted quota and enabled toggle permit an Extra proposal',()=>assert.equal(extraEveningEligibility(3,3,true),true));
test('unknown quota never grants an Extra',()=>assert.equal(extraEveningEligibility(undefined,3,true),false));
