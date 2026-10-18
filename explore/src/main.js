import {showJourney,showRoundFinish} from './journey.js';
import {createSound} from './sound.js';
import {remainingFood} from './round-goal.js';
import {setupFullscreen} from './screen.js';
import {createPortfolio} from './portfolio.js';
import {showLearningHub} from './learning-hub.js';
import {createHawkWorld,stepHawkWorld} from './hawk-player.js';
import {createSnakeWorld,stepSnake} from './snake-player.js';
import {showFoodWeb} from './food-web.js';
import {beginObservation,observe,createExpedition,showResearch} from './research.js';
import {createHopperWorld,stepHopper} from './hopper.js';
import {createJournal,showExploration} from './exploration.js';
import {relationshipLines} from './learning-records.js';
import {SETTINGS,createWorld,stepWorld} from './core.js';
import {createRenderer} from './render.js';
import {createInput,GAME_KEYS} from './input.js';
import {createLifecycle} from './lifecycle.js';
import {loadAssets} from './assets.js';

const $=id=>document.getElementById(id), canvas=$('world'), dialog=$('dialog');
setupFullscreen($('fullscreen-toggle'),document);
const renderer=createRenderer(canvas), input=createInput(),sound=createSound();
let selectedRole='grasshopper',condition='meadow';
let savedStorage=null;try{savedStorage=window.localStorage;}catch{}
const journal=createJournal(savedStorage);
const portfolio=createPortfolio(savedStorage,journal.rounds);
const expedition=createExpedition(portfolio.data.comparison,c=>{if(c.mode){portfolio.data.comparison=c;portfolio.save();}});
function openLearning(startTab=0){showLearningHub({portfolio,expedition,showDialog,openResearch,startTab:Number.isInteger(startTab)?startTab:0});}
function openJourney(start='overview'){showJourney({portfolio,showDialog,onRole:role=>switchRole(role),onAdvanced:()=>openLearning(4),onPlant:()=>openNotebook('plant'),onResearch:openResearch,onReset:()=>{portfolio.reset();journal.clear();expedition.restore(null);selectedRole='grasshopper';condition='meadow';goHome();},onUndo:()=>{portfolio.undoReset();journal.restore(portfolio.data.rounds);expedition.restore(portfolio.data.comparison);openJourney();},start:typeof start==='string'?start:'overview'});}
$('learning-open').addEventListener('click',()=>openJourney());
function openResearch(){if(!expedition.mode&&portfolio.data.comparison)expedition.restore(portfolio.data.comparison);showResearch({expedition,showDialog,launch:(role,c)=>switchRole(role,c,true),journal,world});const next=document.createElement('button');next.textContent='내 근거 설명하고 탐험책 만들기';next.addEventListener('click',()=>openLearning(3));$('dialog-content').append(next);}
const makeWorld=()=>selectedRole==='hawk'?createHawkWorld({timed:$('timed').checked}):selectedRole==='snake'?createSnakeWorld({timed:$('timed').checked}):selectedRole==='grasshopper'?createHopperWorld({timed:$('timed').checked,condition}):createWorld({timed:$('timed').checked});
let world=createHopperWorld(), last=performance.now(), accumulator=0, shownEnd=false,endElapsed=0;
let screenMouse=null, resizeQueued=false, previousSize=null, lastAnnouncement='', returnFocus=null;
const captured=new Map();
let assetsReady=false, loadingAssets=false;
async function prepareAssets(){if(loadingAssets)return;loadingAssets=true;$('start').disabled=true;$('asset-status').classList.add('sr-only');$('retry-assets').hidden=true;$('asset-status').textContent='개구리와 연못 그림을 준비하고 있어요…';try{renderer.setAssets(await loadAssets());assetsReady=true;$('start').disabled=false;$('asset-status').textContent='준비됐어요 · 시작하기를 눌러 주세요';}catch(error){$('asset-status').classList.toggle('sr-only',false);$('asset-status').textContent=error.message;$('retry-assets').hidden=false;}finally{loadingAssets=false;}}
$('retry-assets').addEventListener('click',prepareAssets);
prepareAssets();
const coarse=window.matchMedia('(any-pointer: coarse)');

