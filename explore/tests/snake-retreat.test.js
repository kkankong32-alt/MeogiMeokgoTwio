import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,stepWorld,retreatSnake,clearGroundPath} from '../src/core.js';
test('snake no longer stalls against meadow edge in reproduced seed 1 route',()=>{
 const w=createWorld({seed:1,timed:false});let still=0,last={...w.predator},retreated=false;
 for(let f=0;f<800;f++){
  const a=Math.floor(f/95)*2.399+1;stepWorld(w,{move:{x:Math.cos(a),y:Math.sin(a)},jump:f%113===0});
  if(w.status!=='playing'){w.status='playing';w.player.x=580;w.player.y=900;}
  const s=w.predator;retreated ||= (s.retreatRemaining??0)>0;
  still=Math.hypot(s.x-last.x,s.y-last.y)<.01&&!['windup','recover'].includes(s.state)?still+1:0;
  assert.ok(still<40,`stationary for ${still} frames at ${f}`);last={x:s.x,y:s.y};
 }
 assert.ok(retreated);
});
test('retreat follows the existing trail with bounded movement and no ground crossing',()=>{
 const w=createWorld(),s=w.predator;s.retreatRemaining=150;const start=s.skin.distance;
 for(let i=0;i<100;i++){const old={x:s.x,y:s.y};assert.ok(retreatSnake(w,s,1/60));assert.ok(Math.hypot(s.x-old.x,s.y-old.y)<=1.501);assert.ok(clearGroundPath(w,old,s,s.r));assert.ok(s.skin.distance<=start);}
 assert.equal(s.retreatRemaining,0);assert.ok(Math.abs(s.skin.distance-(start-150))<1e-7);
});
