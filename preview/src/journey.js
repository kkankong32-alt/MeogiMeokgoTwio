/** A representative local proof, not the full animal roster or six-chapter rebuild. */
import {createWorld,stepWorld,distance,pauseWorld,addEvent} from './core.js';
import {seedMeadowSnake} from './fauna/snake-rig.mjs';
export const FOOD_RELATIONS=Object.freeze([
 ['plants','grasshopper'],['plants','caterpillar'],['grasshopper','frog'],['caterpillar','frog'],['frog','snake']
]);
// Later creatures are added through relationships + actors, never fake completion icons.
export const PROOF_SCOPE=Object.freeze({playable:['grasshopper','frog'],implemented:['plants','grasshopper','caterpillar','frog','snake'],futureUpperConsumers:['duck','hawk']});
function plant(id,x,y,r=48){return{id,x,y,r,capacity:4,bites:4,remaining:4,consumed:0};}
export function createJourney(role='grasshopper',{knowledge=null,settings={}}={}){
 const w=createWorld({stage:role==='grasshopper'?2:5,settings:{...settings,untimed:true}});
 w.events=[];w.prototype=true;w.hearts=3;w.escapeRemaining=3;w.quota=1;w.goalReached=false;w.knowledge=knowledge;w.fed=false;w.routeCheckpoint=0;w.timed=false;
 w.spawn={x:430,y:650};Object.assign(w.player,w.spawn);w.checkpointPosition={...w.spawn};w.route=[{time:0,...w.spawn}];w.destination={x:1165,y:1060,r:58,label:role==='grasshopper'?'관찰소 입구':'물가 쉼터'};
 w.grass=[plant('west-leaves',440,650,53),plant('north-leaves',655,530,51),plant('south-leaves',700,1000,55),plant('east-leaves',1080,1060,50),plant('middle-leaves',900,800,40)];
 w.cover=[{id:'start-cover',x:430,y:650,r:78},{id:'north-cover',x:635,y:560,r:56},{id:'south-cover',x:700,y:990,r:58},{id:'lab-cover',x:615,y:735,r:62},{id:'east-cover',x:1130,y:1060,r:62}];
 if(role==='grasshopper'){
  w.prey=[{id:'other-hopper',role:'grasshopper',x:885,y:800,r:17,home:{x:885,y:800},alive:true,captured:false,phase:0,state:'foraging'},{id:'caterpillar-neighbor',role:'caterpillar',x:690,y:990,r:16,home:{x:690,y:990},alive:true,captured:false,phase:1,state:'feeding'}];
  Object.assign(w.predator,{x:760,y:850,home:{x:760,y:850},state:'patrol',stateTime:0,facing:-1,face:{x:-1,y:0}});
  w.objective='한입 먹고 길 고르기 · 짧은 사냥터 / 돌아가는 풀숲';w.routeChoices=[{label:'빠른 길 · 사냥터',x:780,y:700},{label:'돌아가는 길 · 풀숲',x:635,y:495}];w.phase='hopper-crossing';
 }else{
  w.prey=[{id:'grasshopper-risky',role:'grasshopper',x:1160,y:850,r:17,home:{x:1160,y:850},alive:true,captured:false,phase:2,state:'foraging'},{id:'caterpillar-east',role:'caterpillar',x:1080,y:1060,r:16,home:{x:1080,y:1060},alive:true,captured:false,phase:0,state:'foraging'},{id:'caterpillar-reserve',role:'caterpillar',x:1140,y:1070,r:16,home:{x:1140,y:1070},alive:true,captured:false,phase:1,state:'feeding'}];
  Object.assign(w.predator,{x:1060,y:890,home:{x:1000,y:910},state:'patrol',stateTime:0,facing:-1,face:{x:-1,y:0}});seedMeadowSnake(w.predator);
  w.phase='find-lab';w.objective='익숙한 먹이터가 비었어요. 관찰소에서 다른 길 찾기';w.routeChoices=[{label:'빠른 먹이 · 높은 풀',x:935,y:730},{label:'다른 먹이 · 동쪽 낮은 풀',x:910,y:1150}];w.lab={x:615,y:735,r:38};w.destination={...w.lab,label:'현장 관찰소'};w.quota=999;
 }
 addEvent(w,'prototype-start',{role,category:'model-rule'});return w;
}
export function applyDiscovery(w,knowledge){if(w.role!=='frog')return false;w.knowledge=knowledge;w.fieldCondition=knowledge?.fieldCondition==='absent'?'absent':'present';for(const q of w.prey)if(q.role==='grasshopper'&&w.fieldCondition==='absent'&&q.alive){q.alive=false;q.removedByCondition=true;}addEvent(w,'field-condition',{condition:w.fieldCondition,category:'model-rule'});w.inquiryReturnEventIndex=w.events.length;w.priorAlternative=w.events.some(e=>e.type==='ate'&&e.food==='caterpillar'&&e.actor===w.player.id);w.phase=w.fed?'frog-return':'frog-forage';w.quota=w.fed?1:999;w.destination=w.fed?{...w.lab,r:45,label:'관찰소로 귀환'}:{x:1000,y:960,r:52,label:w.fieldCondition==='absent'?'동쪽 낮은 풀 · 다른 먹이 흔적':'먹이 흔적 · 두 길 중 선택'};w.checkpointPosition={x:w.lab.x,y:w.lab.y};w.objective=w.fed?'찾은 먹이 길을 확인했어요 · 관찰소로 돌아오기':w.fieldCondition==='absent'?'메뚜기가 없는 들판 · 다른 먹이를 찾아 관찰소로 돌아오기':'높은 풀의 빠른 먹이 / 풀숲을 잇는 다른 먹이 길';if(w.fieldCondition==='absent')w.routeChoices=w.routeChoices.map((s,i)=>i===0?{...s,label:'메뚜기가 없는 높은 풀'}:s);w.immuneUntil=w.time+3;w.labVisited=true;addEvent(w,'inquiry-return',{position:{x:w.player.x,y:w.player.y},category:'model-rule'});return true;}

