/** A bounded feeding-choice observation, deliberately not a population model. */
import {createCreatureRenderer} from './creatures.js';
import {hopPose,RIGS} from './motion.js';
import {GAME_EAT} from './tongue-gameplay.js';
import {samplePreyHop,PREY_MOTION} from './fauna/prey-behavior.mjs';

export const INQUIRY_DURATION=8;
export const INQUIRY_VERSION=1;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const ease=n=>{const t=clamp(n);return t*t*(3-2*t);};
const copy=value=>JSON.parse(JSON.stringify(value));
const NAMES={plants:'풀',grasshopper:'메뚜기',caterpillar:'애벌레',frog:'개구리'};
const CONDITION_NAMES={present:'A · 메뚜기 있음',absent:'B · 메뚜기 없음'};

/** All actors, patches and starting positions are identical. Only availability changes. */
export function createInquiryScenario({grasshopperAvailable=true}={}){
 return{version:INQUIRY_VERSION,condition:grasshopperAvailable?'present':'absent',grasshopperAvailable:Boolean(grasshopperAvailable),duration:INQUIRY_DURATION,
  environment:{light:'daylight',temperature:'same',plantRegrowth:false,patches:[{id:'left-patch',x:393,y:245,startingBites:6},{id:'right-patch',x:552,y:266,startingBites:6}]},
  actors:[{id:'frog',role:'frog',x:184,y:269,available:true},{id:'grasshopper',role:'grasshopper',x:437,y:216,patchId:'left-patch',available:Boolean(grasshopperAvailable)},{id:'caterpillar',role:'caterpillar',x:608,y:260,patchId:'right-patch',available:true}]};
}

/** The frog selects the nearest available food; it does not forecast abundance. */
export function selectInquiryFood(scenario){
 const frog=scenario.actors.find(a=>a.role==='frog');
 return scenario.actors.filter(a=>a.available&&['grasshopper','caterpillar'].includes(a.role)).sort((a,b)=>Math.hypot(a.x-frog.x,a.y-frog.y)-Math.hypot(b.x-frog.x,b.y-frog.y))[0]?.role??null;
}

/** Absolute-time sampling is deterministic and cannot mutate the controlled setup. */
export function sampleInquiry(scenario,seconds=0){
 const time=clamp(seconds,0,INQUIRY_DURATION),food=selectInquiryFood(scenario),forage=ease(time/1.8),preyHop=samplePreyHop(time),hop=clamp((time-3.15)/.9),frogHop=hopPose('short',hop*RIGS.short.duration),attackTime=clamp(time-4.25,0,GAME_EAT.duration),caught=time>=4.25+GAME_EAT.contact;
 const actors=scenario.actors.map(a=>({...a,phase:time,z:0,facing:a.role==='frog'?1:-1}));
 for(const a of actors){
  if(a.patchId){const patch=scenario.environment.patches.find(p=>p.id===a.patchId),progress=a.role==='grasshopper'?preyHop.progress:forage;a.x+=(patch.x-a.x)*progress;a.y+=(patch.y-8-a.y)*progress;a.feeding=a.available&&time>=1.8&&time<3.15;a.alive=!(a.role===food&&caught);if(a.role==='grasshopper'){a.z=PREY_MOTION.forageHeight*preyHop.heightFactor;a.motion={time,idleTime:Math.max(0,time-PREY_MOTION.duration),facing:-1,hop:time>0&&time<PREY_MOTION.duration?{}:null};}}
  if(a.role==='frog'){a.x+=(food==='caterpillar'?111:25)*clamp(frogHop.root.travel/RIGS.short.travel);a.hopping=hop>0&&hop<1;a.hopTime=hop*RIGS.short.duration;a.state=time>=4.25&&time<4.25+GAME_EAT.duration?'eating':'idle';a.stateTime=attackTime;a.tongue={suppress:true};a.eaten=caught?food:null;}
 }
 const patches=scenario.environment.patches.map(p=>({...p,remaining:p.startingBites-(time>=2.4&&actors.some(a=>a.available&&a.patchId===p.id)?1:0)}));
 const phase=time<1.8?'forage':time<3.15?'feeding':time<4.25?'choose':time<5.55?'catch':time<INQUIRY_DURATION?'trace':'complete';
 const events=[];
 if(time>=2.4)for(const actor of actors.filter(a=>a.available&&a.patchId))events.push({type:'foraged',actor:actor.role,food:'plants',patchId:actor.patchId,at:2.4});
 if(caught&&food)events.push({type:'fed',actor:'frog',food,at:4.25+GAME_EAT.contact});
 return{time,food,actors,patches,phase,attackTime,caught,events,complete:time>=INQUIRY_DURATION};
}

