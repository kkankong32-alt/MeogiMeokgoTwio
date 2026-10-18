/** Locked-pixel, local-only grasshopper. World movement belongs to caller.
 * Source art is never redrawn. Each matrix is rigid (no shear/scale).
 */
export const SOURCE = Object.freeze({width:1672,height:941,pivot:[836,489],asset:'assets/grasshopper-locked-v01.png'});
export const HOP = Object.freeze({hold:0.42,anticipate:0.18,push:0.09,flight:0.46,land:0.15,settle:0.22,duration:1.52});
const poly=(p)=>p;
export const LEGS = Object.freeze([
 {id:'hind-far',side:'far',kind:'hind',hip:[746,320],knee:[357,72],toe:[210,196],
 upper:poly([[315,20],[385,20],[820,325],[746,364],[485,327],[371,135],[334,120]]),
 lower:poly([[322,24],[389,45],[402,129],[343,254],[283,275],[165,226],[172,159],[244,158],[286,193]])},
 {id:'middle-far',side:'far',kind:'middle',hip:[991,360],knee:[934,262],toe:[806,182],
 upper:poly([[899,230],[956,225],[1036,374],[959,390],[904,297]]),
 lower:poly([[771,143],[838,142],[878,207],[961,232],[971,284],[910,303],[830,267],[790,219]])},
 {id:'front-far',side:'far',kind:'front',hip:[1147,386],knee:[1224,319],toe:[1310,334],
 upper:poly([[1107,372],[1198,296],[1238,295],[1260,339],[1169,409]]),
 lower:poly([[1200,295],[1245,285],[1295,310],[1344,280],[1360,337],[1292,378],[1232,353]])},
 {id:'hind-near',side:'near',kind:'hind',hip:[767,648],knee:[439,520],toe:[187,800],
 upper:poly([[399,471],[458,464],[808,590],[823,670],[774,722],[705,738],[558,681],[419,568]]),
 lower:poly([[401,480],[475,509],[424,629],[317,789],[215,844],[155,842],[138,787],[212,727],[236,705],[336,532]])},
 {id:'middle-near',side:'near',kind:'middle',hip:[986,657],knee:[883,640],toe:[771,875],
 upper:poly([[849,596],[905,596],[1017,639],[1009,693],[976,706],[875,668],[848,644]]),
 lower:poly([[841,610],[916,625],[867,782],[860,841],[815,896],[791,916],[724,906],[717,853],[765,805],[787,755],[800,714]])},
 {id:'front-near',side:'near',kind:'front',hip:[1118,640],knee:[1208,719],toe:[1301,825],
 upper:poly([[1081,612],[1138,603],[1234,700],[1228,746],[1184,744],[1089,665]]),
 lower:poly([[1173,690],[1242,692],[1276,751],[1329,778],[1343,832],[1305,864],[1266,848],[1218,809],[1186,774]])},
].map(Object.freeze));
export const ANTENNAE=Object.freeze([
 {id:'antenna-high',base:[1283,457],mask:[[1266,467],[1259,450],[1290,379],[1341,261],[1411,170],[1489,114],[1535,96],[1578,99],[1591,125],[1579,144],[1525,153],[1473,180],[1413,234],[1362,319],[1319,413],[1301,462]]},
 {id:'antenna-low',base:[1323,468],mask:[[1310,447],[1385,404],[1457,366],[1537,341],[1616,342],[1655,357],[1660,386],[1635,397],[1595,382],[1540,381],[1487,390],[1426,414],[1371,445],[1336,482],[1313,479]]},
]);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const lerp=(a,b,t)=>a+(b-a)*t;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
export const transformPoint=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
export function rigidAt(pivot,angle=0,translation=[0,0]){const c=Math.cos(angle),s=Math.sin(angle);return[c,s,-s,c,pivot[0]-c*pivot[0]+s*pivot[1]+translation[0],pivot[1]-s*pivot[0]-c*pivot[1]+translation[1]];}
function boneMatrix(a,b,A,B){const angle=Math.atan2(B[1]-A[1],B[0]-A[0])-Math.atan2(b[1]-a[1],b[0]-a[0]);const c=Math.cos(angle),s=Math.sin(angle);return[c,s,-s,c,A[0]-c*a[0]+s*a[1],A[1]-s*a[0]-c*a[1]];}
function ik(a,b,c,A,C){
 const l1=dist(a,b),l2=dist(b,c),dx=C[0]-A[0],dy=C[1]-A[1],raw=Math.hypot(dx,dy),d=clamp(raw,Math.abs(l1-l2)+.001,l1+l2-.001);
 const ux=dx/(raw||1),uy=dy/(raw||1),along=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-along*along));
 const sign=Math.sign((c[0]-a[0])*(b[1]-a[1])-(c[1]-a[1])*(b[0]-a[0]))||1;
 const B=[A[0]+ux*along-uy*h*sign,A[1]+uy*along+ux*h*sign];
 return {knee:B,toe:[A[0]+ux*d,A[1]+uy*d],reachClamped:Math.abs(raw-d)>1e-6};
}
/** Pure pose. mode='idle' is unbounded time; mode='hop' is a clamped one-shot.
 * No world coordinate, direction, speed or AI input is accepted.
 * worldProgress is only a normalized scheduling suggestion; renderer ignores it.
 */
