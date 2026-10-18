import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,stepWorld,addEvent} from '../src/core.js';
import {relationshipLines} from '../src/learning-records.js';

test('first real meal survives all 90 seconds of background feeding',()=>{
  const w=createWorld();w.predator.disabled=true;stepWorld(w,{eat:true});
  while(w.status==='playing')stepWorld(w);
  assert.equal(w.status,'finished');assert.equal(w.player.eaten,1);
  assert.ok(w.backgroundFeeding.count>100);
  assert.equal(w.events.some(e=>e.type==='ate'),false); // original rolling log really overflowed
  assert.equal(w.learningEvents.filter(e=>e.type==='ate').length,1);
  assert.ok(relationshipLines(w).some(s=>s.includes('메뚜기 → 개구리')));
  assert.ok(!relationshipLines(w).some(s=>s.includes('개구리 → 뱀')));
});
test('actual head collision records frog to snake exactly once without adding food',()=>{
  const w=createWorld();w.navigation=null;w.rocks=[];
  Object.assign(w.player,{x:600,y:500});
  Object.assign(w.predator,{x:620,y:500,state:'attack',stateTime:0,face:{x:-1,y:0},locked:{x:-1,y:0}});
  stepWorld(w);assert.equal(w.status,'caught');
  for(let i=0;i<120;i++)stepWorld(w);
  const captures=w.learningEvents.filter(e=>e.type==='caught');
  assert.equal(captures.length,1);assert.equal(captures[0].food,'frog');assert.equal(captures[0].eater,'snake');
  assert.equal(w.player.eaten,0);
  assert.equal(w.events.filter(e=>e.type==='caught').length,1);
  assert.ok(relationshipLines(w).some(s=>s.includes('개구리 → 뱀')));
});
test('timeout, pause, warning and restart never invent capture evidence',()=>{
  const w=createWorld();w.paused=true;stepWorld(w,{eat:true});assert.deepEqual(w.learningEvents,[]);
  w.paused=false;w.time=89.99;stepWorld(w);assert.equal(w.status,'finished');
  assert.ok(!relationshipLines(w).some(s=>s.includes('개구리 → 뱀')));
  const fresh=createWorld();addEvent(fresh,'predator-warning',{actor:fresh.predator.id});
  assert.deepEqual(fresh.learningEvents,[]);assert.equal(fresh.backgroundFeeding,null);
  assert.equal(fresh.player.eaten,0);assert.equal(fresh.time,0);
});
test('untimed repeated background and diagnostic events cannot evict learning evidence',()=>{
  const w=createWorld({timed:false});
  addEvent(w,'ate',{food:'grasshopper',eater:'frog',target:'example'});
  for(let i=0;i<10000;i++){addEvent(w,'feeding-observed',{food:'grass',eater:'grasshopper'});addEvent(w,'jump');}
  assert.equal(w.learningEvents.length,1);assert.equal(w.events.length,100);
  assert.equal(w.backgroundFeeding.count,10000);assert.equal(relationshipLines(w).length,3);
});
