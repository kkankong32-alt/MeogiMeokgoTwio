import {createSnakeWorld,stepFrog} from './snake-player.js';
import {normalize,clamp,distance,canStand,moveBody,clearGroundPath,blockedLine,steerSnake,addEvent,SETTINGS} from './core.js';
import {updateSnakeTrail,seedMeadowSnake} from './fauna/snake-rig.mjs';
import {stepPreyMotion} from './fauna/prey-behavior.mjs';
export const HAWK_PLAY=Object.freeze({height:150,speed:235,boostSpeed:390,boostTime:.35,diveTime:.5,riseTime:.30,diveSpeed:110,catchRadius:28,cooldown:.9});
export function createHawkWorld({seed=17,timed=true}={}){
 const w=createSnakeWorld({seed,timed,challenge:false}),snake=w.player;snake.id='ground-snake-1';snake.alive=true;snake.x=1100;snake.y=1050;snake.renderScale=.62;snake.state='patrol';seedMeadowSnake(snake);
 w.role='hawk';w.hawk=null;w.groundSnakes=[snake];w.player={id:'hawk-player',role:'hawk',x:869,y:1050,z:HAWK_PLAY.height,r:24,face:{x:0,y:-1},state:'cruise',stateTime:0,eaten:0,eatCooldown:0,jumpCooldown:0};w.diveAttempts=0;return w;
}
export const hawkFood=w=>[...w.frogs,...w.groundSnakes].filter(q=>q.alive);
export function hawkTarget(w){return hawkFood(w).filter(q=>(q.z??0)<24&&distance(q,w.player)<=HAWK_PLAY.catchRadius+q.r).sort((a,b)=>distance(a,w.player)-distance(b,w.player))[0]??null;}
function note(w,text){w.player.feedback={text,until:w.time+1.25};}
function fly(w,dir,speed,dt){const p=w.player,n=Math.hypot(dir.x,dir.y);if(!n)return;const d=normalize(dir);p.face=d;p.x=clamp(p.x+d.x*speed*Math.min(1,n)*dt,160,w.width-160);p.y=clamp(p.y+d.y*speed*Math.min(1,n)*dt,500,w.height-90);}
export function finishHawk(w,cause){if(w.status!=='playing')return;w.status='survived';w.endCause=cause;w.player.state='cruise';w.player.z=HAWK_PLAY.height;w.reason=cause==='food-exhausted'?'이곳의 먹이를 모두 먹었어요. 탐험 클리어! 내가 먹은 생물의 관계를 살펴봐요.':'매의 90초 탐험을 마쳤어요. 실제 먹기 기록을 살펴봐요.';addEvent(w,'round-end',{status:w.status,reason:w.reason});}
function groundLife(w,dt){
 stepPreyMotion(w,dt,{clearGroundPath,blockedLine,onFeeding:q=>{if(!w.observedEvents.some(e=>e.food==='grass'))w.observedEvents.push({time:w.time,type:'observed-ate',food:'grass',eater:'grasshopper',target:q.id});}});
 // Ground animals react to a descending bird, not its harmless high flight.
 const observer=w.player.state==='diving'?w.player:{x:-10000,y:-10000};
 const ground={...w,player:observer};for(const f of w.frogs)stepFrog(ground,f,dt);
 for(const s of w.groundSnakes){if(!s.alive)continue;const flee=w.player.state==='diving'&&distance(s,w.player)<230;
 const target=flee?normalize({x:s.x-w.player.x,y:s.y-w.player.y}):{x:Math.cos(w.time*.5+1),y:Math.sin(w.time*.5+1)};
 const speed=flee?80:35,turn=steerSnake(s,target,dt,speed);moveBody(w,s,turn.direction.x*speed*dt,turn.direction.y*speed*dt);s.face=turn.direction;updateSnakeTrail(s,dt);}
}
export function stepHawkWorld(w,input={},dt=SETTINGS.fixedStep){
 if(w.paused||w.status!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);w.time+=dt;const p=w.player,d=input.move??{x:0,y:0};p.stateTime+=dt;p.eatCooldown=Math.max(0,p.eatCooldown-dt);p.jumpCooldown=Math.max(0,p.jumpCooldown-dt);if(p.feedback?.until<w.time)p.feedback=null;
 if(p.carried&&w.time-p.carried.start>.45)p.carried=null;
 if(input.hop&&p.state==='diving'){p.state='rising';p.stateTime=0;p.riseFrom=p.z;p.eatCooldown=Math.max(.25,p.eatCooldown);note(w,'급강하 취소 · 다시 기회를 찾아요');}
 else if(input.eat&&['cruise','boosting'].includes(p.state)&&p.eatCooldown<=0){p.state='diving';p.stateTime=0;p.eatCooldown=HAWK_PLAY.cooldown;w.diveAttempts++;}
 else if(input.jump&&p.state==='cruise'&&p.jumpCooldown<=0){p.state='boosting';p.stateTime=0;p.jumpCooldown=.85;}
 fly(w,p.state==='boosting'&&!Math.hypot(d.x,d.y)?p.face:d,p.state==='diving'?HAWK_PLAY.diveSpeed:p.state==='boosting'?HAWK_PLAY.boostSpeed:HAWK_PLAY.speed,dt);
 groundLife(w,dt);
 if(p.state==='diving'){
  const t=Math.min(1,p.stateTime/HAWK_PLAY.diveTime);p.z=HAWK_PLAY.height*(1-t*t);
  if(t>=1){const q=canStand(w,p,10)?hawkTarget(w):null;
   if(q){q.alive=false;p.eaten++;p.carried={role:q.role,snapshot:{...q},start:w.time};addEvent(w,'ate',{actor:p.id,target:q.id,food:q.role,eater:'hawk',source:'textbook-49'});note(w,(q.role==='frog'?'개구리':'뱀')+' → 매 · 잡았어요!');}
   else{addEvent(w,'eat-missed',{actor:p.id});note(w,'빗나갔어요 · 지면 원을 먹이에 맞춰요');}
   p.state='rising';p.stateTime=0;p.riseFrom=0;
  }
 }else if(p.state==='rising'){p.z=p.riseFrom+(HAWK_PLAY.height-p.riseFrom)*Math.min(1,p.stateTime/HAWK_PLAY.riseTime);if(p.stateTime>=HAWK_PLAY.riseTime){p.state='cruise';p.z=HAWK_PLAY.height;}}
 else{p.z=HAWK_PLAY.height;if(p.state==='boosting'&&p.stateTime>=HAWK_PLAY.boostTime)p.state='cruise';}
 if(!hawkFood(w).length&&p.state==='cruise'&&!p.carried)finishHawk(w,'food-exhausted');
 if(w.status==='playing'&&hawkFood(w).length>0&&w.timed&&w.time>=SETTINGS.roundSeconds)finishHawk(w,'time');
}
