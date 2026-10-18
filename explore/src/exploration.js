import {relationshipLines} from './learning-records.js';
export const CHAIN=['grass','grasshopper','frog'];
export function checkChain(order){return order.length===3&&order.every((id,i)=>id===CHAIN[i]);}
export function summarizeRound(w){return{role:w.role??'frog',condition:w.condition??'meadow',status:w.status,endCause:w.endCause??null,time:Math.round(w.time),food:w.player.eaten,events:w.learningEvents.filter(e=>['ate','caught'].includes(e.type)).map(e=>({...e}))};}
export function createJournal(storage){let rounds=[];try{const saved=JSON.parse(storage?.getItem('pond-journal-v011')??'[]');if(Array.isArray(saved))rounds=saved.filter(r=>['frog','grasshopper','snake','hawk'].includes(r?.role)&&Array.isArray(r.events)&&Number.isFinite(r.food)).slice(-8);}catch{}return{get rounds(){return rounds;},restore(saved){rounds=JSON.parse(JSON.stringify(saved.slice(-8)));try{storage?.setItem('pond-journal-v011',JSON.stringify(rounds));}catch{}},save(w){if(w.status==='playing')return;rounds=[...rounds,summarizeRound(w)].slice(-8);try{storage?.setItem('pond-journal-v011',JSON.stringify(rounds));}catch{}},clear(){rounds=[];try{storage?.removeItem('pond-journal-v011');}catch{}}};}
export function showExploration({world,journal,showDialog,onRole,onCondition,tab='plant'}){
 const names={grass:'풀',grasshopper:'메뚜기',frog:'개구리'},area=document.getElementById('dialog-content');
 showDialog('연못 탐험 수첩',[]);
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const row=el('div',null,'learn-tabs'),body=el('section',null,'learn-body');area.append(row,body);
 const button=(parent,text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);parent.append(b);return b;};
 const note=text=>body.append(el('p',text));
 function render(which){body.replaceChildren();for(const b of row.children)b.setAttribute('aria-pressed',String(b.dataset.tab===which));
  if(which==='plant'){
   const photo=el('img');photo.src=document.getElementById('grass-reference').src;photo.alt='햇빛을 받은 푸른 풀의 잎';photo.className='plant-closeup';const figure=el('figure',null,'plant-figure');figure.append(photo,el('figcaption','풀 · 스스로 양분을 만드는 생산자'));let enlarged=false;const zoom=button(figure,'풀 그림 크게 보기',()=>{enlarged=!enlarged;figure.classList.toggle('enlarged',enlarged);zoom.textContent=enlarged?'작게 보기':'풀 그림 크게 보기';zoom.setAttribute('aria-expanded',String(enlarged));});zoom.setAttribute('aria-expanded','false');body.append(figure);
   body.append(el('h3','메뚜기가 먹은 풀은 어떻게 살아갈까?'));
   const ate=world.learningEvents.some(e=>e.food==='grass');note(ate?'메뚜기가 먹는 풀을 살펴봐요. 그림 아래 버튼으로 크게 볼 수 있어요.':'그림 속 풀을 살펴봐요. 아래 버튼으로 크게 볼 수 있어요.');
   note('풀에 햇빛과 물을 연결해 보세요.');const choices=el('div',null,'choice-row'),answer=el('p','두 가지를 골라요.','learn-feedback');answer.setAttribute('role','status');body.append(choices,answer);const chosen=new Set();
   for(const [id,label]of [['sun','☀ 햇빛'],['water','💧 물'],['prey','메뚜기 먹이']]){const b=button(choices,label,()=>{if(id==='prey'){answer.textContent='풀은 메뚜기를 먹지 않아요. 풀은 스스로 양분을 만드는 생산자예요.';return;}chosen.add(id);b.setAttribute('aria-pressed','true');answer.textContent=chosen.size===2?'연결했어요! 풀은 햇빛 등을 이용해 스스로 양분을 만들어요. 물도 필요해요. 메뚜기는 풀을 먹는 소비자예요.':'하나 더 연결해 보세요.';});b.setAttribute('aria-pressed','false');}
   note('실제 풀의 성장은 시간이 필요해요. 게임에서 먹은 잎이 즉시 다시 자라지는 않아요. 햇빛과 물은 먹이사슬의 생물 카드가 아니에요.');
  }else if(which==='chain'){
   body.append(el('h3','먹히는 쪽부터 차례대로 눌러요'));
   note('메뚜기의 입장도 떠올려 봐요. 풀부터 시작해 먹이사슬을 연결해 보세요.');const order=[],cards=el('div',null,'choice-row'),line=el('p','빈 자리 → 빈 자리 → 빈 자리','chain-line'),feedback=el('p','화살표는 먹히는 생물에서 먹는 생물로!','learn-feedback');feedback.setAttribute('role','status');body.append(cards,line,feedback);
   for(const id of ['frog','grass','grasshopper'])button(cards,names[id],()=>{if(order.includes(id)||order.length===3)return;order.push(id);line.textContent=order.map(x=>names[x]).join(' → ');if(order.length===3)feedback.textContent=checkChain(order)?'연결 성공! 풀은 생산자, 메뚜기와 개구리는 소비자예요.':'먹히는 쪽에서 먹는 쪽으로 가야 해요. 풀은 누가 먹었나요? 다시 연결해 봐요.';});
   button(body,'다시 연결',()=>render('chain'));body.append(el('h4','이번 판에서 실제로 확인한 관계'));for(const t of relationshipLines(world))note(t);note('위 카드 연결은 먹이 관계 모형이에요. 실제로 먹거나 잡히지 않은 관계를 내 플레이 기록으로 만들지는 않아요.');
  }else{
   body.append(el('h3','같은 풀밭, 다른 입장'));
   note('개구리에게 메뚜기는 먹이예요. 메뚜기에게 개구리는 어떤 존재일까요?');const feedback=el('p','답을 고르면 두 역할의 차이를 볼 수 있어요.','learn-feedback');feedback.setAttribute('role','status');const choices=el('div',null,'choice-row');body.append(choices,feedback);button(choices,'나를 잡아먹는 동물',()=>feedback.textContent='맞아요! 같은 생물이 누구의 입장에서 보느냐에 따라 먹이이기도, 포식자이기도 해요.');button(choices,'양분을 만들어 주는 생산자',()=>feedback.textContent='개구리는 스스로 양분을 만드는 생산자가 아니에요. 메뚜기를 먹는 소비자예요.');
   body.append(el('h4','내가 끝낸 최근 탐험'));if(!journal.rounds.length)note('한 판을 마치면 이곳에 남아요. 먹이 개수는 과학 이해 점수가 아니에요.');for(const r of journal.rounds.slice(-4)){note(`${r.role==='hawk'?'매':r.role==='frog'?'개구리':r.role==='snake'?'뱀':'메뚜기'} · ${r.condition==='cut'?'풀밭 일부가 베어진 조건':'기본 풀밭'} · ${r.time}초 · 먹이 ${r.food} · ${r.status==='caught'?'잡힘':r.endCause==='food-exhausted'?'먹이 소진으로 종료':'시간 종료'}`);}note('기록은 이 브라우저에 최근 8판까지 남아요. 브라우저 저장이 막혀 있으면 현재 창에서만 남아요.');
   const actions=el('div',null,'choice-row');body.append(actions);button(actions,world.role==='grasshopper'?'개구리 입장으로 바꾸기':'메뚜기 입장으로 바꾸기',()=>onRole(world.role==='grasshopper'?'frog':'grasshopper'));
   button(actions,'매 입장으로 바꾸기',()=>onRole('hawk'));button(actions,'뱀 입장으로 바꾸기',()=>onRole('snake'));button(actions,'풀밭 일부가 베어졌다면?',()=>onCondition('cut'));button(actions,'기본 풀밭에서 메뚜기로',()=>onCondition('meadow'));note('조건 비교: 가운데 먹이 풀밭 하나만 줄여 다시 해요. 다른 규칙은 같아요. 이동 경로가 어떻게 달라질까요? 이 결과는 자연의 개체 수를 예측하는 실험값은 아니에요.');
  }
 }
 for(const [id,title]of [['plant','① 풀 관찰'],['chain','② 관계 연결'],['compare','③ 입장 바꾸기']]){const b=button(row,title,()=>render(id));b.dataset.tab=id;}
 render(tab);
}
