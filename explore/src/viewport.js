/** CSS pixels and projected ground units are separate; one scale for both axes. */
export const GROUND_Y = .62;
export const VIEW_LIMIT = Object.freeze({width:960, height:620, minScale:.6, maxPortraitRatio:1.15});
export const TITLE_BUTTON = Object.freeze({left:.31851, top:.76816, width:.35697, height:.14637});
const positive = (value, fallback=1) => Number.isFinite(value) && value > 0 ? value : fallback;
export function containRect(width, height, aspect=16/9) {
  width=positive(width); height=positive(height); aspect=positive(aspect,16/9);
  const w=Math.min(width,height*aspect), h=w/aspect;
  return {x:(width-w)/2,y:(height-h)/2,width:w,height:h};
}
export function titleButtonRect(width,height) {
  const art=containRect(width,height), b=TITLE_BUTTON;
  const w=Math.max(44,art.width*b.width), h=Math.max(44,art.height*b.height);
  return {x:art.x+art.width*(b.left+b.width/2)-w/2,y:art.y+art.height*(b.top+b.height/2)-h/2,width:w,height:h};
}
export function viewportMetrics(width,height,pixelRatio=1) {
  width=positive(width); height=positive(height);
  // Portrait's excess height becomes a quiet margin rather than a narrow tunnel.
  const frameHeight=Math.min(height,width*VIEW_LIMIT.maxPortraitRatio);
  const scale=Math.max(width/VIEW_LIMIT.width,frameHeight/VIEW_LIMIT.height,VIEW_LIMIT.minScale);
  const view={x:0,y:(height-frameHeight)/2,width,height:frameHeight};
  // <= 4 megapixels / <= 2x DPR is an allocation budget, not an FPS promise.
  const dpr=Math.min(positive(pixelRatio),2,Math.sqrt(4_000_000/(width*height)));
  return {width,height,view,scale,dpr,pixelWidth:Math.max(1,Math.floor(width*dpr)),pixelHeight:Math.max(1,Math.floor(height*dpr)),logicalWidth:view.width/scale,logicalHeight:view.height/scale};
}
export function screenToGround(x,y,camera,metrics) {
  const {view,scale}=metrics;
  return {x:(x-view.x-view.width/2)/scale+camera.x,y:(y-view.y-view.height/2)/(scale*GROUND_Y)+camera.y};
}
export function groundToScreen(x,y,z,camera,metrics) {
  const {view,scale}=metrics;
  return {x:view.x+view.width/2+(x-camera.x)*scale,y:view.y+view.height/2+((y-camera.y)*GROUND_Y-z)*scale};
}
export function isInsideView(x,y,{view}) { return x>=view.x&&x<=view.x+view.width&&y>=view.y&&y<=view.y+view.height; }
