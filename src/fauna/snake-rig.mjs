/** Continuous skin deformation of one locked raster. Canvas 2D, no external runtime dependency.
 * q.x/y are head-ground coordinates. updateSnakeTrail is simulation-owned and never called by draw.
 * All distances are world-ground units; project() alone owns the 0.62 ground projection.
 */
export const SNAKE = Object.freeze({sourceWidth:2172,sourceHeight:724,scale:.285,lengthScale:18.9/243.6,headSourceX:1985,headSourceY:390,headGroundOffset:19.5,neckSourceX:1741.4,tailSourceX:42,sourceTop:270,sourceBottom:485,bodyLength:1100,neckLength:18.9,bodyWidth:44,tailStart:.82,headRadius:30,navigationRadius:66,turnRadius:190,groundProjection:.62,segments:220});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const norm=(x,y)=>{const l=Math.hypot(x,y);return l?{x:x/l,y:y/l}:{x:1,y:0};};
// Measured alpha silhouette registration of the unchanged raster, not repainted artwork.
const sourceProfile=[[50,314,19],[60,320.5,22],[70,326.5,24],[80,331.5,24],[90,335.5,26],[100,339.5,28],[110,343,29],[120,345.5,30],[130,348,31],[140,351,33],[150,353,33],[160,354.5,34],[170,356.5,36],[180,358,37],[190,359.5,38],[200,361,39],[210,362.5,40],[220,363,41],[230,364.5,42],[240,365,43],[250,366,45],[260,366.5,46],[270,367,47],[280,367.5,48],[290,368,49],[300,368,51],[310,368,53],[320,368,53],[330,368,55],[340,367.5,56],[350,367.5,58],[360,367.5,58],[370,366.5,60],[380,366,61],[390,365,61],[400,364.5,62],[410,364,63],[420,362.5,64],[430,362,65],[440,360.5,66],[450,359.5,66],[460,358.5,68],[470,357,69],[480,356,69],[490,355.5,70],[500,354,71],[510,353,71],[520,351.5,72],[530,351,73],[540,350,73],[550,348.5,74],[560,348,75],[570,347.5,76],[580,346,77],[590,345.5,78],[600,345.5,78],[610,345,79],[620,344.5,80],[630,344,81],[640,344,83],[650,344,83],[660,344,85],[670,344,85],[680,344,87],[690,344.5,88],[700,345,89],[710,345.5,90],[720,346.5,92],[730,347,93],[740,348,95],[750,348.5,96],[760,349.5,98],[770,351,99],[780,352,99],[790,353,101],[800,354.5,102],[810,356,103],[820,357,105],[830,358,105],[840,359.5,106],[850,360.5,108],[860,362,109],[870,363,109],[880,364.5,110],[890,365.5,110],[900,366,111],[910,367.5,112],[920,368.5,112],[930,369.5,112],[940,370,113],[950,371,113],[960,372,113],[970,372,113],[980,373,113],[990,373,113],[1000,373.5,114],[1010,374,113],[1020,374.5,114],[1030,374.5,114],[1040,374.5,114],[1050,374.5,114],[1060,374,113],[1070,374,113],[1080,373,113],[1090,373,113],[1100,372,113],[1110,371.5,114],[1120,371,113],[1130,370,113],[1140,369,113],[1150,368,113],[1160,367,113],[1170,365,113],[1180,364,113],[1190,363,113],[1200,361.5,112],[1210,360,113],[1220,358.5,112],[1230,357,113],[1240,355.5,112],[1250,354,111],[1260,352.5,112],[1270,351,111],[1280,350,111],[1290,348.5,110],[1300,347.5,110],[1310,347,109],[1320,346,109],[1330,345.5,110],[1340,345,109],[1350,344.5,110],[1360,344,109],[1370,344,109],[1380,343.5,110],[1390,343.5,110],[1400,343.5,110],[1410,344,109],[1420,344.5,110],[1430,345,111],[1440,346,111],[1450,347,111],[1460,348,111],[1470,349,111],[1480,350,113],[1490,352,113],[1500,353.5,114],[1510,354.5,114],[1520,357,115],[1530,358.5,116],[1540,360,117],[1550,362.5,118],[1560,364.5,118],[1570,366.5,120],[1580,369,121],[1590,371.5,122],[1600,374,123],[1610,376.5,124],[1620,379,125],[1630,381,125],[1640,383.5,126],[1650,386,127],[1660,388,127],[1670,391,127],[1680,393,127],[1690,395,127],[1700,397,127],[1710,398.5,128],[1720,400,127],[1730,401.5,128],[1740,402,127]];
function sourceSample(x,component){for(let i=1;i<sourceProfile.length;i++){const a=sourceProfile[i-1],b=sourceProfile[i];if(x<=b[0])return mix(a[component],b[component],clamp((x-a[0])/(b[0]-a[0]),0,1));}return sourceProfile.at(-1)[component];}
export const sourceCenter=x=>sourceSample(x,1);
export const sourceWidth=x=>sourceSample(x,2);
export const sourceBehind=x=>SNAKE.neckLength+(SNAKE.neckSourceX-x)/(SNAKE.neckSourceX-SNAKE.tailSourceX)*(SNAKE.bodyLength-SNAKE.neckLength);
// Reuse thick torso texture at its own scale; never stretch the head with body length.
// A continuous mirrored UV repeat changes texture coordinates, never creature facing.
const torsoMinX=900,torsoSpan=SNAKE.neckSourceX-torsoMinX,textureDensity=2.8;
function torsoUV(b){const u=((b-SNAKE.neckLength)*textureDensity)%(torsoSpan*2);return SNAKE.neckSourceX-(u<=torsoSpan?u:torsoSpan*2-u);}
export function sourceXAt(behind){const end=SNAKE.bodyLength*SNAKE.tailStart;if(behind<=end)return torsoUV(Math.max(SNAKE.neckLength,behind));return mix(torsoUV(end),SNAKE.tailSourceX,(behind-end)/(SNAKE.bodyLength-end));}
/** Full girth through 82% of the body, then one rounded terminal taper. */
export function bodyWidthAt(behind){const t=clamp((behind/SNAKE.bodyLength-SNAKE.tailStart)/(1-SNAKE.tailStart),0,1);return mix(SNAKE.bodyWidth,7,smooth(t)**2);}
export function seedSnakeTrail(q,points){initializeSnakeTrail(q);let s=0;const reversed=[...points].reverse(),trail=[];for(let i=0;i<reversed.length;i++){if(i)s+=Math.hypot(reversed[i].x-reversed[i-1].x,reversed[i].y-reversed[i-1].y);trail.push({...reversed[i],s});}for(const p of trail)p.s-=s;q.skin.trail=trail;return q.skin;}
/** A pre-existing broad turn keeps the longer animal on the meadow at spawn. */
export function seedMeadowSnake(q){const points=[{x:q.x,y:q.y}],neck=40,r=190;for(let b=2;b<=SNAKE.bodyLength+80;b+=2){let x,y;if(b<=neck){x=q.x+b;y=q.y;}else if(b<=neck+Math.PI*r){const a=(b-neck)/r;x=q.x+neck+r*Math.sin(a);y=q.y-r*(1-Math.cos(a));}else{x=q.x+neck-(b-neck-Math.PI*r);y=q.y-2*r;}points.push({x,y});}return seedSnakeTrail(q,points);}
export function initializeSnakeTrail(q){const d=norm(q.face?.x??1,q.face?.y??0);q.skin={distance:0,trail:[{x:q.x,y:q.y,s:0}],direction:d,last:{x:q.x,y:q.y},lastSpeed:0};return q.skin;}
export function updateSnakeTrail(q,dt){const a=q.skin??initializeSnakeTrail(q),dx=q.x-a.last.x,dy=q.y-a.last.y,d=Math.hypot(dx,dy);if(d>80){initializeSnakeTrail(q);return;}
 if(d>1e-8){a.distance+=d;const v=norm(dx,dy);a.direction=v;a.trail.push({x:q.x,y:q.y,s:a.distance});while(a.trail.length>2&&a.trail[1].s<a.distance-SNAKE.bodyLength-80)a.trail.shift();a.last={x:q.x,y:q.y};}a.lastSpeed=dt>0?d/dt:0;return a;}
