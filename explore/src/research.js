import {summarizeRound} from './exploration.js';
import {relationshipLines} from './learning-records.js';
export function beginObservation(w){w.observation={distance:0,last:{x:w.player.x,y:w.player.y},firstFood:null};}
export function observe(w){const o=w.observation;if(!o)return;const p=w.player;o.distance+=Math.hypot(p.x-o.last.x,p.y-o.last.y);o.last={x:p.x,y:p.y};if(o.firstFood===null){const e=w.learningEvents.find(e=>e.type==='ate');if(e)o.firstFood=e.time??w.time;}}
export function snapshot(w){return {...summarizeRound(w),distance:Math.round(w.observation?.distance??0),firstFood:w.observation?.firstFood??null};}
export function createExpedition(initial=null,onChange=()=>{}){let mode=null,stage=0,prediction=null,rounds=[];const notify=()=>onChange({mode,stage,prediction,rounds});const api={get mode(){return mode;},get stage(){return stage;},get prediction(){return prediction;},get rounds(){return rounds;},restore(c){mode=c?.mode??null;rounds=c?.rounds??[];stage=rounds.length;prediction=c?.prediction??null;},start(next,guess=null){mode=next;stage=0;prediction=guess;rounds=[];notify();},cancel(){mode=null;stage=0;rounds=[];notify();},record(w){if(!mode||w.status==='playing'||stage>=2)return false;const role=mode==='roles'?(stage===0?'frog':'grasshopper'):'grasshopper',condition=mode==='grass'&&stage===1?'cut':'meadow';if((w.role??'frog')!==role||(w.condition??'meadow')!==condition||!w.timed)return false;rounds.push(snapshot(w));stage++;notify();return true;}};api.restore(initial);return api;}
export function showResearch({expedition,showDialog,launch,journal,world}){
 const area=document.getElementById('dialog-content');
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const note=text=>area.append(el('p',text));
 const button=(text,fn,parent=area)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);parent.append(b);return b;};
 const run=()=>launch(expedition.mode==='roles'&&expedition.stage===0?'frog':'grasshopper',expedition.mode==='grass'&&expedition.stage===1?'cut':'meadow');
 function intro(){showDialog('연못 탐험 연구소',[]);const board=el('div',null,'research-board'),img=el('img');img.src=document.getElementById('research-reference').src;img.alt='연못 탐험 연구소. 입장 바꾸기: 먹이였던 내가 사냥꾼? 풀밭 바꾸기: 예상하고 비교해요.';board.append(img);area.append(board);
 const a=button('입장 바꾸기',()=>{showDialog('입장 바꾸기 · 두 번의 탐험',[]);note('개구리로 한 판, 메뚜기로 한 판! 같은 연못에서 먹이와 피해야 할 동물이 어떻게 바뀌는지 찾아봐요.');note('각 판은 최대 90초예요. 잡혀도 기록을 살펴보고 다음 탐험으로 갈 수 있어요.');button('개구리부터 탐험',()=>{expedition.start('roles');run();});},board);a.className='research-hotspot left';
 const b=button('풀밭 바꾸기',predict,board);b.className='research-hotspot right';
 note('연구 비교는 이 브라우저의 학습 기록에 저장돼요. 게임 도중 열어도 시간은 멈춰요. 새 탐험을 시작하면 지금 진행 중인 판은 끝낸 기록에 넣지 않아요.');
 if(expedition.mode&&expedition.stage<2)button('진행 중인 연구 이어가기',()=>{showDialog('연구 이어가기',[]);note(expedition.stage===0?'첫 번째 조건을 다시 시작해요.':'첫 기록은 보존하고 두 번째 조건을 시작해요.');button('이 조건 시작',run);});
 if(expedition.rounds.length===2)button('완료한 비교 다시 보기',results);
 }
 function predict(){showDialog('먼저 예상해 볼까요?',[]);note('가운데 풀밭 하나가 베어지면, 먹이를 찾는 내 움직임이 어떻게 달라질까요?');note('정답 시험이 아니에요. 예상 하나를 고른 뒤 직접 확인해요.');for(const guess of ['더 멀리 찾아갈 것 같아요','비슷할 것 같아요','아직 잘 모르겠어요'])button(guess,()=>{showDialog('① 기본 풀밭부터 탐험',[]);note('내 예상: '+guess);note('먼저 기본 풀밭, 다음은 가운데 풀밭 하나가 베어진 조건이에요. 시작 위치와 난수, 동물의 규칙은 같고 각 판은 최대 90초예요.');button('기본 풀밭 시작',()=>{expedition.start('grass',guess);run();});});}
 function card(r,label){const section=el('section',null,'research-card');section.append(el('h3',label),el('p',`${r.time}초 · 먹이 ${r.food}개 · ${r.status==='caught'?'잡힘':r.endCause==='food-exhausted'?'클리어':'시간 종료'}`));const event=r.events.find(e=>e.type==='ate')??r.events.find(e=>e.type==='caught');if(event){const names={grass:'풀',grasshopper:'메뚜기',frog:'개구리',snake:'뱀',hawk:'매'};section.append(el('p',`${names[event.food]} → ${names[event.eater]}`));}const detail=el('details');detail.append(el('summary','자세한 사건 기록'),el('p',`이동 거리 ${r.distance} 게임 단위 · 첫 먹기 ${r.firstFood===null?'기록 없음':r.firstFood.toFixed(1)+'초'}`));for(const line of relationshipLines({learningEvents:r.events,backgroundSummary:{}}))detail.append(el('p',line));section.append(detail);return section;}

 function results(){showDialog('내 두 번의 탐험 비교',[]);const pair=el('div',null,'research-pair');expedition.rounds.forEach((r,i)=>pair.append(card(r,expedition.mode==='roles'?(i?'② 메뚜기 입장':'① 개구리 입장'):(i?'② 풀밭 일부가 베어짐':'① 기본 풀밭'))));area.append(pair);
 note('선택 활동이에요. 달라진 점 한 가지만 이야기해도 좋아요.');
 if(expedition.mode==='grass'){note('내 예상: '+expedition.prediction);const tip=el('details');tip.append(el('summary','비교할 때 기억할 점'),el('p','먹이 개수는 과학 이해 점수가 아니에요. 이동 거리는 게임 단위예요. 조작과 끝난 시간이 달라질 수 있으므로 두 판의 차이를 풀의 양 때문이라고만 단정하지 않아요.'));area.append(tip);note('풀밭이 줄었을 때 나는 어떻게 했나요?');}else{note('모형의 관계: 풀 → 메뚜기 → 개구리 → 뱀. 위의 사건 기록과 구분해요.');note('메뚜기 입장에서 개구리는 어떤 존재였나요?');}
 const answer=el('p','내 경험에 맞는 것을 골라요.','learn-feedback');answer.setAttribute('role','status');
 for(const label of expedition.mode==='grass'?['다른 풀밭을 찾아갔어요','크게 다르지 않았어요','다시 해 보고 싶어요']:['먹이에서 쫓기는 입장으로 바뀌었어요','아직 관계가 헷갈려요'])button(label,()=>{answer.textContent=label+' · 내 경험을 떠올렸어요.';});area.append(answer);button('다른 연구 선택',intro);
 }
 if(expedition.mode&&expedition.stage===2)results();else if(expedition.mode&&expedition.stage===1){showDialog('첫 탐험 기록을 챙겼어요',[]);area.append(card(expedition.rounds[0],'① 끝낸 탐험'));note(expedition.mode==='roles'?'이제 메뚜기가 되어 개구리를 만나 봐요.':'이번에는 가운데 풀밭 하나만 줄여 봐요. 나머지 시작 조건은 같아요.');button('두 번째 탐험 시작',run);}else intro();
}
