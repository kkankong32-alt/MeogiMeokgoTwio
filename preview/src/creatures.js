/** Canvas adapter. Every approved raster is transformed once. No whole-face deformation. */
import {composeRasterTransform} from './vendor/full-motion/full-rig.mjs';
import {MOUTH,TONGUE,PREY} from './vendor/tongue-v10.mjs';
import {registration,atlasManifest} from './frog-registration.js';
import {ART,facing,restPose,tonguePose} from './motion.js';
import {GAME_EAT} from './tongue-gameplay.js';
import {evaluateGrasshopper,createGrasshopperRenderer,HOP} from './fauna/grasshopper-rig.mjs';
import {preyDrawOptions} from './fauna/prey-behavior.mjs';
/** The world owns height. The rig replaces its authored lift rather than adding it. */
export function grasshopperDrawState(q){
 if(!q?.isPlayer&&!q?.playerControlled)return preyDrawOptions(q??{});
 const jumping=q.state==='jumping',moving=q.state==='moving';
 const duration=q.jumpDuration||1.62;
 return{time:jumping?Math.min(HOP.duration,Math.max(0,q.stateTime)/duration*HOP.duration):moving?HOP.hold+HOP.anticipate+HOP.push+HOP.flight*.5:0,idleTime:q.stateTime??0,facing:q.facing??q.face?.x??1,worldLift:q.z??0,isHopping:jumping||moving};
}
export function createCreatureRenderer(assets){
 let mask=null,layer=null;const grasshopper=createGrasshopperRenderer(assets.prey,{makeCanvas:assets.makeCanvas});
 const sourcePart=(c,id,matrix)=>{const p=atlasManifest.parts[id],f=p.frame;c.save();c.transform(...matrix);c.drawImage(assets.atlas,f.x,f.y,f.width,f.height,p.cropX,p.cropY,f.width,f.height);c.restore();};
 const mouth=(c,reveal)=>c.ellipse(...MOUTH.center,MOUTH.rx*reveal,MOUTH.ry*reveal,MOUTH.angle,0,Math.PI*2);
 function forward(c,m=null){
  const u=[Math.cos(TONGUE.angle),Math.sin(TONGUE.angle)],v=[-u[1],u[0]],C=[MOUTH.center[0]-u[0]*10,MOUTH.center[1]-u[1]*10];
  const points=[[C[0]+v[0]*300,C[1]+v[1]*300],[C[0]-v[0]*300,C[1]-v[1]*300],[C[0]-v[0]*300+u[0]*650,C[1]-v[1]*300+u[1]*650],[C[0]+v[0]*300+u[0]*650,C[1]+v[1]*300+u[1]*650]];
  c.beginPath();points.forEach(([x,y],i)=>{const p=m?[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]:[x,y];i?c.lineTo(...p):c.moveTo(...p);});c.closePath();c.clip();
 }
 function prepare(){if(mask)return;mask=assets.makeCanvas(80,70);const c=mask.getContext('2d');c.translate(-1040,-540);sourcePart(c,'body-head',registration['body-head'].baseTransform);layer=assets.makeCanvas(80,70);}
 function cavity(c,reveal){prepare();const x=layer.getContext('2d');x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,80,70);x.globalCompositeOperation='source-over';x.save();x.translate(-1040,-540);x.beginPath();mouth(x,reveal);x.clip();x.translate(...MOUTH.center);x.scale(.4,.4);x.translate(-820,-700);x.drawImage(assets.cavity,0,0);x.restore();x.globalCompositeOperation='destination-in';x.drawImage(mask,0,0);x.globalCompositeOperation='source-over';c.drawImage(layer,1040,540);}
 function prey(c,x,y,q=null,{scale=ART.preyScale,flip=1,carried=false}={}){if(q?.role==='caterpillar'){caterpillar(c,x,y,q,{scale:scale/ART.preyScale,flip,lift:carried?0:q.z??0});return;}const o=q?grasshopperDrawState(q):{time:0,idleTime:0,facing:1,worldLift:0,isHopping:false};const pose=evaluateGrasshopper(o.isHopping?o.time:o.idleTime,{mode:o.isHopping?'hop':'idle'});grasshopper.draw(c,pose,{x,y,scale,facing:o.facing*flip,worldLift:carried?0:o.worldLift});}
 function caterpillar(c,x,y,q={}, {scale=1,flip=1,lift=q.z??0}={}){
  c.save();c.translate(x,y-lift);c.scale(scale*(q.facing??1)*flip,scale);
  const phase=q.phase??0;
  if(assets.caterpillar){
   const width=64,height=528/1856*width,bob=q.state==='foraging'?Math.sin(phase*5)*.6:0;
   // Preserve the generated cutout's aspect ratio and centered foot anchor.
   c.drawImage(assets.caterpillar,-width/2,-height*.9867+bob,width,height);
  }else{c.fillStyle='#aab865';c.beginPath();c.ellipse(0,-7,25,8,0,0,Math.PI*2);c.fill();}
  c.restore();
 }
 function frog(c,p,ground){
  c.save();c.translate(ground.x,ground.y);c.scale(ART.scale*facing(p),ART.scale);c.translate(-ART.pivot.x,-ART.pivot.y);
  if(p.state==='eating'){
   const t=tonguePose(p);c.translate(...t.bundleTranslation);
   if(t.reveal>0)cavity(c,t.reveal);
   if(t.reach>0&&!p.tongue?.suppress){c.save();if(p.tongue?.aim?.matrix)c.transform(...p.tongue.aim.matrix);forward(c);c.transform(...t.tongueMatrix);for(let x=0;x<512;x+=4){const m=t.tongueMatrix,wx=m[0]*x+m[2]*64+m[4],wy=m[1]*x+m[3]*64+m[5],along=(wx-MOUTH.center[0])*Math.cos(TONGUE.angle)+(wy-MOUTH.center[1])*Math.sin(TONGUE.angle),taper=.33+.67*Math.min(1,Math.max(0,along/74));c.drawImage(assets.tongue,x,0,Math.min(5,512-x),128,x,64-64*taper,Math.min(5,512-x),128*taper);}c.restore();}
   if(p.tongue?.caught&&t.time<GAME_EAT.commit){
    c.save();const m=p.tongue.aim?.matrix,x=t.tipLocal[0]+(p.tongue.capture?.offset[0]??0),y=t.tipLocal[1]+(p.tongue.capture?.offset[1]??0);forward(c,m);
    // Aim moves the carried animal's anchor; it must never stretch the approved 1.7× silhouette.
    const at=m?[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]:[x,y];
    prey(c,at[0],at[1],p.tongue.preySnapshot,{scale:ART.preyScale/ART.scale,flip:facing(p),carried:true});c.restore();
   }
   for(const id of registration.$drawOrder){c.save();if(id==='body-head'&&t.reveal>0){c.beginPath();c.rect(0,0,1600,1254);mouth(c,t.reveal);c.clip('evenodd');}sourcePart(c,id,registration[id].baseTransform);c.restore();}
  }else{
   const pose=p.pose??restPose;
   // Ground p.x already owns approved root travel. Remove exactly that from the pose.
   c.translate(-pose.root.travel,0);
   for(const id of pose.drawOrder)sourcePart(c,id,composeRasterTransform(pose.parts[id]));
  }
  c.restore();
 }
 return{frog,prey,caterpillar};
}
