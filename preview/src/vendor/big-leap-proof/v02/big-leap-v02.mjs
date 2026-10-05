/** Exaggerated game leap; preserves v01 and the shared evaluator unchanged. */
import { createRig } from '../../full-motion/full-rig.mjs';
export const BIG_LEAP_V02_OPTIONS = {
  duration: 1.62,
  rootTrack: [
    [0,0,0,0], [.12,0,42,1], [.18,0,36,.4],
    [.30,60,-50,-3], [.40,240,-620,-5], [.50,450,-840,-3],
    [.58,615,-760,-1], [.68,840,-380,1], [.78,1029,-7,2],
    [.85,1040,32,1.5], [.94,1040,9,.5], [1,1040,0,0],
  ],
  events: { fore:{release:.18,land:.78}, hind:{release:.30,land:.94} },
  phases: [
    {name:'deep-preload',start:0,end:.18}, {name:'planted-hind-push',start:.18,end:.30},
    {name:'rearward-unfold',start:.30,end:.4152}, {name:'full-extension-hold',start:.4152,end:.6072},
    {name:'tuck-before-landing',start:.6072,end:.748}, {name:'fore-reach',start:.748,end:.78},
    {name:'landing-compression',start:.78,end:.86}, {name:'hind-recovery',start:.86,end:1},
  ],
  flight: {
    'hind-near': {trail:[105,23,140],tuck:[22,45,-30]},
    'hind-far': {trail:[15,145,145],tuck:[18,0,-35]},
    fore:{trail:[12,12,12],tuck:[18,8,24]},
  },
};
function freeze(value) { if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value; }
/**
 * Explicit local adapter: duplicate the exact extension angles at air .18/.48.
 * Release and landing IK angles from createRig are retained unchanged. No
 * evaluator code, correction, transforms, lengths or source art are replaced.
 */
export function createBigLeapV02({joints={},registrations={}}={}) {
  const rig=structuredClone(createRig({...BIG_LEAP_V02_OPTIONS,joints,registrations}));
  for(const id of ['hind-near','hind-far']) {
    const c=rig.chains[id], [start,extension,tuck,end]=c.flight;
    c.flight=[[0,start[1]],[.18,extension[1]],[.48,{...extension[1]}],[.70,tuck[1]],[1,end[1]]];
  }
  return freeze(rig);
}
export const V02_CHECKPOINTS=[
  {u:0,label:'Rest'}, {u:.12,label:'42 px preload'}, {u:.26,label:'Hind toes world-locked'},
  {u:.30,label:'Toe-off'}, {u:.4152,label:'Full rearward extension'}, {u:.50,label:'840 px apex / 3.5× v01'},
  {u:.6072,label:'End of 0.311 s extension hold'}, {u:.748,label:'Tuck before landing'},
  {u:.78,label:'Reachable fore touchdown'}, {u:.85,label:'32 px compression'},
  {u:.94,label:'Hind feet recover'}, {u:1,label:'Recovered rest'},
];
