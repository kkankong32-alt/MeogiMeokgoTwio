import test from 'node:test';
import assert from 'node:assert/strict';
import {createInput,GAME_KEYS,PAD_DEADZONE} from '../src/input.js';
import {computeVisibleBounds,warningGeometry,sortVisibleActors,createRenderer} from '../src/render.js';
import {grasshopperDrawState} from '../src/creatures.js';
import {viewportMetrics,screenToGround,GROUND_Y} from '../src/viewport.js';
import {createWorld,getJumpReadiness} from '../src/core.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const ready=()=>{const input=createInput();input.setEnabled(true);return input;};
const player={x:0,y:0};
function fakeCanvas(width=800,height=560){
 const calls=[],context=new Proxy({}, {get(target,key){return target[key]??((...args)=>calls.push([key,...args]));},set(target,key,value){target[key]=value;return true;}});
 return{calls,context,getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width,height})};
}
for(const code of ['KeyJ','KeyZ'])test(`${code} provides held eating and release cancels a buffered request`,()=>{
 const i=ready();assert.equal(i.keyDown(code),true);let state=i.consume(player);assert.equal(state.eat,true);assert.equal(state.eatHeld,true);
 state=i.consume(player);assert.equal(state.eat,false);assert.equal(state.eatHeld,true);
 i.keyUp(code);state=i.consume(player);assert.equal(state.eatHeld,false);assert.equal(state.cancelEat,true);assert.equal(i.consume(player).cancelEat,false);
});
for(const code of ['KeyK','KeyX','Space'])test(`${code} is one big jump per physical press`,()=>{
 const i=ready();i.keyDown(code);assert.equal(i.consume(player).jump,true);i.keyDown(code,true);assert.equal(i.consume(player).jump,false);i.keyDown(code,false);assert.equal(i.consume(player).jump,false);
 i.keyUp(code);i.keyDown(code);assert.equal(i.consume(player).jump,true);
});
test('two actions only; old short-hop control is not accepted',()=>{const i=ready();assert.equal(i.startAction(1,'hop'),false);assert.equal(i.queue('hop'),false);assert.equal('hop' in i.consume(player),false);assert.equal(GAME_KEYS.has('KeyZ'),true);assert.equal(GAME_KEYS.has('KeyX'),true);});
test('movement, held eat, and one-shot jump can have three independent finger owners',()=>{
 const i=ready();i.startPad(1,24,0);i.startAction(2,'eat');i.startAction(3,'jump');assert.deepEqual(i.activePointers,[1,2,3]);assert.equal(i.startAction(1,'eat'),false);assert.equal(i.startPad(2,0,0),false);
 const state=i.consume(player);assert.ok(state.move.x>0);assert.equal(state.eatHeld,true);assert.equal(state.jump,true);
 i.endPointer(3);assert.equal(i.consume(player).jump,false);assert.equal(i.padId,1);assert.equal(i.consume(player).eatHeld,true);
 i.endPointer(2);assert.equal(i.consume(player).cancelEat,true);assert.equal(i.padId,1);
});
test('release and pointer cancellation both discard unconsumed eat',()=>{for(const cancel of [false,true]){const i=ready();i.startAction(2,'eat');i.endPointer(2,cancel);const state=i.consume(player);assert.equal(state.eat,false);assert.equal(state.eatHeld,false);assert.equal(state.cancelEat,true);}});
test('canceling one eat source does not cancel another held source',()=>{const i=ready();i.keyDown('KeyJ');i.startAction(2,'eat');i.endPointer(2,true);const state=i.consume(player);assert.equal(state.eat,true);assert.equal(state.eatHeld,true);assert.equal(state.cancelEat,false);i.keyDown('KeyZ');i.keyUp('KeyJ');assert.equal(i.consume(player).cancelEat,false);i.keyUp('KeyZ');assert.equal(i.consume(player).cancelEat,true);});
test('tiny pad movement is zero and cannot interrupt grazing',()=>{const i=ready();i.startPad(4,PAD_DEADZONE*.5,PAD_DEADZONE*.5);assert.deepEqual(i.movement(player),{x:0,y:0});assert.deepEqual(i.stick,{x:0,y:0});i.updatePad(4,80,80);near(Math.hypot(...Object.values(i.movement(player))),1);assert.equal(i.updatePad(999,0,0),false);});
test('disable clears pointer ownership, held keys, and all queued actions',()=>{const i=ready();i.startPad(1,28,0);i.startAction(2,'eat');i.startAction(3,'jump');i.keyDown('KeyD');i.setEnabled(false);i.setEnabled(true);const state=i.consume(player);assert.deepEqual(i.activePointers,[]);assert.deepEqual(state.move,{x:0,y:0});assert.equal(state.eat,false);assert.equal(state.eatHeld,false);assert.equal(state.jump,false);assert.equal(state.cancelEat,true);});
test('normal jump tap survives until next tick, cancellation does not',()=>{const i=ready();i.startAction(1,'jump');i.endPointer(1);assert.equal(i.consume(player).jump,true);i.startAction(2,'jump');i.endPointer(2,true);assert.equal(i.consume(player).jump,false);});
test('HUD trim and individual button exclusions are transformed from CSS to ground space',()=>{
 const metrics=viewportMetrics(800,560),camera={x:740,y:700};const bounds=computeVisibleBounds(metrics,camera,[{left:0,top:0,width:800,height:65},{left:640,top:430,width:150,height:120}]);
 const top=screenToGround(8,73,camera,metrics),corner=screenToGround(632,422,camera,metrics);near(bounds.top,top.y);near(bounds.left,top.x);near(bounds.exclusions[1].left,corner.x);near(bounds.exclusions[1].top,corner.y);assert.equal(bounds.exclusions.length,2);
});
test('portrait letterbox and off-canvas controls are excluded from attack visibility',()=>{
 const metrics=viewportMetrics(390,844),camera={x:600,y:900};const bounds=computeVisibleBounds(metrics,camera,[{left:5,top:710,width:130,height:125}]);
 const top=screenToGround(metrics.view.x+8,metrics.view.y+8,camera,metrics);near(bounds.top,top.y);assert.equal(bounds.exclusions.length,0);assert.ok(bounds.bottom>bounds.top);
});
test('diagonal warning geometry has the exact core capsule half-width',()=>{
 const shape=warningGeometry({start:{x:20,y:30},end:{x:140,y:190},r:24});near(Math.hypot(shape.corners[0].x-20,shape.corners[0].y-30),24);near(Math.hypot(shape.corners[1].x-140,shape.corners[1].y-190),24);assert.equal(shape.r,24);assert.equal(warningGeometry(null),null);
});
test('controlled grasshopper uses authoritative facing and world lift once',()=>{
 const draw=grasshopperDrawState({isPlayer:true,state:'jumping',stateTime:.8,jumpDuration:1.6,facing:-1,z:99,motion:{facing:1}});assert.equal(draw.worldLift,99);assert.equal(draw.facing,-1);assert.equal(draw.isHopping,true);near(draw.time,1.52/2);
});
for(const stage of [1,2,3,4,5,6])test(`stage ${stage} renders destination and publishes visibility with balanced Canvas state`,()=>{
 const canvas=fakeCanvas(),renderer=createRenderer(canvas);renderer.resize();renderer.setOcclusions([{left:0,top:0,width:800,height:55}]);const w=createWorld({stage});renderer.render(w,1/60);
 assert.ok(Number.isFinite(w.visibleBounds.left));assert.ok(w.visibleBounds.right>w.visibleBounds.left);assert.ok(w.visibleBounds.bottom>w.visibleBounds.top);
 assert.equal(canvas.calls.filter(c=>c[0]==='save').length,canvas.calls.filter(c=>c[0]==='restore').length);assert.deepEqual(w.presentationJump,getJumpReadiness(w));
 assert.ok(canvas.calls.some(c=>c[0]==='fillText'&&/도착|쉼터|풀숲/.test(c[1])));assert.ok(canvas.calls.some(c=>c[0]==='scale'&&c[1]===c[2]));
});
test('goal instruction replaces food-target instruction while optional food stays separate',()=>{
 const canvas=fakeCanvas(),renderer=createRenderer(canvas),w=createWorld({stage:1});renderer.resize();renderer.render(w,1/60);w.player.eaten=w.quota;renderer.render(w,1/60);assert.ok(canvas.calls.some(c=>c[0]==='fillText'&&c[1]==='도착 지점으로!'));assert.ok(canvas.calls.some(c=>c[0]==='fillText'&&c[1]==='목표 완료!'));
});
test('native attack warning preserves elliptical ground radius rather than a thin line',()=>{
 const canvas=fakeCanvas(),renderer=createRenderer(canvas),w=createWorld({stage:2});renderer.resize();w.predator.state='windup';w.predator.warning={start:{x:700,y:800},end:{x:830,y:970},r:30};renderer.render(w,1/60);assert.ok(canvas.calls.some(c=>c[0]==='ellipse'&&c[3]===30&&Math.abs(c[4]-30*GROUND_Y)<1e-8));assert.ok(canvas.calls.some(c=>c[0]==='fillText'&&c[1]==='! 혀 공격 준비'));
});

test('airborne evasive player renders after a closer ground snake',()=>{const player={id:'p',y:500,z:90,state:'jumping'},snake={id:'s',y:800};assert.equal(sortVisibleActors([player,snake],player).at(-1),player);player.z=0;assert.equal(sortVisibleActors([player,snake],player).at(-1),snake);});
test('active warning removes optional food label and uses a separate high-contrast banner',()=>{const canvas=fakeCanvas(390,448),renderer=createRenderer(canvas),w=createWorld({stage:2});renderer.resize();w.predator.state='windup';w.predator.warning={start:{x:500,y:700},end:{x:390,y:650},r:20};renderer.render(w,1/60);const texts=canvas.calls.filter(c=>c[0]==='fillText');assert.ok(!texts.some(c=>c[1]==='먹기 유지'||c[1]==='선택 +1'));const label=texts.find(c=>c[1]==='! 혀 공격 준비');assert.ok(label);assert.ok(canvas.calls.some(c=>c[0]==='strokeRect'));assert.ok(canvas.calls.some(c=>c[0]==='fillText'&&/도착/.test(c[1])));});
