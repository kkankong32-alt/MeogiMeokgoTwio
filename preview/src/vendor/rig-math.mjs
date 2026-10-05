/** Proof-only affine rig. Original raster pixels are reused, not redrawn per frame. */
export const REST=Object.freeze({hip:{x:414,y:653},knee:{x:430,y:822},ankle:{x:355,y:823},toe:{x:451,y:955}});
export const LIMITS=Object.freeze({hip:6,knee:8,ankle:10});
const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
const wrapAngle=degrees=>((degrees+180)%360+360)%360-180;
export const IDENTITY=[1,0,0,1,0,0];
export function multiply(a,b){return[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
export const translate=(x,y)=>[1,0,0,1,x,y];
export const rotate=degrees=>{const c=Math.cos(rad(degrees)),s=Math.sin(rad(degrees));return[c,s,-s,c,0,0];};
export const transformPoint=(m,p)=>({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]});
export const pivotRotation=(point,degrees)=>multiply(multiply(translate(point.x,point.y),rotate(degrees)),translate(-point.x,-point.y));
export function rigTransforms({dx=0,dy=0,hip=0,knee=0,ankle=0}={}, {stressTest=false}={}){
  for(const [name,value]of Object.entries({dx,dy,hip,knee,ankle}))if(!Number.isFinite(value))throw new Error(`Invalid ${name}`);
  for(const [name,value]of Object.entries({hip,knee,ankle}))if(!stressTest&&Math.abs(value)>LIMITS[name]+1e-7)throw new Error(`Outside bounded proof range: ${name}`);
  const body=translate(dx,dy),thigh=multiply(body,pivotRotation(REST.hip,hip)),shank=multiply(thigh,pivotRotation(REST.knee,knee)),foot=multiply(shank,pivotRotation(REST.ankle,ankle));
  return{'body-head':body,'hind-near-thigh':thigh,'hind-near-shank':shank,'hind-near-foot':foot};
}
/** Fixed bend branch, rigid lengths. Out-of-reach requests report clamping. */
export function solveTwoBone(start,goal,a,b,bend=1){
  const dx=goal.x-start.x,dy=goal.y-start.y,raw=Math.hypot(dx,dy);
  if(!(a>0&&b>0)||!Number.isFinite(raw))throw new Error('Invalid chain');
  const d=Math.max(Math.abs(a-b)+1e-6,Math.min(a+b-1e-6,raw)),dir=raw?{x:dx/raw,y:dy/raw}:{x:1,y:0};
  const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
  return{knee:{x:start.x+dir.x*along+dir.y*height*bend,y:start.y+dir.y*along-dir.x*height*bend},end:{x:start.x+dir.x*d,y:start.y+dir.y*d},clamped:Math.abs(d-raw)>1e-6};
}
export function plantedCrouch(dy){
  const {hip,knee,ankle}=REST,start={x:hip.x,y:hip.y+dy};
  const solution=solveTwoBone(start,ankle,Math.hypot(knee.x-hip.x,knee.y-hip.y),Math.hypot(ankle.x-knee.x,ankle.y-knee.y));
  const upper=wrapAngle(deg(Math.atan2(solution.knee.y-start.y,solution.knee.x-start.x)-Math.atan2(knee.y-hip.y,knee.x-hip.x)));
  const lower=wrapAngle(deg(Math.atan2(solution.end.y-solution.knee.y,solution.end.x-solution.knee.x)-Math.atan2(ankle.y-knee.y,ankle.x-knee.x)))-upper;
  const pose={dy,hip:upper,knee:lower,ankle:-upper-lower};rigTransforms(pose);return pose;
}
