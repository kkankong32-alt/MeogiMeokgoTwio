import test from 'node:test';import assert from 'node:assert/strict';
import {createSnakeWorld,stepSnake} from '../src/snake-player.js';
import {observedRelations} from '../src/food-web.js';
const ticks=(w,n,input={})=>{for(let i=0;i<n;i++)stepSnake(w,input);};
test('final meal has a brief capture animation then ends early without a fabricated hawk capture',()=>{
 const w=createSnakeWorld();w.frogs=w.frogs.slice(0,1);stepSnake(w,{eat:true});while(!w.player.eaten)stepSnake(w);
 assert.equal(w.status,'playing');assert.ok(w.player.captureVisual);assert.equal(w.frogs[0].alive,false);
 ticks(w,25);assert.equal(w.status,'survived');assert.equal(w.endCause,'food-exhausted');assert.ok(w.time<1);
 assert.equal(w.learningEvents.filter(e=>e.type==='ate').length,1);assert.equal(w.learningEvents.filter(e=>e.type==='caught').length,0);
 const before=JSON.stringify(w);ticks(w,100);assert.equal(JSON.stringify(w),before);
});
test('hawk taking last frog ends exploration but does not award player a meal',()=>{
 const w=createSnakeWorld();w.frogs=w.frogs.slice(0,1);const q=w.frogs[0];w.hawk={...w.hawk,state:'warning',time:1.04,target:{x:q.x,y:q.y,id:q.id}};w.player.x=1200;w.player.y=1100;stepSnake(w);
 assert.equal(w.endCause,'food-exhausted');assert.equal(w.player.eaten,0);assert.ok(observedRelations(w).some(e=>e.food==='frog'&&e.eater==='hawk'&&e.sourceKind==='other'));
 assert.ok(!w.learningEvents.some(e=>e.type==='ate'||e.type==='caught'));
});
test('smaller frog footprint matches art and pause freezes capture',()=>{
 const w=createSnakeWorld();assert.equal(w.frogs[0].renderScale,.85);assert.equal(w.frogs[0].r,25.5);stepSnake(w,{eat:true});ticks(w,7);assert.ok(w.player.captureVisual);w.paused=true;const before=JSON.stringify(w);ticks(w,60);assert.equal(JSON.stringify(w),before);
});
test('miss never shows captured frog or prematurely ends exploration',()=>{
 const w=createSnakeWorld();stepSnake(w,{eat:true,move:{x:0,y:-1}});ticks(w,30);assert.equal(w.player.eaten,0);assert.ok(!w.player.captureVisual);assert.equal(w.status,'playing');
});
