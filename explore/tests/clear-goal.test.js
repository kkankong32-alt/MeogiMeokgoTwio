import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,stepWorld} from '../src/core.js';
import {createHopperWorld,stepHopper} from '../src/hopper.js';
import {createSnakeWorld,stepSnake} from '../src/snake-player.js';
import {createHawkWorld,stepHawkWorld} from '../src/hawk-player.js';
import {remainingFood} from '../src/round-goal.js';
const roles=[['frog',createWorld,stepWorld,w=>{w.prey=w.prey.slice(0,1)}],['grasshopper',createHopperWorld,stepHopper,w=>{w.plants.forEach((p,i)=>p.leaves=i===0?1:0)}],['snake',createSnakeWorld,stepSnake,w=>{w.frogs=w.frogs.slice(0,1)}],['hawk',createHawkWorld,stepHawkWorld,w=>{w.frogs=w.frogs.slice(0,1);w.groundSnakes=[]}]];
for(const [role,create,step,last]of roles){
 for(const timed of [true,false])test(`${role}: actual last meal clears with time left (timed=${timed}), persists evidence and freezes`,()=>{
  const w=create({timed});last(w);assert.equal(remainingFood(w),1);step(w,{eat:true});for(let i=0;i<120&&w.status==='playing';i++)step(w);
  assert.equal(w.endCause,'food-exhausted');assert.ok(w.time<2);assert.equal(w.player.eaten,1);assert.equal(remainingFood(w),0);assert.equal(w.learningEvents.filter(e=>e.type==='ate').length,1);assert.equal(w.learningEvents.filter(e=>e.type==='caught').length,0);
  assert.equal(w.events.filter(e=>e.type==='round-end').length,1);const final=JSON.stringify(w);for(let i=0;i<100;i++)step(w,{eat:true,jump:true});assert.equal(JSON.stringify(w),final);
  const next=create({timed});assert.equal(next.status,'playing');assert.ok(remainingFood(next)>0);assert.equal(next.player.eaten,0);
 });
 test(`${role}: one meal with more food never clears early`,()=>{const w=create();const initial=remainingFood(w);step(w,{eat:true});for(let i=0;i<60;i++)step(w);assert.equal(w.player.eaten,1);assert.equal(remainingFood(w),initial-1);assert.equal(w.status,'playing');assert.equal(w.endCause,undefined)});
}
test('cut meadow counts only available leaves',()=>{assert.equal(remainingFood(createHopperWorld()),12);assert.equal(remainingFood(createHopperWorld({condition:'cut'})),9)});
test('hawk final meal at the time boundary still ends as a food clear',()=>{const w=createHawkWorld();w.frogs=w.frogs.slice(0,1);w.groundSnakes=[];w.time=89.4;stepHawkWorld(w,{eat:true});for(let i=0;i<90;i++)stepHawkWorld(w);assert.equal(w.player.eaten,1);assert.equal(w.endCause,'food-exhausted');});
