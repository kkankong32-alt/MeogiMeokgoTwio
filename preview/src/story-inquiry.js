/** Hands-on, bounded learning models. No wall-clock playback or world mutation. */
import {createCreatureRenderer} from './creatures.js';
import {GAME_EAT} from './tongue-gameplay.js';

export const STORY_INQUIRY_VERSION=1;
export const STORY_INQUIRY_KINDS=Object.freeze(['plant','food','habitat','decomposer']);
const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,Number.isFinite(value)?value:min));
const clone=value=>JSON.parse(JSON.stringify(value));
const FOOD_NAMES={grass:'풀',caterpillar:'애벌레',hopper:'메뚜기'};
const TITLES={plant:'햇빛가리개를 움직여 볼까?',food:'메뚜기를 빼면 무엇을 먹을까?',habitat:'풀을 벤 뒤, 어디로 갈까?',decomposer:'낙엽은 어디로 돌아갈까?'};
const INTROS={plant:'같은 크기의 풀 두 포기를 나란히 봐요. 오른쪽 햇빛가리개를 옮기고, 함께 시간을 넘겨요.',food:'메뚜기만 빼거나 다시 놓아 봐요. 애벌레와 개구리는 같은 자리에 두고 비교해요.',habitat:'지금 서 있는 풀밭의 위치 모형이에요. 풀을 베기 전과 뒤를 비교하고, 갈 길을 골라요.',decomposer:'같은 낙엽을 놓고 촉촉한 흙과 마른 흙을 비교해요. 곰팡이처럼 낙엽을 잘게 바꾸는 생물을 분해자라고 해요.'};
const FIXED={plant:'같게 둔 것: 풀의 종류 · 물 · 온도 · 관찰 시간',food:'같게 둔 것: 개구리 · 애벌레 · 시작 위치 · 칸막이',habitat:'같은 장소 · 같은 이동 출발점과 도착점',decomposer:'같게 둔 것: 낙엽 · 분해자 · 온도 · 공기'};
const SUMMARIES={plant:'식물은 빛을 이용해 스스로 양분을 만들어요. 빛 자체가 먹이는 아니에요.',food:'이 모형에서는 메뚜기가 있으면 가까운 메뚜기를, 없으면 애벌레를 먹었어요. 먹이 길은 여러 갈래로 이어질 수 있어요.',habitat:'풀을 베면 숨을 곳이 줄어요. 남은 풀숲을 살펴보고 이동할 길을 고를 수 있어요.',decomposer:'낙엽 속 물질 일부가 흙 속 양분으로 돌아가요. 흙 속 양분은 식물이 뿌리로 빨아들이는 작은 재료예요.'};

