import {ARCADE,effectForEvent,jumpProgress} from './arcade.js';
import {recordLearningEvent} from './learning-records.js';
/** Deterministic simulation; responsive gameplay clock samples preserved animation poses. */
import {ART,RIGS,EAT_DURATION,hopPose,tongueGeometry,targetPoint,facing,aimPlayer} from './motion.js';
import {NAV} from './navigation.js';
import {STRIDE,stridePose,strideProgress} from './locomotion.js';
import {GAME_EAT} from './tongue-gameplay.js';
import {stepPreyMotion} from './fauna/prey-behavior.mjs';
import {updateSnakeTrail,seedMeadowSnake,SNAKE} from './fauna/snake-rig.mjs';
export const SETTINGS=Object.freeze({fixedStep:1/60,maxFrameDelta:.1,worldWidth:1672,worldHeight:941/.62,roundSeconds:90,moveSpeed:ARCADE.moveSpeed,jumpSeconds:ARCADE.big.duration,jumpRecovery:ARCADE.big.recovery,jumpHeight:ARCADE.big.height,eatSeconds:EAT_DURATION,eatCooldown:EAT_DURATION+.06,tongueReach:160,windupSeconds:ARCADE.warning});
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export const length=v=>Math.hypot(v.x,v.y);
export function normalize(v){const l=length(v);return l?{x:v.x/l,y:v.y/l}:{x:0,y:0};}
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function random(seed=17){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function segmentHitsCircle(a,b,c,r=c.r){const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy,t=den?clamp(((c.x-a.x)*dx+(c.y-a.y)*dy)/den,0,1):0;return Math.hypot(a.x+dx*t-c.x,a.y+dy*t-c.y)<=r;}
export function pointInPolygon(p,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function ellipseHit(a,b,o,pad=0){const rx=(o.rx??o.r)+pad,ry=(o.ry??o.r)+pad;return segmentHitsCircle({x:(a.x-o.x)/rx,y:(a.y-o.y)/ry},{x:(b.x-o.x)/rx,y:(b.y-o.y)/ry},{x:0,y:0,r:1});}
function distanceSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy,t=d?clamp(((p.x-a[0])*dx+(p.y-a[1])*dy)/d,0,1):0;return Math.hypot(p.x-a[0]-dx*t,p.y-a[1]-dy*t);}
function edges(poly,fn){return poly.some((a,i)=>fn(a,poly[(i+1)%poly.length]));}
function cross(a,b,c){return(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
function segmentsCross(a,b,c,d){return cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))+1e-9&&Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y))+1e-9;}
function polygonLine(a,b,poly){return pointInPolygon(a,poly)||pointInPolygon(b,poly)||edges(poly,(c,d)=>segmentsCross(a,b,{x:c[0],y:c[1]},{x:d[0],y:d[1]}));}
const worldPoly=poly=>poly.map(([x,y])=>[x,y/ART.groundY]);
export function blockedLine(w,a,b){return w.rocks.some(r=>r.polygon?polygonLine(a,b,r.polygon):ellipseHit(a,b,r));}
export function canStand(w,p,r){
 if(p.x<r||p.y<r||p.x>w.width-r||p.y>w.height-r)return false;
 if(w.rocks.some(o=>o.polygon?(pointInPolygon(p,o.polygon)||edges(o.polygon,(a,b)=>distanceSegment(p,a,b)<r)):ellipseHit(p,p,o,r)))return false;
 if(w.navigation){const meadow=w.navigation.worldMeadow??worldPoly(w.navigation.meadow),water=w.navigation.worldWater??worldPoly(w.navigation.water??[]);if(!pointInPolygon(p,meadow)||edges(meadow,(a,b)=>distanceSegment(p,a,b)<r))return false;if(water.length&&(pointInPolygon(p,water)||edges(water,(a,b)=>distanceSegment(p,a,b)<r)))return false;}return true;
}
function segmentDistance(a,b,c,d){const cp={x:c[0],y:c[1]},dp={x:d[0],y:d[1]};if(segmentsCross(a,b,cp,dp))return 0;return Math.min(distanceSegment(a,c,d),distanceSegment(b,c,d),distanceSegment(cp,[a.x,a.y],[b.x,b.y]),distanceSegment(dp,[a.x,a.y],[b.x,b.y]));}
/** Exact swept disc against polygon edges, including a tiny concave tangent interval. */
export function clearGroundPath(w,start,end,r=start.r){
 if(!canStand(w,start,r)||!canStand(w,end,r))return false;
 const touches=poly=>edges(poly,(a,b)=>segmentDistance(start,end,a,b)<r-1e-8);
 if(w.rocks.some(o=>o.polygon?(polygonLine(start,end,o.polygon)||touches(o.polygon)):ellipseHit(start,end,o,r)))return false;
 if(w.navigation){const m=w.navigation.worldMeadow??worldPoly(w.navigation.meadow),water=w.navigation.worldWater??worldPoly(w.navigation.water??[]);if(touches(m)||water.length&&(polygonLine(start,end,water)||touches(water)))return false;}return true;
}
/** Axis-separated movement permits sliding but each sub-segment is itself swept. */
export function moveBody(w,b,dx,dy){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(2,b.r/3)));for(let i=0;i<steps;i++){const nx=clamp(b.x+dx/steps,b.r,w.width-b.r);if(clearGroundPath(w,b,{x:nx,y:b.y},b.r))b.x=nx;const ny=clamp(b.y+dy/steps,b.r,w.height-b.r);if(clearGroundPath(w,b,{x:b.x,y:ny},b.r))b.y=ny;}}
export function clearLeapPath(w,p,dx){return clearGroundPath(w,p,{x:p.x+dx,y:p.y},p.r);}
export function createWorld({seed=17,timed=true}={}){
 const rng=random(seed),p={id:'frog-player',role:'frog',x:580,y:900,r:34,face:{x:1,y:0},facing:1,z:0,state:'idle',stateTime:0,eatCooldown:0,jumpCooldown:0,jumpDirection:{x:1,y:0},jumpKind:'big',pose:null,tongue:null,eaten:0,feedback:null,velocity:{x:0,y:0},gaitTime:0};
 const first=targetPoint(p),preyPoints=[first,{x:1030,y:1000},{x:880,y:960},{x:415,y:840},{x:1120,y:890},{x:690,y:1040},{x:770,y:730},{x:520,y:1080},{x:1010,y:750},{x:880,y:1140}];
 const w={width:SETTINGS.worldWidth,height:SETTINGS.worldHeight,seed,timed,time:0,paused:false,status:'playing',reason:'',events:[],effects:[],learningEvents:[],backgroundFeeding:null,navigation:{...NAV,worldMeadow:worldPoly(NAV.meadow),worldWater:worldPoly(NAV.water)},rocks:NAV.rocks.map(r=>({...r,polygon:worldPoly(r.polygon)})),cover:[{x:375,y:600,r:50},{x:1080,y:1130,r:52}],player:p,prey:preyPoints.map((pos,i)=>({id:`grasshopper-${i+1}`,role:'grasshopper',...pos,r:17,alive:true,captured:false,phase:rng()*6.28,cooldown:2+rng(),state:'feeding'})),predator:{id:'snake-1',role:'snake',developmentArt:false,x:940,y:1050,r:SNAKE.headRadius,home:{x:940,y:1050},state:'patrol',stateTime:0,face:{x:-1,y:0},locked:{x:-1,y:0},lastSeen:null},rng};seedMeadowSnake(w.predator);return w;
}
export function addEvent(w,type,details={}){const event={time:Number(w.time.toFixed(3)),type,...details};w.events.push(event);if(w.events.length>100)w.events.shift();recordLearningEvent(w,event);if(effectForEvent(event)){const at=event.type==='predator-missed'?w.predator:w.player;w.effects.push({...event,x:at.x,y:at.y});if(w.effects.length>12)w.effects.shift();}}
function notice(w,text){w.player.feedback={text,until:w.time+1.8};}
export function requestJump(w,direction,kind='big'){
 const p=w.player;if(w.paused||w.status!=='playing'||p.jumpCooldown>0||p.state==='jumping'||(p.state==='eating'&&!p.tongue?.committed))return false;
 kind=kind==='short'?'short':'big';const action=ARCADE[kind],dir=normalize(length(direction??{x:0,y:0})>.1?direction:p.face);
 let travel=action.distance;
 if(!clearGroundPath(w,p,{x:p.x+dir.x*travel,y:p.y+dir.y*travel},p.r)){
  let lo=0,hi=travel;for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(clearGroundPath(w,p,{x:p.x+dir.x*mid,y:p.y+dir.y*mid},p.r))lo=mid;else hi=mid;}travel=lo;
 }
 if(travel<20){notice(w,'앞이 막혔어요 · 방향을 바꿔 보세요');addEvent(w,'jump-blocked',{actor:p.id,kind});return false;}
 aimPlayer(p,dir);p.velocity={x:0,y:0};p.stride=null;p.pendingAction=null;p.tongue=null;
 p.jumpDirection=dir;p.jumpDistance=travel;p.jumpKind=kind;p.jumpOrigin={x:p.x,y:p.y};p.state='jumping';p.stateTime=0;p.pose=hopPose(kind,RIGS[kind].duration*.18);p.jumpCooldown=action.duration+action.recovery;
 addEvent(w,'jump',{actor:p.id,kind,duration:action.duration,direction:{...dir}});return true;
}
export function requestEat(w){
 const p=w.player;if(w.paused||w.status!=='playing'||p.eatCooldown>0||['jumping','eating'].includes(p.state))return false;
 const full=tongueGeometry(p,GAME_EAT.contact);
 if(blockedLine(w,p,full.mouth)||blockedLine(w,p,full.tip)||blockedLine(w,full.mouth,full.tip)){notice(w,'바위가 혀를 막아요');addEvent(w,'eat-blocked',{actor:p.id});return false;}
 p.stride=null;p.pendingAction=null;p.velocity={x:0,y:0};p.z=0;p.pose=null;p.eatCooldown=SETTINGS.eatCooldown;p.state='eating';p.stateTime=0;p.tongue={caught:null,committed:false,previousTip:null};addEvent(w,'eat-start',{actor:p.id});return true;
}
export function playerHidden(w){return w.cover.some(c=>distance(w.player,c)<c.r*.8);}
function cancelAction(w){const p=w.player;if(p.tongue?.caught&&!p.tongue.committed){const q=w.prey.find(q=>q.id===p.tongue.caught);if(q){q.captured=false;q.state='feeding';}addEvent(w,'catch-cancelled',{actor:p.id,target:q?.id});}p.tongue=null;p.stride=null;p.pendingAction=null;p.state='idle';p.stateTime=0;p.z=0;p.pose=null;p.velocity={x:0,y:0};}
function endRound(w,status,reason){if(w.status!=='playing')return;cancelAction(w);w.status=status;w.reason=reason;if(status==='caught')addEvent(w,'caught',{actor:w.predator.id,target:w.player.id,food:'frog',eater:'snake',source:'textbook-49'});addEvent(w,'round-end',{status,reason});}
function projected(p){return{x:p.x,y:p.y*ART.groundY-(p.z??0)};}
function touchPrey(a,b,q){const c=projected(q),pa=projected(a),pb=projected(b);return segmentHitsCircle({x:(pa.x-c.x)/(ART.preyRadiusX+1.4),y:(pa.y-c.y)/(ART.preyRadiusY+1.4)},{x:(pb.x-c.x)/(ART.preyRadiusX+1.4),y:(pb.y-c.y)/(ART.preyRadiusY+1.4)},{x:0,y:0,r:1});}
function stepPlayer(w,input,dt){const p=w.player;p.eatCooldown=Math.max(0,p.eatCooldown-dt);p.jumpCooldown=Math.max(0,p.jumpCooldown-dt);p.stateTime+=dt;if(p.feedback&&w.time>p.feedback.until)p.feedback=null;
 if(p.state==='jumping'){
  const action=ARCADE[p.jumpKind],u=clamp(p.stateTime/action.duration,0,1),pose=hopPose(p.jumpKind,RIGS[p.jumpKind].duration*(.18+.82*u));p.pose=pose;
  p.x=p.jumpOrigin.x+p.jumpDirection.x*p.jumpDistance*jumpProgress(u);p.y=p.jumpOrigin.y+p.jumpDirection.y*p.jumpDistance*jumpProgress(u);p.z=Math.sin(Math.PI*u)*action.height;
  if(u>=1){p.z=0;p.state='idle';p.stateTime=0;p.pose=null;addEvent(w,'land',{actor:p.id,kind:p.jumpKind});}return;
 }
 if(p.state==='eating'){const action=p.tongue,g=tongueGeometry(p);if(action&&!action.caught&&g.visible&&p.stateTime<=GAME_EAT.hold+1e-9){const prior=action.previousTip??g.mouth;const hits=w.prey.filter(q=>q.alive&&!q.captured&&q.role==='grasshopper'&&touchPrey(prior,g.tip,q)&&!blockedLine(w,p,q)&&!blockedLine(w,p,g.mouth)&&!blockedLine(w,g.mouth,q)).sort((a,b)=>distance(g.mouth,a)-distance(g.mouth,b)||a.id.localeCompare(b.id));const q=hits[0];if(q){action.caught=q.id;action.capture={time:p.stateTime,reach:g.pose.reach,offset:[(q.x-g.tip.x)/(ART.scale*facing(p)),((q.y-g.tip.y)*ART.groundY-(q.z??0))/ART.scale]};action.capture.offsetWorld={x:q.x-g.tip.x,y:q.y-g.tip.y,z:q.z??0};action.preySnapshot=structuredClone(q);q.captured=true;q.state='carried';addEvent(w,'tongue-contact',{actor:p.id,target:q.id,position:{x:q.x,y:q.y},tip:{...g.tip}});}}
  if(action){action.previousTip=g.visible?g.tip:null;if(action.caught&&!action.committed&&p.stateTime>=GAME_EAT.commit-1e-9){const q=w.prey.find(q=>q.id===action.caught);if(q?.alive&&q.captured){q.alive=false;q.captured=false;p.eaten++;action.committed=true;addEvent(w,'ate',{actor:p.id,eater:'frog',food:'grasshopper',target:q.id,position:{x:q.x,y:q.y},source:'textbook-49'});notice(w,'메뚜기 → 개구리 · 먹이 관계 기록');}}}
  if(p.stateTime+1e-9>=EAT_DURATION){if(!action?.committed){notice(w,'빗나감 · 조금 더 가까이!');addEvent(w,'eat-missed',{actor:p.id});}p.state='idle';p.stateTime=0;p.tongue=null;}return;
 }
 const raw=input.move??{x:0,y:0},dir=normalize(raw),amount=Math.min(1,length(raw)),v=p.velocity??{x:0,y:0};
 const desired={x:dir.x*ARCADE.moveSpeed*amount,y:dir.y*ARCADE.moveSpeed*amount};
 // First-frame movement; fast braking and immediate reversal, no reserved half-second stride.
 if(amount&&Math.hypot(v.x,v.y)<1){v.x=desired.x*.55;v.y=desired.y*.55;}
 const rate=amount?ARCADE.acceleration:ARCADE.braking;
 for(const axis of ['x','y'])v[axis]+=clamp(desired[axis]-v[axis],-rate*dt,rate*dt);
 if(amount&&v.x*dir.x+v.y*dir.y<0){v.x=desired.x*.5;v.y=desired.y*.5;}
 p.velocity=v;const before={x:p.x,y:p.y};moveBody(w,p,v.x*dt,v.y*dt);
 if(amount)aimPlayer(p,dir);
 if(distance(before,p)>.001){p.gaitTime=(p.gaitTime+dt)%STRIDE.duration;p.pose=stridePose(p.gaitTime);p.z=Math.max(0,p.pose.root.height*ART.scale);p.state='moving';}
 else{p.state='idle';p.pose=null;p.z=0;p.gaitTime=0;p.velocity={x:0,y:0};}
}