function drawStick() {
  const {x,y}=input.stick, travel=Math.max(12,($('pad').getBoundingClientRect().width-48)/2);
  $('stick').style.transform=`translate(${x*travel}px,${y*travel}px)`;
}
function clearInput() {
  input.clear(); screenMouse=null;
  // Clear ownership before releasing capture; lostpointercapture may fire synchronously.
  const release=[...captured]; captured.clear();
  for(const [id,element] of release) {
    try {if(element.hasPointerCapture(id))element.releasePointerCapture(id);} catch { /* Contact may already be gone. */ }
  }
  drawStick();
}
function announce(text) {if(text!==lastAnnouncement){$('announcement').textContent=text;lastAnnouncement=text;}}
const lifecycle=createLifecycle(({started,paused,dialogOpen,reason})=>{
  if(paused&&world.status==='playing')sound.stop();world.paused=paused; if(paused)world.player.pendingAction=null; clearInput(); input.setEnabled(started&&!paused&&world.status==='playing');
  accumulator=0; last=performance.now();
  $('pause').textContent=paused?'계속하기':'일시정지';
  $('pause').setAttribute('aria-label',paused?'게임 계속하기':'게임 일시정지');
  $('pause-overlay').hidden=!started||!paused||dialogOpen||world.status!=='playing';
  $('pause-reason').textContent=reason||'일시정지';
  if(started&&paused&&!dialogOpen)announce(`${reason||'일시정지'}. 계속하기를 누르면 이어집니다.`);
  if(started&&!paused&&!dialogOpen)announce('연습을 계속합니다.');
});
function resume(){if(!lifecycle.started||dialog.open||world.status!=='playing')return;lifecycle.pause(false);canvas.focus({preventScroll:true});}
function interrupt(reason){sound.stop();lifecycle.interrupt(reason);}
function canAction(action) {
  if(!lifecycle.started||world.paused||world.status!=='playing'||world.player.pendingAction)return false;
  if(world.role==='hawk'){if(action==='hop')return world.player.state==='diving';if(action==='eat')return ['cruise','boosting'].includes(world.player.state)&&world.player.eatCooldown<=0;return world.player.state==='cruise'&&world.player.jumpCooldown<=0;}
  if(world.role==='snake'){if(['eating','dashing'].includes(world.player.state))return false;return action==='eat'?world.player.eatCooldown<=0:world.player.jumpCooldown<=0;}
  if(action==='eat')return world.player.eatCooldown<=0&&!['jumping','eating'].includes(world.player.state);
  return world.player.jumpCooldown<=0&&world.player.state!=='jumping'&&(world.player.state!=='eating'||world.player.tongue?.committed);
}
function showDialog(title,lines,{settings=false,button='닫기'}={}) {
  $('dialog-content').classList.toggle('reflection-page',false);
  $('dialog-content').classList.toggle('learning-hub',false);$('dialog-content').classList.toggle('simple-journey',false);$('dialog-content').classList.toggle('round-finish',false);
  if(!dialog.open){returnFocus=document.activeElement;lifecycle.openDialog();}
  $('dialog-title').textContent=title; $('help-guide').hidden=true; $('poster-zoom').hidden=true; dialog.classList.toggle('poster-dialog',false);
  $('dialog-content').replaceChildren(...lines.map(line=>{const p=document.createElement('p');p.textContent=line;return p;}));
  $('settings').hidden=!settings; $('dialog-close').textContent=button;
  if(!dialog.open)dialog.showModal();
  if($('dialog-content').parentElement)$('dialog-content').parentElement.scrollTop=0;
}
function closeDialog() {
  if(!dialog.open)return;dialog.close();lifecycle.closeDialog();
  const visibleReturn=returnFocus?.isConnected&&!returnFocus.closest('[hidden]')&&returnFocus.getClientRects().length>0;
  const target=!lifecycle.started?(visibleReturn?returnFocus:$('start')):!lifecycle.paused?canvas:visibleReturn?returnFocus:$('resume');
  target.focus({preventScroll:true});
}
let posterZoomed=false;
function showPoster(kind) {
  showDialog(kind==='controls'?'조작방법':'게임설명',[]);
  $('help-guide').hidden=false; $('poster-zoom').hidden=false;
  $('hawk-poster').hidden=selectedRole!=='hawk';$('snake-poster').hidden=selectedRole!=='snake';
  $('controls-poster').hidden=selectedRole!=='frog'||kind!=='controls'; $('story-poster').hidden=selectedRole!=='frog'||kind!=='story';
  $('hopper-controls-poster').hidden=selectedRole!=='grasshopper'||kind!=='controls'; $('hopper-story-poster').hidden=selectedRole!=='grasshopper'||kind!=='story';
  const rule=document.createElement('p');rule.className='round-rule';rule.textContent='먹이를 모두 먹으면 남은 시간과 관계없이 클리어! 마지막 먹기 동작 뒤 실제 먹이 관계를 확인해요. 먹이 기록은 과학 이해 점수가 아니에요.';$('dialog-content').append(rule);dialog.classList.toggle('poster-dialog',true); posterZoomed=false;
  $('poster-scroll').classList.toggle('zoomed',false);
  $('poster-scroll').scrollTop=0; $('poster-scroll').scrollLeft=0;
  $('poster-zoom').textContent='크게 보기'; $('poster-zoom').setAttribute('aria-pressed','false');
}
function updateRoleLabels(){const hopper=selectedRole==='grasshopper',snake=selectedRole==='snake',hawk=selectedRole==='hawk',name=hawk?'매':snake?'뱀':hopper?'메뚜기':'개구리';$('role-tag').textContent=`${name}${snake?'으로':'로'} 살아보기${hopper&&condition==='cut'?' · 풀밭 변화':''} · 0.16.6`;const instructions=hawk?'방향키 또는 WASD 비행, J 급강하, K 급강하 취소, SPACE 빠른 비행. 터치: 왼손 이동 패드, 오른손 급강하·취소·빠른 비행. 지면 원을 먹이에 맞춰 내려오세요.':snake?'방향키 또는 WASD 이동, J 물기, K 짧게 이동, SPACE 빠르게 이동. 터치: 왼손 이동 패드와 오른손 행동 버튼. 뱀은 지면을 따라 움직여요.':'방향키 또는 WASD 이동, J 먹기, K 짧은 뜀, SPACE 큰 도약. 터치: 왼손 이동 패드와 오른손 행동 버튼.';canvas.setAttribute('aria-label',name+' 탐험. '+instructions);$('keyboard-instructions').textContent=instructions;for(const [id,role]of [['choose-hopper','grasshopper'],['choose-frog','frog'],['choose-snake','snake'],['choose-hawk','hawk']])$(id).setAttribute('aria-pressed',String(selectedRole===role));for(const [id,label,key]of [['eat',hawk?'급강하':snake?'물기':'먹기','J'],['hop',hawk?'취소':snake?'짧게 이동':'짧은 뜀','K'],['jump',hawk?'빠른 비행':snake?'빠르게 이동':'큰 도약','SPACE']]){const title=document.createElement('span'),hint=document.createElement('small');title.textContent=label;hint.textContent=key;$(id).replaceChildren(title,hint);$(id).setAttribute('aria-label',label+' '+key);}$('control-hint').textContent=hawk?'왼손 비행 · 오른손 급강하·취소·빠른 비행':snake?'왼손 이동 · 오른손 물기·짧게 이동·빠르게 이동':'왼손 이동 · 오른손 먹기·짧은 뜀·큰 도약';$('movement-caption').textContent=hawk?'하늘에서 찾고 · 지면 원을 맞춰 급강하':snake?'지면 이동 · 빠른 물기 · 매의 예고 원을 피해요':'즉시 이동 · 빠른 먹기 · 방향 도약';$('chapter-hint').textContent=hawk?'매의 입장에서 먹이를 찾아 급강하해 봐요.':name+'의 입장으로 먹고 피하며 살아봐요.';}