export function samplePlantInquiry({shade=0,progress=0}={}){
 shade=clamp(shade);progress=clamp(progress);
 const light=1-shade/100,amount=light*progress/100;
 return{shade,progress,condition:shade<=20?'light':shade>=80?'shade':'partial',light,foodMade:amount,referenceFoodMade:progress/100,water:'same',temperature:'same',plantSize:'same',plantRegrowth:false,model:'qualitative-light-comparison',result:progress===0?'아직 시간이 흐르지 않았어요':shade>=80?'빛이 적어 만든 양분도 적어요':'잎에서 빛으로 양분을 만들어요'};
}
export function createStoryFoodScenario({grasshopperAvailable=true}={}){
 return{model:'controlled-alternative-food',grasshopperAvailable:Boolean(grasshopperAvailable),environment:{water:'same',temperature:'same',divider:{x:340,y:70,height:210},plantRegrowth:false},actors:[{id:'frog',role:'frog',x:175,y:253,available:true},{id:'hopper',role:'grasshopper',x:446,y:222,available:Boolean(grasshopperAvailable)},{id:'caterpillar',role:'caterpillar',x:597,y:268,available:true}]};
}
export function sampleFoodInquiry({food=null,availability=food==='caterpillar'?'absent':'present',foodMode=food==='grass'?'grass':'availability',progress=0}={}){
 progress=clamp(progress);availability=availability==='absent'?'absent':'present';foodMode=foodMode==='grass'?'grass':'availability';
 const baseScenario=createStoryFoodScenario({grasshopperAvailable:availability==='present'}),scenario=foodMode==='grass'?{model:'separate-grass-check',grasshopperAvailable:false,environment:baseScenario.environment,actors:[baseScenario.actors[0],{id:'grass',role:'plants',x:512,y:255,available:true}]}:baseScenario,chosen=foodMode==='grass'?'grass':availability==='present'?'hopper':'caterpillar',open=progress>=35,edible=chosen!=='grass',eaten=edible&&progress>=85,rejected=chosen==='grass'&&progress>=85;
 const foodWebEdge=eaten?{food:chosen==='hopper'?'grasshopper':chosen,eater:'frog'}:null;
 return{food:chosen,condition:foodMode==='grass'?'grass':availability,availability,foodMode,progress,open,edible,eaten,rejected,grasshopperAvailable:availability==='present',scenario,foodWebEdge,foodWebEdges:foodWebEdge?[foodWebEdge]:[],result:!open?(foodMode==='grass'?'풀을 따로 살펴봐요. 칸막이를 열어요':availability==='present'?'메뚜기와 애벌레가 있어요. 칸막이를 열어요':'메뚜기만 뺐어요. 애벌레는 그대로예요'):eaten?(availability==='present'?'가까운 메뚜기를 먹었어요':'메뚜기가 없어서 애벌레를 먹었어요'):rejected?'풀을 먹지 않았어요':'칸막이가 열렸어요. 끝까지 옮겨요',model:'controlled-alternative-food'};
}
export const HABITAT_SITE=Object.freeze({bounds:Object.freeze({left:350,top:450,right:1200,bottom:1180}),start:Object.freeze({x:700,y:505}),end:Object.freeze({x:1080,y:1120}),lab:Object.freeze({x:600,y:590}),mownArea:Object.freeze({x:805,y:770,rx:195,ry:155})});
export const habitatToModel=point=>({x:(point.x-350)/850,y:(point.y-450)/730});
export const habitatToWorld=point=>({x:Math.round(350+point.x*850),y:Math.round(450+point.y*730)});
const coverAt=(id,x,y,r)=>({id,...habitatToModel({x,y}),rx:r/850,ry:r/730});
const KEPT_COVER=Object.freeze([coverAt('start-cover',700,505,70),coverAt('lab-cover',600,590,75),coverAt('west-cover',440,760,59),coverAt('south-cover',690,1040,59),coverAt('east-cover',1165,1060,59),coverAt('final-cover',1080,1120,78)]);
const CUT_COVER=Object.freeze([coverAt('north-cover',735,600,59),coverAt('middle-cover',930,930,59)]);
const routePoints=points=>Object.freeze(points.map(([x,y])=>Object.freeze(habitatToModel({x,y}))));
const westRoute=routePoints([[700,505],[600,590],[440,760],[690,1040],[1080,1120]]),southRoute=routePoints([[700,505],[600,590],[705,1050],[1080,1120]]),oldRoute=routePoints([[700,505],[735,600],[930,930],[1080,1120]]);
export const HABITAT_ROUTES=Object.freeze({west:westRoute,south:southRoute,old:oldRoute,cover:westRoute,open:oldRoute});
const cleanRoute=route=>Array.isArray(route)?route.slice(0,160).filter(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)).map(p=>({x:clamp(p.x,0,1),y:clamp(p.y,0,1)})):[];
export function sampleHabitatInquiry({comparison=50,route=[]}={}){
 comparison=clamp(comparison);route=cleanRoute(route);let covered=0,total=0;const visited=new Set();
 for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(distance*90));for(let j=0;j<steps;j++){const t=(j+.5)/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;total++;const patches=KEPT_COVER.filter(p=>((x-p.x)/p.rx)**2+((y-p.y)/p.ry)**2<=1);if(patches.length)covered++;patches.forEach(p=>visited.add(p.id));}}
 const coverage=total?covered/total:0,connects=route.length>=2&&Math.hypot(route[0].x-habitatToModel(HABITAT_SITE.start).x,route[0].y-habitatToModel(HABITAT_SITE.start).y)<.15&&Math.hypot(route.at(-1).x-habitatToModel(HABITAT_SITE.end).x,route.at(-1).y-habitatToModel(HABITAT_SITE.end).y)<.15;
 return{comparison,route,coverage,connects,visitedCover:[...visited],keptCover:clone(KEPT_COVER),cutCover:clone(CUT_COVER),model:'same-habitat-cover-comparison',result:!route.length?'비교한 뒤 길을 골라 보세요':!connects?'위쪽 출발점에서 오른쪽 아래 도착점까지 이어 주세요':visited.size>=4?'남은 풀숲을 여러 곳 지나는 길이에요':'숨을 풀숲이 없는 옛길을 지나가요'};
}
export function sampleDecomposerInquiry({moisture='moist',progress=0}={}){
 moisture=moisture==='dry'?'dry':'moist';progress=clamp(progress);const decomposed=progress/100*(moisture==='moist'?.72:.22);
 return{moisture,progress,modelDays:Math.round(progress/100*14),decomposed,soilMinerals:decomposed,energyReturnedToPlant:0,instantPlantGrowth:false,model:'qualitative-decomposition-comparison',result:progress===0?'같은 양의 낙엽으로 시작해요':moisture==='moist'?'촉촉한 흙에서 낙엽이 더 많이 바뀌었어요':'마른 흙에서는 낙엽이 천천히 바뀌었어요'};
}
function baseState(kind){return{version:STORY_INQUIRY_VERSION,kind,controls:{shade:0,food:null,availability:'present',foodMode:'availability',moisture:'moist',progress:0,comparison:50,mode:'compare'},touched:{condition:false,time:false,before:false,after:false},route:[],routeChoice:null,fieldCondition:null,observations:[],completed:false};}
function makeRecord(state){
 const {kind,controls,touched}=state;
 if(kind==='habitat')return null;
 if(!touched.condition||!touched.time||controls.progress<100)return null;
 if(kind==='plant'){const s=samplePlantInquiry(controls);if(s.condition==='partial')return null;return{kind,condition:s.condition,shade:s.shade,progress:100,didChoose:true,didScrub:true,foodMade:s.foodMade,referenceFoodMade:s.referenceFoodMade,result:s.result};}
 if(kind==='food'){const s=sampleFoodInquiry(controls);return{kind,condition:s.condition,food:s.food,availability:s.availability,foodMode:s.foodMode,grasshopperAvailable:s.grasshopperAvailable,progress:100,didChoose:true,didScrub:true,eaten:s.eaten,rejected:s.rejected,startingConditions:s.scenario,foodWebEdge:s.foodWebEdge,foodWebEdges:s.foodWebEdges,result:s.result};}
 const s=sampleDecomposerInquiry(controls);return{kind,condition:s.moisture,moisture:s.moisture,progress:100,didChoose:true,didScrub:true,decomposed:s.decomposed,soilMinerals:s.soilMinerals,result:s.result};
}
function ready(state){const keys=new Set(state.observations.map(r=>r.condition));return state.kind==='plant'?keys.has('light')&&keys.has('shade'):state.kind==='food'?keys.has('present')&&keys.has('absent')&&['present','absent'].includes(state.fieldCondition):state.kind==='decomposer'?keys.has('moist')&&keys.has('dry'):Boolean(state.touched.before&&state.touched.after&&sampleHabitatInquiry({route:state.route}).connects);}
/** Only bounded control values and recreated model observations survive restoration. */
export function createStoryInquiryState(kind='plant',saved={}){
 if(!STORY_INQUIRY_KINDS.includes(kind))throw new Error(`Unknown story inquiry kind: ${kind}`);
 const state=baseState(kind),input=saved?.state??saved;
 if(!input||input.kind!==kind||input.version!==STORY_INQUIRY_VERSION)return state;
 const c=input.controls??{},t=input.touched??{};
 state.controls={shade:clamp(c.shade),food:Object.hasOwn(FOOD_NAMES,c.food)?c.food:null,availability:c.availability==='absent'?'absent':'present',foodMode:c.foodMode==='grass'?'grass':'availability',moisture:c.moisture==='dry'?'dry':'moist',progress:clamp(c.progress),comparison:clamp(c.comparison),mode:c.mode==='draw'?'draw':'compare'};
 state.touched={condition:t.condition===true,time:t.time===true,before:t.before===true,after:t.after===true};state.route=cleanRoute(input.route);state.routeChoice=['west','south','old','drawn'].includes(input.routeChoice)?input.routeChoice:null;state.fieldCondition=['present','absent'].includes(input.fieldCondition)?input.fieldCondition:null;
 for(const r of Array.isArray(input.observations)?input.observations:[]){
  if(r?.kind!==kind||r.progress!==100||r.didChoose!==true||r.didScrub!==true)continue;
  const trial=baseState(kind);trial.touched={...trial.touched,condition:true,time:true};trial.controls.progress=100;
  if(kind==='plant'){if(!Number.isFinite(r.shade))continue;trial.controls.shade=clamp(r.shade);}
  if(kind==='food'){if(!['present','absent','grass'].includes(r.condition))continue;if(r.condition!=='grass'&&(r.availability!==r.condition||r.grasshopperAvailable!==(r.condition==='present')||r.food!==(r.condition==='present'?'hopper':'caterpillar')))continue;trial.controls.foodMode=r.condition==='grass'?'grass':'availability';trial.controls.availability=r.condition==='absent'?'absent':'present';trial.controls.food=r.condition==='grass'?'grass':r.condition==='absent'?'caterpillar':'hopper';}
  if(kind==='decomposer'){if(!['moist','dry'].includes(r.moisture))continue;trial.controls.moisture=r.moisture;}
  const record=makeRecord(trial);if(record&&record.condition===r.condition&&!state.observations.some(o=>o.condition===record.condition))state.observations.push(record);
 }
 state.completed=input.completed===true&&ready(state);return state;
}
/** Pure reducer: every observation is caused by controls; elapsed real time is irrelevant. */
export function updateStoryInquiry(input,action={}){
 const state=createStoryInquiryState(input.kind,input),{kind,controls,touched}=state;
 if(action.type==='condition'){
  if(kind==='plant'){if(!Number.isFinite(action.value))return state;controls.shade=clamp(action.value);}
  else if(kind==='food'){if(!Object.hasOwn(FOOD_NAMES,action.value))return state;controls.food=action.value;controls.foodMode=action.value==='grass'?'grass':'availability';if(action.value!=='grass')controls.availability=action.value==='hopper'?'present':'absent';}
  else if(kind==='decomposer'){if(!['moist','dry'].includes(action.value))return state;controls.moisture=action.value;}
  else return state;
  controls.progress=0;touched.condition=true;touched.time=false;
 }else if(action.type==='availability'&&kind==='food'){
  if(!['present','absent'].includes(action.value))return state;controls.availability=action.value;controls.foodMode='availability';controls.food=action.value==='present'?'hopper':'caterpillar';controls.progress=0;touched.condition=true;touched.time=false;
 }else if(action.type==='field'&&kind==='food'){
  if(['present','absent'].includes(action.value)&&['present','absent'].every(key=>state.observations.some(r=>r.condition===key)))state.fieldCondition=action.value;
 }else if(action.type==='scrub'&&kind!=='habitat'){
  if(!Number.isFinite(action.value))return state;
  const value=clamp(action.value);if(value!==controls.progress)touched.time=true;controls.progress=value;
 }else if(action.type==='record'){
  const record=makeRecord(state);if(record)state.observations=[...state.observations.filter(r=>r.condition!==record.condition),record];
 }else if(action.type==='compare'&&kind==='habitat'){
  if(!Number.isFinite(action.value))return state;controls.comparison=clamp(action.value);if(controls.comparison<=5)touched.before=true;if(controls.comparison>=95)touched.after=true;
 }else if(action.type==='route'&&kind==='habitat'){
  state.route=cleanRoute(typeof action.value==='string'?HABITAT_ROUTES[action.value]:action.value);state.routeChoice=typeof action.value==='string'?({cover:'west',open:'old'}[action.value]??(['west','south','old'].includes(action.value)?action.value:null)):'drawn';
 }else if(action.type==='mode'&&kind==='habitat')controls.mode=action.value==='draw'?'draw':'compare';
 else if(action.type==='reset'){controls.progress=0;touched.time=false;if(kind==='habitat'){state.route=[];state.routeChoice=null;}}
 else if(action.type==='complete'&&ready(state))state.completed=true;
 return state;
}
export function createStoryInquiryEvidence(input){
 const state=createStoryInquiryState(input.kind,input);if(!ready(state))return null;state.completed=true;
 const habitat=state.kind==='habitat'?sampleHabitatInquiry({comparison:state.controls.comparison,route:state.route}):null;
 const observations=habitat?[{condition:'before',cover:'same habitat before mowing',manipulated:true},{condition:'after',cover:'remaining cover after mowing',manipulated:true},{condition:'route',route:clone(state.route),coverage:habitat.coverage,result:habitat.result}]:clone(state.observations);
 return{kind:state.kind,version:STORY_INQUIRY_VERSION,completed:true,model:true,prediction:false,observations,summary:SUMMARIES[state.kind],changedVariable:{plant:'light',food:'grasshopperAvailability',habitat:'mowing',decomposer:'moisture'}[state.kind],sameStartingConditions:true,plantRegrowth:false,energyCycle:false,...(state.kind==='food'?{fieldCondition:state.fieldCondition,comparison:{sameStartingConditions:true,changedVariable:'grasshopperAvailability',presentFood:'grasshopper',absentFood:'caterpillar'},foodWebEdges:observations.flatMap(r=>r.foodWebEdges??[])}:{}),...(habitat?{route:clone(state.route),worldRoute:state.route.map(habitatToWorld),routeChoice:state.routeChoice??'drawn',siteBounds:clone(HABITAT_SITE.bounds),routeCoverage:habitat.coverage}:{}),state};
}

