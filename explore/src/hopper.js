import {STRIDE,stridePose} from './locomotion.js';
import {createWorld,normalize,distance,moveBody,clearGroundPath,blockedLine,addEvent,segmentHitsCircle,clamp,canStand,SETTINGS} from './core.js';
import {aimPlayer,tongueGeometry,ART} from './motion.js';
import {GAME_EAT} from './tongue-gameplay.js';
import {stepPreyMotion} from './fauna/prey-behavior.mjs';

export const HOPPER=Object.freeze({speed:225,feedSeconds:.65,warning:.65,jumpSeconds:.46,jumpDistance:220,shortSeconds:.28,shortDistance:95});
export function createHopperWorld({seed=17,timed=true,condition='meadow'}={}){
 const w=createWorld({seed,timed});w.role='grasshopper';w.condition=condition;
 const frog={...w.player,id:'frog-hunter',x:960,y:980,alive:true,state:'patrol',cooldown:3.5,locked:{x:-1,y:0},targetId:null};
 w.player={...w.player,id:'hopper-player',role:'grasshopper',r:17,x:580,y:900,alive:true,motion:{idleTime:0,time:0,hop:null,facing:1},feedProgress:0};
 w.predator={disabled:true};w.hunters=[frog];w.prey=w.prey.filter((q,i)=>i===1||i===7);w.cover=[];
 w.plants=[{id:'grass-1',name:'가까운 풀밭',x:610,y:910},{id:'grass-2',name:'가운데 풀밭',x:820,y:870},{id:'grass-3',name:'아래 풀밭',x:735,y:1110},{id:'grass-4',name:'오른쪽 풀밭',x:1100,y:1040}].map((p,i)=>({...p,role:'grass',r:55,leaves:condition==='cut'&&i===1?0:3,cut:condition==='cut'&&i===1}));
 return w;
}
export function nearbyPlant(w){return w.plants.filter(q=>q.leaves>0&&distance(w.player,q)<q.r+20&&!blockedLine(w,w.player,q)).sort((a,b)=>distance(w.player,a)-distance(w.player,b))[0]??null;}
function feedback(w,text){w.player.feedback={text,until:w.time+2};}
export function finishHopper(w,status){if(w.status!=='playing')return;w.status=status;w.player.state='idle';w.player.z=0;w.player.feedProgress=0;w.player.motion.hop=null;w.reason=w.endCause==='food-exhausted'?'이곳의 풀잎을 모두 먹었어요. 탐험 클리어! 풀과 메뚜기의 관계를 살펴봐요.':status==='caught'?'개구리에게 잡혔어요. 이번엔 내가 먹이가 되었네요.':'메뚜기의 90초를 살아냈어요.';if(status==='caught')addEvent(w,'caught',{actor:'frog-hunter',target:w.player.id,food:'grasshopper',eater:'frog',source:'textbook-49'});addEvent(w,'round-end',{status,reason:w.reason});}
function jump(w,dir,short){const p=w.player;if(p.jumpCooldown>0||p.state==='jumping')return;const d=normalize(Math.hypot(dir.x,dir.y)>.01?dir:p.face),max=short?HOPPER.shortDistance:HOPPER.jumpDistance;let travel=max;while(travel>10&&!clearGroundPath(w,p,{x:p.x+d.x*travel,y:p.y+d.y*travel},p.r))travel-=5;if(travel<=10){feedback(w,'앞이 막혔어요 · 방향을 바꿔요');return;}p.state='jumping';p.stateTime=0;p.feedProgress=0;p.feedback=null;p.jumpDirection=d;p.jumpOrigin={x:p.x,y:p.y};p.jumpDistance=travel;p.jumpDuration=short?HOPPER.shortSeconds:HOPPER.jumpSeconds;p.jumpHeight=short?30:65;p.jumpCooldown=p.jumpDuration+.08;p.motion.hop={};aimPlayer(p,d);p.motion.facing=p.facing;addEvent(w,'jump',{actor:p.id,kind:short?'short':'big'});}
function stepHopperPlayer(w,input,dt){const p=w.player,raw=input.move??{x:0,y:0},dir=normalize(raw),moving=Math.hypot(raw.x,raw.y)>.01;p.stateTime+=dt;p.jumpCooldown=Math.max(0,p.jumpCooldown-dt);p.eatCooldown=0;p.motion.idleTime+=dt;if(p.feedback?.until<w.time)p.feedback=null;
 if(input.jump||input.hop)jump(w,dir,!input.jump);
 if(p.state==='jumping'){if(p.stateTime===0)p.stateTime=dt;const u=clamp(p.stateTime/p.jumpDuration,0,1);p.x=p.jumpOrigin.x+p.jumpDirection.x*p.jumpDistance*u;p.y=p.jumpOrigin.y+p.jumpDirection.y*p.jumpDistance*u;p.z=Math.sin(Math.PI*u)*p.jumpHeight;p.motion.time=.69+.46*u;if(u>=1){p.state='idle';p.z=0;p.motion.hop=null;addEvent(w,'land',{actor:p.id});}return;}
 p.z=0;if(moving){if(p.state==='feeding')p.feedback=null;p.state='moving';p.feedProgress=0;p.feedTarget=null;aimPlayer(p,dir);p.motion.facing=p.facing;p.motion.hop={};p.motion.time=.69+.46*((w.time%.18)/.18);p.z=Math.sin(Math.PI*((w.time%.18)/.18))*3;moveBody(w,p,dir.x*HOPPER.speed*dt,dir.y*HOPPER.speed*dt);return;}
 if(p.state==='moving')p.state='idle';p.motion.hop=null;
 if(input.eat&&p.state!=='feeding'){const q=nearbyPlant(w);if(q){p.state='feeding';p.feedTarget=q.id;p.feedProgress=0;feedback(w,'잎을 뜯는 중 · 움직이면 바로 취소해요');}else feedback(w,'밝은 풀밭에 가까이 가서 먹기를 눌러요');}
 if(p.state==='feeding'){const q=w.plants.find(q=>q.id===p.feedTarget);if(!q||q.leaves<=0||distance(p,q)>q.r+20){p.state='idle';p.feedProgress=0;return;}p.feedProgress+=dt;if(p.feedProgress+1e-9>=HOPPER.feedSeconds){q.leaves--;p.eaten++;p.state='idle';p.feedProgress=0;addEvent(w,'ate',{actor:p.id,target:q.id,food:'grass',eater:'grasshopper',source:'textbook-49'});feedback(w,q.leaves?'풀 → 메뚜기 · 잎을 뜯었어요!':'다 먹은 풀밭 · 다른 풀밭으로!');}}
}
function projected(q){return{x:q.x,y:q.y*.62-(q.z??0)};}
function stepHunter(w,f,dt){f.stateTime+=dt;f.cooldown=Math.max(0,f.cooldown-dt);
 if(f.state==='windup'){if(f.stateTime>=HOPPER.warning){f.state='eating';f.stateTime=0;f.tongue={committed:false,caught:null,previousTip:null};}return;}
 if(f.state==='eating'){const g=tongueGeometry(f),t=f.tongue;if(g.visible&&f.stateTime<=GAME_EAT.hold){const a=projected(t.previousTip??g.mouth),b=projected(g.tip);for(const q of [w.player,...w.prey]){if(!q.alive||q.captured||t.committed)continue;if(segmentHitsCircle(a,b,projected(q),q.r)&&!blockedLine(w,g.mouth,q)){t.committed=true;if(q===w.player){finishHopper(w,'caught');return;}q.alive=false;addEvent(w,'hunter-fed',{actor:f.id,target:q.id,food:'grasshopper',eater:'frog'});}}}t.previousTip=g.tip;if(f.stateTime>=.28){f.state='recover';f.stateTime=0;f.tongue=null;if(!t.committed){addEvent(w,'hunter-missed',{actor:f.id});if(distance(f,w.player)<200)feedback(w,'피했어요! · 지금 다른 풀밭으로');}}return;}
 if(f.state==='recover'){if(f.stateTime>.85){f.state='patrol';f.stateTime=0;f.cooldown=.25;}return;}
 const targets=[w.player,...w.prey.filter(q=>q.alive&&!q.captured)].filter(q=>!blockedLine(w,f,q)).sort((a,b)=>distance(f,a)-distance(f,b));const q=targets[0];if(!q)return;let best=null;
 for(let i=0;i<8;i++){const angle=i*Math.PI/4,face={x:Math.cos(angle),y:Math.sin(angle)},probe={...f,face,facing:Math.abs(face.x)>.1?Math.sign(face.x):f.facing};const tip=tongueGeometry(probe,GAME_EAT.contact).tip,goal={x:q.x-(tip.x-f.x),y:q.y-(tip.y-f.y)};if(!canStand(w,goal,f.r))continue;const score=distance(f,goal)+(blockedLine(w,f,goal)?250:0);if(!best||score<best.score)best={face,goal,score};}
 if(!best)return;aimPlayer(f,best.face);const d=normalize({x:best.goal.x-f.x,y:best.goal.y-f.y});
 const tip=tongueGeometry(f,GAME_EAT.contact).tip;
 if(f.cooldown<=0&&distance(tip,q)<14){f.state='windup';f.stateTime=0;f.pose=null;f.z=0;f.locked={...f.face};f.targetId=q.id;return;}
 if(f.cooldown>2)return;
 const speed=125,before={x:f.x,y:f.y};moveBody(w,f,d.x*speed*dt,d.y*speed*dt);
 if(distance(before,f)<.1){const side=Math.sin(w.time*.5+w.seed)>0?1:-1;moveBody(w,f,-d.y*side*speed*dt,d.x*side*speed*dt);}f.pose=stridePose(w.time%STRIDE.duration);f.z=Math.max(0,f.pose.root.height*ART.scale);
}
export function stepHopper(w,input={},dt=SETTINGS.fixedStep){if(w.paused||w.status!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);w.time+=dt;stepHopperPlayer(w,input,dt);if(w.plants.length>0&&!w.plants.some(q=>q.leaves>0)){w.endCause='food-exhausted';finishHopper(w,'survived');return;}stepPreyMotion(w,dt,{clearGroundPath,blockedLine});for(const f of w.hunters)stepHunter(w,f,dt);if(w.status==='playing'&&w.timed&&w.time>=SETTINGS.roundSeconds)finishHopper(w,'survived');}
