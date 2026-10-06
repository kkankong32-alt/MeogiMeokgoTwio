import {SETTINGS,clamp,smoothCamera,cameraTarget,selectFoodTarget,getJumpReadiness,playerTongueGeometry} from './core.js';
import {GROUND_Y as Y,viewportMetrics,storyViewportMetrics,screenToGround,isInsideView} from './viewport.js';
import {ART} from './motion.js';
import {predatorSignal} from './predator-signals.js';
import {GAME_EAT} from './tongue-gameplay.js';
import {journeyMission} from './mission.js';
import {createCreatureRenderer} from './creatures.js';
import {createSnakeRenderer} from './fauna/snake-rig.mjs';

const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
function screenRect(rect){const left=finite(rect.left,finite(rect.x)),top=finite(rect.top,finite(rect.y));return{left,top,right:finite(rect.right,left+finite(rect.width)),bottom:finite(rect.bottom,top+finite(rect.height))};}
/** CSS occlusions become ground-space rectangles. Head AND complete attack capsule must fit. */
export function computeVisibleBounds(metrics,camera,occlusions=[],padding=8){
 const v=metrics.view,screen={left:v.x+padding,top:v.y+padding,right:v.x+v.width-padding,bottom:v.y+v.height-padding};
 const exclusions=occlusions.map(screenRect).map(r=>({left:Math.max(v.x,r.left-padding),top:Math.max(v.y,r.top-padding),right:Math.min(v.x+v.width,r.right+padding),bottom:Math.min(v.y+v.height,r.bottom+padding)})).filter(r=>r.right>r.left&&r.bottom>r.top);
 // A full-width HUD or controls strip trims the actual playable view instead of hiding a warning.
 for(const r of exclusions){if(r.right-r.left>=v.width*.6){if(r.top<=screen.top+padding)screen.top=Math.max(screen.top,r.bottom);else if(r.bottom>=screen.bottom-padding)screen.bottom=Math.min(screen.bottom,r.top);}}
 if(screen.bottom<screen.top)screen.bottom=screen.top;
 const a=screenToGround(screen.left,screen.top,camera,metrics),b=screenToGround(screen.right,screen.bottom,camera,metrics);
 const worldRect=r=>{const p=screenToGround(r.left,r.top,camera,metrics),q=screenToGround(r.right,r.bottom,camera,metrics);return{left:p.x,top:p.y,right:q.x,bottom:q.y};};
 return{left:a.x,top:a.y,right:b.x,bottom:b.y,exclusions:exclusions.map(worldRect)};
}
/** Ground capsules keep their full collision width after the .62 projection. */
export function warningGeometry(warning){
 if(!warning?.start||!warning?.end)return null;
 const a=warning.start,b=warning.end,r=Math.max(0,warning.r??warning.radius??0),length=Math.hypot(b.x-a.x,b.y-a.y),normal=length?{x:-(b.y-a.y)/length*r,y:(b.x-a.x)/length*r}:{x:0,y:r};
 return{start:{...a},end:{...b},r,corners:[{x:a.x+normal.x,y:a.y+normal.y},{x:b.x+normal.x,y:b.y+normal.y},{x:b.x-normal.x,y:b.y-normal.y},{x:a.x-normal.x,y:a.y-normal.y}]};
}

/** Escaping above a ground attack must also put the player above ground creature artwork. */
export function sortVisibleActors(objects,player){
 const elevated=player.state==='jumping'&&(player.z??0)>=SETTINGS.attackHeight;
 return[...objects].sort((a,b)=>elevated&&a===player?1:elevated&&b===player?-1:a.y-b.y);
}

