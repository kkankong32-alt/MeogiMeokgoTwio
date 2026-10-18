import {HAWK_PLAY,hawkTarget} from './hawk-player.js';
export function drawHawkFlight(ctx,w,assets,art,point,text){
 const p=w.player,g=point(p.x,p.y),a=point(p.x,p.y,p.z),high=p.z/HAWK_PLAY.height,aim=hawkTarget(w),diving=p.state==='diving';
 ctx.save();ctx.fillStyle=`rgba(12,28,25,${.27-high*.13})`;ctx.beginPath();ctx.ellipse(g.x,g.y,55-high*16,19-high*5,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=aim?'#e8ff70':'#fff4c0';ctx.lineWidth=aim?3:2;ctx.setLineDash(diving?[6,5]:[]);ctx.beginPath();ctx.ellipse(g.x,g.y,HAWK_PLAY.catchRadius+23,(HAWK_PLAY.catchRadius+23)*.62,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
 ctx.beginPath();ctx.moveTo(g.x-8,g.y);ctx.lineTo(g.x+8,g.y);ctx.moveTo(g.x,g.y-8);ctx.lineTo(g.x,g.y+8);ctx.stroke();
 text(g.x,g.y+44,diving?'내려가는 중 · K 취소':p.state==='rising'?'다시 날아올라요':aim?'지금! J 급강하':'지면 원을 먹이에 맞춰요',aim?'#eaff7c':'#fff4c0');
 // Airborne sprite is separate from its ground shadow and catching position.
 const angle=Math.atan2(p.face.y*.62,p.face.x)+Math.PI/2,size=220+high*60,flap=p.state==='boosting'?1+Math.sin(w.time*23)*.035:1+Math.sin(w.time*5)*.012;
 ctx.translate(a.x,a.y);ctx.rotate(angle);ctx.scale(flap,1);const sprite=diving&&assets.hawkDive?assets.hawkDive:assets.hawk;const drawSize=diving?size*.8:size;ctx.drawImage(sprite,-drawSize/2,-drawSize/3,drawSize,drawSize*2/3);ctx.restore();
 if(p.carried){const c=p.carried,u=Math.min(1,(w.time-c.start)/.45);ctx.save();ctx.globalAlpha=1-u*.75;if(c.role==='frog'&&art){ctx.translate(a.x,a.y+24);ctx.scale(.33*(1-u*.3),.33*(1-u*.3));art.frog(ctx,{...c.snapshot,z:0,pose:null},{x:0,y:0});}else ctx.drawImage(assets.snake,a.x-45,a.y+8,90,30);ctx.restore();}
 text(a.x,Math.max(18,a.y-92),'나 · 매','#fff4a8');
}
