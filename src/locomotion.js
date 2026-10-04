/** Ground hops: planted feet never translate. The complete source rig remains rigid. */
import {createRig,evaluateHop} from './vendor/full-motion/full-rig.mjs';
import {registration} from './frog-registration.js';
export const STRIDE=Object.freeze({duration:.50,distance:49,moveStart:.30,moveEnd:.72});
const rig=createRig({joints:registration.$jointOverrides,registrations:registration,duration:STRIDE.duration,
 rootTrack:[[0,0,0,0],[.12,0,16,.4],[.20,0,12,.1],[.30,0,-10,-.8],[.43,0,-108,-1],[.51,0,-124,-.5],[.61,0,-76,.2],[.72,0,-3,.6],[.82,0,12,.7],[.90,0,5,.2],[1,0,0,0]],
 events:{fore:{release:.20,land:.72},hind:{release:.30,land:.90}},
 airClearance:{hind:15,fore:9},
 flight:{hind:{trail:[13,16,12],tuck:[21,38,29]},fore:{trail:[10,13,15],tuck:[19,7,29]}}
});
export function stridePose(time){return evaluateHop(time,{rig,loop:false});}
export function strideProgress(time){const t=Math.max(0,Math.min(1,(time/STRIDE.duration-STRIDE.moveStart)/(STRIDE.moveEnd-STRIDE.moveStart)));return t*t*(3-2*t);}
export const strideRig=rig;