export function evaluateGrasshopper(time=0,{mode='idle'}={}){
 if(!Number.isFinite(time))throw new TypeError('time must be finite');
 const t=mode==='hop'?clamp(time,0,HOP.duration):Math.max(0,time);
 let phase='idle',air=0,lift=0,crouch=0,pitch=0,fold=0,worldProgress=0;
 const a=HOP.hold,b=a+HOP.anticipate,c=b+HOP.push,d=c+HOP.flight,e=d+HOP.land;
 if(mode==='hop'){
  if(t<a)phase='hold';
  else if(t<b){phase='anticipation';crouch=8*smooth((t-a)/HOP.anticipate);}
  else if(t<c){phase='push';const u=smooth((t-b)/HOP.push);crouch=8*(1-u);}
  else if(t<d){phase='flight';const u=(t-c)/HOP.flight;air=1;worldProgress=smooth(u);lift=172*4*u*(1-u);pitch=-.035*Math.sin(2*Math.PI*u);fold=Math.sin(Math.PI*u)**2;}
  else if(t<e){phase='landing';const u=(t-d)/HOP.land;worldProgress=1;crouch=6*Math.sin(Math.PI*u)**2;}
  else{phase=t<HOP.duration?'settle':'hold';worldProgress=1;}
 }
 const breathe=mode==='idle'?1.2*(1-Math.cos(t*1.9)):0;
 const bodyMatrix=rigidAt(SOURCE.pivot,pitch,[0,-lift+crouch+breathe]);
 const legs=LEGS.map((l,i)=>{
  const hip=transformPoint(bodyMatrix,l.hip);
  // All six toe contacts are exactly stationary on the ground in holds/crouch.
  // In flight their baseline follows the rigid body, then tucks mildly inward.
  let target=[...l.toe];
  if(air){target=transformPoint(bodyMatrix,l.toe);const strength=l.kind==='hind'?0.14:0.12;target=[lerp(target[0],hip[0],fold*strength),lerp(target[1],hip[1],fold*strength)];}
  const solved=ik(l.hip,l.knee,l.toe,hip,target);
  return {id:l.id,side:l.side,kind:l.kind,hip,knee:solved.knee,toe:solved.toe,contact:!air,reachClamped:solved.reachClamped,upper:boneMatrix(l.hip,l.knee,hip,solved.knee),lower:boneMatrix(l.knee,l.toe,solved.knee,solved.toe)};
 });
 const idleEnvelope=mode==='idle'?1:0;
 const antennae=ANTENNAE.map((l,i)=>{
  const angle=.014*Math.sin(t*2.4+i*.9)*idleEnvelope+fold*(i===0?-.045:.026);
  const base=transformPoint(bodyMatrix,l.base),rotation=pitch+angle;
  return{id:l.id,matrix:rigidAt(l.base,rotation,[base[0]-l.base[0],base[1]-l.base[1]])};
 });
 return {time:t,mode,phase,airborne:!!air,lift,crouch,pitch,worldProgress,bodyMatrix,legs,antennae,sourcePivot:[...SOURCE.pivot]};
}
function pathPolygon(c,points){c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();}
/** Direct Canvas renderer from immutable source. makeCanvas optional but recommended:
 * it pre-clips raster parts once, making each animated frame 15 image draws.
 */
