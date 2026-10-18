/** Ground movement adapter for the six-leg raster rig. No planted frame translates.
 * Inject navigation functions from the game's core; this module owns neither frog logic nor scoring.
 */
export const PREY_MOTION=Object.freeze({duration:1.52,airStart:.69,airEnd:1.15,threatRadius:110,fleeDistance:64,forageDistance:28,hopHeight:11,forageHeight:6,recovery:.65});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const norm=(x,y)=>{const d=Math.hypot(x,y);return d?{x:x/d,y:y/d}:{x:1,y:0};};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function samplePreyHop(t){const u=clamp((t-PREY_MOTION.airStart)/(PREY_MOTION.airEnd-PREY_MOTION.airStart),0,1);return{time:clamp(t,0,PREY_MOTION.duration),progress:u,airborne:t>PREY_MOTION.airStart&&t<PREY_MOTION.airEnd,heightFactor:4*u*(1-u),done:t>=PREY_MOTION.duration};}
export function initializePreyMotion(q){q.motion={time:0,idleTime:0,hop:null,restFor:Math.max(.2,q.cooldown??2),facing:q.facing??1};q.z=0;return q.motion;}
function candidateDirections(q,away,flee,rng){const sx=flee?(Math.abs(away.x)>.01?Math.sign(away.x):(q.motion.facing??1)):(rng()<.5?-1:1);const slope=flee?clamp(away.y/Math.max(.25,Math.abs(away.x)),-.5,.5):(rng()-.5)*.55;
 // Camera has east/west art. Use shallow ground trajectories rather than rotating a side view north.
 return[{x:sx,y:slope}, {x:sx,y:0},{x:sx,y:-Math.sign(slope||1)*.42},{x:-sx,y:0}].map(v=>norm(v.x,v.y));}
export function tryPreyHop(w,q,{flee=false,clearGroundPath,random=w.rng??Math.random}={}){const m=q.motion??initializePreyMotion(q);if(m.hop||q.captured||!q.alive)return false;const away=norm(q.x-w.player.x,q.y-w.player.y),base=flee?PREY_MOTION.fleeDistance:PREY_MOTION.forageDistance;
 for(const distance of [base,base*.65])for(const d of candidateDirections(q,away,flee,random)){const end={x:q.x+d.x*distance,y:q.y+d.y*distance};if(flee&&dist(end,w.player)<dist(q,w.player)+8)continue;if(!clearGroundPath(w,q,end,q.r))continue;m.hop={start:{x:q.x,y:q.y},end,height:flee?PREY_MOTION.hopHeight:PREY_MOTION.forageHeight,flee};m.time=0;m.facing=Math.sign(d.x)||m.facing;q.facing=m.facing;q.state=flee?'fleeing':'hopping';return true;}m.restFor=.4;return false;
}
export function stepPreyMotion(w,dt,{clearGroundPath,blockedLine=()=>false,onFeeding=()=>{}}={}){if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid prey delta');if(typeof clearGroundPath!=='function')throw new Error('clearGroundPath is required');if(w.paused||w.status!=='playing'||dt===0)return;dt=Math.min(dt,.1);
 for(const q of w.prey){if(!q.alive||q.captured)continue;const m=q.motion??initializePreyMotion(q);q.phase=(q.phase??0)+dt;
  if(m.hop){m.time=Math.min(PREY_MOTION.duration,m.time+dt);const p=samplePreyHop(m.time),h=m.hop;q.x=h.start.x+(h.end.x-h.start.x)*p.progress;q.y=h.start.y+(h.end.y-h.start.y)*p.progress;q.z=h.height*p.heightFactor;
   if(p.done){q.x=h.end.x;q.y=h.end.y;q.z=0;q.state='feeding';m.hop=null;m.idleTime=0;m.restFor=PREY_MOTION.recovery+(h.flee?.25:1+(w.rng?.()??.5));}continue;
  }
  q.z=0;q.state='feeding';m.idleTime+=dt;m.restFor=Math.max(0,m.restFor-dt);const threat=dist(w.player,q)<PREY_MOTION.threatRadius&&!blockedLine(w,w.player,q);
  if(threat&&m.restFor<=PREY_MOTION.recovery){tryPreyHop(w,q,{flee:true,clearGroundPath});continue;}
  if(m.restFor<=0){onFeeding(q);tryPreyHop(w,q,{clearGroundPath});if(!m.hop)m.restFor=1;}
 }
}
export function preyDrawOptions(q){const m=q.motion;return{time:m?.hop?m.time:0,idleTime:m?.idleTime??0,facing:m?.facing??q.facing??1,worldLift:q.z??0,isHopping:Boolean(m?.hop)};}
