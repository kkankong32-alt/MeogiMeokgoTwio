/** Game-scale adapter: the approved raster/face stay fixed; readability is explicit. */
import {MOUTH,TONGUE,smooth} from './vendor/tongue-v10.mjs';
export const GAME_EAT=Object.freeze({duration:1.26,extend:.22,contact:.43,hold:.64,retract:.98,commit:1.04,length:1.24,thickness:3});
export function evaluateGameTongue(time,capture=null){
 const t=Math.max(0,Math.min(GAME_EAT.duration,time)),u=[Math.cos(TONGUE.angle),Math.sin(TONGUE.angle)];
 let reach=0,reveal=0,phase='ready';
 if(t>=.10&&t<GAME_EAT.extend)phase='anticipation';
 if(t>=GAME_EAT.extend&&t<GAME_EAT.contact){reach=smooth((t-GAME_EAT.extend)/(GAME_EAT.contact-GAME_EAT.extend));phase='snap';}
 else if(t>=GAME_EAT.contact&&t<GAME_EAT.hold){reach=1;phase='catch';}
 else if(t>=GAME_EAT.hold&&t<GAME_EAT.retract){reach=1-smooth((t-GAME_EAT.hold)/(GAME_EAT.retract-GAME_EAT.hold));phase='carry back';}
 else if(t>=GAME_EAT.retract)phase='settle';
 if(capture&&t>=capture.time){if(t<GAME_EAT.hold)reach=capture.reach;else if(t<GAME_EAT.retract)reach=capture.reach*(1-smooth((t-GAME_EAT.hold)/(GAME_EAT.retract-GAME_EAT.hold)));}
 if(t>=GAME_EAT.extend&&t<.29)reveal=smooth((t-GAME_EAT.extend)/.07);else if(t>=.29&&t<.89)reveal=1;else if(t>=.89&&t<1.02)reveal=1-smooth((t-.89)/.13);
 const sx=TONGUE.scaleX*GAME_EAT.length,sy=TONGUE.scaleY*GAME_EAT.thickness;
 const fullRoot=[MOUTH.center[0]-20*u[0],MOUTH.center[1]-20*u[1]],a=sx*u[0],b=sx*u[1],c=-sy*u[1],d=sy*u[0],travel=TONGUE.travel*GAME_EAT.length;
 const root=[fullRoot[0]+u[0]*(reach-1)*travel,fullRoot[1]+u[1]*(reach-1)*travel];
 const tongueMatrix=[a,b,c,d,root[0]-a*32-c*64,root[1]-b*32-d*64];
 const tip=[a*475+c*64+tongueMatrix[4],b*475+d*64+tongueMatrix[5]],target=[fullRoot[0]+a*(475-32),fullRoot[1]+b*(475-32)];
 return{time:t,phase,jawAngle:0,bodyScale:1,bundleTranslation:[0,0],reach,reveal,tongueMatrix,tipLocal:tip,tipWorld:tip,target,preyRotation:.45*smooth((t-GAME_EAT.contact)/.2),catchPulse:t>=GAME_EAT.contact&&t<.8?1-smooth((t-GAME_EAT.contact)/.37):0};
}
