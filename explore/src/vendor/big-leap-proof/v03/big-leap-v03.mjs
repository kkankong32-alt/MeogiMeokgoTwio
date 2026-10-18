/** Straighter full hind-chain reach. Exact v02 root/camera/art retained. */
import {createBigLeapV02,V02_CHECKPOINTS} from '../v02/big-leap-v02.mjs';
export const V03_EXTENSION = Object.freeze({
  // Body-local segment directions; +/- bend branch retained with a tiny soft knee.
  // Distal ankle-to-toe direction continues the shank instead of curling back.
  'hind-near': Object.freeze({upper:205,bendAngle:1.5,distal:206.5}),
  'hind-far': Object.freeze({upper:197,bendAngle:-1.5,distal:195.5}),
});
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function createBigLeapV03(options={}) {
  const rig=structuredClone(createBigLeapV02(options));
  for(const [id,angles] of Object.entries(V03_EXTENSION)) {
    rig.chains[id].flight[1][1]={...angles};
    rig.chains[id].flight[2][1]={...angles};
  }
  return freeze(rig);
}
export const V03_CHECKPOINTS=V02_CHECKPOINTS.map(p=>({...p,label:p.u===.4152?'Full knee and ankle extension':p.label}));