function switchRole(role,newCondition='meadow',research=false){if(!research)expedition.cancel();$('timed').disabled=research;if(research)$('timed').checked=true;closeDialog();selectedRole=role;condition=newCondition;sound.reset();world=makeWorld();beginObservation(world);updateRoleLabels();renderer.resetCamera();shownEnd=false;endElapsed=0;lifecycle.pause(false);canvas.focus({preventScroll:true});}
function openNotebook(tab='plant'){if(tab!=='plant'&&['snake','hawk'].includes(world.role)){showFoodWeb(world,showDialog);const b=document.createElement('button');b.textContent='연못 탐험 연구소 열기';b.addEventListener('click',openResearch);$('dialog-content').append(b);return;}showExploration({world,journal,showDialog,tab,onRole:role=>switchRole(role),onCondition:c=>switchRole('grasshopper',c)});const b=document.createElement('button');b.textContent='연못 탐험 연구소 열기';b.addEventListener('click',openResearch);$('dialog-content').append(b);}
$('change-role').addEventListener('click',()=>{if(!['snake','hawk'].includes(world.role)){openNotebook('compare');}else{showDialog('살아볼 생물 선택',[]);for(const [role,name]of [['frog','개구리'],['grasshopper','메뚜기'],['snake','뱀'],['hawk','매']]){const b=document.createElement('button');b.textContent=name+' 입장으로 바꾸기';b.addEventListener('click',()=>switchRole(role));$('dialog-content').append(b);}}});
$('choose-hawk').addEventListener('click',()=>{selectedRole='hawk';condition='meadow';updateRoleLabels();});
$('choose-snake').addEventListener('click',()=>{selectedRole='snake';condition='meadow';updateRoleLabels();});
$('choose-hopper').addEventListener('click',()=>{selectedRole='grasshopper';condition='meadow';updateRoleLabels();});
$('choose-frog').addEventListener('click',()=>{selectedRole='frog';updateRoleLabels();});
const showHelp=()=>showPoster('controls');
$('help').addEventListener('click',showHelp); $('compact-help').addEventListener('click',showHelp);
$('entry-controls').addEventListener('click',showHelp);
for(const id of ['entry-story','game-story'])$(id).addEventListener('click',()=>showPoster('story'));
const settingsRecords=document.createElement('div');settingsRecords.className='settings-records';$('settings').append(settingsRecords);
function openSettings(){
 settingsRecords.replaceChildren();
 const reset=document.createElement('button');reset.textContent='탐험 기록 초기화';reset.addEventListener('click',()=>openJourney('reset'));settingsRecords.append(reset);
 if(portfolio.canUndoReset){const undo=document.createElement('button');undo.textContent='초기화 전 기록 되돌리기';undo.addEventListener('click',()=>openJourney('undo'));settingsRecords.append(undo);}
 showDialog('설정',[],{settings:true});
}
for(const id of ['settings-open','compact-settings'])$(id).addEventListener('click',openSettings);
$('poster-zoom').addEventListener('click',()=>{
  posterZoomed=!posterZoomed; $('poster-scroll').classList.toggle('zoomed',posterZoomed);
  $('poster-zoom').textContent=posterZoomed?'전체 보기':'크게 보기';
  $('poster-zoom').setAttribute('aria-pressed',String(posterZoomed));
});
$('dialog-close').addEventListener('click',closeDialog);
dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
$('pause').addEventListener('click',()=>world.paused?resume():lifecycle.pause(true));
$('resume').addEventListener('click',resume);
$('start').addEventListener('click',()=>{
  if(lifecycle.started||!assetsReady)return;
  shownEnd=false;endElapsed=0;$('entry').hidden=true;$('game').hidden=false;previousSize=null;
  sound.reset();world=makeWorld();beginObservation(world);updateRoleLabels();renderer.resetCamera();lifecycle.start();queueResize();
  canvas.focus({preventScroll:true});announce(`${selectedRole==='hawk'?'매':selectedRole==='frog'?'개구리':selectedRole==='snake'?'뱀':'메뚜기'} 탐험을 시작합니다. 방향키 또는 왼쪽 패드로 이동하세요.`);
});
$('title-image').addEventListener('error',()=>$('entry-art').classList.add('artwork-failed'));
if($('title-image').complete&&!$('title-image').naturalWidth)$('entry-art').classList.add('artwork-failed');
$('sound-toggle').addEventListener('click',async()=>{const b=$('sound-toggle');b.disabled=true;const enabled=await sound.setEnabled(!sound.enabled);b.disabled=false;b.textContent=enabled?'소리 켜짐':'소리 꺼짐';b.setAttribute('aria-pressed',String(enabled));b.setAttribute('aria-label',enabled?'효과음 끄기':'효과음 켜기');if(!enabled)announce('효과음이 꺼져 있어요.');});
function goHome(){closeDialog();lifecycle.home();sound.reset();expedition.cancel();$('timed').disabled=false;$('game').hidden=true;$('entry').hidden=false;shownEnd=false;endElapsed=0;previousSize=null;updateRoleLabels();queueResize();$('start').focus({preventScroll:true});announce('처음 화면으로 돌아왔어요. 생물을 골라 새 탐험을 시작하세요.');}
$('home').addEventListener('click',()=>{if(world.status!=='playing'){goHome();return;}showDialog('처음 화면으로 갈까요?',['진행 중인 이번 판은 저장되지 않아요. 이전에 마친 탐험 기록은 그대로 남아요.'],{button:'계속하기'});const b=document.createElement('button');b.textContent='탐험을 그만하고 홈으로';b.addEventListener('click',goHome);$('dialog-content').append(b);});
function restartRound(){closeDialog();
  sound.reset();world=makeWorld();beginObservation(world);updateRoleLabels();renderer.resetCamera();shownEnd=false;endElapsed=0;lifecycle.pause(false);canvas.focus({preventScroll:true});announce('새 연습을 시작합니다.');
}
$('restart').addEventListener('click',restartRound);
$('records').addEventListener('click',()=>openNotebook('chain'));
$('timed').addEventListener('change',()=>{world.timed=$('timed').checked;});
$('debug').addEventListener('change',()=>renderer.setDebug($('debug').checked));
$('mouse').addEventListener('change',clearInput);
function updateTouchLayout(){document.body.classList.toggle('touch-ui',coarse.matches||navigator.maxTouchPoints>0||$('show-touch').checked);queueResize();}
$('show-touch').addEventListener('change',updateTouchLayout);
coarse.addEventListener?.('change',updateTouchLayout);