/** Completion requires a full observation, not simply selecting a condition. */
export function makeInquiryRecord(scenario,{elapsed=0,observedSeconds=0}={}){
 if(!Number.isFinite(elapsed)||!Number.isFinite(observedSeconds)||elapsed<INQUIRY_DURATION-1e-6||observedSeconds<INQUIRY_DURATION-1e-6)return null;
 const result=sampleInquiry(scenario,INQUIRY_DURATION);
 return{version:INQUIRY_VERSION,condition:scenario.condition,grasshopperAvailable:scenario.grasshopperAvailable,completed:true,observedSeconds:INQUIRY_DURATION,food:result.food,
  startingConditions:copy(scenario),events:result.events,foodWebEdges:result.events.map(event=>({food:event.food,eater:event.actor})),plantRegrowth:false};
}

export function restoreInquiryState(value={}){
 const input=value?.state??value??{},source=Array.isArray(input.records)?input.records:Object.values(input.records??{}),records={};
 for(const record of source){
  if(!record||!['present','absent'].includes(record.condition)||record.version!==INQUIRY_VERSION||record.completed!==true||!Number.isFinite(record.observedSeconds)||record.observedSeconds<INQUIRY_DURATION)continue;
  const expected=createInquiryScenario({grasshopperAvailable:record.condition==='present'});
  if(record.food!==selectInquiryFood(expected)||record.grasshopperAvailable!==expected.grasshopperAvailable)continue;
  // Recreate trusted bounded model evidence; stored fields never become markup.
  records[record.condition]=makeInquiryRecord(expected,{elapsed:INQUIRY_DURATION,observedSeconds:INQUIRY_DURATION});
 }
 return{version:INQUIRY_VERSION,selectedCondition:input.selectedCondition==='absent'?'absent':'present',tab:input.tab==='compare'?'compare':'observe',records,completed:Boolean(input.completed&&records.present&&records.absent)};
}

export function createInquiryEvidence(state){
 const normalized=restoreInquiryState(state);
 if(!normalized.records.present||!normalized.records.absent)return null;
 normalized.completed=true;
 return{kind:'food-web-inquiry',version:INQUIRY_VERSION,completed:true,model:'simplified-feeding-choice',records:Object.values(normalized.records),
  fieldCondition:normalized.selectedCondition,comparison:{sameStartingConditions:true,changedVariable:'grasshopperAvailability',presentFood:'grasshopper',absentFood:'caterpillar'},
  knowledge:['plants-producers','food-to-eater','alternate-food-route'],state:normalized};
}

