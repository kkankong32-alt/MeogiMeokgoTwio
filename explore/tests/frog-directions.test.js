import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,stepWorld,requestJump,requestEat} from '../src/core.js';
import {aimPlayer,targetPoint,tongueGeometry,ART} from '../src/motion.js';
import {GAME_EAT} from '../src/tongue-gameplay.js';
const free=()=>{const w=createWorld({timed:false});w.navigation=null;w.rocks=[];w.predator.disabled=true;w.prey=[];return w;};
test('all eight headings persist after release and default leap follows last heading',()=>{
 for(let i=0;i<8;i++){const w=free(),a=i*Math.PI/4,d={x:Math.cos(a),y:Math.sin(a)};
  stepWorld(w,{move:d});stepWorld(w,{});
  assert.ok(Math.hypot(w.player.face.x-d.x,w.player.face.y-d.y)<1e-8);
  assert.ok(requestJump(w,{x:0,y:0}));assert.ok(Math.hypot(w.player.jumpDirection.x-d.x,w.player.jumpDirection.y-d.y)<1e-8);
 }
});
test('north, south and diagonal tongue contacts the shown target and records one meal',()=>{
 for(const d of [{x:0,y:-1},{x:0,y:1},{x:1,y:-1},{x:-1,y:-1},{x:1,y:1},{x:-1,y:1}]){
  const w=free(),p=w.player;aimPlayer(p,d);const q={...targetPoint(p),id:'direction-prey',role:'grasshopper',r:17,alive:true,captured:false,state:'feeding',cooldown:99,phase:0};w.prey=[q];
  const g=tongueGeometry(p,GAME_EAT.contact);assert.ok((g.tip.x-g.mouth.x)*d.x+(g.tip.y-g.mouth.y)*d.y>0);
  assert.ok(requestEat(w));for(let f=0;f<25;f++)stepWorld(w,{});
  assert.equal(p.eaten,1,JSON.stringify(d));assert.equal(w.learningEvents.filter(e=>e.type==='ate').length,1);
 }
});
test('direction locks throughout eating and changes immediately on next action',()=>{
 const w=free();aimPlayer(w.player,{x:0,y:-1});requestEat(w);stepWorld(w,{move:{x:0,y:1}});assert.equal(w.player.face.y,-1);
 for(let f=0;f<25;f++)stepWorld(w,{});stepWorld(w,{move:{x:0,y:1}});assert.equal(w.player.face.y,1);
 assert.equal(ART.scale,.144*.9);
});