const interactive=element=>element?.closest?.('button,input,textarea,select,a,[contenteditable=true]');
window.addEventListener('keydown',event=>{
  if(!lifecycle.started||dialog.open)return;
  if(event.code==='Escape'&&!event.repeat){event.preventDefault();world.paused?resume():lifecycle.pause(true);return;}
  if(interactive(document.activeElement)||!GAME_KEYS.has(event.code)||world.paused)return;
  event.preventDefault();
  if(event.code==='KeyJ'&&!canAction('eat'))return;
  if(event.code==='Space'&&!canAction('jump'))return;if(event.code==='KeyK'&&!canAction('hop'))return;
  input.keyDown(event.code,event.repeat);
});
window.addEventListener('keyup',event=>input.keyUp(event.code));
document.addEventListener('focusin',event=>{if(interactive(event.target))clearInput();});
window.addEventListener('blur',()=>interrupt('다른 창으로 이동했어요'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt('화면을 잠시 떠났어요');});
window.addEventListener('pagehide',()=>interrupt('화면을 잠시 떠났어요'));
window.addEventListener('pageshow',event=>{if(event.persisted){interrupt('이전 화면으로 돌아왔어요');queueResize();}});

function capture(element,id) {
  try {element.setPointerCapture(id);captured.set(id,element);return true;}
  catch {input.endPointer(id,true);drawStick();return false;}
}
function release(event) {
  const element=captured.get(event.pointerId);captured.delete(event.pointerId);input.endPointer(event.pointerId,event.type!=='pointerup');drawStick();
  if(element)try{if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);}catch{}
}
function padPoint(event) {const box=$('pad').getBoundingClientRect();return[event.pointerId,event.clientX-box.left-box.width/2,event.clientY-box.top-box.height/2,box.width*.34];}
$('pad').addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  event.preventDefault();if(input.startPad(...padPoint(event))){capture($('pad'),event.pointerId);drawStick();}
});
$('pad').addEventListener('pointermove',event=>{if(input.updatePad(...padPoint(event))){event.preventDefault();drawStick();}});
for(const [id,action] of [['eat','eat'],['hop','hop'],['jump','jump']]) {
  const element=$(id);
  element.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    event.preventDefault();if(canAction(action)&&input.startAction(event.pointerId,action))capture(element,event.pointerId);
  });
  // Keyboard and assistive-technology activation has no matching pointerdown.
  element.addEventListener('click',event=>{if(event.detail===0&&canAction(action))input.queue(action);});
}
for(const element of [$('pad'),$('eat'),$('hop'),$('jump')]) {
  for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,release);
  element.addEventListener('contextmenu',event=>event.preventDefault());
}
canvas.addEventListener('pointermove',event=>{
  if(!$('mouse').checked||event.pointerType==='touch')return;
  const box=canvas.getBoundingClientRect();screenMouse={x:event.clientX-box.left,y:event.clientY-box.top};
});
canvas.addEventListener('pointerleave',()=>{screenMouse=null;input.setMouse(null);});
canvas.addEventListener('pointerdown',event=>{
  canvas.focus({preventScroll:true});
  if(event.pointerType!=='touch'&&event.button===0&&$('mouse').checked&&canAction('eat'))input.queue('eat');
});
canvas.addEventListener('pointercancel',()=>{screenMouse=null;input.setMouse(null);});