function trailAt(q,behind){const a=q.skin??{distance:0,trail:[{x:q.x,y:q.y,s:0}],direction:norm(q.face?.x??1,q.face?.y??0)},target=a.distance-behind,T=a.trail;
 if(target>=T[0].s&&T.length>1){let low=0,high=T.length-1;while(high-low>1){const m=(low+high)>>1;if(T[m].s<=target)low=m;else high=m;}const u=T[low],v=T[high],k=clamp((target-u.s)/(v.s-u.s),0,1);return{x:mix(u.x,v.x,k),y:mix(u.y,v.y,k)};}
 const first=T[0],d=T.length>1?norm(T[1].x-first.x,T[1].y-first.y):a.direction;return{x:first.x-d.x*(first.s-target),y:first.y-d.y*(first.s-target)};}
/** Pure deterministic pose. Pausing world time/trail freezes the entire creature. */
export function evaluateSnake(q,{waveScale=1}={}){const skin=q.skin,head=trailAt(q,0),dir=norm(q.face?.x??skin?.direction.x??1,q.face?.y??skin?.direction.y??0),phase=(skin?.distance??0)*.035,mode=q.state??'patrol';
 // Windup reduces neck wave but does not redraw the animal or fabricate a new posture.
 const neckTension=mode==='windup'?smooth((q.stateTime??0)/.9):0;
 const spacing=2,spine=[{...head}],angles=[Math.atan2(dir.y,dir.x)];
 const neckLength=SNAKE.neckLength;
 // Integrate a tangent field in arc length. Position blending can make a cusp
 // even when both input curves are smooth, so it is deliberately not used.
 for(let i=1;i<=Math.ceil((SNAKE.bodyLength+100)/spacing);i++){
  const b=i*spacing,prev=trailAt(q,Math.max(0,b-12)),next=trailAt(q,b+12),d=norm(prev.x-next.x,prev.y-next.y);
  const envelope=smooth((b-neckLength-20)/100)*(1-.6*smooth((b-SNAKE.bodyLength*.82)/(SNAKE.bodyLength*.18)));
  const waveAngle=Math.sin(phase-b*.025)*.18*envelope*waveScale*(1-neckTension*.2);
  const desired=Math.atan2(d.y,d.x)+waveAngle,last=angles[i-1],delta=Math.atan2(Math.sin(desired-last),Math.cos(desired-last));
  const stiffness=smooth((b-neckLength)/40),maxTurn=spacing/SNAKE.turnRadius*stiffness;
  const angle=b<=neckLength?angles[0]:last+clamp(delta,-maxTurn,maxTurn),mid=(last+angle)/2,p=spine[i-1];
  spine.push({x:p.x-Math.cos(mid)*spacing,y:p.y-Math.sin(mid)*spacing});angles.push(angle);
 }
 function center(behind){if(behind<=neckLength)return{x:head.x-dir.x*behind,y:head.y-dir.y*behind};const v=clamp(behind/spacing,0,spine.length-1),i=Math.min(Math.floor(v),spine.length-2),u=v-i;return{x:mix(spine[i].x,spine[i+1].x,u),y:mix(spine[i].y,spine[i+1].y,u)};}
 return{head,dir,phase,mode,center,skinDistance:skin?.distance??0};
}
function affine(s,d){const [s0,s1,s2]=s,[d0,d1,d2]=d,den=(s1.x-s0.x)*(s2.y-s0.y)-(s2.x-s0.x)*(s1.y-s0.y);if(Math.abs(den)<1e-9)return null;const a=((d1.x-d0.x)*(s2.y-s0.y)-(d2.x-d0.x)*(s1.y-s0.y))/den,b=((d1.y-d0.y)*(s2.y-s0.y)-(d2.y-d0.y)*(s1.y-s0.y))/den,c=((s1.x-s0.x)*(d2.x-d0.x)-(s2.x-s0.x)*(d1.x-d0.x))/den,e=((s1.x-s0.x)*(d2.y-d0.y)-(s2.x-s0.x)*(d1.y-d0.y))/den;return[a,b,c,e,d0.x-a*s0.x-c*s0.y,d0.y-b*s0.x-e*s0.y];}
function triangle(ctx,image,s,d){const m=affine(s,d);if(!m)return;ctx.save();ctx.beginPath();const cx=(d[0].x+d[1].x+d[2].x)/3,cy=(d[0].y+d[1].y+d[2].y)/3;for(let i=0;i<3;i++){const dx=d[i].x-cx,dy=d[i].y-cy,l=Math.hypot(dx,dy),f=(l+.42)/l,x=cx+dx*f,y=cy+dy*f;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.clip();ctx.transform(...m);ctx.drawImage(image,0,0);ctx.restore();}
export const SNAKE_HEAD=Object.freeze({pivot:[1120,508],cropX:940,scale:.105});
export function createSnakeRenderer(image,{headImage=null,headRegistration=SNAKE_HEAD}={}){
 function draw(ctx,q,project,{shadow=true,waveScale=1,scale=1}={}){const pose=evaluateSnake(q,{waveScale}),anchor=project(q.x,q.y),headScreen=project(q.x+pose.dir.x,q.y+pose.dir.y),heading=Math.atan2(headScreen.y-anchor.y,headScreen.x-anchor.x),axisProjection=Math.hypot(headScreen.x-anchor.x,headScreen.y-anchor.y);
  // Dorsal head and body share one continuous camera tangent. No sign-based mirror.
  const headAngle=heading;
  function mapped(behind,sx,sy){const p=pose.center(behind),a=pose.center(Math.max(0,behind-1)),b=pose.center(behind+1),at=project(p.x,p.y),ap=project(a.x,a.y),bp=project(b.x,b.y),t=norm(ap.x-bp.x,ap.y-bp.y),n={x:-t.y,y:t.x},offset=(sy-sourceCenter(sx))*bodyWidthAt(behind)/sourceWidth(sx)*scale;
   return{x:anchor.x+(at.x-anchor.x)*scale+n.x*offset,y:anchor.y+(at.y-anchor.y)*scale+n.y*offset-SNAKE.headGroundOffset*scale};
  }
  if(shadow){ctx.save();ctx.strokeStyle='rgba(20,39,17,.19)';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=26*scale;ctx.beginPath();for(let i=0;i<=60;i++){const p=pose.center(i/60*SNAKE.bodyLength),v=project(p.x,p.y);i?ctx.lineTo(anchor.x+(v.x-anchor.x)*scale,anchor.y+(v.y-anchor.y)*scale+4*scale):ctx.moveTo(v.x,v.y+4*scale);}ctx.stroke();ctx.restore();}
  const count=SNAKE.segments;for(let i=0;i<count;i++){const b0=mix(SNAKE.bodyLength,SNAKE.neckLength,i/count),b1=mix(SNAKE.bodyLength,SNAKE.neckLength,(i+1)/count),x0=sourceXAt(b0),x1=sourceXAt(b1),y0=SNAKE.sourceTop,y1=SNAKE.sourceBottom,s=[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}],d=[mapped(b0,x0,y0),mapped(b1,x1,y0),mapped(b1,x1,y1),mapped(b0,x0,y1)];triangle(ctx,image,[s[0],s[1],s[2]],[d[0],d[1],d[2]]);triangle(ctx,image,[s[0],s[2],s[3]],[d[0],d[2],d[3]]);}
  ctx.save();ctx.translate(anchor.x,anchor.y-SNAKE.headGroundOffset*scale);ctx.rotate(headAngle);
  if(headImage&&headRegistration){const h=headRegistration;ctx.scale(h.scale*axisProjection*scale,h.scale*scale);ctx.drawImage(headImage,h.cropX,0,headImage.width-h.cropX,headImage.height,h.cropX-h.pivot[0],-h.pivot[1],headImage.width-h.cropX,headImage.height);}
  else{ctx.scale(SNAKE.scale*scale,SNAKE.scale*scale);ctx.drawImage(image,SNAKE.neckSourceX,SNAKE.sourceTop,image.width-SNAKE.neckSourceX,SNAKE.sourceBottom-SNAKE.sourceTop,SNAKE.neckSourceX-SNAKE.headSourceX,SNAKE.sourceTop-SNAKE.headSourceY,image.width-SNAKE.neckSourceX,SNAKE.sourceBottom-SNAKE.sourceTop);}
  ctx.restore();
  return pose;
 }
 return{draw};
}
