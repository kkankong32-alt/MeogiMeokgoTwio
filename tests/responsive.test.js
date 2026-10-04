import test from 'node:test';
import assert from 'node:assert/strict';
import {viewportMetrics,containRect,titleButtonRect,screenToGround,groundToScreen,isInsideView,GROUND_Y,VIEW_LIMIT} from '../src/viewport.js';
import {createInput} from '../src/input.js';
import {createLifecycle} from '../src/lifecycle.js';
import {createRenderer} from '../src/render.js';
import {createWorld,stepWorld,cameraTarget} from '../src/core.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const ready=()=>{const i=createInput();i.setEnabled(true);return i;};
const player={x:0,y:0};
const viewports=[
  ['desktop',1440,900,1],['desktop-hiDPI',1920,1080,2],['ultrawide',2560,1080,2],
  ['phone-portrait',390,844,3],['phone-landscape',844,390,3],['small-phone',320,568,2],
  ['small-landscape',568,320,2],['iPad-portrait-4:3',768,1024,2],['iPad-landscape-4:3',1024,768,2],
  ['tablet-portrait',820,1180,2],['Fold-outer',344,882,3],['Fold-inner-near-square',717,720,3],['split-window',375,768,2]
];
for(const [name,width,height,dpr] of viewports) {
  test(`projection budget and reversible coordinates: ${name}`,()=>{
    const m=viewportMetrics(width,height,dpr);
    assert.ok(m.logicalWidth<=960+1e-8);assert.ok(m.logicalHeight<=620+1e-8);
    assert.ok(m.pixelWidth*m.pixelHeight<=4_000_000);assert.ok(m.dpr<=2);assert.ok(m.view.y>=0);
    const camera={x:713,y:422},p={x:620,y:530};
    const screen=groundToScreen(p.x,p.y,0,camera,m),round=screenToGround(screen.x,screen.y,camera,m);
    near(round.x,p.x);near(round.y,p.y);
    const origin=groundToScreen(camera.x,camera.y,0,camera,m);
    const x=groundToScreen(camera.x+10,camera.y,0,camera,m),y=groundToScreen(camera.x,camera.y+10,0,camera,m);
    near(x.x-origin.x,(y.y-origin.y)/GROUND_Y);
    const jumped=groundToScreen(p.x,p.y,58,camera,m);near(screen.y-jumped.y,58*m.scale);
  });
  test(`title contains full 16:9 artwork with useful real-button target: ${name}`,()=>{
    const art=containRect(width,height),button=titleButtonRect(width,height);
    near(art.width/art.height,16/9);assert.ok(art.x>=0&&art.y>=0);
    assert.ok(art.x+art.width<=width+1e-8&&art.y+art.height<=height+1e-8);
    assert.ok(button.width>=44&&button.height>=44);assert.ok(button.x>=0&&button.y>=0);
    assert.ok(button.x+button.width<=width&&button.y+button.height<=height);
  });
}
test('same-aspect scaling above the readability floor preserves visible world area',()=>{
  const small=viewportMetrics(600,400),big=viewportMetrics(1500,1000);
  near(small.logicalWidth,big.logicalWidth);near(small.logicalHeight,big.logicalHeight);
});
test('portrait excess height is a margin; mouse cannot steer into the margin',()=>{
  const m=viewportMetrics(344,800);assert.ok(m.view.height<=344*VIEW_LIMIT.maxPortraitRatio);
  assert.equal(isInsideView(172,1,m),false);assert.equal(isInsideView(172,400,m),true);
});
test('zero hidden-element sizes and invalid DPR produce finite metrics',()=>{
  const m=viewportMetrics(0,NaN,Infinity);assert.ok(Object.values(m).filter(x=>typeof x==='number').every(Number.isFinite));
  assert.ok(m.pixelWidth>=1&&m.pixelHeight>=1);
});
test('camera bounds fit the effective scaled view for every aspect ratio',()=>{
  const w=createWorld();for(const [,width,height]of viewports){const m=viewportMetrics(width,height),view={width:m.logicalWidth,height:m.logicalHeight/GROUND_Y};for(const p of [{x:0,y:0,face:{x:-1,y:-1}},{x:w.width,y:w.height,face:{x:1,y:1}}]){const c=cameraTarget(p,view,w);assert.ok(c.x>=view.width/2&&c.x<=w.width-view.width/2);assert.ok(c.y>=view.height/2&&c.y<=w.height-view.height/2);}}
});
test('joystick has one owner and a second finger can jump concurrently',()=>{
  const i=ready();assert.equal(i.startPad(8,25,0),true);assert.equal(i.startPad(9,-30,0),false);
  assert.equal(i.startAction(9,'jump'),true);assert.deepEqual(i.activePointers,[8,9]);
  const v=i.consume(player);assert.equal(v.jump,true);near(v.move.x,25/34);
  assert.equal(i.consume(player).jump,false);i.endPointer(9);near(i.movement(player).x,25/34);
});
test('one pointer cannot own joystick and action together',()=>{
  const i=ready();i.startAction(2,'eat');assert.equal(i.startPad(2,20,0),false);i.clear();i.startPad(2,20,0);assert.equal(i.startAction(2,'eat'),false);
});
test('wrong pointer moves and releases cannot steal the joystick',()=>{
  const i=ready();i.startPad(7,20,0);assert.equal(i.updatePad(8,-20,0),false);i.endPointer(8,true);assert.equal(i.padId,7);near(i.movement(player).x,20/34);i.endPointer(7,true);assert.deepEqual(i.movement(player),{x:0,y:0});
});
test('eat release and pointer cancel both remove unconsumed action',()=>{
  const i=ready();i.startAction(2,'eat');i.endPointer(2,true);assert.equal(i.consume(player).eat,false);
  i.startAction(2,'eat');i.endPointer(2);i.endPointer(2,true);assert.equal(i.consume(player).eat,false);
});
test('canceling a touch action preserves a separate keyboard action',()=>{
  const i=ready();i.startAction(2,'eat');i.keyDown('KeyJ');i.endPointer(2,true);assert.equal(i.consume(player).eat,true);
});
test('lost contact, pause and resume do not leave ownership or stale actions',()=>{
  const i=ready();i.startPad(5,20,0);i.startAction(6,'jump');i.keyDown('KeyD');i.setMouse({x:100,y:0});i.setEnabled(false);
  assert.deepEqual(i.activePointers,[]);assert.deepEqual(i.stick,{x:0,y:0});i.setEnabled(true);assert.deepEqual(i.consume(player),{move:{x:0,y:0},eat:false,eatHeld:false,cancelEat:false,jump:false});assert.equal(i.startPad(5,-20,0),true);
});
test('paused input rejects keyboard, pointer, mouse and queued activation',()=>{
  const i=createInput();assert.equal(i.keyDown('KeyD'),false);assert.equal(i.startPad(1,40,0),false);assert.equal(i.startAction(2,'eat'),false);assert.equal(i.queue('jump'),false);i.setMouse({x:100,y:100});assert.deepEqual(i.consume(player),{move:{x:0,y:0},eat:false,eatHeld:false,cancelEat:false,jump:false});
});
test('keyboard repeats do not repeat action requests',()=>{
  const i=ready();i.keyDown('Space');assert.equal(i.consume(player).jump,true);i.keyDown('Space',true);assert.equal(i.consume(player).jump,false);i.keyUp('Space');i.keyDown('Space');assert.equal(i.consume(player).jump,true);
});
test('keyboard overrides joystick and mouse; releasing keys falls back safely',()=>{
  const i=ready();i.setMouse({x:100,y:0});i.startPad(2,-20,0);i.keyDown('ArrowUp');assert.deepEqual(i.movement(player),{x:0,y:-1});i.keyUp('ArrowUp');near(i.movement(player).x,-20/34);i.endPointer(2);assert.equal(i.movement(player).x,1);i.setMouse(null);assert.deepEqual(i.movement(player),{x:0,y:0});
});
test('joystick deadzone, diagonal correction, and stick travel are bounded',()=>{
  const i=ready();i.startPad(2,1,2);assert.deepEqual(i.movement(player),{x:0,y:0});i.updatePad(2,100,100);near(Math.hypot(...Object.values(i.movement(player))),1);near(Math.hypot(i.stick.x,i.stick.y),1);assert.ok(i.movement(player).y>i.movement(player).x);
});
test('dialog Escape restores prior pause state, with an explicit interruption latch',()=>{
  const l=createLifecycle();l.start();l.openDialog();l.closeDialog();assert.equal(l.paused,false);l.pause(true);l.openDialog();l.closeDialog();assert.equal(l.paused,true);l.pause(false);l.openDialog();l.interrupt('hidden');l.closeDialog();assert.equal(l.paused,true);l.pause(false);assert.equal(l.paused,false);
});
test('resize/rotation interruption freezes but never replaces simulation state',()=>{
  const w=createWorld(),i=ready(),l=createLifecycle(s=>{w.paused=s.paused;if(s.paused)i.setEnabled(false);});l.start();i.keyDown('KeyD');stepWorld(w,i.consume(w.player));const prior={time:w.time,x:w.player.x,seed:w.seed};l.interrupt('rotate');for(let f=0;f<120;f++)stepWorld(w,{move:{x:1,y:1},jump:true});assert.deepEqual({time:w.time,x:w.player.x,seed:w.seed},prior);l.pause(false);stepWorld(w);assert.ok(w.time>prior.time);
});
test('opening or closing a help dialog before start cannot run the simulation',()=>{
  const l=createLifecycle();l.openDialog();l.closeDialog();assert.equal(l.started,false);assert.equal(l.paused,true);
});
test('renderer performs balanced clipping and scaling with a fake Canvas API',()=>{
  const calls=[],context=new Proxy({}, {get(target,key){return target[key]??((...args)=>calls.push([key,...args]));},set(target,key,value){target[key]=value;return true;}});
  const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:344,height:580})};
  const r=createRenderer(canvas);r.resize();r.render(createWorld(),1/60);
  assert.equal(calls.filter(c=>c[0]==='save').length,calls.filter(c=>c[0]==='restore').length);
  assert.ok(calls.some(c=>c[0]==='scale'&&c[1]===c[2]));assert.ok(calls.some(c=>c[0]==='clip'));
  assert.equal(r.toWorld(100,0),null);assert.ok(Number.isFinite(r.toWorld(172,290).x));
});

test('small displays crop at the readability floor while still obeying world visibility caps',()=>{
  const narrow=viewportMetrics(320,200),large=viewportMetrics(600,375);assert.equal(narrow.scale,VIEW_LIMIT.minScale);assert.ok(narrow.logicalWidth<large.logicalWidth);assert.ok(narrow.logicalHeight<large.logicalHeight);assert.ok(large.logicalWidth<=960);
});

test('creature labels keep at least 12 CSS pixels at the small-display scale',()=>{
  const context=new Proxy({}, {get:(target,key)=>target[key]??(()=>{}),set:(target,key,value)=>(target[key]=value,true)});
  const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:320,height:200})},r=createRenderer(canvas);r.resize();r.render(createWorld(),1/60);assert.ok(parseFloat(context.font)*r.getMetrics().scale>=12);
});