function updateViewport() {
  const viewport=window.visualViewport;
  // Do not counteract accessibility pinch zoom; update chrome resizing at normal scale.
  if(!viewport||Math.abs(viewport.scale-1)<.01){
    document.documentElement.style.setProperty('--app-height',`${viewport?.height||window.innerHeight}px`);
    document.documentElement.style.setProperty('--app-width',`${viewport?.width||window.innerWidth}px`);
  }
}
function queueResize() {
  if(resizeQueued)return;resizeQueued=true;
  requestAnimationFrame(()=>{
    resizeQueued=false;updateViewport();
    if(!lifecycle.started)return;
    if(window.visualViewport&&Math.abs(window.visualViewport.scale-1)>=.01)interrupt('화면을 확대했어요');
    const box=canvas.getBoundingClientRect();if(box.width<1||box.height<1)return;
    if(previousSize&&(Math.abs(previousSize.width-box.width)>1||Math.abs(previousSize.height-box.height)>1))interrupt('화면 크기가 바뀌었어요');
    previousSize={width:box.width,height:box.height};renderer.resize();
  });
}
if('ResizeObserver' in window)new ResizeObserver(queueResize).observe($('playfield'));
window.addEventListener('resize',queueResize);
window.visualViewport?.addEventListener('resize',queueResize);
window.screen.orientation?.addEventListener?.('change',()=>{interrupt('화면 방향이 바뀌었어요');queueResize();});
window.addEventListener('orientationchange',()=>{interrupt('화면 방향이 바뀌었어요');queueResize();});

