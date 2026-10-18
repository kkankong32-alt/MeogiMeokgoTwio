/** Canvas adapter. Every approved raster is transformed once. No whole-face deformation. */
import {composeRasterTransform} from './vendor/full-motion/full-rig.mjs';
import {MOUTH,TONGUE,PREY} from './vendor/tongue-v10.mjs';
import {registration,atlasManifest} from './frog-registration.js';
import {ART,facing,restPose,tonguePose,tongueGeometry,verticalFacing,verticalArt} from './motion.js';
import {GAME_EAT} from './tongue-gameplay.js';
import {evaluateGrasshopper,createGrasshopperRenderer} from './fauna/grasshopper-rig.mjs';
import {preyDrawOptions} from './fauna/prey-behavior.mjs';
export function createCreatureRenderer(assets){
 let mask=null,layer=null;const grasshopper=createGrasshopperRenderer(assets.prey,{makeCanvas:assets.makeCanvas});
 const sourcePart=(c,id,matrix)=>{const p=atlasManifest.parts[id],f=p.frame;c.save();c.transform(...matrix);c.drawImage(assets.atlas,f.x,f.y,f.width,f.height,p.cropX,p.cropY,f.width,f.height);c.restore();};
 const mouth=(c,reveal)=>c.ellipse(...MOUTH.center,MOUTH.rx*reveal,MOUTH.ry*reveal,MOUTH.angle,0,Math.PI*2);
 function forward(c){const u=[Math.cos(TONGUE.angle),Math.sin(TONGUE.angle)],v=[-u[1],u[0]],C=[MOUTH.center[0]-u[0]*10,MOUTH.center[1]-u[1]*10];c.beginPath();c.moveTo(C[0]+v[0]*300,C[1]+v[1]*300);c.lineTo(C[0]-v[0]*300,C[1]-v[1]*300);c.lineTo(C[0]-v[0]*300+u[0]*650,C[1]-v[1]*300+u[1]*650);c.lineTo(C[0]+v[0]*300+u[0]*650,C[1]+v[1]*300+u[1]*650);c.closePath();c.clip();}
 function prepare(){if(mask)return;mask=assets.makeCanvas(80,70);const c=mask.getContext('2d');c.translate(-1040,-540);sourcePart(c,'body-head',registration['body-head'].baseTransform);layer=assets.makeCanvas(80,70);}
 function cavity(c,reveal){prepare();const x=layer.getContext('2d');x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,80,70);x.globalCompositeOperation='source-over';x.save();x.translate(-1040,-540);x.beginPath();mouth(x,reveal);x.clip();x.translate(...MOUTH.center);x.scale(.4,.4);x.translate(-820,-700);x.drawImage(assets.cavity,0,0);x.restore();x.globalCompositeOperation='destination-in';x.drawImage(mask,0,0);x.globalCompositeOperation='source-over';c.drawImage(layer,1040,540);}
 function prey(c,x,y,q=null,{scale=ART.preyScale,flip=1,carried=false}={}){const o=q?preyDrawOptions(q):{time:0,idleTime:0,facing:1,worldLift:0,isHopping:false};const pose=evaluateGrasshopper(o.isHopping?o.time:o.idleTime,{mode:o.isHopping?'hop':'idle'});grasshopper.draw(c,pose,{x,y,scale,facing:o.facing*flip,worldLift:carried?0:o.worldLift});}
 function verticalFrog(c,p,ground){
  const a=verticalArt(p),air=p.state==='jumping'&&p.stateTime>.06&&(p.z??0)>5;
  // Camera lift stays vertical, independent of the ground heading.
  // This artwork already contains camera perspective. Do not flatten it a second time.
  c.save();c.translate(ground.x,ground.y-a.lift-(p.z??0));c.rotate(a.angle);
  // Leap frame body is smaller in the generated sheet: normalize its body, not its toes.
  const scale=a.scale*(air?1.38:1),pivot=air?[313,a.north?190:335]:a.pivot;
  c.filter='brightness(1.42) saturate(1.4) contrast(1.04) hue-rotate(5deg)';
  c.drawImage(assets.frogDirections,a.north?0:627,air?627:0,627,627,-pivot[0]*scale,-pivot[1]*scale,627*scale,627*scale);c.restore();
  if(p.state==='eating'){
   const g=tongueGeometry(p),screen=q=>({x:ground.x+q.x-p.x,y:ground.y+(q.y-p.y)*ART.groundY});
   const m=screen(g.mouth),tip=screen(g.tip);
   if(g.visible){c.save();c.lineCap='round';c.strokeStyle='#9e3249';c.lineWidth=7;c.beginPath();c.moveTo(m.x,m.y);c.lineTo(tip.x,tip.y);c.stroke();c.strokeStyle='#ed8797';c.lineWidth=4;c.stroke();c.restore();}
   if(p.tongue?.caught&&g.pose.time<GAME_EAT.commit){const o=p.tongue.capture.offsetWorld??{x:0,y:0,z:0};prey(c,tip.x+o.x,tip.y+o.y*ART.groundY-o.z,p.tongue.preySnapshot,{carried:true});}
  }
 }
 function frog(c,p,ground){
  if(verticalFacing(p)&&assets.frogDirections){verticalFrog(c,p,ground);return;}
  c.save();c.translate(ground.x,ground.y);c.scale(ART.scale*facing(p),ART.scale);c.translate(-ART.pivot.x,-ART.pivot.y);
  if(p.state==='eating'){
   const t=tonguePose(p);c.translate(...t.bundleTranslation);
   if(t.reveal>0)cavity(c,t.reveal);
   if(t.reach>0){c.save();forward(c);c.transform(...t.tongueMatrix);for(let x=0;x<512;x+=4){const m=t.tongueMatrix,wx=m[0]*x+m[2]*64+m[4],wy=m[1]*x+m[3]*64+m[5],along=(wx-MOUTH.center[0])*Math.cos(TONGUE.angle)+(wy-MOUTH.center[1])*Math.sin(TONGUE.angle),taper=.33+.67*Math.min(1,Math.max(0,along/74));c.drawImage(assets.tongue,x,0,Math.min(5,512-x),128,x,64-64*taper,Math.min(5,512-x),128*taper);}c.restore();}
   if(p.tongue?.caught&&t.time<GAME_EAT.commit){c.save();forward(c);prey(c,t.tipLocal[0]+(p.tongue.capture?.offset[0]??0),t.tipLocal[1]+(p.tongue.capture?.offset[1]??0),p.tongue.preySnapshot,{scale:ART.preyScale/ART.scale,flip:facing(p),carried:true});c.restore();}
   for(const id of registration.$drawOrder){c.save();if(id==='body-head'&&t.reveal>0){c.beginPath();c.rect(0,0,1600,1254);mouth(c,t.reveal);c.clip('evenodd');}sourcePart(c,id,registration[id].baseTransform);c.restore();}
  }else{
   const pose=p.pose??restPose;
   // Ground p.x already owns approved root travel. Remove exactly that from the pose.
   c.translate(-pose.root.travel,pose.root.height-(p.z??0)/ART.scale);
   for(const id of pose.drawOrder)sourcePart(c,id,composeRasterTransform(pose.parts[id]));
  }
  c.restore();
 }
 return{frog,prey};
}
