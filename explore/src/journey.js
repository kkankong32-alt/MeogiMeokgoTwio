import {NAMES,edgeKey,edgeLabel,evidenceFor,downloadFile} from './portfolio.js';
import {drawPortrait,drawLearningWeb,makeBook,saveBook} from './book.js';
export const JOURNEY_ROLES=['grasshopper','frog','snake','hawk'];
export function journeyProgress(data){const done=JOURNEY_ROLES.filter(id=>data.rounds.some(r=>r.role===id));return {done,next:JOURNEY_ROLES.find(id=>!done.includes(id))??null,complete:done.length===4};}
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
function button(parent,text,fn,cls){const b=el('button',text,cls);b.type='button';b.addEventListener('click',fn);parent.append(b);return b;}
function artButton(parent,text,fn,kind){const b=button(parent,'',fn,'journey-art-button '+kind);b.setAttribute('aria-label',text);b.append(el('span',text,'sr-only'));return b;}
function portrait(parent,id,size=256){const c=el('canvas');c.width=size;c.height=size;c.setAttribute('aria-hidden','true');drawPortrait(c.getContext('2d'),id,0,0,size);parent.append(c);}
function strip(parent,data){const progress=journeyProgress(data),row=el('div',null,'journey-progress');row.setAttribute('aria-label','네 생물 체험 진행');for(const [i,id]of JOURNEY_ROLES.entries()){const card=el('div',null,'journey-stop'+(progress.done.includes(id)?' done':''));portrait(card,id);card.append(el('strong',NAMES[id]),el('small',progress.done.includes(id)?'✓ 체험했어요':`${i+1}번째 체험`));row.append(card);}parent.append(row);return progress;}
function shell(showDialog,title){showDialog(title,[]);const root=document.getElementById('dialog-content');root.classList.add('simple-journey');return root;}
export function showRoundFinish({world,portfolio,showDialog,onRole,onRetry,onJourney}){
 const root=shell(showDialog,world.status==='caught'?'이번엔 내가 먹이가 되었어요':world.endCause==='food-exhausted'?'탐험 클리어!':'이번 탐험을 마쳤어요');
 const summary=el('div',null,'round-summary');portrait(summary,world.role??'frog');const text=el('div');text.append(el('h3',NAMES[world.role??'frog']+' 체험 완료'),el('p',`먹이 기록: ${world.player.eaten}개 · ${Math.round(world.time)}초`));summary.append(text);root.append(summary);
 const events=world.learningEvents.filter(e=>['ate','caught'].includes(e.type)),keys=[...new Set(events.map(e=>edgeKey(e.food,e.eater)))];
 const evidence=el('div',null,'round-evidence');for(const k of keys.slice(0,2))evidence.append(el('p',edgeLabel(k)+' · '+(events.find(e=>edgeKey(e.food,e.eater)===k).type==='caught'?'실제로 잡혔어요':'직접 먹었어요')));if(!keys.length)evidence.append(el('p','이번에는 먹거나 잡힌 기록이 없어요.'));root.append(evidence);
 const p=journeyProgress(portfolio.data);root.classList.add('round-finish');root.append(el('p',p.complete?'네 생물을 모두 체험했어요. 이제 관계를 연결하고 한 줄만 남겨요.':`글쓰기는 나중에 한 번만! 다음은 ${NAMES[p.next]}로 살아봐요.`,'journey-lead'));
 const actions=el('div',null,'journey-main-actions');root.append(actions);
 artButton(actions,p.complete?'관계 연결':'다음 생물로: '+NAMES[p.next],()=>p.complete?onJourney('connect'):onRole(p.next),p.complete?'art-connect':'art-next');artButton(actions,'한 번 더 해보기',onRetry,'art-retry');strip(root,portfolio.data);
 const detail=el('details',null,'journey-details');detail.append(el('summary','이번 판 자세히 보기'));detail.append(el('p',world.reason),el('p','먹이 개수는 과학 이해 점수가 아니에요.'));for(const e of events)detail.append(el('p',`${e.time.toFixed(1)}초 · ${edgeLabel(edgeKey(e.food,e.eater))} · ${e.type==='caught'?'잡힘':'먹기'}`));root.append(detail);
}
export function showJourney({portfolio,showDialog,onRole,onAdvanced,onPlant,onResearch,onReset,onUndo,start='overview'}){
 const saved=()=>portfolio.persistent?'자동으로 저장했어요.':'이 창에서만 보관돼요. 기록 파일을 저장해 주세요.';
 function render(page){const root=shell(showDialog,page==='reset'?'새 탐험을 시작할까요?':page==='connect'?'누가 누구를 먹었을까요?':page==='reflect'?'네 생물 체험, 한 줄 정리':'나의 탐험 여정');
 if(page==='reset'){root.append(el('p','이 브라우저의 체험 기록, 연결한 관계, 한 줄 정리와 비교 기록을 초기화해요. 진행 중인 판도 끝내고 생물 선택으로 돌아가요.','journey-lead'));root.append(el('p','초기화 전 기록은 한 번 되돌릴 수 있어요. 파일로도 보관하려면 아래 저장 버튼을 눌러 주세요.'));button(root,'기록 파일 먼저 저장',()=>downloadFile(portfolio.export(),'연못-초기화전-기록.json','application/json'),'quiet-action');const actions=el('div',null,'journey-main-actions');root.append(actions);button(actions,'취소',()=>render('overview'),'quiet-action');button(actions,'확인 · 새 탐험 시작',onReset,'reset-confirm');return;}
 if(page==='overview'){
 const p=strip(root,portfolio.data);root.append(el('p','메뚜기 → 개구리 → 뱀 → 매 순서로 체험해요. 잡혀도 체험 기록은 남아요.','journey-lead'));root.append(el('p',`${p.done.length}/4 체험 완료 · 저장된 체험 기록을 포함해요.`));
 const actions=el('div',null,'journey-main-actions');root.append(actions);artButton(actions,p.complete?'관계 연결':'다음 생물로: '+NAMES[p.next],()=>p.complete?render('connect'):onRole(p.next),p.complete?'art-connect':'art-next');
 if(!p.complete)button(actions,'지금 관계 연결해 보기',()=>render('connect'),'quiet-action');
 const extra=el('details',null,'journey-details');extra.append(el('summary','다른 생물 고르기'));for(const id of JOURNEY_ROLES)button(extra,NAMES[id]+'로 살아보기',()=>onRole(id));root.append(extra);
 const optional=el('details',null,'journey-details');optional.append(el('summary','더 해 보고 싶다면 · 선택 활동'));button(optional,'풀 자세히 관찰하기',onPlant);button(optional,'풀밭 변화 비교하기',onResearch);button(optional,'자세한 기록 · 기존 탐구 보고서',onAdvanced);root.append(optional);const manage=el('details',null,'journey-details');manage.append(el('summary','탐험 기록 관리'));button(manage,'탐험 기록 초기화',()=>render('reset'),'quiet-action');if(portfolio.canUndoReset){manage.append(el('p','되돌리면 초기화 후 새로 쌓인 기록을 이전 기록으로 교체해요.'));button(manage,'초기화 전 기록 되돌리기',()=>render('undo'),'quiet-action');}root.append(manage);
 }else if(page==='undo'){root.append(el('p','초기화 후 새로 쌓인 기록 대신 이전 기록을 복원해요.'));button(root,'현재 기록 파일 저장',()=>downloadFile(portfolio.export(),'연못-현재-기록.json','application/json'),'quiet-action');button(root,'취소',()=>render('overview'),'quiet-action');button(root,'이전 기록으로 되돌리기',onUndo,'reset-confirm');}else if(page==='connect'){
 root.append(el('p','먹히는 생물 → 먹는 생물. 그림 두 장을 차례로 눌러요.','journey-lead'));let first=null;
 const cards=el('div',null,'simple-species');root.append(cards);const feedback=el('p','예: 풀을 누른 뒤 메뚜기를 눌러요.','simple-feedback');feedback.setAttribute('role','status');root.append(feedback);
 const map=el('canvas',null,'simple-map');map.setAttribute('role','img');map.setAttribute('aria-label','내가 연결한 먹이 관계. 아래 글 목록과 같은 내용입니다.');const lines=el('div',null,'simple-links');
 const redraw=()=>{drawLearningWeb(map,portfolio.data);lines.replaceChildren();for(const k of portfolio.data.links)lines.append(el('p',edgeLabel(k)+' · '+(evidenceFor(portfolio.data,k).length?'내 체험에서 확인':'모형의 관계')));};
 for(const id of ['grass',...JOURNEY_ROLES]){const b=button(cards,'',()=>{if(!first){first=id;b.setAttribute('aria-pressed','true');feedback.textContent=NAMES[id]+' → 누구에게 먹힐까요?';return;}const a=first;first=null;for(const c of cards.children)c.setAttribute('aria-pressed','false');if(portfolio.connect(a,id)){feedback.textContent=edgeLabel(edgeKey(a,id))+' 연결했어요!';redraw();}else feedback.textContent='먹히는 쪽부터 다시 눌러 보세요.';});b.setAttribute('aria-label',NAMES[id]);b.setAttribute('aria-pressed','false');portrait(b,id);b.append(el('strong',NAMES[id]));}
 root.append(map,lines);redraw();root.append(el('p','개구리는 뱀과 매에게 먹혀요. 자연의 먹이 관계는 여러 갈래로 이어집니다. 이 그림은 일부 생물만 담은 모형이에요.','simple-caption'));
 artButton(root,'한 줄 정리',()=>render('reflect'),'art-reflect');artButton(root,'탐험 여정으로',()=>render('overview'),'art-back');
 }else{
 root.classList.add('reflection-page');
 root.append(el('p','여러 생물로 살아보니 무엇을 알게 되었나요? 한 문장만 적어도 충분해요.','journey-lead'));
 const keys=[...new Set(portfolio.data.rounds.flatMap(r=>r.events.map(e=>edgeKey(e.food,e.eater))))];const evidence=el('div',null,'simple-feedback');evidence.append(el('strong','내 체험에서 확인한 관계'),el('p',keys.length?keys.map(edgeLabel).join(' / '):'아직 기록이 없어요. 먼저 한 생물로 살아봐요.'));root.append(evidence);
 const ribbon=el('div',null,'reflection-ribbon');for(const id of JOURNEY_ROLES)portrait(ribbon,id,256);root.append(ribbon);const label=el('label','내가 발견한 것 (선택 · 240자 이내)','answer-field'),input=el('textarea');input.value=portfolio.data.answers.claim??'';input.maxLength=240;input.placeholder='예: 개구리는 먹이를 먹지만 뱀에게 먹히기도 해요.';label.append(input);root.append(label);const state=el('p',saved(),'save-status');state.setAttribute('role','status');input.addEventListener('input',()=>{portfolio.answer('claim',input.value);state.textContent=saved();});root.append(state);
 const actions=el('div',null,'journey-main-actions'),preview=el('div',null,'brief-preview');root.append(actions,preview);artButton(actions,'한 장 보고서 보기',async()=>{preview.replaceChildren(el('p','보고서를 만드는 중이에요…'));try{const pages=await makeBook(portfolio.data,null,{brief:true});preview.replaceChildren(...pages);button(preview,'PDF로 저장',()=>saveBook(pages),'report-download');}catch{preview.replaceChildren(el('p','그림을 불러온 뒤 다시 눌러 주세요.'));}},'art-report');input.addEventListener('input',()=>preview.replaceChildren());artButton(actions,'관계 연결로 돌아가기',()=>render('connect'),'art-back');
 const files=el('details',null,'journey-details');files.append(el('summary','기록 옮기기 · 더 자세한 보고서'));button(files,'기록 파일 저장',()=>downloadFile(portfolio.export(),'연못-학습기록.json','application/json'));button(files,'불러오기 · 자세한 보고서',onAdvanced);root.append(files);
 }
 }
 render(start);
}