function frame(now) {
  let dt=(now-last)/1000;last=now;
  if(dt>.25&&lifecycle.started&&!world.paused){interrupt('실행이 잠시 중단됐어요');dt=0;}
  dt=Math.min(Math.max(0,dt),SETTINGS.maxFrameDelta);
  if(lifecycle.started) {
    if(!world.paused)accumulator+=dt;else accumulator=0;
    if(screenMouse)input.setMouse(renderer.toWorld(screenMouse.x,screenMouse.y));
    while(accumulator>=SETTINGS.fixedStep){(world.role==='hawk'?stepHawkWorld:world.role==='snake'?stepSnake:world.role==='grasshopper'?stepHopper:stepWorld)(world,input.consume(world.player));observe(world);accumulator-=SETTINGS.fixedStep;}
    sound.update(world);renderer.render(world,dt);
    $('timer').textContent=world.timed?`${Math.max(0,Math.ceil(SETTINGS.roundSeconds-world.time))}초`:'시간 제한 없음';
    $('food').textContent=`먹이 기록 ${world.player.eaten}`; $('remaining-food').textContent=`남은 먹이 ${remainingFood(world)}`;
    $('state').textContent=world.status==='playing'?(world.paused?'일시정지':world.hawk?.state==='warning'?'! 매 공격 준비':world.hunters?.some(f=>f.state==='windup')?'! 개구리 혀 준비':world.predator.state==='windup'?'! 뱀 공격 준비':'탐험 중'):world.status==='caught'?'잡혔어요':world.endCause==='food-exhausted'?'탐험 클리어!':'탐험 종료';
    $('jump').setAttribute('aria-disabled',String(!canAction('jump')));
    $('hop').setAttribute('aria-disabled',String(!canAction('hop')));
    $('eat').setAttribute('aria-disabled',String(!canAction('eat')));
    $('status').textContent=world.player.feedback?.text??(world.role==='hawk'?(world.player.state==='diving'?'급강하 중 · K 취소':world.player.state==='rising'?'다시 날아오르는 중':world.player.eatCooldown>0?'다음 급강하 '+world.player.eatCooldown.toFixed(1)+'초':'지면 원이 밝아지면 J 급강하 · SPACE 빠른 비행'):world.player.state==='eating'?(world.role==='snake'?'물기 동작 중':'먹기 동작 중'):world.player.jumpCooldown>0?`다음 ${world.role==='snake'?'빠른 이동':'뜀'} ${world.player.jumpCooldown.toFixed(1)}초`:world.role==='snake'?'머리를 개구리 쪽으로 · J 물기 · 매의 예고 원 밖으로':world.role==='grasshopper'?'풀 근처에서 멈추고 먹기 · 점선 옆으로 도약':'먹이를 잡으며 90초 살아남기 · 뱀 경고에 도약');
    if(world.status!=='playing')endElapsed+=dt;
    if(world.status!=='playing'&&!shownEnd&&(world.status!=='caught'||endElapsed>=.22)){shownEnd=true;journal.save(world);portfolio.record(world);expedition.record(world);showRoundFinish({world,portfolio,showDialog,onRole:role=>switchRole(role),onRetry:restartRound,onJourney:openJourney});if(expedition.mode){const researchButton=document.createElement('button');researchButton.textContent='연구 기록 확인하고 이어가기';researchButton.addEventListener('click',openResearch);$('dialog-content').append(researchButton);}}

  }
  requestAnimationFrame(frame);
}
updateViewport();updateTouchLayout();requestAnimationFrame(frame);