export function createGrasshopperRenderer(image,{makeCanvas}={}){
 if(image.width!==SOURCE.width||image.height!==SOURCE.height)throw new Error('Locked grasshopper source must be 1672 x 941');
 const parts=new Map();
 const bodyOutline=[[146,250],[339,245],[790,315],[943,351],[980,368],[1032,341],[1108,345],[1139,374],[1202,354],[1243,364],[1289,365],[1313,389],[1340,447],[1357,501],[1344,562],[1324,599],[1299,623],[1263,649],[1226,648],[1201,620],[1159,623],[1121,609],[1097,654],[1083,671],[1023,665],[1000,645],[969,631],[925,612],[897,618],[871,610],[852,639],[817,641],[792,635],[769,610],[733,599],[572,537],[472,491],[434,482],[401,520],[379,545],[320,520],[272,488],[230,442],[204,392],[174,363],[150,317]];
 const descriptors=[...LEGS.flatMap(l=>[{id:l.id+'-upper',mask:l.upper},{id:l.id+'-lower',mask:l.lower}]),...ANTENNAE.map(a=>({id:a.id,mask:a.mask})),{id:'body',body:true}];
 for(const d of descriptors){
  if(!makeCanvas)continue;
  const xs=d.mask?.map(p=>p[0])??[0,SOURCE.width],ys=d.mask?.map(p=>p[1])??[0,SOURCE.height];
  const x=Math.floor(Math.min(...xs))-2,y=Math.floor(Math.min(...ys))-2,w=Math.ceil(Math.max(...xs))-x+2,h=Math.ceil(Math.max(...ys))-y+2;
  const canvas=makeCanvas(w,h),c=canvas.getContext('2d');c.translate(-x,-y);clip(c,d);c.drawImage(image,0,0);parts.set(d.id,{image:canvas,x,y,w,h});
 }
 function clip(c,d){c.beginPath();if(d.body){pathPolygon(c,bodyOutline);c.clip();for(const a of ANTENNAE){c.beginPath();c.rect(0,0,SOURCE.width,SOURCE.height);pathPolygon(c,a.mask);c.clip('evenodd');}}else{pathPolygon(c,d.mask);c.clip();}}
 function part(c,id,matrix){const d=descriptors.find(x=>x.id===id),cache=parts.get(id);c.save();c.transform(...matrix);if(cache)c.drawImage(cache.image,cache.x,cache.y);else{clip(c,d);c.drawImage(image,0,0);}c.restore();}
 /** x/y are current world anchor in canvas pixels, size is native-art scale.
  * Facing mirrors exactly once. No implicit travel/shadow is applied.
  * worldLift (canvas px) REPLACES authored lift. Do not also subtract z from y.
  */
 function draw(c,pose,{x=0,y=0,scale=1,facing=1,alpha=1,worldLift,debug=false}={}){
  c.save();c.globalAlpha*=alpha;c.translate(x,y);c.scale(scale*(facing<0?-1:1),scale);c.translate(-SOURCE.pivot[0],-SOURCE.pivot[1]);
  if(worldLift!==undefined)c.translate(0,pose.lift-worldLift/scale);
  for(const l of pose.legs){part(c,l.id+'-upper',l.upper);part(c,l.id+'-lower',l.lower);}
  part(c,'body',pose.bodyMatrix);
  for(const a of pose.antennae)part(c,a.id,a.matrix);
  if(debug){for(const l of pose.legs){c.strokeStyle=l.contact?'#1cdbea':'#ff8663';c.lineWidth=3;c.beginPath();c.moveTo(...l.hip);c.lineTo(...l.knee);c.lineTo(...l.toe);c.stroke();c.fillStyle=l.contact?'#1cdbea':'#ff8663';c.beginPath();c.arc(...l.toe,9,0,Math.PI*2);c.fill();}}
  c.restore();
 }
 return Object.freeze({draw,cachedParts:parts.size,source:SOURCE});
}
