import {createWorld,normalize,distance,moveBody,clearGroundPath,blockedLine,addEvent,segmentHitsCircle,SETTINGS} from './core.js';
import {updateSnakeTrail,seedMeadowSnake} from './fauna/snake-rig.mjs';
import {aimPlayer,ART} from './motion.js';
import {stridePose,STRIDE} from './locomotion.js';
import {stepPreyMotion} from './fauna/prey-behavior.mjs';
export const SNAKE_PLAY=Object.freeze({speed:195,biteDuration:.18,biteSpeed:350,biteCooldown:.42,dashDuration:.30,dashSpeed:410,shortDuration:.16,shortSpeed:330,warning:1.05,hawkRadius:62,hawkCooldown:5});
export function createSnakeWorld({seed=17,timed=true,challenge=true}={}){
 const w=createWorld({seed,timed});const template={...w.player};w.role='snake';w.condition='meadow';
 w.player={...template,...w.predator,id:'snake-player',role:'snake',x:940,y:1050,state:'idle',stateTime:0,face:{x:-1,y:0},locked:{x:-1,y:0},eaten:0,eatCooldown:0,jumpCooldown:0,z:0,r:30};seedMeadowSnake(w.player);
 w.snakeChallenge=challenge;w.predator={disabled:true};w.cover=[];const positions=[{x:869,y:1050},{x:650,y:850},{x:1060,y:800},{x:580,y:1060}];if(challenge)positions.push({x:415,y:840},{x:880,y:1140});w.frogs=positions.map((pos,i)=>({...template,...pos,id:'frog-food-'+i,role:'frog',alive:true,renderScale:.85,r:25.5,state:'idle',face:{x:1,y:0},facing:1,z:0,cooldown:i?1.4:1.2,eaten:0}));
 w.hawk={role:'hawk',id:'hawk-1',state:'patrol',time:0,cooldown:6,target:null,x:1000,y:700,z:190};w.observedEvents=[];return w;
}
function feedback(w,text){w.player.feedback={text,until:w.time+1.5};}
export function finishSnake(w,status){if(w.status!=='playing')return;w.status=status;w.player.state='idle';w.player.z=0;w.reason=w.endCause==='food-exhausted'?'이곳에 남은 개구리가 없어요. 탐험 클리어! 실제로 일어난 먹이 관계를 살펴봐요.':status==='caught'?'매의 예고 원에서 벗어나지 못했어요.':'뱀의 90초 탐험을 마쳤어요.';if(status==='caught')addEvent(w,'caught',{actor:w.hawk.id,target:w.player.id,food:'snake',eater:'hawk',source:'textbook-49'});addEvent(w,'round-end',{status,reason:w.reason});}
function npcEvent(w,food,eater,target){w.observedEvents.push({time:Number(w.time.toFixed(3)),type:'observed-ate',food,eater,target});if(w.observedEvents.length>40)w.observedEvents.shift();}
// Player motion follows input immediately; only the visible heading eases.
function moveSnake(w,dir,speed,dt){
 const p=w.player;if(!Math.hypot(dir.x,dir.y))return;
 p.visualFace??={...p.face};p.face={...dir};
 moveBody(w,p,dir.x*speed*dt,dir.y*speed*dt);
 updateSnakeTrail(p,dt);
}
function turnVisualHead(p,dt){
 const from=p.visualFace??p.face,a=Math.atan2(from.y,from.x),b=Math.atan2(p.face.y,p.face.x);
 const delta=Math.atan2(Math.sin(b-a),Math.cos(b-a)),angle=a+Math.max(-Math.PI/0.12*dt,Math.min(Math.PI/0.12*dt,delta));
 p.visualFace={x:Math.cos(angle),y:Math.sin(angle)};
}
function stepPlayer(w,input,dt){const p=w.player;p.eatCooldown=Math.max(0,p.eatCooldown-dt);p.jumpCooldown=Math.max(0,p.jumpCooldown-dt);p.stateTime+=dt;if(p.feedback?.until<w.time)p.feedback=null;
 const raw=input.move??{x:0,y:0},dir=normalize(raw);
 if(p.state==='eating'){const before={x:p.x,y:p.y};moveSnake(w,p.locked,SNAKE_PLAY.biteSpeed,dt);if(!p.biteCommitted){const q=w.frogs.find(q=>q.alive&&q.z<24&&segmentHitsCircle(before,p,q,p.r+q.r-10)&&!blockedLine(w,p,q));if(q){q.alive=false;p.captureVisual={frog:{...q,pose:null},start:w.time,duration:.28};p.biteCommitted=true;p.eaten++;addEvent(w,'ate',{actor:p.id,target:q.id,food:'frog',eater:'snake',source:'textbook-49'});feedback(w,'개구리 → 뱀 · 잡았어요!');}}if(p.stateTime>=SNAKE_PLAY.biteDuration){p.state='idle';if(!p.biteCommitted){addEvent(w,'eat-missed',{actor:p.id});feedback(w,'빗나갔어요 · 머리를 먹이 쪽으로');}}return;}
 if(p.state==='dashing'){moveSnake(w,Math.hypot(dir.x,dir.y)?dir:p.face,p.dashSpeed,dt);if(p.stateTime>=p.dashDuration)p.state='idle';return;}
 if(input.eat&&p.eatCooldown<=0){p.state='eating';p.stateTime=0;p.locked=Math.hypot(dir.x,dir.y)?{...dir}:{...p.face};p.face={...p.locked};p.visualFace={...p.locked};p.biteCommitted=false;p.eatCooldown=SNAKE_PLAY.biteCooldown;return;}
 if((input.jump||input.hop)&&p.jumpCooldown<=0){p.state='dashing';p.stateTime=0;p.dashSpeed=input.jump?SNAKE_PLAY.dashSpeed:SNAKE_PLAY.shortSpeed;p.dashDuration=input.jump?SNAKE_PLAY.dashDuration:SNAKE_PLAY.shortDuration;p.jumpCooldown=p.dashDuration+.35;moveSnake(w,Math.hypot(dir.x,dir.y)?dir:p.face,p.dashSpeed,dt);return;}
 p.state=Math.hypot(dir.x,dir.y)?'moving':'idle';moveSnake(w,dir,SNAKE_PLAY.speed*Math.min(1,Math.hypot(raw.x,raw.y)),dt);
}
export function stepFrog(w,f,dt){if(!f.alive)return;f.cooldown=Math.max(0,f.cooldown-dt);f.z=0;f.pose=null;
 const harder=w.role==='snake'&&w.snakeChallenge;const danger=distance(f,w.player)<(harder?260:230);if(danger){if(harder?f.id==='frog-food-0'&&w.time<.75:f.cooldown>0)return;let d=normalize({x:f.x-w.player.x,y:f.y-w.player.y});const speed=harder?165:125;if(harder&&!clearGroundPath(w,f,{x:f.x+d.x*35,y:f.y+d.y*35},f.r)){const choices=[{x:-d.y,y:d.x},{x:d.y,y:-d.x}].filter(v=>clearGroundPath(w,f,{x:f.x+v.x*35,y:f.y+v.y*35},f.r));if(choices.length)d=choices.sort((a,b)=>distance({x:f.x+b.x*35,y:f.y+b.y*35},w.player)-distance({x:f.x+a.x*35,y:f.y+a.y*35},w.player))[0];}moveBody(w,f,d.x*speed*dt,d.y*speed*dt);aimPlayer(f,d);f.pose=stridePose(w.time%STRIDE.duration);f.z=Math.max(0,f.pose.root.height*ART.scale);return;}
 const prey=w.prey.filter(q=>q.alive&&!q.captured&&!blockedLine(w,f,q)).sort((a,b)=>distance(f,a)-distance(f,b))[0];if(!prey)return;const d=normalize({x:prey.x-f.x,y:prey.y-f.y});aimPlayer(f,d);
 if(distance(f,prey)<48&&prey.z<12&&f.cooldown<=0){prey.alive=false;f.cooldown=2;npcEvent(w,'grasshopper','frog',prey.id);return;}
 if(f.cooldown<=0){moveBody(w,f,d.x*72*dt,d.y*72*dt);f.pose=stridePose(w.time%STRIDE.duration);f.z=Math.max(0,f.pose.root.height*ART.scale);}}
