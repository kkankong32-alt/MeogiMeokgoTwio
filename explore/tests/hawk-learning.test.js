import test from 'node:test';import assert from 'node:assert/strict';
import {hawkEvidence} from '../src/food-web.js';
test('hawk reflection distinguishes actual meal, unobserved possible relation and reversed arrow',()=>{const w={learningEvents:[{type:'ate',food:'frog',eater:'hawk'}],observedEvents:[{food:'snake',eater:'hawk'}]};assert.equal(hawkEvidence(w,'frog','hawk'),'witnessed');assert.equal(hawkEvidence(w,'snake','hawk'),'unseen');assert.equal(hawkEvidence(w,'hawk','frog'),'reversed');});