let instanceCounter=0;
/** Isolated modal; parent owns pausing/restoring the main game and persisting state. */
export function mountInquiry(container,{assets=null,onComplete=()=>{},onClose=()=>{},initialState={}}={}){
 if(!container?.ownerDocument)throw new Error('A DOM container is required for the field lab');
 const doc=container.ownerDocument,win=doc.defaultView??globalThis,id=`inquiry-${++instanceCounter}`,state=restoreInquiryState(initialState),root=doc.createElement('section'),previousFocus=doc.activeElement;
 root.className='iq-shell';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby',`${id}-title`);
 root.innerHTML=`<div class="iq-panel">
  <div class="iq-heading"><div><span class="iq-eyebrow">FIELD LAB · 작은 생태 관찰실</span><h2 id="${id}-title">먹이 하나가 없다면?</h2></div><button type="button" class="iq-close" aria-label="관찰실 닫기">×</button></div>
  <p class="iq-intro">같은 풀밭에서 메뚜기만 바꿔 보세요. 개구리는 무엇을 먹을까요?</p>
  <div class="iq-tabs" role="tablist" aria-label="관찰실 보기"><button type="button" role="tab" class="iq-tab" data-tab="observe" id="${id}-observe-tab" aria-controls="${id}-observe">01 직접 관찰</button><button type="button" role="tab" class="iq-tab" data-tab="compare" id="${id}-compare-tab" aria-controls="${id}-compare">02 기록 비교 <span class="iq-count">0/2</span></button></div>
  <div class="iq-observe" id="${id}-observe" role="tabpanel" aria-labelledby="${id}-observe-tab">
   <div class="iq-stage"><canvas class="iq-canvas" width="720" height="340" role="img" aria-label="같은 풀밭에서 풀을 먹는 곤충과 먹이를 고르는 개구리 관찰"></canvas><div class="iq-stage-top"><span class="iq-condition-tag"></span><span class="iq-timer">0.0 / 8초</span></div><span class="iq-species iq-frog-label">개구리</span><span class="iq-species iq-grasshopper-label">메뚜기</span><span class="iq-species iq-caterpillar-label">애벌레</span><span class="iq-plant-label">풀 · 생산자</span><div class="iq-stage-caption">먹이 관계는 관찰 뒤에 기록돼요</div></div>
   <div class="iq-progress" role="progressbar" aria-label="관찰 진행" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0"><span></span></div>
   <div class="iq-status" aria-live="polite"><span class="iq-status-dot"></span><p class="iq-status-text"></p></div>
   <div class="iq-control-grid"><div class="iq-variable"><div class="iq-control-title"><strong>바꿀 조건: 메뚜기</strong><span class="iq-fixed-label">다른 시작 조건은 같아요</span></div><div class="iq-switch-row"><button type="button" data-availability="absent">없음</button><input class="iq-availability" type="range" min="0" max="1" step="1" value="1" aria-label="메뚜기 있음 또는 없음"><button type="button" data-availability="present">있음</button></div><p class="iq-variable-hint">손잡이를 끌거나 ‘있음 / 없음’을 눌러요</p></div><div class="iq-run-controls"><button type="button" class="iq-run iq-primary">▶ 관찰 시작</button><button type="button" class="iq-reset" aria-label="현재 조건을 같은 시작 상태로 되돌리기">↺ 다시 놓기</button></div></div>
   <div class="iq-trial-chips"><button type="button" data-condition="present"><span class="iq-trial-icon">A</span><span>메뚜기 있음</span><span class="iq-trial-check">미관찰</span></button><button type="button" data-condition="absent"><span class="iq-trial-icon">B</span><span>메뚜기 없음</span><span class="iq-trial-check">미관찰</span></button></div>
  </div>
  <div class="iq-comparison" id="${id}-compare" role="tabpanel" aria-labelledby="${id}-compare-tab" hidden><div class="iq-comparison-head"><span class="iq-eyebrow">MY FIELD NOTES</span><h3>같은 시작, 다른 먹이 선택</h3><p>두 장면을 끝까지 보면 먹이 관계가 기록돼요</p></div><div class="iq-records"></div><div class="iq-discovery" hidden><span class="iq-discovery-mark">↗</span><div><strong>다른 먹이로 이어지는 길을 찾았어요</strong><p>메뚜기가 없을 때 개구리가 애벌레를 먹었어요. 먹이 관계는 한 줄이 아니라 여러 갈래로 연결될 수 있어요.</p></div></div><p class="iq-arrow-key"><span>먹이 → 먹는 생물</span> 화살표는 먹이가 전달되는 방향이에요. 공격 방향과는 달라요.</p><div class="iq-field-choice"><strong>어떤 조건에서 직접 살아볼까요?</strong><div class="iq-switch-row"><button type="button" data-field-condition="present">A · 두 먹이 길</button><button type="button" data-field-condition="absent">B · 메뚜기 없는 들판</button></div><p>선택한 조건이 돌아갈 들판에 적용돼요. 먹이를 찾아 먹고 관찰소로 돌아오세요.</p></div><button type="button" class="iq-save iq-primary">이 조건으로 들판에 돌아가기</button></div>
  <div class="iq-footnote"><span class="iq-safe-badge">게임은 잠시 쉬는 중</span><p>단순화한 먹이 선택 모형이에요. 개체 수의 미래 변화나 실제 생태계 전체를 예측하지 않아요. 풀도 바로 다시 자라지 않아요.</p></div>
 </div>`;
 container.append(root);
 const $=selector=>root.querySelector(selector),$$=selector=>[...root.querySelectorAll(selector)],canvas=$('.iq-canvas'),ctx=canvas.getContext('2d'),art=assets?.atlas&&assets?.prey?createCreatureRenderer(assets):null;
 let scenario=createInquiryScenario({grasshopperAvailable:state.selectedCondition==='present'}),elapsed=0,observed=0,running=false,finished=false,destroyed=false,lastFrame=0,frameId=null,lastStatus='',needsDraw=true;
 const requestFrame=win.requestAnimationFrame?.bind(win)??(fn=>win.setTimeout(()=>fn(win.performance?.now?.()??Date.now()),16));
 const cancelFrame=win.cancelAnimationFrame?.bind(win)??win.clearTimeout.bind(win);
 const events=[];
 function listen(target,event,fn){target.addEventListener(event,fn);events.push(()=>target.removeEventListener(event,fn));}
 function getState(){return copy({...state,version:INQUIRY_VERSION});}
 function updateStatus(text){if(text===lastStatus)return;lastStatus=text;$('.iq-status-text').textContent=text;}
 function phaseText(sample){
  if(finished)return state.records.present&&state.records.absent?'두 조건을 모두 관찰했어요. 기록 비교에서 연결을 살펴보세요.':`조건 ${state.selectedCondition==='present'?'A':'B'} 기록 완료! 메뚜기 조건을 바꾸고 한 번 더 관찰해 보세요.`;
  if(!running)return elapsed>0?'관찰을 잠시 멈췄어요. 이어서 볼 수 있어요.':`조건 ${state.selectedCondition==='present'?'A':'B'} 준비 완료. 관찰을 시작해 보세요.`;
  if(sample.phase==='forage')return'곤충들이 풀밭으로 움직여요. 어디에서 먹는지 살펴보세요.';
  if(sample.phase==='feeding')return'풀은 생산자예요. 곤충들이 각자의 풀밭에서 풀을 먹어요.';
  if(sample.phase==='choose')return'개구리가 먹이를 고르고 있어요. 어느 곤충을 향하나요?';
  if(sample.phase==='catch')return`개구리가 ${NAMES[sample.food]}를 먹고 있어요.`;
  return`관찰한 관계: ${NAMES[sample.food]} → 개구리. 화살표는 먹이에서 먹는 생물 쪽이에요.`;
 }
 function updateControls(){
  $('.iq-condition-tag').textContent=CONDITION_NAMES[state.selectedCondition];$('.iq-availability').value=state.selectedCondition==='present'?'1':'0';$('.iq-availability').setAttribute('aria-valuetext',state.selectedCondition==='present'?'메뚜기 있음':'메뚜기 없음');
  for(const button of $$('[data-availability]')){button.setAttribute('aria-pressed',String(button.dataset.availability===state.selectedCondition));button.disabled=running;}
  $('.iq-availability').disabled=running;
  for(const button of $$('[data-condition]')){const chosen=button.dataset.condition===state.selectedCondition,recorded=Boolean(state.records[button.dataset.condition]);button.classList.toggle('is-current',chosen);button.classList.toggle('is-recorded',recorded);button.setAttribute('aria-pressed',String(chosen));button.disabled=running;button.querySelector('.iq-trial-check').textContent=recorded?'✓ 관찰 완료':'미관찰';}
  $('.iq-run').textContent=running?'Ⅱ 잠시 멈춤':finished?'↻ 한 번 더 보기':elapsed>0?'▶ 이어서 관찰':'▶ 관찰 시작';
  const count=Object.keys(state.records).length;$('.iq-count').textContent=`${count}/2`;
  $('.iq-stage').classList.toggle('is-absent',state.selectedCondition==='absent');$('.iq-stage').classList.toggle('is-running',running);
  $('.iq-save').disabled=count<2;$('.iq-save').textContent=`${state.selectedCondition==='present'?'A · 두 먹이 길':'B · 메뚜기 없는 들판'}로 돌아가기`;for(const button of $$('[data-field-condition]')){button.disabled=count<2;button.setAttribute('aria-pressed',String(button.dataset.fieldCondition===state.selectedCondition));}
  $('.iq-discovery').hidden=count<2;
  updateStatus(phaseText(sampleInquiry(scenario,elapsed)));
 }
 function setCondition(condition){
  if(running||!['present','absent'].includes(condition))return;
  state.selectedCondition=condition;scenario=createInquiryScenario({grasshopperAvailable:condition==='present'});elapsed=observed=0;finished=false;needsDraw=true;updateControls();draw();
 }
 function setTab(tab){
  if(tab==='compare'&&running){running=false;updateControls();}
  state.tab=tab;for(const button of $$('[data-tab]')){const selected=button.dataset.tab===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
  $('.iq-observe').hidden=tab!=='observe';$('.iq-comparison').hidden=tab!=='compare';
  if(tab==='compare')renderRecords();else{needsDraw=true;draw();}
 }
 function renderRecords(){
  const host=$('.iq-records');host.replaceChildren();
  for(const condition of ['present','absent']){
   const record=state.records[condition],card=doc.createElement('article');card.className=`iq-record ${record?'is-recorded':''}`;
   const top=doc.createElement('div');top.className='iq-record-top';const title=doc.createElement('strong');title.textContent=CONDITION_NAMES[condition];const badge=doc.createElement('span');badge.textContent=record?'✓ 8초 관찰 완료':'아직 관찰하지 않았어요';top.append(title,badge);card.append(top);
   if(record){
    const chain=doc.createElement('div');chain.className='iq-food-chain';chain.setAttribute('aria-label',`풀에서 ${NAMES[record.food]}, 그리고 개구리로 이어지는 먹이 관계`);
    for(const [index,name]of ['풀',NAMES[record.food],'개구리'].entries()){if(index){const arrow=doc.createElement('span');arrow.className='iq-chain-arrow';arrow.textContent='→';chain.append(arrow);}const node=doc.createElement('span');node.className=`iq-chain-node ${index===0?'is-producer':''}`;node.textContent=name;chain.append(node);}card.append(chain);
    const extra=doc.createElement('p');extra.className='iq-record-extra';extra.textContent=condition==='present'?'함께 관찰: 풀 → 애벌레':'메뚜기와 연결된 먹이 길은 이번 관찰에 없었어요';card.append(extra);
   }else{const button=doc.createElement('button');button.type='button';button.textContent='이 조건 관찰하기 →';button.addEventListener('click',()=>{setCondition(condition);setTab('observe');$('.iq-run').focus();});card.append(button);}
   host.append(card);
  }
 }
 function ellipse(x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
 function patch(p,time){
  ellipse(p.x,p.y+6,52,21,'#66844555');ellipse(p.x,p.y+6,46,17,'#bfcb8740');
  for(let i=0;i<13;i++){const a=i*2.399,rad=34*Math.sqrt((i+1)/13),x=p.x+Math.cos(a)*rad,y=p.y+Math.sin(a)*rad*.35,bite=p.remaining<p.startingBites&&i===5,h=bite?5:15+(i%3)*4,sway=Math.sin(time*1.5+i)*1.2;ctx.strokeStyle=i%2?'#99b361':'#516d35';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y+4);ctx.quadraticCurveTo(x-2+sway,y-h*.55,x-5+sway,y-h);ctx.moveTo(x,y+4);ctx.quadraticCurveTo(x+5+sway,y-h*.65,x+7+sway,y-h*.75);ctx.stroke();}
 }
 function arrow(from,to,bend=0){
  const middle={x:(from.x+to.x)/2,y:(from.y+to.y)/2+bend},angle=Math.atan2(to.y-middle.y,to.x-middle.x);ctx.save();ctx.strokeStyle='#ffecad';ctx.fillStyle='#ffecad';ctx.lineWidth=3.5;ctx.lineCap='round';ctx.shadowColor='#203b2d';ctx.shadowBlur=4;ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo(middle.x,middle.y,to.x,to.y);ctx.stroke();ctx.beginPath();ctx.moveTo(to.x,to.y);ctx.lineTo(to.x-Math.cos(angle-.5)*11,to.y-Math.sin(angle-.5)*11);ctx.lineTo(to.x-Math.cos(angle+.5)*11,to.y-Math.sin(angle+.5)*11);ctx.closePath();ctx.fill();ctx.restore();
 }
 function draw(){
  if(!ctx||destroyed||state.tab!=='observe')return;
  const sample=sampleInquiry(scenario,elapsed),box=canvas.getBoundingClientRect(),ratio=Math.min(2,win.devicePixelRatio||1),width=Math.max(1,Math.round((box.width||720)*ratio)),height=Math.round(width*340/720);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  ctx.setTransform(width/720,0,0,height/340,0,0);ctx.clearRect(0,0,720,340);
  const gradient=ctx.createLinearGradient(0,0,720,340);gradient.addColorStop(0,'#6f8a64');gradient.addColorStop(.5,'#9aae77');gradient.addColorStop(1,'#718b60');ctx.fillStyle=gradient;ctx.fillRect(0,0,720,340);
  if(assets?.ground){ctx.save();ctx.globalAlpha=.24;ctx.drawImage(assets.ground,70,330,1460,570,0,0,720,340);ctx.restore();}
  ctx.save();ctx.globalAlpha=.16;ellipse(275,186,294,111,'#f4ecc0');ctx.restore();
  for(let i=0;i<24;i++){const x=22+(i*113)%684,y=80+(i*67)%242;ctx.strokeStyle='#42663844';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y-5);ctx.moveTo(x,y);ctx.lineTo(x+3,y-6);ctx.stroke();}
  for(const p of sample.patches)patch(p,sample.time);
  const frog=sample.actors.find(a=>a.role==='frog'),target=sample.actors.find(a=>a.role===sample.food),afterCatch=sample.time>=5.55;
  for(const actor of sample.actors.filter(a=>a.role!=='frog')){
   if(!actor.available){ctx.save();ctx.setLineDash([4,5]);ellipse(393,237,30,11,null,'#d3ddab77');ctx.restore();continue;}
   let x=actor.x,y=actor.y,alpha=1;
   if(actor.role===sample.food&&sample.caught&&!afterCatch){const u=ease((sample.attackTime-GAME_EAT.hold)/(GAME_EAT.retract-GAME_EAT.hold));x+=(frog.x+68-x)*u;y+=(frog.y-38-y)*u;alpha=sample.attackTime>=GAME_EAT.commit?0:1;}
   if(afterCatch&&actor.role===sample.food)alpha=.24;
   ctx.save();ctx.globalAlpha=alpha;ellipse(x,y+5,actor.role==='grasshopper'?30:24,7,'#2f4a2f33');
   if(art){if(actor.role==='grasshopper')art.prey(ctx,x,y,{...actor,z:actor.feeding?Math.sin(sample.time*8)*1.2:actor.z});else art.caterpillar(ctx,x,y,actor);}
   else if(actor.role==='caterpillar'){for(let i=0;i<6;i++)ellipse(x-20+i*7,y-3,6,7,i===5?'#dfbd66':'#b5c875','#526735');}
   else{ellipse(x,y-4,25,9,'#aec977','#3f6339');ctx.strokeStyle='#3e5735';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-8,y);ctx.lineTo(x-20,y-16);ctx.lineTo(x-29,y+7);ctx.stroke();}
   if(actor.feeding){ctx.fillStyle='#e4ebac';for(let i=0;i<3;i++){const t=(sample.time*1.6+i/3)%1;ctx.fillRect(x-8+i*7,y-17-t*13,3*(1-t),3*(1-t));}}
   ctx.restore();
  }
  ellipse(frog.x+2,frog.y+4,57,14,'#203c3033');
  if(art){art.frog(ctx,{...frog,pose:frog.hopping?hopPose('short',frog.hopTime):null},{x:frog.x,y:frog.y});}
  else{ellipse(frog.x,frog.y-23,43,28,'#99b56a','#45653d');ellipse(frog.x+31,frog.y-39,20,18,'#a7bd73','#45653d');ellipse(frog.x+33,frog.y-51,8,8,'#f0df94');ellipse(frog.x+36,frog.y-52,3,4,'#263d29');}
  if(frog.state==='eating'&&sample.attackTime>=GAME_EAT.extend&&sample.attackTime<GAME_EAT.retract){
   const t=sample.attackTime,reach=t<GAME_EAT.contact?ease((t-GAME_EAT.extend)/(GAME_EAT.contact-GAME_EAT.extend)):t<GAME_EAT.hold?1:1-ease((t-GAME_EAT.hold)/(GAME_EAT.retract-GAME_EAT.hold)),start={x:frog.x+68,y:frog.y-36},end={x:start.x+(target.x-start.x)*reach,y:start.y+(target.y-3-start.y)*reach};
   ctx.strokeStyle='#795852';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.strokeStyle='#eaa29a';ctx.lineWidth=6;ctx.stroke();ellipse(end.x,end.y,5,4,'#f3b7a6');
  }
  if(afterCatch){const prey={x:target.x,y:target.y-13};arrow({x:target.x-22,y:target.y+36},{x:target.x-5,y:target.y+9},-6);arrow({x:prey.x-22,y:prey.y-11},{x:frog.x+54,y:frog.y-65},-49);}
  $('.iq-frog-label').style.left=`${frog.x/720*100}%`;
  $('.iq-grasshopper-label').style.left=`${sample.actors.find(a=>a.role==='grasshopper').x/720*100}%`;
  $('.iq-caterpillar-label').style.left=`${sample.actors.find(a=>a.role==='caterpillar').x/720*100}%`;
  $('.iq-stage-caption').textContent=afterCatch?`먹이 → 먹는 생물  ·  ${NAMES[sample.food]} → 개구리`:'먹이 관계는 관찰 뒤에 기록돼요';
  $('.iq-stage-caption').classList.toggle('is-trace',afterCatch);
  $('.iq-timer').textContent=`${elapsed.toFixed(1)} / 8초`;$('.iq-progress span').style.width=`${elapsed/INQUIRY_DURATION*100}%`;$('.iq-progress').setAttribute('aria-valuenow',elapsed.toFixed(1));
  updateStatus(phaseText(sample));needsDraw=false;
 }
 function resetCurrent(){running=false;elapsed=observed=0;finished=false;lastFrame=0;needsDraw=true;updateControls();draw();}
 function run(){if(running){running=false;updateControls();return;}if(finished){elapsed=observed=0;finished=false;}running=true;lastFrame=0;updateControls();}
 function frame(now){
  if(destroyed)return;
  if(running&&!doc.hidden&&state.tab==='observe'){
   const delta=lastFrame?clamp((now-lastFrame)/1000,0,.05):0;
   elapsed=Math.min(INQUIRY_DURATION,elapsed+delta);observed=Math.min(INQUIRY_DURATION,observed+delta);needsDraw=true;
   if(elapsed>=INQUIRY_DURATION){running=false;finished=true;state.records[state.selectedCondition]=makeInquiryRecord(scenario,{elapsed,observedSeconds:observed});updateControls();}
  }
  lastFrame=now;if(needsDraw)draw();frameId=requestFrame(frame);
 }
 function close(){running=false;onClose(getState());}
 function onKey(event){
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
  if(event.key==='Tab'){const nodes=$$('button,input,[tabindex="0"]').filter(node=>!node.disabled&&!node.closest('[hidden]')&&node.tabIndex>=0),first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}}
 }
 listen($('.iq-close'),'click',close);listen($('.iq-run'),'click',run);listen($('.iq-reset'),'click',resetCurrent);
 listen($('.iq-availability'),'input',event=>setCondition(Number(event.target.value)===1?'present':'absent'));
 for(const button of $$('[data-availability]'))listen(button,'click',()=>setCondition(button.dataset.availability));
 for(const button of $$('[data-condition]'))listen(button,'click',()=>setCondition(button.dataset.condition));
 for(const button of $$('[data-tab]')){listen(button,'click',()=>setTab(button.dataset.tab));listen(button,'keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'observe':event.key==='End'?'compare':state.tab==='observe'?'compare':'observe';setTab(next);$(`[data-tab="${next}"]`).focus();}});}
 for(const button of $$('[data-field-condition]'))listen(button,'click',()=>setCondition(button.dataset.fieldCondition));
 listen($('.iq-save'),'click',()=>{const evidence=createInquiryEvidence(state);if(evidence){state.completed=true;updateControls();onComplete(evidence);}});
 listen(root,'keydown',onKey);
 listen(doc,'visibilitychange',()=>{lastFrame=0;if(doc.hidden&&running){running=false;updateControls();}});
 listen(win,'resize',()=>{needsDraw=true;draw();});
 const resizeObserver=win.ResizeObserver?new win.ResizeObserver(()=>{needsDraw=true;draw();}):null;resizeObserver?.observe(canvas);
 updateControls();setTab(state.tab);frameId=requestFrame(frame);$('.iq-close').focus();
 return{getState,destroy(){if(destroyed)return;destroyed=true;running=false;cancelFrame(frameId);resizeObserver?.disconnect();events.forEach(remove=>remove());root.remove();if(previousFocus?.isConnected)previousFocus.focus();}};
}