export function createRenderer(canvas,{assets=null}={}){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas 2D is unavailable');
 const camera={x:620,y:740};let width=800,height=560,metrics=viewportMetrics(width,height),debug=false,art=assets?createCreatureRenderer(assets):null,snakeArt=assets?.snake?createSnakeRenderer(assets.snake,{headImage:assets.snakeHead}):null,initialized=false,manualOcclusions=null,lastWorld=null,lastEaten=0,goalBurst=0,particles=[];
 function resize(){const box=canvas.getBoundingClientRect();metrics=viewportMetrics(box.width,box.height,globalThis.devicePixelRatio||1);width=metrics.logicalWidth;height=metrics.logicalHeight;canvas.width=metrics.pixelWidth;canvas.height=metrics.pixelHeight;}
 function point(x,y,z=0){return{x:x-camera.x+width/2,y:(y-camera.y)*Y+height/2-z};}
 function ellipse(x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2/metrics.scale;ctx.stroke();}}
 function text(x,y,value,color='#fff4d3',size=12){ctx.font=`700 ${Math.max(12,size)/metrics.scale}px "Noto Sans KR", "Noto CJK", system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3/metrics.scale;ctx.lineJoin='round';ctx.strokeStyle='#183221ee';ctx.strokeText(value,x,y);ctx.fillStyle=color;ctx.fillText(value,x,y);}
 function polygon(poly,image=false){ctx.beginPath();poly.forEach((o,i)=>{const [x,y]=Array.isArray(o)?o:[o.x,o.y],q=point(x,image?y/Y:y);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();}
 function line(a,b,color,width=2){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
 function shadow(o,small=false){const p=point(o.x,o.y),lift=Math.max(0,o.z??0),s=Math.max(.4,1-lift/250);ellipse(p.x,p.y+3,(small?29:48)*s,(small?9:17)*s,`rgba(17,41,24,${Math.max(.07,.24-lift/1000)})`);}
 function occlusions(){
  if(manualOcclusions)return manualOcclusions;
  const doc=canvas.ownerDocument??globalThis.document;if(!doc?.querySelectorAll)return[];
  const box=canvas.getBoundingClientRect();
  return[...doc.querySelectorAll('[data-game-occlusion], #hud, #pad, #eat, #jump, #pause')].filter(el=>!el.hidden&&!el.closest?.('[hidden]')&&(!el.getClientRects||el.getClientRects().length)).map(el=>{const r=el.getBoundingClientRect();return{left:r.left-(box.left??0),top:r.top-(box.top??0),width:r.width,height:r.height};});
 }
 function safeLogical(bounds){const a=point(bounds.left,bounds.top),b=point(bounds.right,bounds.bottom);return{left:a.x,top:a.y,right:b.x,bottom:b.y};}
 function grassPatch(g,w,target){
  const p=point(g.x,g.y),remaining=Math.max(0,g.remaining??g.bites??0),capacity=g.capacity??g.bites??4,active=target?.id===g.id;
  if(w.prototype&&assets?.edibleGrass){
   const width=g.r*2.03,height=width*268/512;ctx.save();ctx.globalAlpha=remaining?1:.36;
   if(active)ellipse(p.x,p.y,g.r*.85,g.r*Y*.7,'#f4e28d25');
   ctx.drawImage(assets.edibleGrass,p.x-width/2,p.y-height*.79,width,height);ctx.restore();
  }else{
   ellipse(p.x,p.y,g.r,g.r*Y,remaining?'#43692966':'#59644729',active?'#f7ef92':remaining?'#c1d38b99':'#a5b58a55');
   ctx.save();ctx.globalAlpha=remaining?.82:.36;
   for(let i=0;i<11;i++){const angle=i*2.39996,rad=g.r*.63*Math.sqrt((i+1)/11),x=p.x+Math.cos(angle)*rad,y=p.y+Math.sin(angle)*rad*Y;
    const tall=remaining?12+(i%3)*4:4;ctx.strokeStyle=i%2?'#d0db86':'#759441';ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(x-5,y+3);ctx.quadraticCurveTo(x-4,y-tall*.5,x-7,y-tall);ctx.moveTo(x,y+3);ctx.quadraticCurveTo(x+1,y-tall*.6,x+2,y-tall-3);ctx.moveTo(x+4,y+3);ctx.quadraticCurveTo(x+7,y-tall*.5,x+9,y-tall*.8);ctx.stroke();}ctx.restore();
  }
  if(w.story&&['windup','attack'].includes(w.predator?.state))return;
  if((w.role==='grasshopper'||w.prototype)&&(!w.prototype||g.id===[...w.grass].sort((a,b)=>Math.hypot(a.x-w.player.x,a.y-w.player.y)-Math.hypot(b.x-w.player.x,b.y-w.player.y))[0]?.id)&&!(w.prototype&&Math.hypot(w.predator.x-w.player.x,w.predator.y-w.player.y)<300&&target?.id!==g.id)){
   const y=p.y+g.r*Y+15/metrics.scale;
   text(p.x,y,remaining?(w.prototype?(w.role==='grasshopper'?`먹을 풀 · ${remaining}번 남음`:'곤충이 먹는 풀'):`풀 ${remaining}입`):'다 먹은 풀',remaining?'#f1f7b6':'#d6d9bb');
   const gap=8/metrics.scale,start=p.x-(capacity-1)*gap/2;
   if(w.role==='grasshopper')for(let i=0;i<capacity;i++)ellipse(start+i*gap,y+12/metrics.scale,2.2/metrics.scale,2.2/metrics.scale,i<remaining?'#f0e48c':'#233c2677');
  }
 }
 function destination(w,safe){
  if(w.story&&['windup','attack'].includes(w.predator?.state))return;
  const d=w.prototype?journeyMission(w).beacon:w.destination;if(!d)return;if(!w.story&&w.prototype&&w.role==='grasshopper'&&!w.fed&&selectFoodTarget(w))return;const p=point(d.x,d.y),met=w.story?true:w.prototype?(w.phase==='find-lab'||w.player.eaten>=w.quota):w.player.eaten>=w.quota,phase=w.settings?.reducedMotion?0:Math.sin(w.time*3)*.04;
  ellipse(p.x,p.y,d.r*(1+phase),d.r*Y*(1+phase),met?'#dded7844':'#dce6be22',met?'#fff59d':'#d8e6b899');
  ellipse(p.x,p.y,d.r*.73,d.r*.73*Y,null,met?'#fff3b999':'#d8e6b855');
  const inside=p.x>safe.left+75/metrics.scale&&p.x<safe.right-75/metrics.scale&&p.y>safe.top+50/metrics.scale&&p.y<safe.bottom-40/metrics.scale;
  if(inside){
   line({x:p.x,y:p.y-4},{x:p.x,y:p.y-45},'#f6e4ae',2.7/metrics.scale);ctx.beginPath();ctx.moveTo(p.x,p.y-45);ctx.lineTo(p.x+25,p.y-38);ctx.lineTo(p.x,p.y-29);ctx.closePath();ctx.fillStyle=met?'#ffdf73':'#d4dbad';ctx.fill();text(p.x,p.y+d.r*Y+19/metrics.scale,w.prototype?d.label:met?'도착 지점으로!':d.label,met?'#fff3a1':'#f1efd7');
  }else{
   const margin=47/metrics.scale,cx=(safe.left+safe.right)/2,cy=(safe.top+safe.bottom)/2,dx=p.x-cx,dy=p.y-cy;
   const rx=Math.max(10,(safe.right-safe.left)/2-margin),ry=Math.max(10,(safe.bottom-safe.top)/2-margin),t=Math.min(1,rx/Math.max(.001,Math.abs(dx)),ry/Math.max(.001,Math.abs(dy))),x=cx+dx*t,y=cy+dy*t,angle=Math.atan2(dy,dx);
   ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=met?'#ffe589':'#dfe5c7';ctx.strokeStyle='#395036';ctx.lineWidth=2/metrics.scale;ctx.beginPath();ctx.moveTo(15/metrics.scale,0);ctx.lineTo(-5/metrics.scale,-9/metrics.scale);ctx.lineTo(-1/metrics.scale,0);ctx.lineTo(-5/metrics.scale,9/metrics.scale);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
   text(clamp(x,safe.left+70/metrics.scale,safe.right-70/metrics.scale),clamp(y+21/metrics.scale,safe.top+16/metrics.scale,safe.bottom-12/metrics.scale),w.prototype?d.label:met?'도착 지점으로!':`도착 · ${d.label}`,met?'#fff0a4':'#eff0d2');
  }
 }
 function attackGroundCue(s,w){
  if(!['windup','attack'].includes(s?.state))return;const shape=warningGeometry(s.warning);if(!shape)return;
  const attack=s.state==='attack';
  // A quiet ground wash covers the exact warned footprint, with no physical-looking rim.
  // It is drawn BEFORE creatures: it cannot sit across the frog's feet or snake's head.
  ctx.save();ctx.globalAlpha=attack?.20:.13;polygon(shape.corners);ctx.fillStyle='#fff1c5';ctx.fill();
  for(const v of [shape.start,shape.end]){const q=point(v.x,v.y);ellipse(q.x,q.y,shape.r,shape.r*Y,'#fff1c5');}
  ctx.restore();
  // One short directional scuff uses light/dark luminance, not a red/green color code.
  const a=point(shape.start.x,shape.start.y),b=point(shape.end.x,shape.end.y),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,n={x:dx/len,y:dy/len};
  const tail=Math.min(len*.22,28/metrics.scale),mark=Math.min(len*.22,23/metrics.scale),tip={x:a.x+n.x*(tail+mark),y:a.y+n.y*(tail+mark)},wing=5/metrics.scale;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(a.x+n.x*tail,a.y+n.y*tail);ctx.lineTo(tip.x,tip.y);ctx.moveTo(tip.x-n.x*wing-n.y*wing*.8,tip.y-n.y*wing+n.x*wing*.8);ctx.lineTo(tip.x,tip.y);ctx.lineTo(tip.x-n.x*wing+n.y*wing*.8,tip.y-n.y*wing-n.x*wing*.8);
  ctx.globalAlpha=.50;ctx.strokeStyle='#283425';ctx.lineWidth=3/metrics.scale;ctx.stroke();ctx.globalAlpha=.85;ctx.strokeStyle='#fff3d3';ctx.lineWidth=1.25/metrics.scale;ctx.stroke();ctx.restore();
 }
 function attackWarning(s,w,safe){
  if(!['windup','attack'].includes(s?.state))return;const shape=warningGeometry(s.warning);if(!shape)return;
  const attack=s.state==='attack',a=point(shape.start.x,shape.start.y),b=point(shape.end.x,shape.end.y);
  {
   // A dedicated high-contrast banner stays away from food/destination labels and the actual strike.
   const x=(safe.left+safe.right)/2,top=safe.top+22/metrics.scale,bottom=safe.bottom-22/metrics.scale;
   const warningTop=Math.min(a.y,b.y)-shape.r*Y,warningBottom=Math.max(a.y,b.y)+shape.r*Y;
   const y=warningTop>top+27/metrics.scale?top:warningBottom<bottom-27/metrics.scale?bottom:Math.abs(top-(a.y+b.y)/2)>Math.abs(bottom-(a.y+b.y)/2)?top:bottom;
   const badgeWidth=190/metrics.scale,badgeHeight=35/metrics.scale,signal=predatorSignal(w);
   ctx.fillStyle='#162a24f5';ctx.fillRect(x-badgeWidth/2,y-badgeHeight/2,badgeWidth,badgeHeight);ctx.strokeStyle='#ffcf76';ctx.lineWidth=2/metrics.scale;ctx.strokeRect(x-badgeWidth/2,y-badgeHeight/2,badgeWidth,badgeHeight);
   text(x,y-2/metrics.scale,signal.label,attack?'#ffd3b3':'#ffe09a',14);
   if(!attack){ctx.fillStyle='#ffcf76';ctx.fillRect(x-badgeWidth/2+2/metrics.scale,y+badgeHeight/2-4/metrics.scale,(badgeWidth-4/metrics.scale)*signal.progress,2/metrics.scale);}
  }
 }
 function predatorFrog(s,w){
  const p=point(s.x,s.y);shadow(s);if(art)art.frog(ctx,{...s,state:s.state==='attack'?'eating':'idle',stateTime:GAME_EAT.contact,tongue:{suppress:true},pose:null,facing:s.facing??(s.face?.x<0?-1:1)},p);else ellipse(p.x,p.y-20,35,20,'#a2b975');
  if(s.state==='attack'&&s.warning){
   const start=s.warning.start,end=s.warning.end,progress=clamp(s.attackProgress??0,0,1),a=point(start.x,start.y),b=point(start.x+(end.x-start.x)*progress,start.y+(end.y-start.y)*progress);
   const dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy)||1,r=s.warning.r??s.warning.radius??13,n={x:-dy/length*r,y:dx/length*r*Y};
   // Same approved ribbon. Its visible sweep and projected width match the current attack segment.
   if(progress>0){ctx.save();ctx.transform((b.x-a.x)/512,(b.y-a.y)/512,n.x*2/128,n.y*2/128,a.x-n.x,a.y-n.y);
    if(assets?.tongue)ctx.drawImage(assets.tongue,0,0,512,128);else{ctx.fillStyle='#e58c88';ctx.fillRect(0,0,512,128);}ctx.restore();}

  }
 }
 function targetMarker(target,w){
  if(!target)return;const p=point(target.x,target.y,target.z??0),grass=w.role==='grasshopper';
  const rx=grass?(target.r??24)+5:33,ry=grass?rx*Y:13;
  if(!w.prototype||!grass)ellipse(p.x,p.y,rx,ry,null,'#fff4a8');
  else{ctx.strokeStyle='#fff1a5';ctx.lineWidth=2/metrics.scale;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(p.x+side*(rx-7),p.y-6);ctx.lineTo(p.x+side*rx,p.y-6);ctx.lineTo(p.x+side*rx,p.y+6);ctx.stroke();}}
  const bonus=!w.prototype&&w.player.eaten>=w.quota&&w.player.eaten<w.quota+2;
  text(p.x,p.y-ry-15/metrics.scale,bonus?'선택 +1':grass?(w.prototype?'먹기 한 번!':'먹기 유지'):'먹기 한 번!',bonus?'#ffdd8f':'#fff7c5');
  if(grass&&w.player.grazeProgress>0){ctx.beginPath();ctx.ellipse(p.x,p.y,rx+4,ry+4,0,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(w.player.grazeProgress/.9,0,1));ctx.strokeStyle='#fff7b2';ctx.lineWidth=4/metrics.scale;ctx.stroke();}
 }
 function updateEffects(w,dt){
  if(lastWorld!==w){lastWorld=w;lastEaten=w.player.eaten;particles=[];goalBurst=0;}
  if(w.player.eaten>lastEaten){const event=[...(w.events??[])].reverse().find(e=>e.type==='ate'&&e.actor===w.player.id),pos=event?.position??w.player;
   if(!w.settings?.reducedMotion)for(let i=0;i<10;i++)particles.push({x:pos.x,y:pos.y,age:0,angle:i*Math.PI/5,speed:24+(i%3)*11,bonus:lastEaten>=w.quota});
   if(lastEaten<w.quota&&w.player.eaten>=w.quota)goalBurst=.9;lastEaten=w.player.eaten;
  }
  if(!w.paused){const delta=Math.min(.05,Math.max(0,dt||0));particles.forEach(p=>p.age+=delta);particles=particles.filter(p=>p.age<.7);goalBurst=Math.max(0,goalBurst-delta);}
 }
 function drawEffects(w){
  for(const f of particles){const age=f.age,p=point(f.x+Math.cos(f.angle)*f.speed*age,f.y+Math.sin(f.angle)*f.speed*age,18+age*40);ctx.save();ctx.globalAlpha=1-age/.7;ctx.translate(p.x,p.y);ctx.rotate(f.angle+age*2);ctx.fillStyle=f.bonus?'#ffe18a':'#e9f5a8';ctx.fillRect(-3,-1.5,6,3);ctx.restore();}
  if(goalBurst>0){const p=point(w.player.x,w.player.y),u=1-goalBurst/.9;ellipse(p.x,p.y,45+u*60,(45+u*60)*Y,null,`rgba(255,238,142,${1-u})`);text(p.x,p.y-92-u*20,w.prototype?'한입 성공!':'목표 완료!','#ffe99a',16);}
 }
 function render(w,dt=0){
  if(w.story){metrics=storyViewportMetrics(metrics.width,metrics.height,metrics.dpr);width=metrics.logicalWidth;height=metrics.logicalHeight;}
  const {view,scale,dpr}=metrics;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#142d26';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.beginPath();ctx.rect(view.x,view.y,view.width,view.height);ctx.clip();ctx.translate(view.x,view.y);ctx.scale(scale,scale);
  const target=cameraTarget(w.player,{width,height:height/Y},w);if(!initialized||lastWorld!==w){Object.assign(camera,target);initialized=true;}else smoothCamera(camera,target,dt);
  camera.x=w.width<=width?w.width/2:clamp(camera.x,width/2,w.width-width/2);camera.y=w.height<=height/Y?w.height/2:clamp(camera.y,height/Y/2,w.height-height/Y/2);
  w.visibleBounds=computeVisibleBounds(metrics,camera,occlusions());const safe=safeLogical(w.visibleBounds);
  if(assets?.ground){const origin=point(0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(assets.ground,origin.x,origin.y,w.width,w.height*Y);}else{ctx.fillStyle='#5b7555';ctx.fillRect(0,0,width,height);}
  if(w.navigation?.meadow){polygon(w.navigation.worldMeadow??w.navigation.meadow,!w.navigation.worldMeadow);ctx.strokeStyle='#e8d99388';ctx.lineWidth=1.2/scale;ctx.setLineDash([5/scale,8/scale]);ctx.stroke();ctx.setLineDash([]);}
  if(w.story)for(const zone of w.mownAreas??[]){const at=point(zone.x,zone.y);ellipse(at.x,at.y,zone.rx,zone.ry*Y,'#aeac6555');for(let i=0;i<28;i++){const a=i*2.39996,r=Math.sqrt((i+1)/28);const x=at.x+Math.cos(a)*zone.rx*r,y=at.y+Math.sin(a)*zone.ry*Y*r;line({x:x-5,y:y+1},{x:x+4,y:y-2},'#babb7caa',1.8);}if(!['windup','attack'].includes(w.predator?.state)&&at.y>30/scale&&at.y<height-30/scale)text(at.x,at.y,'풀이 베어진 자리','#e5e4b5',12);}
  for(const c of w.cover??[]){const p=point(c.x,c.y);
   if(w.prototype&&assets?.coverGrass){const size=c.r*2.15;ctx.drawImage(assets.coverGrass,p.x-size/2,p.y-size*.84,size,size);}else ellipse(p.x,p.y,c.r,c.r*Y,'#173b2222','#bed08070');
   const nearest=[...(w.cover??[])].sort((a,b)=>Math.hypot(a.x-w.player.x,a.y-w.player.y)-Math.hypot(b.x-w.player.x,b.y-w.player.y))[0];
   if(w.prototype&&c.id===nearest?.id&&Math.hypot(w.predator.x-w.player.x,w.predator.y-w.player.y)>=300)text(p.x,p.y-c.r*1.65,'키 큰 풀 = 숨는 곳','#dceab0',11);else if(debug)text(p.x,p.y,'은폐');}

  for(const c of w.removedCover??[]){const p=point(c.x,c.y);ctx.setLineDash([5/scale,5/scale]);ellipse(p.x,p.y,c.r,c.r*Y,'#b2975022','#d1b88488');ctx.setLineDash([]);if(!w.story)text(p.x,p.y,w.story?'없어진 풀숲':'줄어든 은신처','#e6d5a4');}
  const p=w.player,food=selectFoodTarget(w),selected=food?.target??food;
  for(const g of w.grass??[])grassPatch(g,w,selected);
  if(w.prototype&&(w.story||!w.fed)&&Math.hypot(w.predator.x-w.player.x,w.predator.y-w.player.y)>=300)for(const sign of w.routeChoices??[]){const q=point(sign.x,sign.y);ctx.fillStyle='#183825cc';ctx.fillRect(q.x-86,q.y-12,172,24);text(q.x,q.y,sign.label,'#f3e2a5',11);}

  if(w.story&&w.plannedRoute?.length&&w.stage===3){ctx.save();ctx.strokeStyle='#e3dcad99';ctx.lineWidth=2/scale;ctx.setLineDash([4/scale,8/scale]);ctx.beginPath();w.plannedRoute.forEach((v,i)=>{const q=point(v.x,v.y);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.stroke();ctx.restore();}
  const warningActive=['windup','attack'].includes(w.predator?.state)&&Boolean(w.predator.warning);
  destination(w,warningActive?{...safe,top:safe.top+48/scale,bottom:safe.bottom-38/scale}:safe);
  attackGroundCue(w.predator,w);
  if(w.prototype){const a=point(p.x,p.y);ellipse(a.x,a.y,p.r+9,(p.r+9)*Y,'#effff022');}
  const objects=sortVisibleActors([...(w.prey??[]).filter(q=>q.alive&&!q.captured&&!q.storyHidden),...(w.predator&&(w.story||!w.predator.disabled)?[w.predator]:[]),p],p);
  for(const o of objects){const at=point(o.x,o.y),player=o===p;
   const fading=player&&w.storyHideAmount>0;if(fading){ctx.save();ctx.globalAlpha=1-w.storyHideAmount*.93;}
   if(o.role==='frog'){
    if(!player)predatorFrog(o,w);else{shadow(o);if(art)art.frog(ctx,o,at);else ellipse(at.x,at.y-20-(o.z??0),35,20,'#a2b975');}
   }else if(o.role==='grasshopper'){
    shadow(o,true);if(art)art.prey(ctx,at.x,at.y,player?{...o,isPlayer:true}:o);else ellipse(at.x,at.y-(o.z??0),24,9,'#c6cf85');
   }else if(o.role==='caterpillar'){
    shadow(o,true);if(art)art.caterpillar(ctx,at.x,at.y,o);else ellipse(at.x,at.y,22,8,'#bfd073');
   }else if(o.role==='duck'){
    shadow(o);if(assets?.duck){const dw=165,dh=dw*347/512,anchor={x:.5237430168,y:.9845360825};ctx.save();ctx.translate(at.x,at.y);ctx.scale(o.facing??1,1);const tilt=o.state==='windup'?-.10:o.state==='attack'?.16:0;ctx.rotate(tilt);const bob=['approach','patrol'].includes(o.state)?Math.sin(w.time*9)*1.8:0;ctx.drawImage(assets.duck,-dw*anchor.x,-dh*anchor.y+bob,dw,dh);ctx.restore();}
   }else if(o.role==='snake'){
    if(snakeArt)snakeArt.draw(ctx,o,point);else ellipse(at.x,at.y-8,18,9,'#7e823e');
   }
   if(fading)ctx.restore();
   if(player&&w.prototype&&!w.storyHideAmount){const above=at.y-(o.z??0)-(o.role==='grasshopper'?24:99);ctx.fillStyle='#edfff0';ctx.strokeStyle='#193729';ctx.lineWidth=1.5/scale;ctx.beginPath();ctx.moveTo(at.x-5/scale,above-9/scale);ctx.lineTo(at.x+5/scale,above-9/scale);ctx.lineTo(at.x,above-2/scale);ctx.closePath();ctx.fill();ctx.stroke();}
   if(player&&w.prototype&&!w.storyHideAmount&&w.time<6&&!['windup','attack'].includes(w.predator?.state)){const lx=clamp(at.x+(o.role==='grasshopper'?72:100)/scale,safe.left+48/scale,safe.right-48/scale),ly=clamp(at.y-18/scale,safe.top+14/scale,safe.bottom-14/scale);ctx.fillStyle='#153524e8';ctx.fillRect(lx-46/scale,ly-10/scale,92/scale,20/scale);text(lx,ly,o.role==='grasshopper'?'나 · 메뚜기':'나 · 개구리','#f4ffe4',12);}
   if(player&&w.immuneUntil>w.time){ctx.setLineDash([5/scale,5/scale]);ellipse(at.x,at.y,o.r+8,(o.r+8)*Y,null,'#a9e6e6');ctx.setLineDash([]);}
   if(player&&o.feedback&&(!w.story||!['windup','attack'].includes(w.predator?.state)))text(at.x,at.y+55/scale,o.feedback.text);
  }
  // The verbal warning remains above creatures; its ground cue stays beneath them.
  if(w.prototype){const signal=predatorSignal(w);if(['approach','recover'].includes(signal.kind)){const q=point(w.predator.x,w.predator.y),x=clamp(q.x,safe.left+65/scale,safe.right-65/scale),y=clamp(q.y-70,safe.top+17/scale,safe.bottom-18/scale);text(x,y,signal.label,signal.kind==='approach'?'#ffe09a':'#def0c8',12);}}
  attackWarning(w.predator,w,safe);
  if(!warningActive&&!['jumping','eating'].includes(p.state))targetMarker(selected,w);
  updateEffects(w,dt);drawEffects(w);
  if(w.story){
   const mw=102/scale,mh=65/scale,mx=safe.left+10/scale,my=safe.top+9/scale;ctx.save();ctx.globalAlpha=.9;ctx.fillStyle='#173427';ctx.fillRect(mx,my,mw,mh);ctx.strokeStyle='#aec696';ctx.lineWidth=1/scale;ctx.strokeRect(mx,my,mw,mh);if(assets?.ground)ctx.drawImage(assets.ground,mx,my,mw,mh);const mini=q=>({x:mx+q.x/w.width*mw,y:my+q.y/w.height*mh});for(const c of w.cover){const at=mini(c);ellipse(at.x,at.y,2/scale,2/scale,'#95d394');}const goal=mini(w.goalDestination),current=mini(w.destination),me=mini(w.player);ctx.fillStyle='#ffe17f';ctx.beginPath();ctx.moveTo(goal.x,goal.y-5/scale);ctx.lineTo(goal.x+5/scale,goal.y);ctx.lineTo(goal.x,goal.y+5/scale);ctx.lineTo(goal.x-5/scale,goal.y);ctx.closePath();ctx.fill();ellipse(current.x,current.y,5/scale,5/scale,null,'#fff8b7');ellipse(me.x,me.y,3/scale,3/scale,'#fff','#1e4739');text(mx+mw/2,my+mh+9/scale,'● 나  ◇ 마지막 목적지','#e9edce',10);ctx.restore();}
  // The DOM action button uses this same authoritative value; no independent visual cooldown.
  w.presentationJump=getJumpReadiness(w);
  if(debug){ctx.lineWidth=1.5/scale;for(const o of [...(w.prey??[]).filter(q=>q.alive&&!q.captured&&!q.storyHidden),p,...(w.predator?[w.predator]:[])]){const q=point(o.x,o.y);ellipse(q.x,q.y,o.r,o.r*Y,null,'#ffd26e');}for(const r of w.rocks??[]){if(r.polygon)polygon(r.polygon);else{const q=point(r.x,r.y);ctx.beginPath();ctx.ellipse(q.x,q.y,r.rx??r.r,(r.ry??r.r)*Y,0,0,Math.PI*2);}ctx.strokeStyle='#eb775b';ctx.stroke();}if(w.navigation?.water){polygon(w.navigation.worldWater??w.navigation.water,!w.navigation.worldWater);ctx.strokeStyle='#4bdeff';ctx.stroke();}if(p.state==='eating'&&p.role==='frog'){const t=playerTongueGeometry(p),a=point(t.mouth.x,t.mouth.y),b=point(t.tip.x,t.tip.y);line(a,b,'#ff80ad');ellipse(b.x,b.y,2,2,'#fff');}polygon([[w.visibleBounds.left,w.visibleBounds.top],[w.visibleBounds.right,w.visibleBounds.top],[w.visibleBounds.right,w.visibleBounds.bottom],[w.visibleBounds.left,w.visibleBounds.bottom]]);ctx.strokeStyle='#80ffff';ctx.stroke();}
  if(w.paused||w.status!=='playing'){ctx.fillStyle='#10281f3b';ctx.fillRect(0,0,width,height);}ctx.restore();
 }
 return{render,resize,setAssets(value){assets=value;art=createCreatureRenderer(value);snakeArt=value.snake?createSnakeRenderer(value.snake,{headImage:value.snakeHead}):null;},setOcclusions:rects=>manualOcclusions=rects?rects.map(screenRect):null,setDebug:value=>debug=value,resetCamera:()=>initialized=false,toWorld:(x,y)=>isInsideView(x,y,metrics)?screenToGround(x,y,camera,metrics):null,camera,getMetrics:()=>({...metrics})};
}
