/** Approved source poses, one owner for source displacement and visual lift. */
import {createRig,LARGE_PREVIEW_OPTIONS,evaluateHop} from './vendor/full-motion/full-rig.mjs';
import {createBigLeapV03} from './vendor/big-leap-proof/v03/big-leap-v03.mjs';
import {MOUTH} from './vendor/tongue-v10.mjs';
import {evaluateGameTongue,GAME_EAT} from './tongue-gameplay.js';
import {registration} from './frog-registration.js';
export const ART=Object.freeze({scale:.16,pivot:{x:650,y:808},groundY:.62,preyScale:.0459,preyPivot:{x:836,y:489},preyRadiusX:23.97,preyRadiusY:8.67});
const common={joints:registration.$jointOverrides,registrations:registration};
export const RIGS=Object.freeze({short:createRig({...LARGE_PREVIEW_OPTIONS,...common}),big:createBigLeapV03(common)});
export const EAT_DURATION=GAME_EAT.duration;
export const hopPose=(kind,time)=>evaluateHop(time,{rig:RIGS[kind]??RIGS.big,loop:false});
export const restPose=hopPose('short',0);
export function facing(player){return player.facing??(player.face.x<0?-1:1);}
export function sourceToGround(player,source){return{x:player.x+facing(player)*(source[0]-ART.pivot.x)*ART.scale,y:player.y+(source[1]-ART.pivot.y)*ART.scale/ART.groundY};}
export function tonguePose(player,time=player.stateTime){return evaluateGameTongue(time,player.tongue?.capture);}
export function tongueGeometry(player,time=player.stateTime){const p=tonguePose(player,time),move=p.bundleTranslation,mouth=sourceToGround(player,[MOUTH.center[0]+move[0],MOUTH.center[1]+move[1]]),tip=sourceToGround(player,p.tipWorld);return{pose:p,mouth,tip,visible:p.reach>0&&((p.tipLocal[0]-MOUTH.center[0])*Math.cos(-.5)+(p.tipLocal[1]-MOUTH.center[1])*Math.sin(-.5)>-10)};}
export function targetPoint(player){return sourceToGround(player,evaluateGameTongue(GAME_EAT.contact).target);}
