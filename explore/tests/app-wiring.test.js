/** This is a mocked DOM/event harness. It does not measure CSS layout or browser/device behavior. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
let version=0;
const realPerformance=globalThis.performance;
async function boot({imageFailure=false,standalone=false,role='frog',fakeClock=false}={}) {
  Object.defineProperty(globalThis,'performance',{value:realPerformance,configurable:true});
  let now=performance.now(),next=0;
  if(fakeClock)Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
  const frames=new Map(),ids=new Map();
  class Target {
    constructor(){this.listeners=new Map();}
    addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
    fire(type,props={}){const e={type,target:this,code:'',repeat:false,button:0,pointerType:'touch',detail:1,preventDefault(){this.defaultPrevented=true;},...props};for(const fn of this.listeners.get(type)||[])fn(e);return e;}
  }
  class Element extends Target {
    constructor(tag='DIV',id=''){super();this.tagName=tag;this.id=id;this.hidden=false;this.open=false;this.isConnected=true;this.checked=false;this.textContent='';this.attrs={};this.dataset={};this.children=[];this.capture=new Set();this.box={left:0,top:0,width:640,height:400};this.classes=new Set();this.style={setProperty:(k,v)=>this.style[k]=v};this.classList={add:x=>this.classes.add(x),toggle:(x,v)=>v?this.classes.add(x):this.classes.delete(x)};}
    setAttribute(k,v){this.attrs[k]=v;}
    getAttribute(k){return this.attrs[k];}
    replaceChildren(...x){this.children=x;}
    append(...x){this.children.push(...x);}
    prepend(...x){this.children.unshift(...x);}
    closest(selector){if(selector==='[hidden]')return this.hidden?this:null;return ['BUTTON','INPUT','TEXTAREA','SELECT','A'].includes(this.tagName)?this:null;}
    focus(){doc.activeElement=this;doc.fire('focusin',{target:this});}
    getBoundingClientRect(){return{...this.box};}
    getClientRects(){return this.hidden?[]:[this.box];}
    setPointerCapture(id){this.capture.add(id);}
    hasPointerCapture(id){return this.capture.has(id);}
    releasePointerCapture(id){if(this.capture.delete(id))this.fire('lostpointercapture',{pointerId:id});}
    showModal(){this.open=true;}
    close(){this.open=false;}
    getContext(){return context;}
  }
  const context=new Proxy({}, {get:(target,k)=>target[k]??(()=>{}),set:(target,k,v)=>(target[k]=v,true)});
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const match of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"[^>]*>/g)){const el=new Element(match[1].toUpperCase(),match[2]);el.hidden=/\shidden(?:[\s>])/.test(match[0]);ids.set(el.id,el);}
  ids.get('timed').checked=true;ids.get('pad').box={left:0,top:0,width:100,height:100};
  ids.get('title-image').complete=true;ids.get('title-image').naturalWidth=1664;
  const doc=new Target();Object.assign(doc,{getElementById:id=>ids.get(id),createElement:tag=>new Element(tag.toUpperCase()),documentElement:new Element(),body:new Element(),hidden:false,activeElement:null});
  const win=new Target(),coarse=new Target(),viewport=new Target();coarse.matches=true;Object.assign(viewport,{width:768,height:1024,scale:1});
  Object.assign(win,{matchMedia:()=>coarse,visualViewport:viewport,innerWidth:768,innerHeight:1024,screen:{orientation:new Target()}});
  Object.defineProperty(globalThis,'navigator',{value:{maxTouchPoints:5},configurable:true});
  class FakeImage{set src(value){this.naturalWidth=(value.includes('atlas')||value.startsWith('data:image/webp'))?1997:1672;this.naturalHeight=(value.includes('atlas')||value.startsWith('data:image/webp'))?1944:941;this.width=this.naturalWidth;this.height=this.naturalHeight;queueMicrotask(()=>imageFailure?this.onerror():this.onload());}}
  Object.assign(globalThis,{Image:FakeImage,document:doc,window:win,requestAnimationFrame:fn=>{frames.set(++next,fn);return next;}});
  if(standalone){const offline=fs.readFileSync(new URL('../play-offline.html',import.meta.url),'utf8'),code=offline.match(/<script id="game-code">([\s\S]*?)<\/script>/)[1];new Function('performance',code)({now:()=>now});}else await import(`../src/main.js?mock=${++version}`);
  await new Promise(resolve=>setTimeout(resolve,0));
  ids.get(role==='frog'?'choose-frog':'choose-hopper').fire('click');
  const tick=(elapsed=20)=>{now+=elapsed;const callbacks=[...frames.values()];frames.clear();for(const fn of callbacks)fn(now);};
const el=id=>ids.get(id),start=()=>{el('start').fire('click');tick();tick();};
  return{el,doc,win,tick,start,setImageFailure:value=>imageFailure=value};
}

test('completed meal appears in end dialog and records; restart clears it across consecutive rounds',async()=>{
  const h=await boot({standalone:true});h.start();
  h.win.fire('keydown',{code:'KeyJ'});h.tick();h.win.fire('keyup',{code:'KeyJ'});
  for(let i=0;i<902;i++)h.tick(100);
  const textTree=n=>[n.textContent,...(n.children??[]).map(textTree)].join('\n');
  const lines=()=>textTree(h.el('dialog-content'));
  assert.equal(h.el('dialog-title').textContent,'이번엔 내가 먹이가 되었어요');
  assert.match(lines(),/먹이 기록: 1개/);assert.match(lines(),/과학 이해 점수가 아니에요/);
  assert.match(lines(),/메뚜기 → 개구리/);assert.match(lines(),/개구리 → 뱀/);
  h.el('dialog-close').fire('click');h.el('records').fire('click');assert.match(lines(),/메뚜기 → 개구리/);
  h.el('dialog-close').fire('click');h.el('restart').fire('click');h.tick();
  assert.equal(h.el('food').textContent,'먹이 기록 0');assert.equal(h.el('timer').textContent,'90초');
  h.el('records').fire('click');assert.doesNotMatch(lines(),/메뚜기 → 개구리|개구리 → 뱀/);h.el('dialog-close').fire('click');
  for(let i=0;i<902;i++)h.tick(100);
  assert.equal(h.el('dialog-title').textContent,'이번엔 내가 먹이가 되었어요');
  assert.match(lines(),/먹이 기록: 0개/);assert.match(lines(),/개구리 → 뱀/);
});
test('app starts once from the real DOM button; resize pauses without replacing title/start state',async()=>{
  const h=await boot();assert.equal(h.el('game').hidden,true);h.start();assert.equal(h.el('entry').hidden,true);assert.equal(h.el('game').hidden,false);assert.equal(h.el('state').textContent,'탐험 중');
  h.el('world').box.width=390;h.win.fire('resize');h.tick();h.tick();assert.equal(h.el('state').textContent,'일시정지');assert.equal(h.el('pause-overlay').hidden,false);assert.match(h.el('pause-reason').textContent,/크기/);
  h.el('resume').fire('click');h.tick();assert.equal(h.el('state').textContent,'탐험 중');
});
test('multitouch action down activates once and release/click does not repeat it',async()=>{
  const h=await boot();h.start();h.el('pad').fire('pointerdown',{pointerId:1,clientX:75,clientY:50});h.el('jump').fire('pointerdown',{pointerId:2});h.tick(20);
  assert.equal(h.el('pad').hasPointerCapture(1),true);assert.equal(h.el('jump').attrs['aria-disabled'],'true');
  h.el('jump').fire('pointerup',{pointerId:2});h.el('jump').fire('click',{detail:1});assert.equal(h.el('jump').hasPointerCapture(2),false);assert.equal(h.el('pad').hasPointerCapture(1),true);
});
test('pointercancel before a frame cancels the pending action',async()=>{
  const h=await boot();h.start();h.el('jump').fire('pointerdown',{pointerId:2});h.el('jump').fire('pointercancel',{pointerId:2});h.tick();assert.equal(h.el('jump').attrs['aria-disabled'],'false');
});
test('pause releases all pointer captures and prevents stale action on resume',async()=>{
  const h=await boot();h.start();h.el('pad').fire('pointerdown',{pointerId:1,clientX:80,clientY:50});h.el('jump').fire('pointerdown',{pointerId:2});h.el('pause').fire('click');
  assert.equal(h.el('pad').capture.size,0);assert.equal(h.el('jump').capture.size,0);assert.equal(h.el('stick').style.transform,'translate(0px,0px)');
  h.el('resume').fire('click');h.tick();assert.equal(h.el('jump').attrs['aria-disabled'],'false');
});
test('blur while a help modal is open keeps the round paused after Escape',async()=>{
  const h=await boot();h.start();h.el('help').fire('click');assert.equal(h.el('dialog').open,true);h.win.fire('blur');const event=h.el('dialog').fire('cancel');assert.equal(event.defaultPrevented,true);h.tick();assert.equal(h.el('dialog').open,false);assert.equal(h.el('state').textContent,'일시정지');
});
test('focused native controls retain their keyboard activation rather than game interception',async()=>{
  const h=await boot();h.start();h.el('help').focus();const key=h.win.fire('keydown',{code:'Space'});assert.notEqual(key.defaultPrevented,true);h.tick();assert.equal(h.el('jump').attrs['aria-disabled'],'false');
  h.el('jump').fire('click',{detail:0});h.tick();assert.equal(h.el('jump').attrs['aria-disabled'],'true');
});
test('hidden-page and orientation events require explicit resume',async()=>{
  const h=await boot();h.start();h.doc.hidden=true;h.doc.fire('visibilitychange');h.tick();assert.equal(h.el('state').textContent,'일시정지');h.doc.hidden=false;h.doc.fire('visibilitychange');h.tick();assert.equal(h.el('state').textContent,'일시정지');h.el('resume').fire('click');h.tick();h.win.screen.orientation.fire('change');h.tick();assert.equal(h.el('state').textContent,'일시정지');
});
test('right mouse button cannot trigger actions and paused keyboard actions stay off',async()=>{
  const h=await boot();h.start();h.el('jump').fire('pointerdown',{pointerId:2,pointerType:'mouse',button:2});h.tick();assert.equal(h.el('jump').attrs['aria-disabled'],'false');h.el('pause').fire('click');h.win.fire('keydown',{code:'Space'});h.el('resume').fire('click');h.tick();assert.equal(h.el('jump').attrs['aria-disabled'],'false');
});

test('closing help restores canvas focus when play resumes; Escape works from a native button',async()=>{
  const h=await boot();h.start();h.el('help').focus();h.el('help').fire('click');h.el('dialog-close').fire('click');assert.equal(h.doc.activeElement,h.el('world'));h.tick();assert.equal(h.el('state').textContent,'탐험 중');h.el('help').focus();h.win.fire('keydown',{code:'Escape'});h.tick();assert.equal(h.el('state').textContent,'일시정지');
});

test('repeated pause-resume cycles refresh the live announcement',async()=>{
  const h=await boot();h.start();h.win.fire('blur');const first=h.el('announcement').textContent;h.el('resume').fire('click');assert.notEqual(h.el('announcement').textContent,first);h.win.fire('blur');assert.equal(h.el('announcement').textContent,first);
});
test('BFCache restore and a stalled frame stay paused until explicit resume',async()=>{
  const h=await boot();h.start();h.win.fire('pagehide');h.win.fire('pageshow',{persisted:true});h.tick();assert.equal(h.el('state').textContent,'일시정지');h.el('resume').fire('click');h.tick(400);assert.equal(h.el('state').textContent,'일시정지');assert.match(h.el('pause-reason').textContent,/중단/);
});
test('rotation releases a still-held joystick and action',async()=>{
  const h=await boot();h.start();h.el('pad').fire('pointerdown',{pointerId:1,clientX:80,clientY:50});h.el('jump').fire('pointerdown',{pointerId:2});h.win.screen.orientation.fire('change');assert.equal(h.el('pad').capture.size,0);assert.equal(h.el('jump').capture.size,0);h.el('resume').fire('click');h.tick();assert.equal(h.el('jump').attrs['aria-disabled'],'false');
});
test('capture failure cancels the uncommitted action instead of leaving it queued',async()=>{
  const h=await boot();h.start();h.el('jump').setPointerCapture=()=>{throw new Error('contact gone');};h.el('jump').fire('pointerdown',{pointerId:2});h.tick();assert.equal(h.el('jump').attrs['aria-disabled'],'false');
});
test('hidden return-focus target falls back to Resume while paused',async()=>{
  const h=await boot();h.start();h.el('pause').fire('click');h.el('help').focus();h.el('help').fire('click');h.el('help').hidden=true;h.el('dialog-close').fire('click');assert.equal(h.doc.activeElement,h.el('resume'));
});
test('visualViewport pinch preserves layout dimensions and safely pauses',async()=>{
  const h=await boot();h.start();const before=h.doc.documentElement.style['--app-height'];h.win.visualViewport.scale=2;h.win.visualViewport.height=300;h.win.visualViewport.fire('resize');h.tick();h.tick();assert.equal(h.doc.documentElement.style['--app-height'],before);assert.equal(h.el('state').textContent,'일시정지');assert.match(h.el('pause-reason').textContent,/확대/);
});

test('image load failure blocks play and offers an explicit retry',async()=>{const h=await boot({imageFailure:true});assert.equal(h.el('start').disabled,true);assert.equal(h.el('retry-assets').hidden,false);h.start();assert.equal(h.el('game').hidden,true);h.setImageFailure(false);h.el('retry-assets').fire('click');await new Promise(resolve=>setTimeout(resolve,0));assert.equal(h.el('start').disabled,false);h.start();assert.equal(h.el('game').hidden,false);});
test('short hop has its own native keyboard and touch activation',async()=>{const h=await boot();h.start();h.win.fire('keydown',{code:'KeyK'});h.tick();assert.equal(h.el('hop').attrs['aria-disabled'],'true');assert.equal(h.el('jump').attrs['aria-disabled'],'true');h.win.fire('blur');assert.equal(h.el('hop').capture.size,0);});
test('cancelled low-hop pointer never becomes a delayed jump',async()=>{const h=await boot();h.start();h.el('hop').fire('pointerdown',{pointerId:8});h.el('hop').fire('lostpointercapture',{pointerId:8});h.tick();assert.equal(h.el('hop').attrs['aria-disabled'],'false');assert.equal(h.el('jump').attrs['aria-disabled'],'false');});

test('single-file offline artifact starts the same game and responds to DOM actions without module fetches',async()=>{const h=await boot({standalone:true});assert.equal(h.el('start').disabled,false);h.start();assert.equal(h.el('game').hidden,false);h.win.fire('keydown',{code:'Space'});h.tick();assert.equal(h.el('jump').attrs['aria-disabled'],'true');h.win.fire('blur');h.tick();assert.equal(h.el('state').textContent,'일시정지');h.el('resume').fire('click');h.tick();assert.equal(h.el('state').textContent,'탐험 중');delete globalThis.__ECOLOGY_EMBEDDED_ASSETS__;});

test('main-menu posters work before starting; zoom and close restore focus without starting a round',async()=>{
 const h=await boot();
 for(const [id,poster] of [['entry-controls','controls-poster'],['entry-story','story-poster']]){
  h.el(id).focus();h.el(id).fire('click');assert.equal(h.el('dialog').open,true);assert.equal(h.el(poster).hidden,false);assert.equal(h.el('settings').hidden,true);assert.equal(h.el('game').hidden,true);
  h.el('poster-zoom').fire('click');assert.equal(h.el('poster-zoom').attrs['aria-pressed'],'true');
  h.el('dialog-close').fire('click');assert.equal(h.doc.activeElement,h.el(id));assert.equal(h.el('game').hidden,true);
 }
 h.start();assert.equal(h.el('timer').textContent,'90초');assert.equal(h.el('state').textContent,'탐험 중');
 h.el('help').fire('click');assert.equal(h.el('poster-zoom').attrs['aria-pressed'],'false');h.el('dialog-close').fire('click');h.tick();assert.equal(h.el('state').textContent,'탐험 중');
});

test('touch-only two-pointer movement and action survive poster opening without stuck fingers',async()=>{
 const h=await boot();h.start();assert.ok(h.doc.body.classes.has('touch-ui'));
 h.el('pad').fire('pointerdown',{pointerId:31,clientX:84,clientY:50});h.el('hop').fire('pointerdown',{pointerId:32});h.tick();
 assert.ok(h.el('pad').capture.has(31));assert.ok(h.el('hop').capture.has(32));assert.equal(h.el('hop').attrs['aria-disabled'],'true');
 h.el('help').fire('click');assert.equal(h.el('pad').capture.size,0);assert.equal(h.el('hop').capture.size,0);
 h.el('dialog-close').fire('click');for(let i=0;i<30;i++)h.tick();assert.equal(h.el('hop').attrs['aria-disabled'],'false');
});

const descendants=n=>[n,...(n.children??[]).flatMap(descendants)];
test('hopper keyboard and touch feeding, cancel, pause and restart use the real app wiring',async()=>{const h=await boot({role:'grasshopper'});h.start();h.el('eat').fire('pointerdown',{pointerId:91});h.tick();h.el('eat').fire('pointerup',{pointerId:91});for(let i=0;i<35;i++)h.tick();assert.equal(h.el('food').textContent,'먹이 기록 1');h.el('pause').fire('click');const time=h.el('timer').textContent;for(let i=0;i<20;i++)h.tick();assert.equal(h.el('timer').textContent,time);h.el('resume').fire('click');h.el('eat').fire('pointerdown',{pointerId:92});h.tick();h.el('eat').fire('pointerup',{pointerId:92});h.el('hop').fire('pointerdown',{pointerId:93});h.tick();h.el('hop').fire('pointerup',{pointerId:93});for(let i=0;i<35;i++)h.tick();assert.equal(h.el('food').textContent,'먹이 기록 1');h.el('restart').fire('click');h.tick();assert.equal(h.el('food').textContent,'먹이 기록 0');assert.match(h.el('role-tag').textContent,/메뚜기/);});
test('hopper two-pointer input cancels feeding and does not stick after notebook',async()=>{const h=await boot({role:'grasshopper'});h.start();h.el('pad').fire('pointerdown',{pointerId:61,clientX:84,clientY:50});h.el('jump').fire('pointerdown',{pointerId:62});h.tick();assert.equal(h.el('jump').attrs['aria-disabled'],'true');h.el('records').fire('click');assert.equal(h.el('pad').capture.size,0);assert.equal(h.el('jump').capture.size,0);h.el('dialog-close').fire('click');for(let i=0;i<35;i++)h.tick();assert.equal(h.el('jump').attrs['aria-disabled'],'false');assert.equal(h.el('food').textContent,'먹이 기록 0');});
test('role comparison switches a real round and clears previous actions',async()=>{const h=await boot({role:'grasshopper'});h.start();h.el('change-role').fire('click');const b=descendants(h.el('dialog-content')).find(n=>n.textContent==='개구리 입장으로 바꾸기');assert.ok(b);b.fire('click');h.tick();assert.equal(h.el('dialog').open,false);assert.match(h.el('role-tag').textContent,/개구리/);assert.equal(h.el('food').textContent,'먹이 기록 0');h.win.fire('keydown',{code:'KeyJ'});h.tick();h.win.fire('keyup',{code:'KeyJ'});for(let i=0;i<20;i++)h.tick();assert.equal(h.el('food').textContent,'먹이 기록 1');});
test('hopper image guides open before play and remain distinct from frog posters',async()=>{const h=await boot({role:'grasshopper'});h.el('entry-controls').fire('click');assert.equal(h.el('hopper-controls-poster').hidden,false);assert.equal(h.el('controls-poster').hidden,true);assert.equal(h.el('game').hidden,true);h.el('dialog-close').fire('click');h.el('entry-story').fire('click');assert.equal(h.el('hopper-story-poster').hidden,false);assert.equal(h.el('hopper-controls-poster').hidden,true);});
test('research prediction launches paired rounds, locks timing and preserves first evidence',async()=>{const h=await boot({role:'grasshopper',standalone:true});h.start();const all=n=>[n,...n.children.flatMap(all)];const click=text=>{const b=all(h.el('dialog-content')).find(n=>n.tagName==='BUTTON'&&n.textContent===text);assert.ok(b,text+JSON.stringify(all(h.el('dialog-content')).map(n=>n.textContent))+h.el('state').textContent);b.fire('click');};h.el('records').fire('click');click('연못 탐험 연구소 열기');click('풀밭 바꾸기');click('비슷할 것 같아요');click('기본 풀밭 시작');assert.equal(h.el('timed').disabled,true);h.win.fire('keydown',{code:'KeyJ'});h.tick();h.win.fire('keyup',{code:'KeyJ'});for(let i=0;i<950;i++)h.tick(100);click('연구 기록 확인하고 이어가기');assert.ok(all(h.el('dialog-content')).some(n=>n.textContent.includes('풀 → 메뚜기')));click('두 번째 탐험 시작');for(let i=0;i<950;i++)h.tick(100);click('연구 기록 확인하고 이어가기');assert.equal(h.el('dialog-title').textContent,'내 두 번의 탐험 비교');assert.ok(all(h.el('dialog-content')).some(n=>n.textContent==='내 예상: 비슷할 것 같아요'));assert.equal(all(h.el('dialog-content')).filter(n=>n.textContent.includes('풀 → 메뚜기')).length,2);});
test('snake menu starts real controls, touch bite, pause and restart without frog actions',async()=>{const h=await boot({standalone:true});h.el('choose-snake').fire('click');h.el('entry-controls').fire('click');assert.equal(h.el('snake-poster').hidden,false);assert.equal(h.el('controls-poster').hidden,true);h.el('dialog-close').fire('click');h.start();assert.ok(h.el('role-tag').textContent.includes('뱀으로'));assert.equal(h.el('eat').getAttribute('aria-label'),'물기 J');h.el('eat').fire('pointerdown',{pointerId:41});h.tick();h.el('eat').fire('pointerup',{pointerId:41});for(let i=0;i<20;i++)h.tick();assert.equal(h.el('food').textContent,'먹이 기록 1');h.el('pause').fire('click');const time=h.el('timer').textContent;for(let i=0;i<40;i++)h.tick();assert.equal(h.el('timer').textContent,time);h.el('resume').fire('click');for(let i=0;i<90;i++)h.tick(100);assert.equal(h.el('dialog-title').textContent,'이번엔 내가 먹이가 되었어요');h.el('dialog-close').fire('click');h.el('restart').fire('click');h.tick();assert.equal(h.el('food').textContent,'먹이 기록 0');h.el('hop').fire('pointerdown',{pointerId:42});h.tick();h.el('hop').fire('pointercancel',{pointerId:42});assert.equal(h.el('hop').capture.size,0);});
test('hawk menu, image guide, touch dive and keyboard cancellation work across pause and restart',async()=>{
 const h=await boot({standalone:true});h.el('choose-hawk').fire('click');h.el('entry-controls').fire('click');assert.equal(h.el('hawk-poster').hidden,false);assert.equal(h.el('snake-poster').hidden,true);h.el('dialog-close').fire('click');h.start();
 assert.match(h.el('role-tag').textContent,/매로/);assert.equal(h.el('eat').getAttribute('aria-label'),'급강하 J');assert.equal(h.el('hop').getAttribute('aria-label'),'취소 K');
 h.el('eat').fire('pointerdown',{pointerId:71});h.tick();h.el('eat').fire('pointerup',{pointerId:71});for(let i=0;i<5;i++)h.tick();
 h.win.fire('keydown',{code:'KeyK'});h.tick();h.win.fire('keyup',{code:'KeyK'});for(let i=0;i<45;i++)h.tick();assert.equal(h.el('food').textContent,'먹이 기록 0');
 h.el('restart').fire('click');h.tick();h.el('eat').fire('pointerdown',{pointerId:72});h.tick();h.el('eat').fire('pointerup',{pointerId:72});
 h.el('pause').fire('click');const time=h.el('timer').textContent;for(let i=0;i<50;i++)h.tick();assert.equal(h.el('timer').textContent,time);h.el('resume').fire('click');for(let i=0;i<50;i++)h.tick();assert.equal(h.el('food').textContent,'먹이 기록 1');
 h.el('restart').fire('click');h.tick();assert.equal(h.el('food').textContent,'먹이 기록 0');for(let i=0;i<902;i++)h.tick(100);assert.equal(h.el('dialog-title').textContent,'이번 탐험을 마쳤어요');
 const textTree=n=>[n.textContent,...(n.children??[]).map(textTree)].join('\n');assert.match(textTree(h.el('dialog-content')),/매 체험 완료/);assert.doesNotMatch(textTree(h.el('dialog-content')),/내 사냥 기록을 찾아요/);assert.doesNotMatch(textTree(h.el('dialog-content')),/실제로 잡혔어요/, 'no fabricated capture expected');
});
test('home confirmation cancels safely and confirmed home permits a fresh round',async()=>{const h=await boot();h.start();h.el('home').fire('click');assert.equal(h.el('dialog').open,true);const time=h.el('timer').textContent;for(let i=0;i<30;i++)h.tick();assert.equal(h.el('timer').textContent,time);h.el('dialog-close').fire('click');assert.equal(h.el('entry').hidden,true);h.el('home').fire('click');descendants(h.el('dialog-content')).find(n=>n.textContent==='탐험을 그만하고 홈으로').fire('click');assert.equal(h.el('entry').hidden,false);assert.equal(h.el('game').hidden,true);h.start();assert.equal(h.el('game').hidden,false);assert.equal(h.el('timer').textContent,'90초');assert.equal(h.el('food').textContent,'먹이 기록 0');});
test('finished rounds lead to next animal without a writing assignment; fourth role offers reflection',async()=>{const h=await boot({role:'grasshopper',fakeClock:true});h.start();const clickLabel=label=>{const b=descendants(h.el('dialog-content')).find(n=>n.tagName==='BUTTON'&&n.getAttribute('aria-label')===label);assert.ok(b,label);b.fire('click');};for(const next of ['개구리','뱀','매']){for(let i=0;i<3000;i++)h.tick(100);assert.equal(h.el('dialog').open,true,'end screen before '+next);assert.equal(descendants(h.el('dialog-content')).filter(n=>n.tagName==='TEXTAREA').length,0);clickLabel('다음 생물로: '+next);assert.equal(h.el('dialog').open,false);assert.match(h.el('role-tag').textContent,new RegExp(next));}for(let i=0;i<3000;i++)h.tick(100);clickLabel('관계 연결');assert.equal(h.el('dialog-title').textContent,'누가 누구를 먹었을까요?');clickLabel('한 줄 정리');assert.equal(descendants(h.el('dialog-content')).filter(n=>n.tagName==='TEXTAREA').length,1);});
test('plant illustration has a real reversible enlarge control',async()=>{const h=await boot();h.start();h.el('learning-open').fire('click');const find=text=>descendants(h.el('dialog-content')).find(n=>n.tagName==='BUTTON'&&n.textContent===text);find('풀 자세히 관찰하기').fire('click');const zoom=find('풀 그림 크게 보기');assert.ok(zoom);zoom.fire('click');assert.equal(zoom.getAttribute('aria-expanded'),'true');assert.equal(zoom.textContent,'작게 보기');zoom.fire('click');assert.equal(zoom.getAttribute('aria-expanded'),'false');});
test('reset confirmation can cancel; confirmed reset returns home with empty journey',async()=>{const h=await boot();h.start();const find=t=>descendants(h.el('dialog-content')).find(n=>n.tagName==='BUTTON'&&n.textContent===t);h.el('learning-open').fire('click');find('탐험 기록 초기화').fire('click');assert.equal(h.el('dialog-title').textContent,'새 탐험을 시작할까요?');find('취소').fire('click');assert.equal(h.el('dialog-title').textContent,'나의 탐험 여정');find('탐험 기록 초기화').fire('click');find('확인 · 새 탐험 시작').fire('click');assert.equal(h.el('entry').hidden,false);h.start();h.el('learning-open').fire('click');assert.ok(descendants(h.el('dialog-content')).some(n=>n.textContent.includes('0/4 체험 완료')));assert.ok(find('초기화 전 기록 되돌리기'));});
