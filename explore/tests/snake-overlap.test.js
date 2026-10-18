import test from 'node:test';import assert from 'node:assert/strict';import {groupSnakeCrossings} from '../src/snake-overlap.js';
const piece=(behind,x,y)=>({kind:behind?'body':'head',behind,depth:y,ground:{x,y},draw:c=>c.push(behind)});
test('crossed body is drawn tail first, head last independent of ground Y',()=>{const p=[piece(800,200,203),piece(790,205,201),piece(50,202,210),piece(0,200,200)],out=groupSnakeCrossings(p),calls=[];assert.equal(out.length,1);out[0].draw(calls);assert.deepEqual(calls,[800,790,50,0]);});
test('ordinary adjacent pieces and distant actors remain independent',()=>{const p=[piece(200,100,100),piece(180,102,102),piece(0,500,500)],out=groupSnakeCrossings(p);assert.deepEqual(out,p);});
test('sorting crossings does not mutate the simulation or input pieces',()=>{const p=[piece(900,200,200),piece(20,201,201)],before=p.slice();groupSnakeCrossings(p);assert.deepEqual(p,before);});
