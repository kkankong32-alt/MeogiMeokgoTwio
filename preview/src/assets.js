import {atlasManifest} from './frog-registration.js';
export async function loadAssets({ImageClass=globalThis.Image,makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;}}={}){
 if(!ImageClass)throw new Error('Image decoding is unavailable');
 const paths={atlas:'frog/frog-atlas-runtime-crop-draft.lossless.webp',tongue:'frog/tongue-ribbon.png',cavity:'frog/mouth-interior.png',ground:'environment/zone01-ground-v01.png',prey:'prey/grasshopper-v01.png',caterpillar:'prey/caterpillar-v01-game.png',edibleGrass:'environment/edible-grass-v01-runtime.png',coverGrass:'environment/cover-grass-v01-runtime.png',snake:'predator/snake-v01.png',snakeHead:'predator/snake-head-dorsal-v01.png',duck:'duck/duck-v01-runtime.png'};
 const images=Object.fromEntries(await Promise.all(Object.entries(paths).map(([id,path])=>new Promise((resolve,reject)=>{const image=new ImageClass();image.onload=()=>resolve([id,image]);image.onerror=()=>reject(new Error(`그림을 불러오지 못했어요: ${id}`));image.src=globalThis.__ECOLOGY_EMBEDDED_ASSETS__?.[id]??new URL(`../assets/${path}`,import.meta.url).href;}))));
 if((images.atlas.naturalWidth??images.atlas.width)!==atlasManifest.atlas.width||(images.atlas.naturalHeight??images.atlas.height)!==atlasManifest.atlas.height)throw new Error('개구리 아틀라스 크기가 맞지 않아요');
 return{...images,makeCanvas};
}
