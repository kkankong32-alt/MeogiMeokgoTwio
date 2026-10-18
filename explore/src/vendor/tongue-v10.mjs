/** v10 longer/thicker fixed-jaw stylized snap-catch. Original body shape is never scaled or deformed. */
export const DURATION=2.0, RATE=25, COUNT=50;
export const MOUTH={center:[1080,574.4],rx:14,ry:4.8,angle:-.50};
export const TONGUE={scaleX:.84,scaleY:1.008,lengthMultiplier:1.5,widthMultiplier:1.8,angle:-.50,sourceRoot:[32,64],sourceTip:[480,62],travel:435};
export const PREY={pivot:[836,489],scale:.045};
const clamp=x=>Math.max(0,Math.min(1,x));export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
function tween(t,a,b,p,q){return p+(q-p)*smooth((t-a)/(b-a));}
export function bundle(t){
 let x=0,y=0;
 if(t>=.10&&t<.28){x=tween(t,.10,.28,0,-4);y=tween(t,.10,.28,0,1);}
 else if(t>=.28&&t<.46){x=tween(t,.28,.46,-4,3);y=tween(t,.28,.46,1,-1);}
 else if(t>=.46&&t<.60){x=tween(t,.46,.60,3,-2);y=tween(t,.46,.60,-1,1);}
 else if(t>=.60&&t<.96){x=tween(t,.60,.96,-2,0);y=tween(t,.60,.96,1,0);}
 return[x,y];
}
export function evaluateSnap(time){
 const t=Math.max(0,Math.min(DURATION,time)),u=[Math.cos(TONGUE.angle),Math.sin(TONGUE.angle)];
 let reach=0,reveal=0,phase='ready';
 if(t>=.10&&t<.30)phase='anticipation';
 if(t>=.30&&t<.46){reach=smooth((t-.30)/.16);phase='snap';}
 else if(t>=.46&&t<.56){reach=1;phase='catch';}
 else if(t>=.56&&t<.84){reach=1-smooth((t-.56)/.28);phase='carry back';}
 else if(t>=.84&&t<1.08)phase='settle';
 if(t>=.30&&t<.35)reveal=smooth((t-.30)/.05);
 else if(t>=.35&&t<.76)reveal=1;
 else if(t>=.76&&t<.80)reveal=1-smooth((t-.76)/.04);
 const fullRoot=[MOUTH.center[0]-20*u[0],MOUTH.center[1]-20*u[1]];
 const a=TONGUE.scaleX*u[0],b=TONGUE.scaleX*u[1],c=-TONGUE.scaleY*u[1],d=TONGUE.scaleY*u[0];
 const shift=(reach-1)*TONGUE.travel;
 const root=[fullRoot[0]+u[0]*shift,fullRoot[1]+u[1]*shift];
 const tongueMatrix=[a,b,c,d,root[0]-a*32-c*64,root[1]-b*32-d*64];
 const tip=[a*480+c*62+tongueMatrix[4],b*480+d*62+tongueMatrix[5]];
 const move=bundle(t),catchMove=bundle(.46);
 const fullTip=[fullRoot[0]+a*(480-32)+c*(62-64),fullRoot[1]+b*(480-32)+d*(62-64)];
 const target=[fullTip[0]+catchMove[0],fullTip[1]+catchMove[1]];
 const caught=t>=.46&&t<.96;
 const preyAlpha=t<.96?1:0;
 const preyRotation=caught?.65*smooth((t-.46)/.12):0;
 const catchPulse=t>=.46&&t<.64?1-smooth((t-.46)/.18):0;
 return{time:t,phase,jawAngle:0,bodyScale:1,bundleTranslation:move,reach,reveal,tongueMatrix,tipLocal:tip,tipWorld:[tip[0]+move[0],tip[1]+move[1]],target,preyCaught:caught,preyAlpha,preyRotation,catchPulse};
}