function stepHawk(w,dt){const h=w.hawk;h.time+=dt;h.cooldown=Math.max(0,h.cooldown-dt);
 if(h.state==='patrol'){h.x=w.player.x+Math.cos(w.time*.7)*170;h.y=w.player.y-120+Math.sin(w.time*.7)*60;h.z=190;if(h.cooldown<=0){const q=h.turn%2===1?w.frogs.find(q=>q.alive)??w.player:w.player;h.target={x:q.x,y:q.y,id:q.id};h.state='warning';h.time=0;}return;}
 if(h.state==='warning'){const u=Math.min(1,h.time/SNAKE_PLAY.warning);h.x=h.target.x;h.y=h.target.y;h.z=190*(1-u)+25;if(h.time<SNAKE_PLAY.warning)return;h.state='recover';h.time=0;h.turn=(h.turn??0)+1;
 if(distance(w.player,h.target)<SNAKE_PLAY.hawkRadius+w.player.r*.4){finishSnake(w,'caught');return;}
 const q=w.frogs.find(q=>q.alive&&distance(q,h.target)<SNAKE_PLAY.hawkRadius);if(q){q.alive=false;npcEvent(w,'frog','hawk',q.id);}else feedback(w,'매를 피했어요! · 지금 먹이 쪽으로');
 return;}
 h.z=Math.min(210,25+h.time*180);if(h.time>1){h.state='patrol';h.cooldown=SNAKE_PLAY.hawkCooldown;h.time=0;}}
export function stepSnake(w,input={},dt=SETTINGS.fixedStep){if(w.paused||w.status!=='playing'||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);w.time+=dt;if(w.player.captureVisual&&w.time-w.player.captureVisual.start>=w.player.captureVisual.duration)w.player.captureVisual=null;stepPlayer(w,input,dt);if(w.frogs.length>0&&!w.frogs.some(f=>f.alive)){if(!w.player.captureVisual){w.endCause='food-exhausted';finishSnake(w,'survived');}return;}turnVisualHead(w.player,dt);stepPreyMotion(w,dt,{clearGroundPath,blockedLine,onFeeding:q=>{if(!w.observedEvents.some(e=>e.food==='grass'))npcEvent(w,'grass','grasshopper',q.id);}});for(const f of w.frogs)stepFrog(w,f,dt);stepHawk(w,dt);if(w.status==='playing'&&!w.frogs.some(f=>f.alive)&&!w.player.captureVisual){w.endCause='food-exhausted';finishSnake(w,'survived');}if(w.status==='playing'&&w.timed&&w.time>=SETTINGS.roundSeconds)finishSnake(w,'survived');}