let instanceCounter=0;
/** Parent owns world pausing, persistence and removal of the host. */
export function mountStoryInquiry(container,{kind='plant',assets=null,initialState={},onClose=()=>{},onComplete=()=>{}}={}){
 if(!container?.ownerDocument)throw new Error('A DOM container is required');
 let state=createStoryInquiryState(kind,initialState),destroyed=false,completedThisVisit=false,pointer=null,hopperDrag=null;
 const doc=container.ownerDocument,win=doc.defaultView??globalThis,id=`story-inquiry-${++instanceCounter}`,priorFocus=doc.activeElement,root=doc.createElement('section');
 root.className='si-shell';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby',`${id}-title`);
 const ranges=(name,label,from,to)=>`<label class="si-range-label" for="${id}-${name}"><strong>${label}</strong><output class="si-${name}-value"></output></label><input id="${id}-${name}" class="si-${name}" type="range" min="0" max="100" step="1" value="0"><div class="si-range-ends"><span>${from}</span><span>${to}</span></div>`;
 const conditionButtons=kind==='plant'?'<div class="si-options"><button type="button" data-condition="0">햇빛 충분히</button><button type="button" data-condition="90">햇빛 조금</button></div>'+ranges('shade','1. 햇빛가리개를 옮겨요','가리지 않음','거의 가림'):kind==='food'?`<strong class="si-control-title">1. 메뚜기만 옮겨요</strong><div class="si-options si-food-options"><button type="button" draggable="true" data-availability="present" data-condition="hopper"><span class="si-food-thumb" data-thumb="hopper"></span><span>메뚜기 놓기</span></button><button type="button" data-availability="absent" data-condition="caterpillar"><span>메뚜기 빼기</span></button></div><p class="si-hint">그림 속 메뚜기를 위쪽 보관칸으로 끌어도 돼요</p><button type="button" class="si-grass-extra" data-condition="grass">따로 해 보기: 풀은 먹을까?</button>`:kind==='decomposer'?'<strong class="si-control-title">1. 흙의 물기를 골라요</strong><div class="si-options"><button type="button" data-condition="moist">알맞게 촉촉함</button><button type="button" data-condition="dry">마름</button></div>':ranges('comparison','1. 비교선을 양쪽 끝까지 옮겨요','베기 전만 보기','벤 뒤만 보기')+'<div class="si-options"><button type="button" data-comparison="0">베기 전</button><button type="button" data-comparison="100">벤 뒤</button></div>';
 const second=kind==='habitat'?'<strong class="si-control-title">2. 출발점에서 도착점까지 길을 골라요</strong><div class="si-options"><button type="button" data-route="west">서쪽 풀숲 길</button><button type="button" data-route="south">남쪽 먹이터 길</button><button type="button" data-route="old">옛길</button></div><div class="si-options si-small-options"><button type="button" data-mode="compare">비교선 옮기기</button><button type="button" data-mode="draw">직접 길 그리기</button></div><p class="si-hint">직접 그릴 때는 위쪽 출발점부터 오른쪽 아래 도착점까지 이어 주세요</p>':ranges('progress',kind==='food'?'2. 칸막이 손잡이를 끝까지 옮겨요':'2. 시간을 끝까지 넘겨요',kind==='food'?'닫힘':kind==='decomposer'?'첫날':'아침',kind==='food'?'열고 살펴봄':kind==='decomposer'?'여러 날 뒤':'저녁')+'<button type="button" class="si-record">이 조건 기록하기</button>';
 root.innerHTML=`<div class="si-panel"><header class="si-heading"><div><p class="si-eyebrow">직접 해 보는 작은 탐구</p><h2 id="${id}-title">${TITLES[kind]}</h2></div><button type="button" class="si-close" aria-label="탐구를 닫고 들판으로 돌아가기">×</button></header><p class="si-intro">${INTROS[kind]}</p><p class="si-observer">잠깐 관찰자의 눈으로 살펴봐요. 동물이 도구를 쓰는 장면은 아니에요.</p><div class="si-workspace"><div class="si-visual"><div class="si-stage"><canvas class="si-canvas" width="720" height="340" role="img" aria-label="직접 조작하는 생태 학습 모형"></canvas><span class="si-model-tag">배우기 위한 모형</span></div><p class="si-status" role="status" aria-live="polite"></p><p class="si-fixed">${FIXED[kind]}</p></div><div class="si-controls"><div class="si-control-group">${conditionButtons}</div><div class="si-control-group">${second}</div><button type="button" class="si-reset">지금 조건 다시 해 보기</button></div></div><section class="si-notebook" aria-label="내가 비교한 기록"><div class="si-notebook-heading"><strong>내가 비교한 기록</strong><span class="si-count"></span></div><div class="si-records"></div><p class="si-next"></p></section><p class="si-discovery" hidden></p>${kind==='food'?'<section class="si-field-choice" hidden><strong>3. 들판에서 어떤 조건을 해 볼까요?</strong><div class="si-options"><button type="button" data-field-condition="present">메뚜기와 애벌레</button><button type="button" data-field-condition="absent">애벌레만</button></div><p>고른 조건으로 돌아가요. 실제로 무엇을 먹을지는 내가 움직이며 살펴봐요.</p></section>':''}<footer class="si-footer"><button type="button" class="si-leave">기록을 두고 잠깐 나가기</button><button type="button" class="si-save">발견을 저장하고 들판으로</button></footer><p class="si-footnote">손잡이를 옮겨야 장면이 바뀌어요. 실제 자연의 변화 속도나 결과를 예측하는 실험은 아니에요.${kind==='plant'?' 양분을 만드는 모습을 간단히 나타냈어요. 들판의 풀이 바로 자라는 것은 아니에요.':kind==='decomposer'?' 낙엽이 바뀌는 데는 여러 날이 걸려요. 흙 속 양분은 식물이 뿌리로 빨아들이는 작은 재료예요. 식물은 빛으로 양분을 만들고, 뿌리로는 이 재료를 받아요. 에너지가 흙으로 돌아와 다시 쓰이는 것은 아니에요.':kind==='habitat'?' 풀숲 사이의 빈터도 살펴봐요. 풀숲이 있어도 늘 안전한 것은 아니에요.':kind==='food'?' 여기서는 개구리가 먹을 수 있는 곤충을 나타냈어요. 모든 애벌레나 곤충을 먹는다는 뜻은 아니에요.':''}</p></div>`;
 container.append(root);
 const $=selector=>root.querySelector(selector),$$=selector=>[...root.querySelectorAll(selector)],canvas=$('.si-canvas'),ctx=canvas.getContext('2d'),events=[];
 const art=assets?.atlas&&assets?.prey?createCreatureRenderer(assets):null;
 const listen=(target,event,fn,options)=>{target.addEventListener(event,fn,options);events.push(()=>target.removeEventListener(event,fn,options));};
 const getState=()=>clone(state);
 function dispatch(action){if(destroyed)return;state=updateStoryInquiry(state,action);render();}
 function status(){if(kind==='plant')return samplePlantInquiry(state.controls).result;if(kind==='food')return sampleFoodInquiry(state.controls).result;if(kind==='habitat')return sampleHabitatInquiry({...state.controls,route:state.route}).result;return sampleDecomposerInquiry(state.controls).result;}
 function text(x,y,value,size=16,color='#24432f',align='center'){ctx.fillStyle=color;ctx.font=`600 ${size}px system-ui, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(value,x,y);}
 function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
 function line(points,color,width=3,dash=[]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dash);ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);}
 function imageFit(image,x,y,w,h){if(!image)return;const iw=image.naturalWidth??image.width,ih=image.naturalHeight??image.height,scale=Math.min(w/iw,h/ih);if(!Number.isFinite(scale)||scale<=0)return;ctx.drawImage(image,x+(w-iw*scale)/2,y+(h-ih*scale)/2,iw*scale,ih*scale);}
 function grass(x,y,w=140,h=115,cover=false){const image=cover?assets?.coverGrass:assets?.edibleGrass;if(image)imageFit(image,x-w/2,y-h,w,h);else text(x,y-25,cover?'풀숲':'풀',17);}
 function frog(x,y,feedingProgress=null){const feeding=feedingProgress!==null&&feedingProgress>40&&feedingProgress<85;if(art)art.frog(ctx,{facing:1,state:feeding?'eating':'idle',stateTime:feeding?clamp((feedingProgress-40)/45,0,1)*GAME_EAT.duration:0,tongue:{suppress:true}},{x,y});else text(x,y-25,'개구리',22);}
 function food(food,x,y,alpha=1){ctx.save();ctx.globalAlpha=alpha;if(food==='grass')grass(x,y,105,85);else if(food==='hopper'&&art)art.prey(ctx,x,y,{role:'grasshopper',facing:-1,z:0,state:'idle',stateTime:0});else if(food==='caterpillar'&&art)art.caterpillar(ctx,x,y,{facing:-1,phase:0});else if(food)text(x,y-14,FOOD_NAMES[food],17);ctx.restore();}
 function drawPlant(){
  const s=samplePlantInquiry(state.controls);
  // Both approved plant images have identical fixed dimensions. One shared time
  // scrub drives the uncovered reference and the child-controlled condition.
  for(const column of [{x:192,shade:0,label:'햇빛 그대로',amount:s.referenceFoodMade},{x:528,shade:s.shade,label:'내 햇빛가리개 ↔',amount:s.foodMade}]){
   const {x,shade,amount}=column;ctx.fillStyle='#f4f3e3';ctx.fillRect(x-158,39,316,284);text(x,62,column.label,20);
   ellipse(x+101,96,20,20,'#f5ce62');for(let i=0;i<5;i++)line([{x:x-53+i*29,y:103},{x:x-71+i*29,y:173}],'#ebc15c',3);
   if(x===528){ctx.fillStyle='#586d62';ctx.fillRect(390,118,shade/100*276,12);if(shade>0){ctx.fillStyle=`rgba(37,68,55,${shade/100*.28})`;ctx.fillRect(x-146,131,292,107);}}
   ctx.fillStyle='#e6dfbd';ctx.fillRect(x-146,217,292,21);grass(x,234,152,108);
   text(x,255,'잎이 만든 양분',18);for(let i=0;i<6;i++){const filled=amount*6-i;ellipse(x-83+i*33,283,10,10,filled>=1?'#dda936':filled>0?'#e8cd81':'#dadccb');}
   text(x,309,shade>=80?'빛 조금':shade<=20?'빛 충분히':'빛을 가리는 중',17);
  }
 }
 function drawFood(){
  const s=sampleFoodInquiry(state.controls);ctx.fillStyle='#cadbb3';ctx.fillRect(0,238,720,102);ellipse(192,261,96,17,'#adc596');
  const target=s.food==='hopper'?{x:446,y:222}:{x:597,y:268},mouth={x:243,y:217},retract=s.edible?clamp((s.progress-60)/25,0,1):0;
  grass(446,276,94,70);grass(598,309,94,70);
  if(s.foodMode==='availability'){
   ctx.fillStyle='#f2efda';ctx.fillRect(512,58,178,76);text(603,70,'메뚜기 보관칸',13);
   if(s.availability==='absent'&&!hopperDrag)food('hopper',604,116);
   if(s.availability==='present'&&!hopperDrag&&(!s.eaten||s.food!=='hopper'))food('hopper',446-(446-mouth.x)*retract,222-(222-mouth.y)*retract);
   if(s.food!=='caterpillar'||!s.eaten)food('caterpillar',597-(s.food==='caterpillar'?(597-mouth.x)*retract:0),268-(s.food==='caterpillar'?(268-mouth.y)*retract:0));
   if(hopperDrag)food('hopper',hopperDrag.x,hopperDrag.y);
   text(446,302,s.availability==='present'?'메뚜기':'메뚜기 없음',16);text(603,330,'애벌레 · 같은 자리',14);
  }else{food('grass',512,255);text(524,297,'따로 살펴본 풀',17);}
  if(s.edible&&s.progress>40&&s.progress<85){const reach=s.progress<60?clamp((s.progress-40)/20,0,1):1-retract;line([mouth,{x:mouth.x+(target.x-mouth.x)*reach,y:mouth.y+(target.y-mouth.y-6)*reach}],'#b96f64',7);line([mouth,{x:mouth.x+(target.x-mouth.x)*reach,y:mouth.y+(target.y-mouth.y-6)*reach}],'#e7a398',4);}
  frog(175,253,s.edible?s.progress:null);
  const bottom=280-s.progress/100*210;ctx.fillStyle='#b8d4d3aa';ctx.fillRect(332,70,14,Math.max(0,bottom-70));line([{x:332,y:70},{x:346,y:70},{x:346,y:bottom}],'#587c7b',3);text(339,49,'칸막이',15);text(180,302,'같은 개구리',17);
  if(s.eaten){text(327,126,`${FOOD_NAMES[s.food]} → 개구리`,18);text(target.x,target.y-31,'먹었어요',15);}else if(s.rejected)text(519,182,'풀은 먹지 않았어요',18);
 }
 function drawHabitat(){
  const s=sampleHabitatInquiry({...state.controls,route:state.route}),split=720*(1-s.comparison/100);
  function habitat(after){ctx.fillStyle='#e6d8b3';ctx.fillRect(0,70,720,270);if(after){const m=habitatToModel(HABITAT_SITE.mownArea);ellipse(m.x*720,84+m.y*240,195/850*720,155/730*240,'#ccb58b55');}for(const patch of [...KEPT_COVER,...(after?[]:CUT_COVER)]){const x=patch.x*720,y=84+patch.y*240;ellipse(x,y+5,patch.rx*720*.75,patch.ry*240*.46,'#aec393');grass(x,y+13,Math.max(48,patch.rx*720*1.75),Math.max(46,patch.ry*240*2.1),true);}if(after){for(const p of CUT_COVER){text(p.x*720,86+p.y*240,'풀을 벤 자리',12,'#886c46');}}}
  habitat(true);ctx.save();ctx.beginPath();ctx.rect(0,70,split,270);ctx.clip();habitat(false);ctx.restore();
  if(split>8&&split<712){line([{x:split,y:71},{x:split,y:335}],'#f9f6e5',5);ellipse(split,161,18,18,'#254d3b');text(split,161,'↔',20,'#fff9d9');}
  text(124,49,'베기 전',17);text(593,49,'벤 뒤',17);
  if(state.route.length){line(state.route.map(p=>({x:p.x*720,y:84+p.y*240})),'#f9f6e5',9);line(state.route.map(p=>({x:p.x*720,y:84+p.y*240})),'#3e674d',4,[5,7]);}
  for(const [point,label]of [[HABITAT_SITE.start,'출발'],[HABITAT_SITE.end,'도착']]){const p=habitatToModel(point);ellipse(p.x*720,84+p.y*240,17,17,'#fff5d2');text(p.x*720,84+p.y*240,label,12);}text(73,223,'서쪽 풀숲',12);text(288,311,'남쪽 먹이터',12);
 }
 function drawDecomposer(){
  const s=sampleDecomposerInquiry(state.controls);ctx.fillStyle=s.moisture==='moist'?'#927454':'#bca17b';ctx.fillRect(0,180,720,160);
  for(let i=0;i<14;i++){const gone=i/14<s.decomposed;ctx.save();ctx.translate(97+(i%7)*86,147+Math.floor(i/7)*45);ctx.rotate((i%3-1)*.4);ellipse(0,0,gone?6:25,gone?3:11,gone?'#6d583e':'#b38144');if(!gone)line([{x:-19,y:0},{x:19,y:0}],'#76502e',1.5);ctx.restore();}
  text(365,85,'같은 낙엽 · 분해자도 함께 있어요',19);
  for(let i=0;i<16;i++){const on=i/16<s.soilMinerals;ellipse(83+(i%8)*78,254+Math.floor(i/8)*40,6,6,on?'#ead7a0':'#715b4533');}
  text(369,319,'흙 속 양분 · 뿌리로 빨아들이는 작은 재료',15,'#fff1d2');text(612,210,s.moisture==='moist'?'촉촉한 흙':'마른 흙',15,'#fff1d2');
 }
 function draw(){if(!ctx||destroyed)return;const width=Math.max(1,Math.round((canvas.getBoundingClientRect().width||720)*Math.min(win.devicePixelRatio||1,2))),height=Math.round(width*340/720);if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;ctx.setTransform(width/720,0,0,height/340,0,0);ctx.clearRect(0,0,720,340);ctx.fillStyle='#e9edd8';ctx.fillRect(0,0,720,340);({plant:drawPlant,food:drawFood,habitat:drawHabitat,decomposer:drawDecomposer})[kind]();canvas.setAttribute('aria-label',`${TITLES[kind]} ${status()}`);}
 function renderRecords(){
  const host=$('.si-records');host.replaceChildren();
  const records=kind==='habitat'?[{done:state.touched.before,label:'베기 전 확인'},{done:state.touched.after,label:'벤 뒤 확인'},{done:sampleHabitatInquiry({route:state.route}).connects,label:'내 길 고르기'}]:kind==='plant'?[{condition:'light',label:'햇빛 충분히'},{condition:'shade',label:'햇빛 조금'}]:kind==='food'?[{condition:'present',label:'메뚜기 있음'},{condition:'absent',label:'메뚜기 없음'},...(state.observations.some(r=>r.condition==='grass')?[{condition:'grass',label:'풀 · 따로 관찰'}]:[])]:[{condition:'moist',label:'촉촉한 흙'},{condition:'dry',label:'마른 흙'}];
  for(const item of records){const record=state.observations.find(r=>r.condition===item.condition),done=Boolean(item.done||record),card=doc.createElement('div');card.className=`si-note${done?' is-done':''}`;const title=doc.createElement('strong');title.textContent=`${done?'✓':'○'} ${item.label}`;card.append(title);const detail=doc.createElement('span');detail.textContent=record?(kind==='food'?(record.eaten?`${FOOD_NAMES[record.food]} → 개구리`:'풀은 먹지 않았어요'):kind==='plant'?(record.condition==='light'?'만든 양분이 많아요':'만든 양분이 적어요'):record.condition==='moist'?'더 많이 바뀌었어요':'천천히 바뀌었어요'):done?'직접 살펴봤어요':'아직 기록 전';card.append(detail);host.append(card);}
  $('.si-count').textContent=kind==='habitat'?`${records.filter(r=>r.done).length}/3`:`${kind==='food'?state.observations.filter(r=>['present','absent'].includes(r.condition)).length:state.observations.length}/2`;
 }
 function render(){
  if(destroyed)return;const c=state.controls,canSave=ready(state),record=makeRecord(state);$('.si-status').textContent=status();$('.si-save').disabled=!canSave;$('.si-discovery').hidden=!canSave;$('.si-discovery').textContent=SUMMARIES[kind];
  $('.si-next').textContent=canSave?'비교 기록이 모였어요. 다시 해 보거나, 발견을 저장할 수 있어요.':kind==='plant'?'햇빛 충분히 / 햇빛 조금을 각각 고른 뒤 시간을 끝까지 넘기고 기록해요.':kind==='food'?(state.observations.some(r=>r.condition==='present')&&state.observations.some(r=>r.condition==='absent')?'두 조건을 비교했어요. 아래에서 들판에 놓을 먹이를 골라요.':'메뚜기 있음 / 없음을 각각 고르고, 칸막이를 끝까지 열어 기록해요.'):kind==='habitat'?'비교선을 양쪽 끝까지 옮겨 보고, 출발부터 도착까지 길을 골라요.':'두 가지 흙을 각각 고른 뒤 시간을 끝까지 넘기고 기록해요.';
  for(const button of $$('[data-condition]'))button.setAttribute('aria-pressed',String(kind==='plant'?Number(button.dataset.condition)===c.shade:button.dataset.condition===(kind==='food'?c.food:c.moisture)));
  if(kind==='food'){$('.si-fixed').textContent=c.foodMode==='grass'?'풀은 따로 놓아 보는 관찰이에요':FIXED.food;const compared=['present','absent'].every(key=>state.observations.some(r=>r.condition===key));$('.si-field-choice').hidden=!compared;$('.si-discovery').hidden=!compared;for(const button of $$('[data-availability]'))button.setAttribute('aria-pressed',String(c.foodMode==='availability'&&button.dataset.availability===c.availability));for(const button of $$('[data-field-condition]')){button.disabled=!compared;button.setAttribute('aria-pressed',String(state.fieldCondition===button.dataset.fieldCondition));}$('.si-save').textContent=state.fieldCondition===null?'들판에서 해 볼 조건을 골라요':state.fieldCondition==='absent'?'애벌레만 있는 들판으로':'메뚜기와 애벌레가 있는 들판으로';}
  if($('.si-shade')){$('.si-shade').value=String(c.shade);$('.si-shade-value').textContent=c.shade>=80?'빛 조금':c.shade<=20?'빛 충분히':'가리는 중';$('.si-shade').setAttribute('aria-valuetext',$('.si-shade-value').textContent);}
  if($('.si-progress')){$('.si-progress').value=String(c.progress);$('.si-progress').disabled=!state.touched.condition;const value=kind==='food'?(c.progress===0?'닫힘':c.progress<85?'열고 있어요':'결과 보기'):kind==='decomposer'?`${Math.round(c.progress/100*14)}일째 · 모형 시간`:c.progress===0?'아침':c.progress<50?'오전':c.progress<100?'오후':'저녁';$('.si-progress-value').textContent=value;$('.si-progress').setAttribute('aria-valuetext',value);$('.si-record').disabled=!record;$('.si-record').textContent=record&&state.observations.some(r=>r.condition===record.condition)?'이 조건 다시 기록하기':'이 조건 기록하기';}
  if($('.si-comparison')){$('.si-comparison').value=String(c.comparison);$('.si-comparison-value').textContent=c.comparison<=5?'베기 전':c.comparison>=95?'벤 뒤':'두 모습 비교';$('.si-comparison').setAttribute('aria-valuetext',$('.si-comparison-value').textContent);for(const button of $$('[data-mode]'))button.setAttribute('aria-pressed',String(button.dataset.mode===c.mode));for(const button of $$('[data-comparison]'))button.setAttribute('aria-pressed',String(Number(button.dataset.comparison)===c.comparison));}
  canvas.classList.toggle('is-drawable',kind==='plant'||kind==='habitat'||kind==='food');canvas.classList.toggle('is-drawing-route',kind==='habitat'&&c.mode==='draw');renderRecords();draw();
 }
 function close(){if(!destroyed)onClose(getState());}
 listen($('.si-close'),'click',close);listen($('.si-leave'),'click',close);
 listen($('.si-reset'),'click',()=>dispatch({type:'reset'}));
 for(const button of $$('[data-condition]')){if(!button.dataset.availability)listen(button,'click',()=>dispatch({type:'condition',value:kind==='plant'?Number(button.dataset.condition):button.dataset.condition}));if(kind==='food')listen(button,'dragstart',event=>{event.dataTransfer?.setData('text/plain',button.dataset.condition);if(event.dataTransfer)event.dataTransfer.effectAllowed='copy';});}
 for(const button of $$('[data-availability]'))listen(button,'click',()=>dispatch({type:'availability',value:button.dataset.availability}));
 for(const button of $$('[data-field-condition]'))listen(button,'click',()=>dispatch({type:'field',value:button.dataset.fieldCondition}));
 for(const [name,type]of [['shade','condition'],['progress','scrub'],['comparison','compare']])if($(`.si-${name}`))listen($(`.si-${name}`),'input',event=>dispatch({type,value:Number(event.target.value)}));
 if($('.si-record'))listen($('.si-record'),'click',()=>dispatch({type:'record'}));
 for(const button of $$('[data-comparison]'))listen(button,'click',()=>dispatch({type:'compare',value:Number(button.dataset.comparison)}));
 for(const button of $$('[data-route]'))listen(button,'click',()=>dispatch({type:'route',value:button.dataset.route}));
 for(const button of $$('[data-mode]'))listen(button,'click',()=>dispatch({type:'mode',value:button.dataset.mode}));
 listen($('.si-save'),'click',()=>{if(completedThisVisit)return;const evidence=createStoryInquiryEvidence(state);if(!evidence)return;state=evidence.state;completedThisVisit=true;render();onComplete(clone(evidence));});
 if(kind==='food'){listen(canvas,'dragover',event=>event.preventDefault());listen(canvas,'drop',event=>{event.preventDefault();const value=event.dataTransfer?.getData('text/plain');if(value==='hopper'||value==='caterpillar')dispatch({type:'availability',value:value==='hopper'?'present':'absent'});else if(value==='grass')dispatch({type:'condition',value});});}
 if(kind==='food'){
  const point=event=>{const b=canvas.getBoundingClientRect();return{x:(event.clientX-b.left)/b.width*720,y:(event.clientY-b.top)/b.height*340};};
  listen(canvas,'pointerdown',event=>{if(event.button!==undefined&&event.button!==0||state.controls.foodMode!=='availability')return;const p=point(event),at=state.controls.availability==='present'?{x:446,y:222}:{x:604,y:116};if(Math.abs(p.x-at.x)>62||Math.abs(p.y-at.y)>40)return;event.preventDefault();hopperDrag={id:event.pointerId,...p};canvas.setPointerCapture?.(event.pointerId);dispatch({type:'availability',value:state.controls.availability});});
  listen(canvas,'pointermove',event=>{if(hopperDrag?.id!==event.pointerId)return;Object.assign(hopperDrag,point(event));draw();});
  listen(canvas,'pointerup',event=>{if(hopperDrag?.id!==event.pointerId)return;const p=point(event);hopperDrag=null;canvas.releasePointerCapture?.(event.pointerId);dispatch({type:'availability',value:p.y<145?'absent':'present'});});
  listen(canvas,'pointercancel',()=>{hopperDrag=null;draw();});listen(canvas,'lostpointercapture',()=>{hopperDrag=null;draw();});
 }
 function location(event){const box=canvas.getBoundingClientRect();return{x:clamp((event.clientX-box.left)/box.width,0,1),y:clamp(((event.clientY-box.top)/box.height*340-84)/240,0,1)};}
 function move(event){if(pointer!==event.pointerId)return;const p=location(event);if(kind==='plant')dispatch({type:'condition',value:Math.round(clamp((p.x*720-390)/276,0,1)*100)});else if(state.controls.mode==='draw'){const previous=state.route.at(-1);if(!previous||Math.hypot(p.x-previous.x,p.y-previous.y)>.014)dispatch({type:'route',value:[...state.route,p]});}else dispatch({type:'compare',value:Math.round((1-p.x)*100)});}
 if(kind==='plant'||kind==='habitat'){
  listen(canvas,'pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;if(kind==='plant'&&location(event).x<.5)return;event.preventDefault();pointer=event.pointerId;canvas.setPointerCapture?.(event.pointerId);if(kind==='habitat'&&state.controls.mode==='draw')dispatch({type:'route',value:[location(event)]});else move(event);});listen(canvas,'pointermove',move);
  const release=event=>{if(pointer!==event.pointerId)return;canvas.releasePointerCapture?.(event.pointerId);pointer=null;};listen(canvas,'pointerup',release);listen(canvas,'pointercancel',release);listen(canvas,'lostpointercapture',()=>{pointer=null;});
 }
 listen(root,'keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close();return;}if(event.key==='Tab'){const nodes=$$('button,input,[tabindex="0"]').filter(node=>!node.disabled&&!node.closest('[hidden]')&&node.tabIndex>=0),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}}});
 listen(win,'resize',draw);const observer=win.ResizeObserver?new win.ResizeObserver(draw):null;observer?.observe(canvas);
 // Approved images are reused for the selectable food cards; no replacement artwork is loaded.
 if(kind==='food')for(const thumb of $$('[data-thumb]')){const key=thumb.dataset.thumb,image={grass:assets?.edibleGrass,caterpillar:assets?.caterpillar,hopper:assets?.prey}[key];if(image?.src){const node=doc.createElement('img');node.src=image.src;node.alt='';node.draggable=false;thumb.append(node);}else thumb.hidden=true;}
 render();$('.si-close').focus();
 return{getState,destroy(){if(destroyed)return;destroyed=true;observer?.disconnect();events.forEach(remove=>remove());root.remove();if(priorFocus?.isConnected)priorFocus.focus();}};
}