export function stepJourney(w,input,dt){stepWorld(w,input,dt);if(w.paused||w.status!=='playing')return;
 if(w.labDismissed&&distance(w.player,w.lab)>w.lab.r+20)w.labDismissed=false;
 if(w.role==='frog'&&w.phase==='find-lab'&&!w.labDismissed&&distance(w.player,w.lab)<w.lab.r){w.phase='at-lab';pauseWorld(w,true);return;}
 const shelters=w.cover.filter(c=>!['start-cover','lab-cover'].includes(c.id));for(const c of shelters){if(distance(w.player,c)<c.r*.65&&!w.visitedShelters?.includes(c.id)){w.visitedShelters??=[];w.visitedShelters.push(c.id);w.checkpointPosition={x:c.x,y:c.y};w.player.feedback={text:'쉼터 발견 · 여기서 다시 도전할 수 있어요',until:w.time+2.5};addEvent(w,'shelter-checkpoint',{shelter:c.id,position:{x:c.x,y:c.y}});}}
 if(w.role==='frog'&&w.phase==='frog-forage'&&w.fed){w.phase='frog-return';w.quota=1;w.destination={...w.lab,r:45,label:'관찰소로 귀환'};w.objective='먹이 길 발견! 온 길로 돌아갈까, 풀숲으로 돌아갈까?';addEvent(w,'return-route-open',{position:{x:w.player.x,y:w.player.y},food:w.events.findLast(e=>e.type==='ate'&&e.actor===w.player.id)?.food});}
 if(w.role==='frog'&&w.phase==='frog-return'&&!w.applied&&w.events.slice(w.inquiryReturnEventIndex??w.events.length).some(e=>e.type==='ate'&&e.food==='caterpillar'&&e.actor===w.player.id)){w.applied=true;w.objective='애벌레 먹이 길 발견! 뱀의 위치를 보고 관찰소로 돌아가기';addEvent(w,'discovery-applied',{food:'caterpillar',position:{x:w.player.x,y:w.player.y}});}
}
export function retryJourney(w){w.hearts=3;w.status='playing';w.reason='';w.result=null;w.player.state='idle';w.player.stateTime=0;w.player.pose=null;w.player.tongue=null;w.player.stride=null;w.player.z=0;w.player.eatCooldown=0;w.player.jumpRecovery=0;w.player.landingLock=0;Object.assign(w.player,w.checkpointPosition??w.spawn);w.predator.state='recover';w.predator.stateTime=-1;w.predator.warning=null;w.immuneUntil=w.time+3;w.paused=false;addEvent(w,'prototype-retry',{position:{x:w.player.x,y:w.player.y},preservedKnowledge:Boolean(w.knowledge)});return w;}