function stepPrey(w,dt){stepPreyMotion(w,dt,{clearGroundPath,blockedLine,onFeeding:q=>addEvent(w,'feeding-observed',{actor:q.id,eater:'grasshopper',food:'grass',source:'textbook-49'})});}
/** Snake steering has a distance-bound curvature budget, never an in-place pivot. */
export function steerSnake(s,target,dt,speed=48){
 const current=Math.atan2(s.face.y,s.face.x),wanted=Math.atan2(target.y,target.x),delta=Math.atan2(Math.sin(wanted-current),Math.cos(wanted-current));
 const angle=current+clamp(delta,-speed/SNAKE.turnRadius*dt,speed/SNAKE.turnRadius*dt);
 return{direction:{x:Math.cos(angle),y:Math.sin(angle)},alignment:Math.cos(delta)};
}
/** Rewind the existing safe trail instead of pivoting a trapped head or teleporting. */
export function retreatSnake(w,s,dt){
 const skin=s.skin,T=skin?.trail;if(!T||T.length<2)return false;
 const distance=Math.min(s.retreatRemaining??0,90*dt),at=skin.distance-distance;
 if(at<T[0].s)return false;
 let i=T.length-2;while(i>0&&T[i].s>at)i--;
 const a=T[i],b=T[i+1],u=clamp((at-a.s)/(b.s-a.s),0,1),next={x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};
 if(!clearGroundPath(w,s,next,s.r))return false;
 s.x=next.x;s.y=next.y;s.face=normalize({x:b.x-a.x,y:b.y-a.y});
 T.splice(i+1);T.push({...next,s:at});skin.distance=at;skin.last={...next};skin.direction={...s.face};
 s.retreatRemaining=Math.max(0,s.retreatRemaining-distance);s.blockedTime=0;return true;
}
export function moveSnake(w,s,target,speed,dt){
 if(s.state!=='attack'&&(s.retreatRemaining??0)>0){if(retreatSnake(w,s,dt))return -1;s.retreatRemaining=0;}
 const current=Math.atan2(s.face.y,s.face.x),wanted=Math.atan2(target.y,target.x),delta=Math.atan2(Math.sin(wanted-current),Math.cos(wanted-current));
 let turn=clamp(delta/(speed*dt||1),-1/ARCADE.turnRadius,1/ARCADE.turnRadius);
 if(s.state!=='attack'){
  // Test whole forward arcs before the nose reaches a wall. Axis sliding or
  // turning a stationary head would kink the neck and invalidate its trail.
  const max=1/ARCADE.turnRadius,turns=[turn,-max,0,max],look=ARCADE.turnRadius*1.45;
  const lookRadius=canStand(w,s,SNAKE.navigationRadius)?SNAKE.navigationRadius:s.r+3;
  let best=-Infinity;
  for(const curvature of turns){let previous={x:s.x,y:s.y},safe=0;
   for(let d=18;d<=look;d+=18){const angle=current+curvature*d,p=Math.abs(curvature)<1e-8?{x:s.x+Math.cos(current)*d,y:s.y+Math.sin(current)*d}:{x:s.x+(Math.sin(angle)-Math.sin(current))/curvature,y:s.y-(Math.cos(angle)-Math.cos(current))/curvature};
    if(!clearGroundPath(w,previous,p,lookRadius))break;safe=d;previous=p;
   }
   const end=current+curvature*Math.min(look,24),score=safe*4+Math.cos(wanted-end)*45-Math.abs(curvature-turn)*.01;
   if(score>best){best=score;turn=curvature;}
  }
 }
 const angle=current+turn*speed*dt,direction={x:Math.cos(angle),y:Math.sin(angle)},dx=direction.x*speed*dt,dy=direction.y*speed*dt;
 if(clearGroundPath(w,s,{x:s.x+dx,y:s.y+dy},s.r)){s.face=direction;s.x+=dx;s.y+=dy;s.blockedTime=0;}
 else if(s.state!=='attack'){s.blockedTime=(s.blockedTime??0)+dt;if(s.blockedTime>=.25)s.retreatRemaining=150;}
 return Math.cos(delta);
}
const PATROL=[{x:580,y:900},{x:430,y:820},{x:375,y:600},{x:770,y:730},{x:1030,y:930},{x:1080,y:1130},{x:680,y:1060}];
function stepPredator(w,dt){
 const s=w.predator,p=w.player;if(!s||s.disabled)return;s.stateTime+=dt;
 const gap=distance(s,p),visible=gap<ARCADE.sight&&(!playerHidden(w)||gap<110)&&!blockedLine(w,s,p);
 if(visible)s.lastSeen={x:p.x,y:p.y};
 if(s.state==='windup'){if(s.stateTime>=ARCADE.warning){s.state='attack';s.stateTime=0;s.closestAttack=Infinity;addEvent(w,'predator-attack',{actor:s.id,direction:{...s.locked}});}return;}
 if(s.state==='attack'){
  const before={x:s.x,y:s.y};moveSnake(w,s,s.locked,ARCADE.attackSpeed,dt);
  const close=distanceSegment(p,[before.x,before.y],[s.x,s.y]);s.closestAttack=Math.min(s.closestAttack??Infinity,close);
  if(segmentHitsCircle(before,s,p,p.r+s.r*.8)){endRound(w,'caught','뱀의 머리 공격 범위에 닿았어요');return;}
  if(s.stateTime>=ARCADE.attackSeconds){s.state='recover';s.stateTime=0;addEvent(w,'predator-missed',{actor:s.id});if(s.closestAttack<p.r+s.r*.8+38){notice(w,'아슬아슬! · 지금 먹이를 노려요');addEvent(w,'near-miss',{actor:p.id});}}return;
 }
 if(s.state==='reposition'){
  moveSnake(w,s,normalize({x:s.repositionTarget.x-s.x,y:s.repositionTarget.y-s.y}),ARCADE.chaseSpeed,dt);
  if(gap>270||distance(s,s.repositionTarget)<45||s.stateTime>3){s.state='approach';s.stateTime=0;s.chaseTime=0;}return;
 }
 if(s.state==='recover'){if(s.stateTime>=ARCADE.recovery){s.state='approach';s.stateTime=0;}return;}
 if(visible&&w.time>2){
  s.chaseTime=(s.chaseTime??0)+dt;
  // If the turning circle encloses the target, open distance before another approach.
  if(s.chaseTime>3.5&&gap<220){const a=Math.atan2(s.face.y,s.face.x);const options=[0,.7,-.7,1.4,-1.4,Math.PI].map(d=>({x:s.x+Math.cos(a+d)*250,y:s.y+Math.sin(a+d)*250}));
   const exit=options.find(q=>canStand(w,q,s.r)&&distance(q,p)>200);
   if(exit){s.repositionTarget=exit;s.state='reposition';s.stateTime=0;return;}
  }
  const dir=normalize({x:p.x-s.x,y:p.y-s.y}),alignment=s.face.x*dir.x+s.face.y*dir.y;
  const lateral=Math.abs(s.face.x*(p.y-s.y)-s.face.y*(p.x-s.x));
  if(gap<ARCADE.attackRange&&alignment>.3&&lateral<p.r+s.r*.8+12){s.state='windup';s.stateTime=0;s.chaseTime=0;s.locked={...s.face};addEvent(w,'predator-warning',{actor:s.id,duration:ARCADE.warning});}
  else{s.state='approach';moveSnake(w,s,dir,ARCADE.chaseSpeed,dt);}return;
 }
 if(s.lastSeen&&s.state!=='patrol'){
  if(s.state!=='search'){s.state='search';s.stateTime=0;}
  moveSnake(w,s,normalize({x:s.lastSeen.x-s.x,y:s.lastSeen.y-s.y}),ARCADE.patrolSpeed,dt);
  if(s.stateTime>2||distance(s,s.lastSeen)<45){s.lastSeen=null;s.state='patrol';s.stateTime=0;}return;
 }
 s.state='patrol';s.patrolIndex??=0;const target=PATROL[s.patrolIndex];
 if(distance(s,target)<45||s.stateTime>6){s.patrolIndex=(s.patrolIndex+1)%PATROL.length;s.stateTime=0;}
 moveSnake(w,s,normalize({x:target.x-s.x,y:target.y-s.y}),w.time<2?45:ARCADE.patrolSpeed,dt);
}
export function stepWorld(w,input={},dt=SETTINGS.fixedStep){if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid simulation delta');if(w.paused||w.status!=='playing'||dt===0)return;dt=Math.min(dt,SETTINGS.maxFrameDelta);w.time+=dt;if(!['jumping','eating'].includes(w.player.state))aimPlayer(w.player,input.move);if(input.jump)requestJump(w,input.move??{x:0,y:0},'big');else if(input.hop)requestJump(w,input.move??{x:0,y:0},'short');if(input.eat)requestEat(w);stepPlayer(w,input,dt);if(w.status==='playing'&&w.prey.length>0&&!w.prey.some(q=>q.alive)){if(w.player.state!=='eating'){w.endCause='food-exhausted';endRound(w,'finished','이곳의 메뚜기를 모두 먹었어요. 탐험 클리어! 실제 먹이 관계를 살펴봐요.');}return;}stepPrey(w,dt);stepPredator(w,dt);if(w.predator&&!w.predator.disabled)updateSnakeTrail(w.predator,dt);if(w.status==='playing'&&w.timed&&w.time>=SETTINGS.roundSeconds)endRound(w,'finished','90초 연습이 끝났어요');}
export function cameraTarget(p,view,w){const x=p.x+facing(p)*40,y=p.y-Math.min(105,view.height*.62*.30)/.62;return{x:w.width<=view.width?w.width/2:clamp(x,view.width/2,w.width-view.width/2),y:w.height<=view.height?w.height/2:clamp(y,view.height/2,w.height-view.height/2)};}
export function smoothCamera(camera,target,dt,deadzone=20){const t=1-Math.exp(-7*dt);for(const axis of ['x','y']){const delta=target[axis]-camera[axis];if(Math.abs(delta)>deadzone)camera[axis]+=(delta-Math.sign(delta)*deadzone)*t;}return camera;}
