/** Approved source poses, one owner for source displacement and visual lift. */
import {createRig,LARGE_PREVIEW_OPTIONS,evaluateHop} from './vendor/full-motion/full-rig.mjs';
import {createBigLeapV03} from './vendor/big-leap-proof/v03/big-leap-v03.mjs';
import {MOUTH,TONGUE} from './vendor/tongue-v10.mjs';
import {evaluateGameTongue,GAME_EAT} from './tongue-gameplay.js';
import {registration} from './frog-registration.js';
export const ART=Object.freeze({scale:.1296,pivot:{x:650,y:808},groundY:.62,preyScale:.0459,preyPivot:{x:836,y:489},preyRadiusX:23.97,preyRadiusY:8.67});
const common={joints:registration.$jointOverrides,registrations:registration};
export const RIGS=Object.freeze({short:createRig({...LARGE_PREVIEW_OPTIONS,...common}),big:createBigLeapV03(common)});
export const EAT_DURATION=GAME_EAT.duration;
export const hopPose=(kind,time)=>evaluateHop(time,{rig:RIGS[kind]??RIGS.big,loop:false});
export const restPose=hopPose('short',0);
export function facing(player){return player.facing??(player.face.x<0?-1:1);}
export function verticalFacing(p){return Math.abs(p.face?.y??0)>.38;}
// Eight heading sectors keep keyboard and touch directions identical; no turn delay.
export function aimPlayer(p,dir){
 const n=Math.hypot(dir?.x??0,dir?.y??0);if(n<.1)return;
 const a=Math.round(Math.atan2(dir.y,dir.x)/(Math.PI/4))*Math.PI/4;
 p.face={x:Math.abs(Math.cos(a))<1e-8?0:Math.cos(a),y:Math.abs(Math.sin(a))<1e-8?0:Math.sin(a)};
 if(Math.abs(p.face.x)>.1)p.facing=Math.sign(p.face.x);
}
export function verticalArt(p){const north=p.face.y<0;return{north,scale:ART.scale/.144*.25,lift:48,pivot:[313,north?280:315],mouthY:north?40:400,angle:north?Math.atan2(p.face.x,-p.face.y*ART.groundY):Math.atan2(-p.face.x,p.face.y*ART.groundY)};}
export function sourceToGround(player,source){
 if(verticalFacing(player)){
  const a=verticalArt(player),u=[Math.cos(TONGUE.angle),Math.sin(TONGUE.angle)],dx=source[0]-MOUTH.center[0],dy=source[1]-MOUTH.center[1],forward=(dx*u[0]+dy*u[1])*ART.scale,lateral=(-dx*u[1]+dy*u[0])*ART.scale;
  const d=player.face,screenLength=Math.hypot(d.x,d.y*ART.groundY),reach=Math.abs(a.mouthY-a.pivot[1])*a.scale/screenLength+forward;
  return{x:player.x+d.x*reach-d.y*lateral,y:player.y+d.y*reach+d.x*lateral-a.lift/ART.groundY};
 }
 return{x:player.x+facing(player)*(source[0]-ART.pivot.x)*ART.scale,y:player.y+(source[1]-ART.pivot.y)*ART.scale/ART.groundY};}
export function tonguePose(player,time=player.stateTime){return evaluateGameTongue(time,player.tongue?.capture);}
export function tongueGeometry(player,time=player.stateTime){const p=tonguePose(player,time),move=p.bundleTranslation,mouth=sourceToGround(player,[MOUTH.center[0]+move[0],MOUTH.center[1]+move[1]]),tip=sourceToGround(player,p.tipWorld);return{pose:p,mouth,tip,visible:p.reach>0&&((p.tipLocal[0]-MOUTH.center[0])*Math.cos(-.5)+(p.tipLocal[1]-MOUTH.center[1])*Math.sin(-.5)>-10)};}
export function targetPoint(player){return sourceToGround(player,evaluateGameTongue(GAME_EAT.contact).target);}
