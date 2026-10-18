import {drawHawkFlight} from './hawk-render.js';
import {groupSnakeCrossings} from './snake-overlap.js';
import {ARCADE,effectForEvent} from './arcade.js';
import {depthOrder} from './depth.js';
import {clamp,smoothCamera,cameraTarget} from './core.js';
import {GROUND_Y as Y,viewportMetrics,screenToGround,isInsideView} from './viewport.js';
import {ART,targetPoint,tongueGeometry} from './motion.js';
import {createCreatureRenderer} from './creatures.js';
import {createSnakeRenderer,SNAKE} from './fauna/snake-rig.mjs';
export function createRenderer(canvas,{assets=null}={}){const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas 2D is unavailable');const camera={x:620,y:740};let width=800,height=560,metrics=viewportMetrics(width,height),debug=false,art=assets?createCreatureRenderer(assets):null,snakeArt=assets?.snake?createSnakeRenderer(assets.snake,{headImage:assets.snakeHead,biteImage:assets.snakeBite}):null,initialized=false;
 function resize(){const box=canvas.getBoundingClientRect();metrics=viewportMetrics(box.width,box.height,globalThis.devicePixelRatio||1);width=metrics.logicalWidth;height=metrics.logicalHeight;canvas.width=metrics.pixelWidth;canvas.height=metrics.pixelHeight;}
 function point(x,y,z=0){return{x:x-camera.x+width/2,y:(y-camera.y)*Y+height/2-z};}
 function ellipse(x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
 function text(x,y,value,color='#fff4d3'){ctx.font=`600 ${Math.max(11,12/metrics.scale)}px "Noto CJK", system-ui`;ctx.textAlign='center';ctx.lineWidth=3/metrics.scale;ctx.strokeStyle='#183221d9';ctx.strokeText(value,x,y);ctx.fillStyle=color;ctx.fillText(value,x,y);}
 function polygon(poly,image=false){ctx.beginPath();poly.forEach(([x,y],i)=>{const q=point(x,image?y/Y:y);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();}
 function shadow(o){const p=point(o.x,o.y),lift=Math.max(0,o.z??0),s=Math.max(.4,1-lift/250);ellipse(p.x,p.y+3,38.88*s,13.77*s,`rgba(17,41,24,${.24-lift/1000})`);}
 function snake(s,w){const p=point(s.x,s.y),d=['windup','attack'].includes(s.state)?s.locked:s.face;
  if(s.state==='windup'){const end=point(s.x+d.x*ARCADE.attackSpeed*ARCADE.attackSeconds,s.y+d.y*ARCADE.attackSpeed*ARCADE.attackSeconds);ctx.strokeStyle='#ffcd77';ctx.lineWidth=SNAKE.headRadius*2;ctx.globalAlpha=.32;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.globalAlpha=1;ctx.strokeStyle='#ffba63';ctx.lineWidth=2.5;ctx.setLineDash([8,6]);ctx.stroke();ctx.setLineDash([]);text(p.x,p.y-62,'! 뱀 공격 준비','#ffe096');}
 }
 function render(w,dt){const {view,scale,dpr}=metrics;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#142d26';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.beginPath();ctx.rect(view.x,view.y,view.width,view.height);ctx.clip();ctx.translate(view.x,view.y);ctx.scale(scale,scale);
  const target=['grasshopper','snake','hawk'].includes(w.role)?{x:w.player.x+w.player.face.x*32,y:w.player.y-(w.role==='hawk'?100:28)/Y}:cameraTarget(w.player,{width,height:height/Y},w);if(!initialized){Object.assign(camera,target);initialized=true;}else smoothCamera(camera,target,dt);camera.x=w.width<=width?w.width/2:clamp(camera.x,width/2,w.width-width/2);camera.y=w.height<=height/Y?w.height/2:clamp(camera.y,height/Y/2,w.height-height/Y/2);
  if(assets){const origin=point(0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(assets.ground,origin.x,origin.y);}else{ctx.fillStyle='#5b7555';ctx.fillRect(0,0,width,height);text(width/2,height/2,'그림 준비 중');}
  if(w.navigation){polygon(w.navigation.meadow,true);ctx.strokeStyle='#e8d99377';ctx.lineWidth=1.2/scale;ctx.setLineDash([5/scale,8/scale]);ctx.stroke();ctx.setLineDash([]);}
  for(const c of w.cover){const p=point(c.x,c.y);ellipse(p.x,p.y,c.r,c.r*Y,'#173b221c','#9bbc7044');if(debug)text(p.x,p.y,'은폐 구역');}
  const p=w.player,aim=targetPoint(p),g=point(aim.x,aim.y),ready=!['eating','jumping'].includes(p.state)&&p.eatCooldown<=0;
  if(ready&&p.role==='frog'){ctx.strokeStyle='#fff3b4c0';ctx.lineWidth=1.5/scale;ctx.beginPath();ctx.arc(g.x,g.y,6/scale,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff7d9';ctx.fillRect(g.x-1,g.y-1,2,2);}
  // Warning belongs to the ground plane, not on top of the frog's face.
  if(w.predator&&!w.predator.disabled)snake(w.predator,w);
  const pieces=w.role==='snake'&&snakeArt?snakeArt.pieces(w.player,point):w.predator&&!w.predator.disabled&&snakeArt?snakeArt.pieces(w.predator,point):[];for(const s of w.groundSnakes??[])if(s.alive&&snakeArt)pieces.push(...snakeArt.pieces(s,point,{scale:s.renderScale??1}));
  for(const f of w.hunters??[]){if(f.state==='windup'){const a=point(f.x,f.y),g=tongueGeometry(f,.075),b=point(g.tip.x,g.tip.y);ctx.strokeStyle='#ffad53';ctx.lineWidth=6;ctx.setLineDash([10,8]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);text(a.x,a.y-95,'! 혀 공격 준비','#ffe891');}}
  if(w.hawk?.state==='warning'){const h=w.hawk,at=point(h.target.x,h.target.y);ellipse(at.x,at.y,74,74*Y,'#f39b3540','#ffdc6a');text(at.x,at.y-62,'! 매가 내려와요 · 원 밖으로','#fff4b0');}
  const objects=depthOrder(w,groupSnakeCrossings(pieces));
  for(const o of objects){
   if(o.draw){ctx.save();if(p.role!=='snake'&&o.kind==='body'&&o.ground.y>p.y&&Math.hypot(o.ground.x-p.x,(o.ground.y-p.y)*Y)<48)ctx.globalAlpha=.62;o.draw(ctx);ctx.restore();continue;}
   const at=point(o.x,o.y);
   if(o.role==='grass'){const size=o.leaves?150:65;ctx.save();if(!o.leaves)ctx.globalAlpha=.55;else if(o.y>p.y&&Math.hypot(o.x-p.x,(o.y-p.y)*Y)<60)ctx.globalAlpha=.48;if(assets?.grass)ctx.drawImage(assets.grass,at.x-size/2,at.y-size*.56,size,size*2/3);ctx.restore();text(at.x,at.y+22,o.cut?'베어진 풀밭':o.leaves?`잎 ${o.leaves}번`:'다 먹었어요',o.leaves?'#fff5be':'#ded6bb');if(Math.hypot(p.x-o.x,p.y-o.y)<o.r+20&&o.leaves){ellipse(at.x,at.y+2,55,22,'#e4ec6b20','#fff8b0');text(at.x,at.y-72,p.state==='feeding'?'뜯는 중…':'먹기 J · 잎 뜯기');}continue;}
   if(o.role==='frog'){const size=o.renderScale??1;ctx.save();ctx.translate(at.x,at.y);ctx.scale(size,size);ctx.translate(-at.x,-at.y);shadow(o);if(art)art.frog(ctx,o,at);else ellipse(at.x,at.y-20,35,20,'#a2b975');ctx.restore();}
   else if(o.role==='grasshopper'){ellipse(at.x,at.y+8,26,8,'#14302440');if(art)art.prey(ctx,at.x,at.y,o,o===p?{scale:ART.preyScale*1.18}:{});else ellipse(at.x,at.y,9,4,'#c6cf85');if(p.role==='frog'&&ready&&Math.hypot(aim.x-o.x,(aim.y-o.y)*Y)<28)text(at.x,at.y-31,'먹기 J','#fff8b8');}
  }
  if(w.role==='hawk'&&assets?.hawk)drawHawkFlight(ctx,w,assets,art,point,text);
  if(w.hawk&&assets?.hawk){const h=w.hawk,at=point(h.x,h.y,h.z),size=h.state==='warning'?330:285;at.x=clamp(at.x,size/2+8,width-size/2-8);at.y=clamp(at.y,size*.33+8,height-size*.34-8);ctx.save();ctx.globalAlpha=h.state==='patrol'?.80:1;ctx.drawImage(assets.hawk,at.x-size/2,at.y-size*.33,size,size*2/3);ctx.restore();}
  if(p.role==='snake'){const at=point(p.x,p.y);text(at.x,at.y-58,'나 · 뱀','#fff4a8');
 const caught=p.captureVisual;if(caught&&art){const u=clamp((w.time-caught.start)/caught.duration,0,1),f=caught.frog,mouth={x:p.x+p.face.x*25,y:p.y+p.face.y*25},pos=point(f.x+(mouth.x-f.x)*u,f.y+(mouth.y-f.y)*u),size=(f.renderScale??.85)*(1-u*.92);ctx.save();ctx.translate(pos.x,pos.y-18*u);ctx.scale(size,size);ctx.globalAlpha=1-u*u;art.frog(ctx,f,{x:0,y:0});ctx.restore();if(u<.5)ellipse(at.x,at.y-18,34+u*35,22+u*20,'#fff1a520','#fff0a3');}
 }
  if(p.role==='grasshopper'){const at=point(p.x,p.y,p.z??0);text(at.x,at.y-43,'나','#fff4a8');if(p.state==='feeding'){ctx.fillStyle='#173221';ctx.fillRect(at.x-28,at.y-30,56,7);ctx.fillStyle='#e9db6d';ctx.fillRect(at.x-28,at.y-30,56*Math.min(1,p.feedProgress/.65),7);}}
  for(const effect of w.effects??[]){const age=w.time-effect.time,style=effectForEvent(effect);if(!style||age>.60)continue;const at=point(effect.x,effect.y),u=Math.max(0,age/.60);ctx.save();ctx.globalAlpha=1-u;ctx.strokeStyle=style[1];ctx.lineWidth=3/scale;
   ctx.beginPath();ctx.ellipse(at.x,at.y+3,30+u*45,(14+u*20),0,0,Math.PI*2);ctx.stroke();
   if(effect.type==='ate'||effect.type==='near-miss')for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(at.x+Math.cos(a)*(32+u*35),at.y-28+Math.sin(a)*(22+u*25));ctx.lineTo(at.x+Math.cos(a)*(40+u*42),at.y-28+Math.sin(a)*(30+u*32));ctx.stroke();}
   if(effect.type==='eat-missed'||effect.type==='predator-missed'){ctx.beginPath();ctx.moveTo(at.x-9,at.y-30);ctx.lineTo(at.x+9,at.y-12);ctx.moveTo(at.x+9,at.y-30);ctx.lineTo(at.x-9,at.y-12);ctx.stroke();}
   text(at.x,at.y-75-u*20,style[0],style[1]);ctx.restore();
  }
  if(debug){ctx.lineWidth=1.5/scale;for(const o of [...w.prey.filter(q=>q.alive&&!q.captured),p,...(w.predator?[w.predator]:[])]){const q=point(o.x,o.y);ctx.beginPath();ctx.ellipse(q.x,q.y,o.r,o.r*Y,0,0,Math.PI*2);ctx.strokeStyle='#ffd26e';ctx.stroke();}for(const r of w.rocks){if(r.polygon)polygon(r.polygon);else{const q=point(r.x,r.y);ctx.beginPath();ctx.ellipse(q.x,q.y,r.rx??r.r,(r.ry??r.r)*Y,0,0,Math.PI*2);}ctx.strokeStyle='#eb775b';ctx.stroke();}if(w.navigation?.water){polygon(w.navigation.water,true);ctx.strokeStyle='#4bdeff';ctx.stroke();}if(p.state==='eating'){const t=tongueGeometry(p),a=point(t.mouth.x,t.mouth.y),b=point(t.tip.x,t.tip.y);ctx.strokeStyle='#ff80ad';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ellipse(b.x,b.y,2,2,'#fff');}}
  if(w.paused||w.status!=='playing'){ctx.fillStyle='#10281f50';ctx.fillRect(0,0,width,height);}ctx.restore();
 }
 return{render,resize,setAssets(value){assets=value;art=createCreatureRenderer(value);snakeArt=value.snake?createSnakeRenderer(value.snake,{headImage:value.snakeHead,biteImage:value.snakeBite}):null;},setDebug:value=>debug=value,resetCamera:()=>initialized=false,toWorld:(x,y)=>isInsideView(x,y,metrics)?screenToGround(x,y,camera,metrics):null,camera,getMetrics:()=>({...metrics})};
}
